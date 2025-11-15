#!/bin/bash

# ============================================================================
# Test API Completo e Definitivo - Catalogo AWS
# Verifica TUTTE le API pubbliche e admin, incluse quelle mancanti
# Versione ESTESA con test di upload immagini e gestione completa categorie
# ============================================================================

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

# Contatori
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST API COMPLETO - CATALOGO AWS ${NC}"
echo -e "${BLUE}  Testing ALL Public & Admin APIs${NC}"
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
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    local headers=('-H' 'Content-Type: application/json')
    if [ -n "$auth_token" ]; then
        headers+=('-H' "Authorization: Bearer $auth_token")
    fi

    echo -e "${YELLOW}[TEST #$TOTAL_TESTS]${NC} $description"

    HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
      -X "$method" \
      "${headers[@]}" \
      ${data:+-d "$data"} \
      "$endpoint")

    if [ "$HTTP_CODE" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($HTTP_CODE)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_code, got $HTTP_CODE)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ -s /tmp/response.json ]; then
            echo -e "${RED}Response:${NC}"
            cat /tmp/response.json | jq '.' 2>/dev/null || cat /tmp/response.json
        fi
        return 1
    fi
    echo ""
}

# ============================================================================
# 1. LOGIN ADMIN & ESTRAZIONE ID TOKEN
# ============================================================================

echo -e "${BLUE}--- 1. AUTENTICAZIONE ADMIN ---${NC}\n"

LOGIN_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$COGNITO_CLIENT_ID" \
  --auth-parameters USERNAME="$EMAIL",PASSWORD="$PASSWORD" \
  --region "$COGNITO_REGION" \
  --profile personale \
  --output json 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.AuthenticationResult.IdToken // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ LOGIN SUCCESSFUL${NC} - ID Token acquired"
else
    echo -e "${RED}✗ LOGIN FAILED${NC} - Cannot proceed with admin tests"
    echo "Solo i test pubblici verranno eseguiti."
    TOKEN=""
fi
echo ""

# ============================================================================
# 2. TEST API PUBBLICHE - PRODOTTI
# ============================================================================

echo -e "${PURPLE}--- 2. TEST API PUBBLICHE - PRODOTTI ---${NC}\n"

# [1] GET /public/catalogo/prodotti (Lista tutti i prodotti)
run_test "$PUBLIC_API/prodotti" GET "" "" 200 "GET /public/catalogo/prodotti (All Products)"

# [2] GET /public/catalogo/prodotti con query parameters
run_test "$PUBLIC_API/prodotti?limit=5" GET "" "" 200 "GET /public/catalogo/prodotti?limit=5 (Pagination)"

# [3] GET /public/catalogo/prodotti/{productId} (Prendi il primo prodotto dalla lista)
if [ -s /tmp/response.json ]; then
    FIRST_PRODUCT_ID=$(cat /tmp/response.json | jq -r '.data[0].productId // empty' 2>/dev/null)
    if [ -n "$FIRST_PRODUCT_ID" ] && [ "$FIRST_PRODUCT_ID" != "null" ]; then
        run_test "$PUBLIC_API/prodotti/$FIRST_PRODUCT_ID" GET "" "" 200 "GET /public/catalogo/prodotti/{id} (Single Product)"
    else
        echo -e "${YELLOW}[SKIP]${NC} No products found for single product test"
    fi
fi

# ============================================================================
# 3. TEST API PUBBLICHE - CATEGORIE
# ============================================================================

echo -e "\n${PURPLE}--- 3. TEST API PUBBLICHE - CATEGORIE ---${NC}\n"

# [4] GET /public/catalogo/categorie (Lista tutte le categorie)
run_test "$PUBLIC_API/categorie" GET "" "" 200 "GET /public/catalogo/categorie (All Categories)"

# [5] GET /public/catalogo/categorie/{categoryId} (Categoria specifica)
run_test "$PUBLIC_API/categorie/Domestico" GET "" "" 200 "GET /public/catalogo/categorie/Domestico (Single Category)"

# [6] GET /public/catalogo/sottocategorie (Tutte le sottocategorie)
run_test "$PUBLIC_API/sottocategorie" GET "" "" 200 "GET /public/catalogo/sottocategorie (All Subcategories)"

# [7] GET /public/catalogo/categoria/{cat}/sottocategorie (Sottocategorie per categoria)
run_test "$PUBLIC_API/categoria/Domestico/sottocategorie" GET "" "" 200 "GET /public/catalogo/categoria/Domestico/sottocategorie"

# [8] GET /public/catalogo/categoria/{categoria} (Prodotti per categoria)
run_test "$PUBLIC_API/categoria/Domestico" GET "" "" 200 "GET /public/catalogo/categoria/Domestico (Products by Category)"

# [9] GET /public/catalogo/categoria/{cat}/sottocategoria/{subcat} (Prodotti per categoria e sottocategoria)
run_test "$PUBLIC_API/categoria/Domestico/sottocategoria/Piscina" GET "" "" 200 "GET /categoria/Domestico/sottocategoria/Piscina (Products by Category+Subcategory)"

# ============================================================================
# 4. TEST API ADMIN - PRODOTTI (Solo se autenticato)
# ============================================================================

if [ -n "$TOKEN" ]; then
    echo -e "\n${CYAN}--- 4. TEST API ADMIN - PRODOTTI ---${NC}\n"

    # [10] GET /admin/prodotti (Lista prodotti admin)
    run_test "$ADMIN_API/prodotti" GET "" "$TOKEN" 200 "GET /admin/prodotti (Admin - All Products)"

    # [11] GET /admin/prodotti?limit=3 (Con pagination)
    run_test "$ADMIN_API/prodotti?limit=3" GET "" "$TOKEN" 200 "GET /admin/prodotti?limit=3 (Admin - Paginated)"

    # [12] POST /admin/prodotti (Crea nuovo prodotto)
    PRODUCT_DATA='{
        "nome": { "it": "Prodotto Test API", "en": "Test API Product", "fr": "Produit Test", "es": "Producto Test", "de": "Test Produkt" },
        "codice": "'"$TEST_CODE"'",
        "tipo": "Test API",
        "prezzo": 199.99,
        "unita": "€/PZ",
        "categoria": { "it": "Domestico", "en": "Domestic", "fr": "Domestique", "es": "Doméstico", "de": "Haushalt" },
        "sottocategoria": { "it": "Test", "en": "Test", "fr": "Test", "es": "Test", "de": "Test" },
        "tipoImballaggio": "Sacco 10kg",
        "pezziPerCartone": 12,
        "cartoniPerEpal": 50
    }'
    run_test "$ADMIN_API/prodotti" POST "$PRODUCT_DATA" "$TOKEN" 201 "POST /admin/prodotti (Create Product)"
    
    if [ "$?" -eq 0 ]; then
        TEST_PROD_ID=$(cat /tmp/response.json | jq -r '.data.productId // empty')
        echo -e "${CYAN}Created Product ID: $TEST_PROD_ID${NC}"
    fi

    # [13] GET /admin/prodotti/{id} (Singolo prodotto admin)
    if [ -n "$TEST_PROD_ID" ]; then
        run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" GET "" "$TOKEN" 200 "GET /admin/prodotti/{id} (Admin - Single Product)"
        
        # [14] PUT /admin/prodotti/{id} (Update prodotto)
        UPDATE_DATA='{ "prezzo": 299.99, "tipo": "Test API Updated" }'
        run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" PUT "$UPDATE_DATA" "$TOKEN" 200 "PUT /admin/prodotti/{id} (Update Product)"
    fi

else
    echo -e "\n${YELLOW}--- 4. SKIPPING ADMIN PRODUCT TESTS (No Auth Token) ---${NC}\n"
fi

# ============================================================================
# 5. TEST API ADMIN - CATEGORIE (Solo se autenticato)
# ============================================================================

if [ -n "$TOKEN" ]; then
    echo -e "\n${CYAN}--- 5. TEST API ADMIN - CATEGORIE ---${NC}\n"

    # [15] GET /admin/categorie (Lista categorie admin)
    run_test "$ADMIN_API/categorie" GET "" "$TOKEN" 200 "GET /admin/categorie (Admin - All Categories)"

    # [16] POST /admin/categorie (Crea nuova categoria)
    CATEGORY_DATA='{
        "categoryName": "'"$TEST_CAT_NAME"'",
        "translations": { 
            "it": "Categoria Test API", 
            "en": "Test API Category", 
            "fr": "Catégorie Test", 
            "es": "Categoría Test", 
            "de": "Test Kategorie" 
        }
    }'
    run_test "$ADMIN_API/categorie" POST "$CATEGORY_DATA" "$TOKEN" 201 "POST /admin/categorie (Create Category)"
    
    if [ "$?" -eq 0 ]; then
        TEST_CATEGORY_ID="$TEST_CAT_NAME"
        echo -e "${CYAN}Created Category ID: $TEST_CATEGORY_ID${NC}"
    fi

    # [17] GET /admin/categorie/{id}/sottocategorie (Lista sottocategorie admin)
    if [ -n "$TEST_CATEGORY_ID" ]; then
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie" GET "" "$TOKEN" 200 "GET /admin/categorie/{id}/sottocategorie (Admin)"

        # [18] POST /admin/categorie/{id}/sottocategorie (Aggiungi sottocategoria)
        SUBCATEGORY_DATA='{
            "subcategoryName": "'"$TEST_SUBCAT_NAME"'",
            "translations": { 
                "it": "Sottocategoria Test", 
                "en": "Test Subcategory", 
                "fr": "Sous-catégorie Test", 
                "es": "Subcategoría Test", 
                "de": "Test Unterkategorie" 
            }
        }'
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie" POST "$SUBCATEGORY_DATA" "$TOKEN" 201 "POST /admin/categorie/{id}/sottocategorie (Add Subcategory)"

        # [19] PUT /admin/categorie/{id} (Update categoria)
        UPDATE_CATEGORY_DATA='{
            "translations": { 
                "it": "Categoria Rinominata", 
                "en": "Renamed Category", 
                "fr": "Catégorie Renommée", 
                "es": "Categoría Renombrada", 
                "de": "Umbenannte Kategorie" 
            }
        }'
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID" PUT "$UPDATE_CATEGORY_DATA" "$TOKEN" 200 "PUT /admin/categorie/{id} (Update Category)"

        # [20] PUT /admin/categorie/{id}/sottocategorie/{subId} (Update sottocategoria)
        UPDATE_SUBCATEGORY_DATA='{
            "translations": { 
                "it": "Sottocategoria Aggiornata", 
                "en": "Updated Subcategory", 
                "fr": "Sous-catégorie Mise à Jour", 
                "es": "Subcategoría Actualizada", 
                "de": "Aktualisierte Unterkategorie" 
            }
        }'
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie/$TEST_SUBCAT_NAME" PUT "$UPDATE_SUBCATEGORY_DATA" "$TOKEN" 200 "PUT /admin/categorie/{id}/sottocategorie/{subId} (Update Subcategory)"
    fi

else
    echo -e "\n${YELLOW}--- 5. SKIPPING ADMIN CATEGORY TESTS (No Auth Token) ---${NC}\n"
fi

# ============================================================================
# 6. TEST API ADMIN - UPLOAD (Solo se autenticato)
# ============================================================================

if [ -n "$TOKEN" ]; then
    echo -e "\n${CYAN}--- 6. TEST API ADMIN - UPLOAD ---${NC}\n"

    # [21] POST /admin/upload/presigned-url (Genera URL pre-firmato)
    UPLOAD_DATA='{
        "fileName": "test-image-'"$TIMESTAMP"'.jpg",
        "fileType": "image/jpeg",
        "fileSize": 102400
    }'
    run_test "$ADMIN_API/upload/presigned-url" POST "$UPLOAD_DATA" "$TOKEN" 200 "POST /admin/upload/presigned-url (Generate Presigned URL)"

else
    echo -e "\n${YELLOW}--- 6. SKIPPING ADMIN UPLOAD TESTS (No Auth Token) ---${NC}\n"
fi

# ============================================================================
# 7. TEST EDGE CASES E VALIDAZIONE
# ============================================================================

echo -e "\n${PURPLE}--- 7. TEST EDGE CASES & VALIDATION ---${NC}\n"

# [22] GET prodotto inesistente
run_test "$PUBLIC_API/prodotti/nonexistent-id" GET "" "" 404 "GET /public/catalogo/prodotti/{nonexistent} (404 Not Found)"

# [23] GET categoria inesistente
run_test "$PUBLIC_API/categorie/NonExistentCategory" GET "" "" 404 "GET /public/catalogo/categorie/{nonexistent} (404 Not Found)"

# [24] GET prodotti per categoria inesistente
run_test "$PUBLIC_API/categoria/NonExistent" GET "" "" 200 "GET /public/catalogo/categoria/{nonexistent} (Empty Result)"

if [ -n "$TOKEN" ]; then
    # [25] POST prodotto senza autenticazione (dovrebbe fallire)
    run_test "$ADMIN_API/prodotti" POST '{"test": "unauthorized"}' "" 401 "POST /admin/prodotti (Unauthorized - No Token)"

    # [26] POST prodotto con dati invalidi
    run_test "$ADMIN_API/prodotti" POST '{"invalid": "data"}' "$TOKEN" 400 "POST /admin/prodotti (Bad Request - Invalid Data)"

    # [27] PUT prodotto inesistente
    run_test "$ADMIN_API/prodotti/nonexistent-id" PUT '{"prezzo": 100}' "$TOKEN" 404 "PUT /admin/prodotti/{nonexistent} (404 Not Found)"

    # [28] DELETE prodotto inesistente
    run_test "$ADMIN_API/prodotti/nonexistent-id" DELETE "" "$TOKEN" 404 "DELETE /admin/prodotti/{nonexistent} (404 Not Found)"
fi

# ============================================================================
# 8. CLEANUP - CANCELLAZIONE DATI DI TEST (Solo se autenticato)
# ============================================================================

if [ -n "$TOKEN" ]; then
    echo -e "\n${CYAN}--- 8. CLEANUP - CANCELLAZIONE DATI TEST ---${NC}\n"

    # [29] DELETE sottocategoria test
    if [ -n "$TEST_CATEGORY_ID" ] && [ -n "$TEST_SUBCAT_NAME" ]; then
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID/sottocategorie/$TEST_SUBCAT_NAME" DELETE "" "$TOKEN" 204 "DELETE /admin/categorie/{id}/sottocategorie/{subId} (Delete Test Subcategory)"
    fi

    # [30] DELETE categoria test
    if [ -n "$TEST_CATEGORY_ID" ]; then
        run_test "$ADMIN_API/categorie/$TEST_CATEGORY_ID" DELETE "" "$TOKEN" 204 "DELETE /admin/categorie/{id} (Delete Test Category)"
    fi

    # [31] DELETE prodotto test
    if [ -n "$TEST_PROD_ID" ]; then
        run_test "$ADMIN_API/prodotti/$TEST_PROD_ID" DELETE "" "$TOKEN" 204 "DELETE /admin/prodotti/{id} (Delete Test Product)"
    fi

else
    echo -e "\n${YELLOW}--- 8. SKIPPING CLEANUP (No Auth Token) ---${NC}\n"
fi

# ============================================================================
# 9. TEST ROTTE NON ESISTENTI (Dovrebbero restituire 404)
# ============================================================================

echo -e "\n${PURPLE}--- 9. TEST ROTTE NON ESISTENTI ---${NC}\n"

# [32-35] Test rotte che non dovrebbero esistere
run_test "$PUBLIC_API/nonexistent" GET "" "" 404 "GET /public/catalogo/nonexistent (404 Not Found)"
run_test "$PUBLIC_API/prodotti/search/invalid" GET "" "" 404 "GET /public/catalogo/prodotti/search/invalid (404 Not Found)"
run_test "$API_BASE/api/invalid/endpoint" GET "" "" 404 "GET /api/invalid/endpoint (404 Not Found)"

if [ -n "$TOKEN" ]; then
    run_test "$ADMIN_API/nonexistent" GET "" "$TOKEN" 404 "GET /admin/nonexistent (404 Not Found)"
fi

# ============================================================================
# 10. RIEPILOGO FINALE
# ============================================================================

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}         RIEPILOGO TEST COMPLETATO${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "📊 ${CYAN}Totale test eseguiti:${NC} $TOTAL_TESTS"
echo -e "✅ ${GREEN}Test superati:${NC} $PASSED_TESTS"
echo -e "❌ ${RED}Test falliti:${NC} $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}TUTTI I TEST SONO STATI SUPERATI!${NC}"
    echo -e "${GREEN}L'API è completamente funzionante.${NC}"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Alcuni test sono falliti.${NC}"
    echo -e "${YELLOW}Controlla i log sopra per i dettagli.${NC}"
    echo -e "\n📋 ${CYAN}Percentuale successo: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"
    exit 1
fi