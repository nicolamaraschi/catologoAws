#!/bin/bash

# ============================================================================
# Test API Completo e Definitivo - Catalogo AWS
# Verifica TUTTI gli endpoint pubblici e admin, più le chiamate residue.
# ============================================================================



# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurazione API e Credenziali
API_BASE="https://nnk37tr17e.execute-api.eu-west-1.amazonaws.com/production"
PUBLIC_API="$API_BASE/api/public/catalogo"
ADMIN_API="$API_BASE/api/admin"
COGNITO_REGION="eu-west-1"
COGNITO_CLIENT_ID="4t90j2ijprchem651sn6imhlpc"
EMAIL="nicola.maraschi01@gmail.com" 
PASSWORD="Marase01!"

# Variabili di test dinamiche
TIMESTAMP=$(date +%s)
TEST_CODE="TEST_$TIMESTAMP"
TEST_CAT_NAME="CategoryTest-$TIMESTAMP"
TEST_SUBCAT_NAME="SubcategoryTest-$TIMESTAMP"
TEST_PROD_ID=""
TEST_CATEGORY_ID=""
TOKEN=""

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST API COMPLETO - CATALOGO AWS ${NC}"
echo -e "${BLUE}============================================${NC}\n"

# ============================================================================
# FUNZIONE DI UTILITY PER TESTARE
# ============================================================================

run_test() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local auth_token="${4:-}"
    local expected_code="${5:-200}"
    local description="$6"
    
    local headers=('-H' 'Content-Type: application/json')
    if [ -n "$auth_token" ]; then
        headers+=('-H' "Authorization: Bearer $auth_token")
    fi

    echo -e "${YELLOW}[TEST]${NC} $description"

    HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
      -X "$method" \
      "${headers[@]}" \
      ${data:+-d "$data"} \
      "$endpoint")

    if [ "$HTTP_CODE" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ OK${NC} ($HTTP_CODE)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $HTTP_CODE)"
        if [ -s /tmp/response.json ]; then
            cat /tmp/response.json | jq '.' 2>/dev/null
        fi
        return 1
    fi
    echo ""
}

# ============================================================================
# 1. LOGIN ADMIN & ESTRAZIONE ID TOKEN
# ============================================================================

echo -e "${BLUE}--- 1. LOGIN ADMIN & ESTRAZIONE ID TOKEN ---${NC}\n"

LOGIN_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$COGNITO_CLIENT_ID" \
  --auth-parameters USERNAME="$EMAIL",PASSWORD="$PASSWORD" \
  --region "$COGNITO_REGION" \
  --profile personale \
  --output json 2>/dev/null)

# ESTRAZIONE: Usiamo l'ID Token.
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.AuthenticationResult.IdToken // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ OK${NC} Login successful. ID Token Acquired."
else
    echo -e "${RED}✗ FAIL${NC} Login failed. Cannot proceed."
    exit 1
fi
echo ""

# ============================================================================
# 2. TEST ADMIN CATEGORY CRUD (Gestione Categorie/Sottocategorie Protetta)
# ============================================================================

echo -e "${BLUE}--- 2. TEST ADMIN CATEGORY & SUBCATEGORY CRUD ---${NC}\n"

# [A] POST /admin/categorie (Create Category)
run_test "$ADMIN_API/categorie" POST '{
    "categoryName": "'"$TEST_CAT_NAME"'",
    "translations": { "it": "Test Categoria", "en": "Test Category" }
}' "$TOKEN" 201 "POST /admin/categorie (Create Category)"
if [ "$?" -eq 0 ]; then
    TEST_CATEGORY_ID="$TEST_CAT_NAME"
fi

if [ -n "$TEST_CATEGORY_ID" ]; then
    # [B] POST /admin/categorie/{id}/sottocategorie (Add Subcategory)
    run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie" POST '{
        "subcategoryName": "'"$TEST_SUBCAT_NAME"'",
        "translations": { "it": "Test Sottocategoria", "en": "New Subcategory" }
    }' "$TOKEN" 201 "POST /admin/categorie/{id}/sottocategorie (Add Subcategory)"

    # [C] GET /admin/categorie (Read All Admin)
    run_test "$ADMIN_API/categorie" GET "" "$TOKEN" 200 "GET /admin/categorie (Read All Admin)"

    # [D] GET /admin/categorie/{id}/sottocategorie (Read Subcategories Admin)
    run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie" GET "" "$TOKEN" 200 "GET /admin/categorie/{id}/sottocategorie (Read Subcategories Admin)"

    # [E] PUT /admin/categorie/{id} (Update Category)
    run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID" PUT '{
        "translations": { "it": "Categoria Rinominata", "en": "Renamed Category" }
    }' "$TOKEN" 200 "PUT /admin/categorie/{id} (Update Category)"
    
    # [F] DELETE /admin/categorie/{id}/sottocategorie/{subId} (Delete Subcategory)
    run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie/$TEST_SUBCAT_NAME" DELETE "" "$TOKEN" 204 "DELETE /admin/categorie/{id}/sottocategorie/{subId} (Delete Subcategory)"

    # [G] DELETE /admin/categorie/{id} (Delete Category)
    run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID" DELETE "" "$TOKEN" 204 "DELETE /admin/categorie/{id} (Delete Category)"
fi
echo ""

# ============================================================================
# 3. TEST ADMIN PRODUCT CRUD (Gestione Prodotti Protetta)
# ============================================================================

echo -e "${BLUE}--- 3. TEST ADMIN PRODUCT CRUD ---${NC}\n"

# [H] GET /admin/prodotti (Read All Products Admin)
run_test "$ADMIN_API/prodotti" GET "" "$TOKEN" 200 "GET /admin/prodotti (Read All Products Admin)"

# [I] POST /admin/prodotti (Crea Prodotto)
PRODUCT_DATA='{
    "nome": { "it": "Prodotto Test", "en": "Test Product" },
    "codice": "'"$TEST_CODE"'",
    "tipo": "Test",
    "prezzo": 99.99,
    "unita": "€/PZ",
    "categoria": { "it": "Domestico", "en": "Domestic" },
    "sottocategoria": { "it": "Test", "en": "Test" },
    "tipoImballaggio": "Sacco 10kg"
}'
run_test "$ADMIN_API/prodotti" POST "$PRODUCT_DATA" "$TOKEN" 201 "POST /admin/prodotti (Create Product)"
if [ "$?" -eq 0 ]; then
    TEST_PROD_ID=$(cat /tmp/response.json | jq -r '.data.productId')
fi


if [ -n "$TEST_PROD_ID" ]; then
    # [L] GET /admin/prodotti/{id} (Read Single Product Admin)
    run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" GET "" "$TOKEN" 200 "GET /admin/prodotti/{id} (Read Single Product Admin)"

    # [M] PUT /admin/prodotti/{id} (Update Product)
    UPDATE_DATA='{ "prezzo": 149.99 }'
    run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" PUT "$UPDATE_DATA" "$TOKEN" 200 "PUT /admin/prodotti/{id} (Update Product)"

    # [N] DELETE /admin/prodotti/{id} (Delete Product)
    run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" DELETE "" "$TOKEN" 204 "DELETE /admin/prodotti/{id} (Delete Product)"
fi
echo ""

# ============================================================================
# 4. TEST API PUBBLICHE (Verifica le rotte utente)
# ============================================================================

echo -e "${BLUE}--- 4. TEST PUBBLICI FINALI (Controlli Utente) ---${NC}\n"

# [O] GET /public/catalogo/prodotti (La rotta di base dell'utente)
run_test "$PUBLIC_API/prodotti" GET "" "" 200 "GET /public/catalogo/prodotti"

# [P] GET /public/catalogo/categorie/{id} (La rotta utente di fetch singolo)
run_test "$PUBLIC_API/categorie/Domestico" GET "" "" 200 "GET /public/catalogo/categorie/{id}"

# [Q] GET /public/catalogo/sottocategorie (La rotta utente per tutte le sottocategorie)
run_test "$PUBLIC_API/sottocategorie" GET "" "" 200 "GET /public/catalogo/sottocategorie"

# [R] GET /public/catalogo/categoria/{cat}/sottocategorie (La rotta utente per sottocategorie per categoria)
run_test "$PUBLIC_API/categoria/Domestico/sottocategorie" GET "" "" 200 "GET /public/catalogo/categoria/{cat}/sottocategorie"

# ============================================================================
# 5. TEST API MANCANTI/RESIDUE (Verifica la pulizia del codice)
# ============================================================================

echo -e "${BLUE}--- 5. TEST CHIAMATE RESIDUE (Deve Fallire con 404/403) ---${NC}\n"

# [S] TEST ROGUE CALL: testConnection (GET /prodottiCatalogo/sottocategorie)
# La rotta non è definita, ci aspettiamo 404 Not Found.
run_test "$PUBLIC_API/prodottiCatalogo/sottocategorie" GET "" "" 404 "GET /prodottiCatalogo/sottocategorie (Rogue TestConnection)"

# [T] TEST ROGUE CALL: addSubcategory (POST /prodottiCatalogo/{...})
# La rotta non è definita, e il metodo è POST. Ci aspettiamo 404/403.
run_test "$PUBLIC_API/prodottiCatalogo/categoria/Test/sottocategorie" POST '{
    "sottocategoria": "RogueSub"
}' "" 404 "POST /prodottiCatalogo/{...} (Rogue AddSubcategory)"

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST COMPLETATO${NC}"
echo -e "${BLUE}============================================${NC}"