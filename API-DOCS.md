# Documentazione API - Catalogo Prodotti

Questa directory contiene la documentazione completa delle API del catalogo prodotti in formato OpenAPI 3.0 (Swagger).

## 📄 File

- **`swagger.yaml`**: Specifica OpenAPI completa di tutte le API

## 🔍 Visualizzare la Documentazione

Ci sono diversi modi per visualizzare e interagire con la documentazione Swagger:

### Opzione 1: Swagger Editor Online (Più Semplice)

1. Vai su [Swagger Editor](https://editor.swagger.io/)
2. Copia il contenuto di `swagger.yaml`
3. Incollalo nell'editor
4. Vedrai la documentazione formattata sulla destra

### Opzione 2: Swagger UI Locale con Docker

```bash
# Dalla root del progetto
docker run -p 8080:8080 -e SWAGGER_JSON=/swagger.yaml -v $(pwd)/swagger.yaml:/swagger.yaml swaggerapi/swagger-ui
```

Poi apri: http://localhost:8080

### Opzione 3: Swagger UI con Node.js

```bash
# Installa swagger-ui-express
npm install -g swagger-ui-express express js-yaml

# Crea un file server.js
cat > swagger-server.js << 'EOF'
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');

const app = express();
const swaggerDocument = YAML.load(fs.readFileSync('./swagger.yaml', 'utf8'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(3002, () => {
  console.log('Swagger UI disponibile su http://localhost:3002/api-docs');
});
EOF

# Avvia il server
node swagger-server.js
```

Poi apri: http://localhost:3002/api-docs

### Opzione 4: VS Code Extension

1. Installa l'estensione "OpenAPI (Swagger) Editor" in VS Code
2. Apri il file `swagger.yaml`
3. Usa il comando "OpenAPI: Show Preview" (Ctrl+Shift+P)

## 📚 Struttura della Documentazione

La documentazione è organizzata in sezioni:

### 🌐 API Pubbliche (Nessuna autenticazione richiesta)

#### Prodotti
- `GET /api/public/catalogo/prodotti` - Lista tutti i prodotti
- `GET /api/public/catalogo/prodotti/{productId}` - Dettagli prodotto
- `GET /api/public/catalogo/categoria/{categoria}` - Prodotti per categoria
- `GET /api/public/catalogo/categoria/{categoria}/sottocategoria/{sottocategoria}` - Prodotti per categoria e sottocategoria

#### Categorie
- `GET /api/public/catalogo/categorie` - Lista tutte le categorie
- `GET /api/public/catalogo/categorie/{categoryId}` - Dettagli categoria
- `GET /api/public/catalogo/sottocategorie` - Lista tutte le sottocategorie
- `GET /api/public/catalogo/categoria/{categoria}/sottocategorie` - Sottocategorie per categoria

### 🔐 API Admin (Autenticazione AWS Cognito richiesta)

#### Prodotti
- `GET /api/admin/prodotti` - Lista prodotti (admin)
- `POST /api/admin/prodotti` - Crea prodotto
- `GET /api/admin/prodotti/{productId}` - Dettagli prodotto (admin)
- `PUT /api/admin/prodotti/{productId}` - Aggiorna prodotto
- `DELETE /api/admin/prodotti/{productId}` - Elimina prodotto

#### Categorie
- `GET /api/admin/categorie` - Lista categorie (admin)
- `POST /api/admin/categorie` - Crea categoria
- `PUT /api/admin/categorie/{categoria}` - Aggiorna categoria
- `DELETE /api/admin/categorie/{categoria}` - Elimina categoria
- `GET /api/admin/categorie/{categoria}/sottocategorie` - Lista sottocategorie (admin)
- `POST /api/admin/categorie/{categoria}/sottocategorie` - Crea sottocategoria
- `PUT /api/admin/categorie/{categoria}/sottocategorie/{sottocategoria}` - Aggiorna sottocategoria
- `DELETE /api/admin/categorie/{categoria}/sottocategorie/{sottocategoria}` - Elimina sottocategoria

#### Upload
- `POST /api/admin/upload/presigned-url` - Genera URL pre-firmato per upload immagini

## 🔑 Autenticazione

Le API admin richiedono un token JWT di AWS Cognito nel header:

```
Authorization: Bearer <your-jwt-token>
```

Per ottenere un token:
1. Effettua il login tramite l'interfaccia admin
2. Il token viene salvato automaticamente nel localStorage
3. Tutte le richieste admin includono automaticamente il token

## 📊 Struttura Dati

### Campi Multilingua

Molti campi (nome, categoria, descrizione, ecc.) sono oggetti multilingua con questa struttura:

```json
{
  "it": "Testo in italiano",
  "en": "Text in English",
  "de": "Text auf Deutsch",
  "fr": "Texte en français",
  "es": "Texto en español"
}
```

### Esempio Prodotto Completo

```json
{
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
    "en": "Liquid",
    "de": "Flüssig",
    "fr": "Liquide",
    "es": "Líquido"
  },
  "categoria": {
    "it": "Domestico",
    "en": "Domestic",
    "de": "Haushalt",
    "fr": "Domestique",
    "es": "Doméstico"
  },
  "categoriaIt": "Domestico",
  "sottocategoria": {
    "it": "Detergenti",
    "en": "Cleaners",
    "de": "Reiniger",
    "fr": "Nettoyants",
    "es": "Limpiadores"
  },
  "sottocategoriaIt": "Detergenti",
  "descrizione": {
    "it": "Detergente universale per tutte le superfici",
    "en": "Universal cleaner for all surfaces",
    "de": "Universalreiniger für alle Oberflächen",
    "fr": "Nettoyant universel pour toutes les surfaces",
    "es": "Limpiador universal para todas las superficies"
  },
  "prezzo": 12.50,
  "unita": "pz",
  "tipoImballaggio": "Cartone",
  "pezziPerCartone": 12,
  "cartoniPerEpal": 48,
  "pezziPerEpal": 576,
  "immagini": [
    "https://cdn.example.com/image1.jpg",
    "https://cdn.example.com/image2.jpg"
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:45:00Z"
}
```

## 🧪 Testare le API

### Con cURL

```bash
# Esempio: Ottenere tutti i prodotti
curl -X GET "https://your-api-gateway-url/api/public/catalogo/prodotti" \
  -H "Accept: application/json"

# Esempio: Ottenere un prodotto specifico
curl -X GET "https://your-api-gateway-url/api/public/catalogo/prodotti/284d2c2e-0c5d-44cb-a39d-66c4196dd0a4" \
  -H "Accept: application/json"

# Esempio: Creare un prodotto (admin)
curl -X POST "https://your-api-gateway-url/api/admin/prodotti" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codice": "PROD-002",
    "nome": {
      "it": "Nuovo Prodotto",
      "en": "New Product"
    },
    "categoria": {
      "it": "Domestico",
      "en": "Domestic"
    },
    "prezzo": 15.99
  }'
```

### Con Postman

1. Importa il file `swagger.yaml` in Postman
2. Postman creerà automaticamente una collection con tutte le API
3. Configura le variabili d'ambiente (base URL, token, ecc.)
4. Testa le API

## 🔄 Aggiornare la Documentazione

Quando aggiungi o modifichi un'API:

1. Aggiorna il file `swagger.yaml`
2. Verifica la validità con [Swagger Validator](https://validator.swagger.io/)
3. Committa le modifiche

## 📝 Note Importanti

- **Paginazione**: Le API che restituiscono liste supportano la paginazione tramite i parametri `limit` e `lastKey`
- **Encoding URL**: I parametri URL con caratteri speciali devono essere URL-encoded
- **CORS**: Le API supportano CORS per permettere chiamate da domini diversi
- **Rate Limiting**: Non ci sono limiti di rate al momento, ma potrebbero essere aggiunti in futuro

## 🆘 Supporto

Per problemi o domande sulla documentazione API:
- Apri un issue nel repository
- Contatta il team di sviluppo

## 📜 Licenza

Questa documentazione è parte del progetto Catalogo Prodotti.
