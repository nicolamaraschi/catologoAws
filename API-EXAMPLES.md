# Esempi di Chiamate API - Catalogo Prodotti

Questa guida fornisce esempi pratici per testare tutte le API del catalogo.

## 🔧 Setup Iniziale

### Variabili d'Ambiente

Configura queste variabili nel tuo client HTTP (Postman, Insomnia, ecc.):

```
BASE_URL=https://your-api-gateway-url.execute-api.eu-west-1.amazonaws.com/production
# oppure per sviluppo locale:
BASE_URL=http://localhost:3001

JWT_TOKEN=your-cognito-jwt-token-here
```

## 📚 API Pubbliche - Prodotti

### 1. Ottenere Tutti i Prodotti

```bash
GET {{BASE_URL}}/api/public/catalogo/prodotti
```

**Con paginazione:**
```bash
GET {{BASE_URL}}/api/public/catalogo/prodotti?limit=20
```

**Risposta di esempio:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "284d2c2e-0c5d-44cb-a39d-66c4196dd0a4",
      "codice": "PROD-001",
      "nome": {
        "it": "Detergente Universale",
        "en": "Universal Cleaner"
      },
      "prezzo": 12.50,
      "categoria": {
        "it": "Domestico",
        "en": "Domestic"
      }
    }
  ],
  "metadata": {
    "count": 20,
    "hasMore": true,
    "nextKey": "encoded-pagination-key"
  }
}
```

### 2. Ottenere un Prodotto Specifico

```bash
GET {{BASE_URL}}/api/public/catalogo/prodotti/284d2c2e-0c5d-44cb-a39d-66c4196dd0a4
```

**Risposta di esempio:**
```json
{
  "success": true,
  "data": {
    "productId": "284d2c2e-0c5d-44cb-a39d-66c4196dd0a4",
    "codice": "PROD-001",
    "nome": {
      "it": "Detergente Universale",
      "en": "Universal Cleaner",
      "de": "Universalreiniger",
      "fr": "Nettoyant Universel",
      "es": "Limpiador Universal"
    },
    "tipo": {
      "it": "Liquido",
      "en": "Liquid"
    },
    "categoria": {
      "it": "Domestico",
      "en": "Domestic"
    },
    "categoriaIt": "Domestico",
    "sottocategoria": {
      "it": "Detergenti",
      "en": "Cleaners"
    },
    "descrizione": {
      "it": "Detergente universale per tutte le superfici",
      "en": "Universal cleaner for all surfaces"
    },
    "prezzo": 12.50,
    "unita": "pz",
    "tipoImballaggio": "Cartone",
    "pezziPerCartone": 12,
    "cartoniPerEpal": 48,
    "pezziPerEpal": 576,
    "immagini": [
      "https://cdn.example.com/image1.jpg"
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-20T14:45:00Z"
  }
}
```

### 3. Ottenere Prodotti per Categoria

```bash
GET {{BASE_URL}}/api/public/catalogo/categoria/Domestico
```

**Con caratteri speciali (URL encoding):**
```bash
GET {{BASE_URL}}/api/public/catalogo/categoria/Igiene%20Personale
```

### 4. Ottenere Prodotti per Categoria e Sottocategoria

```bash
GET {{BASE_URL}}/api/public/catalogo/categoria/Domestico/sottocategoria/Detergenti
```

## 📁 API Pubbliche - Categorie

### 5. Ottenere Tutte le Categorie

```bash
GET {{BASE_URL}}/api/public/catalogo/categorie
```

**Risposta di esempio:**
```json
{
  "success": true,
  "data": [
    {
      "it": "Domestico",
      "en": "Domestic",
      "de": "Haushalt",
      "fr": "Domestique",
      "es": "Doméstico"
    },
    {
      "it": "Industriale",
      "en": "Industrial",
      "de": "Industriell",
      "fr": "Industriel",
      "es": "Industrial"
    }
  ]
}
```

### 6. Ottenere una Categoria Specifica

```bash
GET {{BASE_URL}}/api/public/catalogo/categorie/Domestico
```

### 7. Ottenere Tutte le Sottocategorie

```bash
GET {{BASE_URL}}/api/public/catalogo/sottocategorie
```

### 8. Ottenere Sottocategorie per Categoria

```bash
GET {{BASE_URL}}/api/public/catalogo/categoria/Domestico/sottocategorie
```

## 🔐 API Admin - Prodotti

**Nota:** Tutte le richieste admin richiedono l'header di autenticazione:
```
Authorization: Bearer {{JWT_TOKEN}}
```

### 9. Creare un Nuovo Prodotto

```bash
POST {{BASE_URL}}/api/admin/prodotti
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "codice": "PROD-NEW-001",
  "nome": {
    "it": "Nuovo Detergente",
    "en": "New Cleaner"
  },
  "tipo": {
    "it": "Liquido",
    "en": "Liquid"
  },
  "categoria": {
    "it": "Domestico",
    "en": "Domestic"
  },
  "sottocategoria": {
    "it": "Detergenti",
    "en": "Cleaners"
  },
  "descrizione": {
    "it": "Descrizione del nuovo prodotto",
    "en": "Description of the new product"
  },
  "prezzo": 15.99,
  "unita": "pz",
  "tipoImballaggio": "Cartone",
  "pezziPerCartone": 12,
  "cartoniPerEpal": 48,
  "immagini": [
    "https://cdn.example.com/new-product.jpg"
  ]
}
```

**Risposta di esempio:**
```json
{
  "success": true,
  "data": {
    "productId": "new-generated-uuid",
    "codice": "PROD-NEW-001",
    "nome": {
      "it": "Nuovo Detergente",
      "en": "New Cleaner"
    },
    "pezziPerEpal": 576,
    "createdAt": "2025-01-23T20:00:00Z",
    "updatedAt": "2025-01-23T20:00:00Z"
  }
}
```

### 10. Aggiornare un Prodotto

```bash
PUT {{BASE_URL}}/api/admin/prodotti/284d2c2e-0c5d-44cb-a39d-66c4196dd0a4
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "prezzo": 13.99,
  "descrizione": {
    "it": "Descrizione aggiornata",
    "en": "Updated description"
  }
}
```

**Nota:** Puoi aggiornare solo i campi che vuoi modificare, non serve inviare tutto il prodotto.

### 11. Eliminare un Prodotto

```bash
DELETE {{BASE_URL}}/api/admin/prodotti/284d2c2e-0c5d-44cb-a39d-66c4196dd0a4
Authorization: Bearer {{JWT_TOKEN}}
```

**Risposta di esempio:**
```json
{
  "success": true,
  "data": {
    "message": "Product deleted successfully"
  }
}
```

## 🗂️ API Admin - Categorie

### 12. Creare una Nuova Categoria

```bash
POST {{BASE_URL}}/api/admin/categorie
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "categoryName": "NuovaCategoria",
  "translations": {
    "it": "Nuova Categoria",
    "en": "New Category",
    "de": "Neue Kategorie",
    "fr": "Nouvelle Catégorie",
    "es": "Nueva Categoría"
  }
}
```

### 13. Aggiornare una Categoria

```bash
PUT {{BASE_URL}}/api/admin/categorie/Domestico
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "translations": {
    "it": "Domestico Aggiornato",
    "en": "Updated Domestic",
    "de": "Aktualisierter Haushalt",
    "fr": "Domestique Mis à Jour",
    "es": "Doméstico Actualizado"
  }
}
```

### 14. Eliminare una Categoria

```bash
DELETE {{BASE_URL}}/api/admin/categorie/VecchiaCategoria
Authorization: Bearer {{JWT_TOKEN}}
```

**Nota:** Questo eliminerà anche tutte le sottocategorie associate.

### 15. Aggiungere una Sottocategoria

```bash
POST {{BASE_URL}}/api/admin/categorie/Domestico/sottocategorie
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "subcategoryName": "NuovaSottocategoria",
  "translations": {
    "it": "Nuova Sottocategoria",
    "en": "New Subcategory",
    "de": "Neue Unterkategorie",
    "fr": "Nouvelle Sous-catégorie",
    "es": "Nueva Subcategoría"
  }
}
```

### 16. Aggiornare una Sottocategoria

```bash
PUT {{BASE_URL}}/api/admin/categorie/Domestico/sottocategorie/Detergenti
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "translations": {
    "it": "Detergenti Aggiornati",
    "en": "Updated Cleaners"
  }
}
```

### 17. Eliminare una Sottocategoria

```bash
DELETE {{BASE_URL}}/api/admin/categorie/Domestico/sottocategorie/VecchiaSottocategoria
Authorization: Bearer {{JWT_TOKEN}}
```

## 📤 API Admin - Upload Immagini

### 18. Ottenere URL Pre-firmato per Upload

**Step 1: Richiedere l'URL pre-firmato**

```bash
POST {{BASE_URL}}/api/admin/upload/presigned-url
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "fileName": "product-image-001.jpg",
  "fileType": "image/jpeg"
}
```

**Risposta:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/path?presigned-params",
    "fileUrl": "https://cdn.example.com/products/product-image-001.jpg",
    "key": "products/product-image-001.jpg"
  }
}
```

**Step 2: Caricare il file su S3**

```bash
PUT https://s3.amazonaws.com/bucket/path?presigned-params
Content-Type: image/jpeg
Body: [binary file data]
```

**Step 3: Usare il fileUrl nel prodotto**

Usa il `fileUrl` restituito quando crei o aggiorni un prodotto:

```bash
PUT {{BASE_URL}}/api/admin/prodotti/product-id
Content-Type: application/json
Authorization: Bearer {{JWT_TOKEN}}

{
  "immagini": [
    "https://cdn.example.com/products/product-image-001.jpg"
  ]
}
```

## 🧪 Testing con cURL

### Esempio Completo: Creare un Prodotto

```bash
curl -X POST "https://your-api-gateway-url/api/admin/prodotti" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codice": "TEST-001",
    "nome": {
      "it": "Prodotto Test",
      "en": "Test Product"
    },
    "categoria": {
      "it": "Domestico",
      "en": "Domestic"
    },
    "prezzo": 9.99
  }'
```

### Esempio: Ottenere Prodotti con jq (parsing JSON)

```bash
curl -s "https://your-api-gateway-url/api/public/catalogo/prodotti" | jq '.data[] | {codice, nome: .nome.it, prezzo}'
```

## 📝 Note Importanti

### Encoding URL
Quando usi parametri URL con caratteri speciali, assicurati di fare l'encoding:
- Spazio → `%20`
- À → `%C3%80`
- È → `%C3%88`

### Gestione Errori

Tutte le API restituiscono errori in questo formato:

```json
{
  "success": false,
  "error": {
    "message": "Descrizione dell'errore",
    "code": "ERROR_CODE"
  }
}
```

Codici di stato HTTP comuni:
- `200` - Successo
- `201` - Creato
- `400` - Richiesta non valida
- `401` - Non autenticato
- `404` - Risorsa non trovata
- `409` - Conflitto (es. codice prodotto duplicato)
- `500` - Errore interno del server

### Paginazione

Per le liste con molti elementi, usa la paginazione:

```bash
# Prima pagina
GET /api/public/catalogo/prodotti?limit=20

# Pagina successiva (usa il nextKey dalla risposta precedente)
GET /api/public/catalogo/prodotti?limit=20&lastKey=ENCODED_KEY
```

## 🔍 Debugging

### Verificare il Token JWT

```bash
# Decodifica il token (senza verificare la firma)
echo "YOUR_JWT_TOKEN" | cut -d'.' -f2 | base64 -d | jq
```

### Testare la Connettività

```bash
# Verifica che l'API sia raggiungibile
curl -I https://your-api-gateway-url/api/public/catalogo/prodotti
```

### Verbose Mode con cURL

```bash
# Mostra tutti i dettagli della richiesta/risposta
curl -v https://your-api-gateway-url/api/public/catalogo/prodotti
```
