#!/bin/bash

# ============================================================================
# Test API - Catalogo AWS
# ============================================================================

set -e

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurazione
API_BASE="https://nnk37tr17e.execute-api.eu-west-1.amazonaws.com/production"
PUBLIC_API="$API_BASE/api/public/catalogo"
ADMIN_API="$API_BASE/api/admin"
COGNITO_REGION="eu-west-1"
COGNITO_CLIENT_ID="4t90j2ijprchem651sn6imhlpc"
EMAIL="nicola.maraschi01@gmail.com"
PASSWORD="Marase01!"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST API - CATALOGO AWS${NC}"
echo -e "${BLUE}============================================${NC}\n"

# ============================================================================
# 1. TEST API PUBBLICHE (No Auth)
# ============================================================================

echo -e "${YELLOW}[1/7]${NC} Test GET /api/public/catalogo/prodotti"
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" "$PUBLIC_API/prodotti")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - OK"
    cat /tmp/response.json | jq '.metadata.count' 2>/dev/null || cat /tmp/response.json
else
    echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
    cat /tmp/response.json
fi
echo ""

echo -e "${YELLOW}[2/7]${NC} Test GET /api/public/catalogo/categorie"
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" "$PUBLIC_API/categorie")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - OK"
    cat /tmp/response.json | jq '.data | length' 2>/dev/null || cat /tmp/response.json
else
    echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
    cat /tmp/response.json
fi
echo ""

# ============================================================================
# 2. LOGIN COGNITO
# ============================================================================

echo -e "${YELLOW}[3/7]${NC} Login Cognito..."
LOGIN_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id "$COGNITO_CLIENT_ID" \
  --auth-parameters USERNAME="$EMAIL",PASSWORD="$PASSWORD" \
  --region "$COGNITO_REGION" \
  --profile personale \
  --output json 2>/dev/null)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.AuthenticationResult.IdToken // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓${NC} Login successful"
    echo "Token: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗${NC} Login FAILED"
    echo "$LOGIN_RESPONSE"
    exit 1
fi
echo ""

# ============================================================================
# 3. TEST API ADMIN (Con Token)
# ============================================================================

echo -e "${YELLOW}[4/7]${NC} Test GET /api/admin/prodotti (con auth)"
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$ADMIN_API/prodotti")
if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - OK"
    cat /tmp/response.json | jq '.metadata.count' 2>/dev/null || cat /tmp/response.json
else
    echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
    cat /tmp/response.json
fi
echo ""

echo -e "${YELLOW}[5/7]${NC} Test POST /api/admin/prodotti (crea prodotto test)"
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": {
      "it": "Prodotto Test",
      "en": "Test Product",
      "fr": "Produit Test",
      "es": "Producto Test",
      "de": "Test Produkt"
    },
    "codice": "TEST'$(date +%s)'",
    "tipo": "Test",
    "prezzo": 99.99,
    "unita": "€/PZ",
    "categoria": {
      "it": "Domestico",
      "en": "Domestic",
      "fr": "Domestique",
      "es": "Doméstico",
      "de": "Häuslich"
    },
    "sottocategoria": {
      "it": "Test",
      "en": "Test",
      "fr": "Test",
      "es": "Test",
      "de": "Test"
    },
    "tipoImballaggio": "Sacco 10kg"
  }' \
  "$ADMIN_API/prodotti")

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - CREATED"
    PRODUCT_ID=$(cat /tmp/response.json | jq -r '.data.productId')
    echo "Product ID: $PRODUCT_ID"
    cat /tmp/response.json | jq '.data' 2>/dev/null || cat /tmp/response.json
else
    echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
    cat /tmp/response.json
    PRODUCT_ID=""
fi
echo ""

# ============================================================================
# 4. TEST UPDATE & DELETE
# ============================================================================

if [ -n "$PRODUCT_ID" ]; then
    echo -e "${YELLOW}[6/7]${NC} Test PUT /api/admin/prodotti/$PRODUCT_ID (update)"
    HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
      -X PUT \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "prezzo": 149.99,
        "descrizione": {
          "it": "Prodotto aggiornato",
          "en": "Updated product",
          "fr": "Produit mis à jour",
          "es": "Producto actualizado",
          "de": "Aktualisiertes Produkt"
        }
      }' \
      "$ADMIN_API/prodotti/$PRODUCT_ID")
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - UPDATED"
        cat /tmp/response.json | jq '.data.prezzo' 2>/dev/null || cat /tmp/response.json
    else
        echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
        cat /tmp/response.json
    fi
    echo ""
    
    echo -e "${YELLOW}[7/7]${NC} Test DELETE /api/admin/prodotti/$PRODUCT_ID"
    HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
      -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$ADMIN_API/prodotti/$PRODUCT_ID")
    
    if [ "$HTTP_CODE" -eq 204 ]; then
        echo -e "${GREEN}✓${NC} HTTP $HTTP_CODE - DELETED"
    else
        echo -e "${RED}✗${NC} HTTP $HTTP_CODE - FAILED"
        cat /tmp/response.json
    fi
else
    echo -e "${YELLOW}[6/7]${NC} Skipped UPDATE (no product created)"
    echo -e "${YELLOW}[7/7]${NC} Skipped DELETE (no product created)"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  TEST COMPLETATO${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "API Base: $API_BASE"
echo "Email: $EMAIL"
echo ""
echo "Per test manuali:"
echo "  export TOKEN=$TOKEN"
echo ""
echo "Esempio cURL con auth:"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" $ADMIN_API/prodotti"