#!/bin/bash

# ============================================================================
# Deploy Script Ottimizzato per Catalogo AWS
# ============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione
STACK_NAME="catalogo-aws-prod"
ENVIRONMENT="production"
ADMIN_EMAIL="nicola.maraschi01@gmail.com"
AWS_PROFILE="personale"
AWS_REGION="eu-west-1"

# ============================================================================
# Funzioni Utility
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================================
# 1. Pre-flight Checks
# ============================================================================

preflight_checks() {
    log_info "Esecuzione pre-flight checks..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI non installato"
        exit 1
    fi
    log_success "AWS CLI: $(aws --version)"
    
    # Check SAM CLI
    if ! command -v sam &> /dev/null; then
        log_error "SAM CLI non installato"
        exit 1
    fi
    log_success "SAM CLI: $(sam --version)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker non installato (richiesto per --use-container)"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker daemon non in esecuzione"
        exit 1
    fi
    log_success "Docker: $(docker --version)"
    
    # Check AWS Profile
    if ! aws configure list --profile "$AWS_PROFILE" &> /dev/null; then
        log_error "Profile AWS '$AWS_PROFILE' non configurato"
        exit 1
    fi
    log_success "AWS Profile '$AWS_PROFILE' configurato"
    
    # Check AWS Credentials
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        log_error "Credenziali AWS non valide per profile '$AWS_PROFILE'"
        exit 1
    fi
    local ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)
    log_success "AWS Account ID: $ACCOUNT_ID"
    
    # Check template.yaml
    if [ ! -f "template.yaml" ]; then
        log_error "File template.yaml non trovato"
        exit 1
    fi
    log_success "Template SAM trovato"
    
    # Check backend-lambda directory
    if [ ! -d "backend-lambda" ]; then
        log_error "Directory backend-lambda non trovata"
        exit 1
    fi
    log_success "Directory backend-lambda trovata"
    
    # Validate template
    log_info "Validazione template SAM..."
    if ! sam validate --profile "$AWS_PROFILE" --region "$AWS_REGION"; then
        log_error "Template SAM non valido"
        exit 1
    fi
    log_success "Template SAM valido"
    
    echo ""
}

# ============================================================================
# 2. Backup Configurazione Esistente (se presente)
# ============================================================================

backup_existing_stack() {
    log_info "Verifica stack esistente..."
    
    if aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" &> /dev/null; then
        
        log_warning "Stack '$STACK_NAME' già esistente"
        
        # Backup outputs
        local BACKUP_FILE="stack-outputs-backup-$(date +%Y%m%d-%H%M%S).json"
        aws cloudformation describe-stacks \
            --stack-name "$STACK_NAME" \
            --profile "$AWS_PROFILE" \
            --region "$AWS_REGION" \
            --query 'Stacks[0].Outputs' > "$BACKUP_FILE"
        
        log_success "Backup outputs salvato: $BACKUP_FILE"
        
        read -p "Vuoi continuare con l'update? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deploy annullato"
            exit 0
        fi
    else
        log_info "Nuovo stack - primo deploy"
    fi
    
    echo ""
}

# ============================================================================
# 3. Build con Container
# ============================================================================

build_sam() {
    log_info "Build SAM con container Docker..."
    
    # Clean previous builds
    if [ -d ".aws-sam" ]; then
        log_info "Pulizia build precedenti..."
        rm -rf .aws-sam
    fi
    
    # Build with container
    if sam build \
        --use-container \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --cached \
        --parallel; then
        log_success "Build completata con successo"
    else
        log_error "Build fallita"
        exit 1
    fi
    
    echo ""
}

# ============================================================================
# 4. Deploy con Gestione Errori
# ============================================================================

deploy_sam() {
    log_info "Deploy stack '$STACK_NAME'..."
    
    # Deploy con parametri ottimizzati
    if sam deploy \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            "Environment=$ENVIRONMENT" \
            "AdminEmail=$ADMIN_EMAIL" \
        --capabilities CAPABILITY_IAM \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" \
        --resolve-s3 \
        --s3-prefix "$STACK_NAME" \
        --no-confirm-changeset \
        --no-fail-on-empty-changeset \
        --on-failure ROLLBACK \
        --tags \
            Environment="$ENVIRONMENT" \
            Project=Catalogo \
            ManagedBy=SAM; then
        
        log_success "Deploy completato con successo"
    else
        log_error "Deploy fallito"
        log_warning "Verifica CloudFormation Events per dettagli:"
        log_warning "aws cloudformation describe-stack-events --stack-name $STACK_NAME --profile $AWS_PROFILE --region $AWS_REGION"
        exit 1
    fi
    
    echo ""
}

# ============================================================================
# 5. Post-Deploy Verification
# ============================================================================

verify_deployment() {
    log_info "Verifica deployment..."
    
    # Get stack status
    local STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].StackStatus' \
        --output text)
    
    if [ "$STACK_STATUS" != "CREATE_COMPLETE" ] && [ "$STACK_STATUS" != "UPDATE_COMPLETE" ]; then
        log_error "Stack status: $STACK_STATUS"
        exit 1
    fi
    
    log_success "Stack status: $STACK_STATUS"
    
    # Get and display outputs
    log_info "Stack Outputs:"
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    echo ""
}

# ============================================================================
# 6. Save Outputs to .env Files
# ============================================================================

save_outputs_to_env() {
    log_info "Salvataggio outputs per frontend..."
    
    # Get outputs
    local API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicApiBaseUrl`].OutputValue' \
        --output text)
    
    local COGNITO_POOL_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
        --output text)
    
    local COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolClientId`].OutputValue' \
        --output text)
    
    local CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionDomain`].OutputValue' \
        --output text)
    
    # Save to deployment-outputs.env
    cat > deployment-outputs.env << EOF
# Auto-generated by deploy.sh - $(date)
# Stack: $STACK_NAME
# Region: $AWS_REGION

# Frontend Catalogo Utente
REACT_APP_API_BASE_URL=$API_ENDPOINT
REACT_APP_CLOUDFRONT_URL=https://$CLOUDFRONT_DOMAIN

# Frontend Catalogo Admin
REACT_APP_COGNITO_REGION=$AWS_REGION
REACT_APP_COGNITO_USER_POOL_ID=$COGNITO_POOL_ID
REACT_APP_COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID
REACT_APP_API_BASE_URL=${API_ENDPOINT/public\/catalogo/admin}
REACT_APP_CLOUDFRONT_URL=https://$CLOUDFRONT_DOMAIN
EOF
    
    log_success "Outputs salvati in: deployment-outputs.env"
    echo ""
}

# ============================================================================
# 7. Test API
# ============================================================================

test_api() {
    log_info "Test API endpoint..."
    
    local API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicApiBaseUrl`].OutputValue' \
        --output text)
    
    if [ -z "$API_ENDPOINT" ]; then
        log_warning "API endpoint non trovato negli outputs"
        return
    fi
    
    log_info "Testing: $API_ENDPOINT/prodotti"
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT/prodotti")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        log_success "API endpoint risponde correttamente (HTTP $HTTP_STATUS)"
    else
        log_warning "API endpoint HTTP status: $HTTP_STATUS"
        log_warning "Questo è normale se il database è vuoto"
    fi
    
    echo ""
}

# ============================================================================
# 8. Summary
# ============================================================================

print_summary() {
    log_success "======================================"
    log_success "  DEPLOYMENT COMPLETATO CON SUCCESSO"
    log_success "======================================"
    echo ""
    
    log_info "Stack Name: $STACK_NAME"
    log_info "Region: $AWS_REGION"
    log_info "Environment: $ENVIRONMENT"
    echo ""
    
    log_info "Next Steps:"
    echo "  1. Copia le variabili d'ambiente da: deployment-outputs.env"
    echo "  2. Crea primo utente admin:"
    echo "     aws cognito-idp admin-create-user \\"
    echo "       --user-pool-id \$(aws cloudformation describe-stacks --stack-name $STACK_NAME --profile $AWS_PROFILE --region $AWS_REGION --query 'Stacks[0].Outputs[?OutputKey==\`CognitoUserPoolId\`].OutputValue' --output text) \\"
    echo "       --username $ADMIN_EMAIL \\"
    echo "       --user-attributes Name=email,Value=$ADMIN_EMAIL Name=email_verified,Value=true \\"
    echo "       --temporary-password TempPass123! \\"
    echo "       --profile $AWS_PROFILE \\"
    echo "       --region $AWS_REGION"
    echo ""
    echo "  3. Esegui migrazione dati (se necessario):"
    echo "     cd backend-lambda"
    echo "     npm run migrate"
    echo ""
    echo "  4. Monitora logs:"
    echo "     sam logs --stack-name $STACK_NAME --profile $AWS_PROFILE --region $AWS_REGION --tail"
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    echo ""
    log_info "======================================"
    log_info "  CATALOGO AWS - DEPLOY SCRIPT"
    log_info "======================================"
    echo ""
    
    preflight_checks
    backup_existing_stack
    build_sam
    deploy_sam
    verify_deployment
    save_outputs_to_env
    test_api
    print_summary
}

# Handle errors
trap 'log_error "Script fallito alla riga $LINENO"; exit 1' ERR

# Run
main