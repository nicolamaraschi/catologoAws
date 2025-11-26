#!/bin/bash

# Script per il deploy di entrambi i frontend su AWS Amplify
# Usa il profilo AWS 'personale' invece di 'default'

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
AWS_PROFILE="personale"
AWS_REGION="eu-west-1"  # Modifica se necessario
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Nome delle app Amplify (modificabili)
USER_APP_NAME="catalogo-orsi-utente"
ADMIN_APP_NAME="catalogo-orsi-admin"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deploy AWS Amplify - Catalogo Orsi${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Profilo AWS:${NC} $AWS_PROFILE"
echo -e "${YELLOW}Regione:${NC} $AWS_REGION"
echo ""

# Verifica che il profilo AWS esista
if ! aws configure list-profiles | grep -q "^${AWS_PROFILE}$"; then
    echo -e "${RED}❌ Errore: Profilo AWS '${AWS_PROFILE}' non trovato${NC}"
    echo -e "${YELLOW}Profili disponibili:${NC}"
    aws configure list-profiles
    exit 1
fi

# Verifica credenziali AWS
echo -e "${BLUE}🔍 Verifica credenziali AWS...${NC}"
if ! aws sts get-caller-identity --profile $AWS_PROFILE &> /dev/null; then
    echo -e "${RED}❌ Errore: Credenziali AWS non valide per il profilo '${AWS_PROFILE}'${NC}"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text)
echo -e "${GREEN}✓ Account AWS: ${ACCOUNT_ID}${NC}"
echo ""

# Funzione per creare o aggiornare app Amplify
create_or_update_amplify_app() {
    local APP_NAME=$1
    local APP_DIR=$2
    local DESCRIPTION=$3
    
    echo -e "${BLUE}📦 Configurazione app: ${APP_NAME}${NC}"
    echo -e "${YELLOW}Directory:${NC} $APP_DIR"
    
    # Verifica se l'app esiste già
    APP_ID=$(aws amplify list-apps \
        --profile $AWS_PROFILE \
        --region $AWS_REGION \
        --query "apps[?name=='${APP_NAME}'].appId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$APP_ID" ]; then
        echo -e "${YELLOW}⚙️  Creazione nuova app Amplify...${NC}"
        
        # Crea nuova app (senza repository, verrà collegato dopo dalla console)
        APP_ID=$(aws amplify create-app \
            --name "${APP_NAME}" \
            --description "${DESCRIPTION}" \
            --platform WEB \
            --profile $AWS_PROFILE \
            --region $AWS_REGION \
            --query 'app.appId' \
            --output text)
        
        echo -e "${GREEN}✓ App creata con ID: ${APP_ID}${NC}"
        
        # Crea branch main
        aws amplify create-branch \
            --app-id $APP_ID \
            --branch-name main \
            --profile $AWS_PROFILE \
            --region $AWS_REGION \
            --enable-auto-build \
            > /dev/null
        
        echo -e "${GREEN}✓ Branch 'main' creato${NC}"
    else
        echo -e "${GREEN}✓ App esistente trovata (ID: ${APP_ID})${NC}"
    fi
    
    # Ottieni l'URL dell'app
    APP_URL=$(aws amplify get-app \
        --app-id $APP_ID \
        --profile $AWS_PROFILE \
        --region $AWS_REGION \
        --query 'app.defaultDomain' \
        --output text)
    
    echo -e "${GREEN}✓ URL app: https://main.${APP_URL}${NC}"
    echo ""
    
    # Salva l'ID per riferimento futuro
    echo "$APP_ID" > "${APP_DIR}/.amplify-app-id"
}

# Menu interattivo
echo -e "${YELLOW}Cosa vuoi fare?${NC}"
echo "1) Configura entrambe le app Amplify"
echo "2) Configura solo frontend utente"
echo "3) Configura solo frontend admin"
echo "4) Deploy manuale (build locale + upload)"
echo "5) Mostra info app esistenti"
echo "6) Elimina app Amplify"
read -p "Scelta (1-6): " choice

case $choice in
    1)
        echo -e "${BLUE}📦 Configurazione di entrambe le app...${NC}"
        echo ""
        create_or_update_amplify_app \
            "$USER_APP_NAME" \
            "$PROJECT_ROOT/frontend-catalogo-utente" \
            "Frontend catalogo utente - Orsi"
        
        create_or_update_amplify_app \
            "$ADMIN_APP_NAME" \
            "$PROJECT_ROOT/frontend-catalogo-admin" \
            "Frontend catalogo admin - Orsi"
        ;;
    
    2)
        create_or_update_amplify_app \
            "$USER_APP_NAME" \
            "$PROJECT_ROOT/frontend-catalogo-utente" \
            "Frontend catalogo utente - Orsi"
        ;;
    
    3)
        create_or_update_amplify_app \
            "$ADMIN_APP_NAME" \
            "$PROJECT_ROOT/frontend-catalogo-admin" \
            "Frontend catalogo admin - Orsi"
        ;;
    
    4)
        echo -e "${BLUE}🔨 Deploy manuale...${NC}"
        echo ""
        
        # Chiedi quale app
        echo "Quale app vuoi deployare?"
        echo "1) Frontend utente"
        echo "2) Frontend admin"
        read -p "Scelta (1-2): " app_choice
        
        if [ "$app_choice" == "1" ]; then
            APP_DIR="$PROJECT_ROOT/frontend-catalogo-utente"
            APP_NAME="$USER_APP_NAME"
        else
            APP_DIR="$PROJECT_ROOT/frontend-catalogo-admin"
            APP_NAME="$ADMIN_APP_NAME"
        fi
        
        # Build
        echo -e "${YELLOW}⚙️  Building app...${NC}"
        cd "$APP_DIR"
        npm run build
        
        # Ottieni App ID
        if [ -f ".amplify-app-id" ]; then
            APP_ID=$(cat .amplify-app-id)
        else
            APP_ID=$(aws amplify list-apps \
                --profile $AWS_PROFILE \
                --region $AWS_REGION \
                --query "apps[?name=='${APP_NAME}'].appId" \
                --output text)
        fi
        
        if [ -z "$APP_ID" ]; then
            echo -e "${RED}❌ App non trovata. Esegui prima la configurazione.${NC}"
            exit 1
        fi
        
        # Crea deployment
        echo -e "${YELLOW}📤 Uploading build...${NC}"
        
        # Crea un file zip della build
        cd build
        zip -r ../build.zip . > /dev/null
        cd ..
        
        # Upload usando S3 (richiede bucket configurato)
        echo -e "${YELLOW}⚠️  Nota: Per il deploy manuale, usa la console AWS Amplify${NC}"
        echo -e "${YELLOW}   oppure configura il deploy da repository Git${NC}"
        echo ""
        echo -e "${GREEN}✓ Build completata in: ${APP_DIR}/build${NC}"
        ;;
    
    5)
        echo -e "${BLUE}📋 App Amplify esistenti:${NC}"
        echo ""
        
        aws amplify list-apps \
            --profile $AWS_PROFILE \
            --region $AWS_REGION \
            --query 'apps[*].[name,appId,defaultDomain]' \
            --output table
        ;;
    
    6)
        echo -e "${RED}⚠️  Eliminazione app Amplify${NC}"
        echo ""
        
        # Lista app
        aws amplify list-apps \
            --profile $AWS_PROFILE \
            --region $AWS_REGION \
            --query 'apps[*].[name,appId]' \
            --output table
        
        echo ""
        read -p "Inserisci l'App ID da eliminare (o 'cancel' per annullare): " delete_id
        
        if [ "$delete_id" != "cancel" ]; then
            aws amplify delete-app \
                --app-id $delete_id \
                --profile $AWS_PROFILE \
                --region $AWS_REGION
            
            echo -e "${GREEN}✓ App eliminata${NC}"
        fi
        ;;
    
    *)
        echo -e "${RED}Scelta non valida${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ Operazione completata${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Prossimi passi:${NC}"
echo "1. Configura le variabili d'ambiente nella console AWS Amplify"
echo "2. Collega il repository GitHub/GitLab"
echo "3. Configura il build automatico"
echo ""
echo -e "${BLUE}Console AWS Amplify:${NC}"
echo "https://${AWS_REGION}.console.aws.amazon.com/amplify/home?region=${AWS_REGION}"
