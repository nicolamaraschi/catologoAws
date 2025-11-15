# Backend Lambda - Catalogo AWS

Backend serverless per l'applicazione Catalogo, deployato su AWS Lambda con API Gateway.

## 📁 Struttura

```
backend-lambda/
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── public/         # Public APIs (no auth)
│   │   │   ├── getProducts.js
│   │   │   ├── getProductById.js
│   │   │   ├── getCategories.js
│   │   │   └── getProductsByCategory.js
│   │   ├── admin/          # Admin APIs (Cognito auth)
│   │   │   ├── createProduct.js
│   │   │   ├── updateProduct.js
│   │   │   └── deleteProduct.js
│   │   └── upload/         # Upload APIs
│   │       └── getPresignedUrl.js
│   ├── layers/             # Shared code layer
│   │   └── common/
│   │       ├── utils/      # Utilities (response, error, validation, retry)
│   │       └── services/   # Services (DynamoDB, S3)
│   ├── schemas/            # Data schemas
│   └── config/             # Configuration
├── scripts/
│   └── migrate-mongodb-to-dynamodb.js
└── package.json
```

## 🚀 Sviluppo Locale

### Prerequisiti

```bash
node --version  # >= 20.x
npm --version   # >= 10.x
sam --version   # >= 1.100.0
```

### Setup

```bash
# Installare dipendenze
npm install

# Configurare environment variables
cp .env.example .env
nano .env
```

### Testing Locale

```bash
# Start API locale (con SAM)
sam local start-api

# Test Lambda function locale
sam local invoke GetProductsFunction -e events/get-products.json
```

### Unit Testing

```bash
# Eseguire test
npm test

# Coverage
npm run test:coverage
```

## 📦 Deploy

### Build

```bash
# Da root del progetto
sam build --use-container
```

### Deploy

```bash
sam deploy --guided
```

## 🔧 Utilities

### Response Format

Tutte le Lambda usano formato standardizzato:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "metadata": { "count": 10 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Handling

- **Retry con exponential backoff** per errori transienti
- **Dead Letter Queue** per errori permanenti
- **Circuit breaker** per proteggere downstream services

### Validation

Input validation con **Joi**:

```javascript
const { validateProductCreation } = require('./layers/common/utils/validation');

const validatedData = validateProductCreation(body);
```

## 🗄️ DynamoDB Schema

### Products Table

```javascript
{
  productId: "uuid",           // Primary Key
  codice: "ABC123",            // GSI (Unique)
  categoriaIt: "Domestico",    // GSI
  nome: {
    it: "Nome",
    en: "Name",
    fr: "Nom",
    es: "Nombre",
    de: "Name"
  },
  prezzo: 10.50,
  unita: "€/PZ",
  tipoImballaggio: "Sacco 10kg",
  pezziPerCartone: 10,
  cartoniPerEpal: 50,
  pezziPerEpal: 500,          // Calculated
  immagini: ["s3://url1", "s3://url2"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Global Secondary Indexes

- **CodiceIndex**: Query by product code
- **CategoryIndex**: Query by category

## 🔐 Security

### Cognito Authorization

Admin APIs richiedono Cognito JWT token:

```bash
curl -H "Authorization: Bearer COGNITO_TOKEN" \
     https://api.example.com/api/admin/prodotti
```

### IAM Permissions

Lambda functions hanno IAM roles con least-privilege:

- **Public Lambdas**: DynamoDB read-only
- **Admin Lambdas**: DynamoDB read/write
- **Upload Lambdas**: S3 put object

## 📊 Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/catalogo-aws-prod-GetProducts --follow
```

### X-Ray Tracing

Tutte le Lambda hanno X-Ray abilitato per distributed tracing.

### Metrics

- **Invocations**: Numero di invocazioni
- **Duration**: Tempo di esecuzione
- **Errors**: Errori non gestiti
- **Throttles**: Richieste throttled

## 🧪 Testing

### Event Samples

Creare file `events/` per testare localmente:

**events/get-products.json:**
```json
{
  "httpMethod": "GET",
  "path": "/api/public/catalogo/prodotti",
  "queryStringParameters": {
    "limit": "10"
  }
}
```

### Integration Tests

```bash
# Test contro stack deployato
npm run test:integration
```

## 🔄 Migration Script

### Migrare da MongoDB a DynamoDB

```bash
export MONGO_URI="mongodb+srv://..."
export PRODUCTS_TABLE="catalogo-aws-prod-Products"

npm run migrate
```

### Script Features

- Batch write (25 items per batch)
- Exponential backoff
- Progress tracking
- Error handling
- Verification

## 📝 Best Practices

1. **Error Handling**: Sempre usare try-catch e logError()
2. **Validation**: Validare tutti gli input con Joi
3. **Logging**: Usare console.info/warn/error con contesto
4. **Retry**: Usare retryWithBackoff per operazioni AWS
5. **Testing**: Scrivere unit test per ogni handler

## 🆘 Troubleshooting

### Lambda Timeout

Aumentare timeout in `template.yaml`:

```yaml
Timeout: 30  # secondi
```

### Memory Issues

Aumentare memoria in `template.yaml`:

```yaml
MemorySize: 1024  # MB
```

### Cold Start

- Usare Provisioned Concurrency per funzioni critiche
- Minimizzare dimensione bundle
- Lazy-load dipendenze

## 📚 Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/best-practices.html)
