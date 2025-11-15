# 🚀 Catalogo AWS - Deployment Guide

Guida completa per il deployment dell'applicazione Catalogo su AWS con architettura **serverless** completamente gestita.

---

## 📋 Indice

1. [Architettura](#architettura)
2. [Prerequisiti](#prerequisiti)
3. [Migrazione da MongoDB a DynamoDB](#migrazione-database)
4. [Deploy Backend (Lambda + API Gateway)](#deploy-backend)
5. [Deploy Frontend Utente (Amplify)](#deploy-frontend-utente)
6. [Deploy Frontend Admin (Amplify)](#deploy-frontend-admin)
7. [Configurazione Cognito](#configurazione-cognito)
8. [Testing](#testing)
9. [Monitoraggio e Logs](#monitoraggio)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architettura

### Stack Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (AWS Amplify)                    │
├─────────────────────────────────────────────────────────────┤
│  Catalogo Utente (Pubblico)  │  Catalogo Admin (Cognito)   │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
┌────────────▼────────────────────────────▼───────────────────┐
│                  API Gateway (REST API)                      │
│  Public APIs (No Auth)  │  Admin APIs (Cognito Authorizer) │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
┌────────────▼────────────────────────────▼───────────────────┐
│                   AWS Lambda Functions                       │
│  • GetProducts  • GetProductById  • CreateProduct  • etc.   │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
┌────────────▼──────────────┐  ┌─────────▼─────────┐
│  DynamoDB (Products)      │  │  S3 (Images)      │
│  • Point-in-Time Recovery │  │  • Versioning     │
│  • GSI per categorie      │  │  • CloudFront CDN │
└───────────────────────────┘  └───────────────────┘
```

### Servizi AWS Utilizzati

| Servizio | Scopo | Caratteristiche |
|----------|-------|-----------------|
| **Lambda** | Backend serverless | Node.js 20, auto-scaling, DLQ |
| **API Gateway** | REST API | Throttling, CORS, logging |
| **DynamoDB** | Database NoSQL | On-demand, backup, streams |
| **S3** | Storage immagini | Versioning, lifecycle |
| **CloudFront** | CDN | Cache globale per immagini |
| **Cognito** | Autenticazione | User Pool per admin, MFA |
| **CloudWatch** | Monitoring | Logs, metrics, alarms |
| **Amplify** | Frontend hosting | CI/CD, custom headers |

---

## 📦 Prerequisiti

### Software Richiesto

```bash
# AWS CLI
aws --version  # >= 2.0

# AWS SAM CLI
sam --version  # >= 1.100.0

# Node.js
node --version  # >= 20.x

# npm
npm --version  # >= 10.x
```

### Installazione AWS CLI e SAM

```bash
# macOS (Homebrew)
brew install awscli aws-sam-cli

# Windows (Chocolatey)
choco install awscli aws-sam-cli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configurazione AWS

```bash
# Configurare credenziali AWS
aws configure

# Output richiesto:
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: eu-west-1
# Default output format: json
```

### Permessi IAM Richiesti

L'utente AWS deve avere i seguenti permessi:

- `IAMFullAccess`
- `AWSLambdaFullAccess`
- `AmazonDynamoDBFullAccess`
- `AmazonS3FullAccess`
- `AmazonCognitoPowerUser`
- `AmazonAPIGatewayAdministrator`
- `CloudFormationFullAccess`
- `CloudWatchFullAccess`

---

## 🔄 Migrazione Database

### Step 1: Backup MongoDB Atlas

```bash
# Esportare i dati da MongoDB (opzionale)
mongodump --uri="mongodb+srv://YOUR_MONGO_URI" --out=./mongodb-backup
```

### Step 2: Eseguire lo Script di Migrazione

Prima, assicurati di aver deployato il backend (vedi sezione successiva) per creare la tabella DynamoDB.

```bash
cd backend-lambda

# Installare dipendenze
npm install

# Configurare variabili d'ambiente
export MONGO_URI="mongodb+srv://YOUR_MONGO_URI"
export AWS_REGION="eu-west-1"
export PRODUCTS_TABLE="YourStackName-Products"

# Eseguire migrazione
npm run migrate

# Output atteso:
# ✓ Connected to MongoDB
# ✓ Fetched 150 products
# ✓ Transformed 150 products
# ✓ Migration completed successfully!
```

---

## 🚀 Deploy Backend

### Step 1: Build Lambda Layers

```bash
cd backend-lambda

# Installare dipendenze per Lambda
npm install --production
```

### Step 2: Deploy con SAM

```bash
cd ..

# Build del progetto
sam build --use-container

# Deploy interattivo (prima volta)
sam deploy --guided

# Rispondi alle domande:
# Stack Name: catalogo-aws-prod
# AWS Region: eu-west-1
# Parameter Environment: production
# Parameter AdminEmail: admin@yourdomain.com
# Confirm changes before deploy: Y
# Allow SAM CLI IAM role creation: Y
# Disable rollback: N
# Save arguments to configuration file: Y
```

### Step 3: Verificare il Deploy

```bash
# Ottenere gli outputs
aws cloudformation describe-stacks \
  --stack-name catalogo-aws-prod \
  --query 'Stacks[0].Outputs'

# Output atteso:
# - ApiEndpoint: https://xxxxx.execute-api.eu-west-1.amazonaws.com/production
# - CognitoUserPoolId: eu-west-1_XXXXXX
# - CognitoUserPoolClientId: xxxxxxxxxx
# - ImagesBucketName: catalogo-aws-prod-images-xxxx
# - CloudFrontDistributionDomain: xxxxx.cloudfront.net
```

### Step 4: Testare le API

```bash
# Test API pubblica
curl https://YOUR_API_ENDPOINT/production/api/public/catalogo/prodotti

# Output atteso:
# {
#   "success": true,
#   "data": [...],
#   "metadata": { "count": 50, "hasMore": false }
# }
```

---

## 🌐 Deploy Frontend Utente

### Step 1: Preparare le Variabili d'Ambiente

Crea file `.env` in `frontend-catalogo-utente/`:

```bash
cd frontend-catalogo-utente

# Creare .env dal template
cp .env.example .env

# Editare .env con i valori reali
nano .env
```

Contenuto `.env`:

```env
REACT_APP_API_BASE_URL=https://xxxxx.execute-api.eu-west-1.amazonaws.com/production/api/public/catalogo
REACT_APP_CLOUDFRONT_URL=https://xxxxx.cloudfront.net
```

### Step 2: Deploy su AWS Amplify

#### Opzione A: Deploy via Console AWS

1. Accedere alla [Console AWS Amplify](https://console.aws.amazon.com/amplify/)
2. Click su **"New app"** → **"Host web app"**
3. Selezionare repository GitHub/GitLab
4. Branch: `claude/mongodb-atlas-jwt-setup-01ERW7MkJt1cA8RvE6t2qbDJ`
5. App root directory: `frontend-catalogo-utente`
6. Build settings: Amplify rileverà automaticamente `amplify.yml`
7. **Environment variables**:
   - `REACT_APP_API_BASE_URL`: Valore dall'output CloudFormation
   - `REACT_APP_CLOUDFRONT_URL`: CloudFront domain
8. Click **"Save and deploy"**

#### Opzione B: Deploy via CLI

```bash
# Installare Amplify CLI
npm install -g @aws-amplify/cli

# Configurare Amplify
amplify configure

# Inizializzare progetto
amplify init

# Pubblicare
amplify publish
```

### Step 3: Verificare il Deploy

Accedere all'URL fornito da Amplify (es: `https://main.xxxxx.amplifyapp.com`)

---

## 🔒 Deploy Frontend Admin

### Step 1: Preparare le Variabili d'Ambiente

```bash
cd frontend-catalogo-admin

# Creare .env
cp .env.example .env
nano .env
```

Contenuto `.env`:

```env
REACT_APP_COGNITO_REGION=eu-west-1
REACT_APP_COGNITO_USER_POOL_ID=eu-west-1_XXXXXX
REACT_APP_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
REACT_APP_API_BASE_URL=https://xxxxx.execute-api.eu-west-1.amazonaws.com/production/api/admin
REACT_APP_CLOUDFRONT_URL=https://xxxxx.cloudfront.net
```

### Step 2: Aggiornare App.js

Rinominare `App-cognito.js` in `App.js`:

```bash
mv src/App.js src/App-old.js
mv src/App-cognito.js src/App.js
```

### Step 3: Installare Dipendenze Amplify

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### Step 4: Deploy su Amplify

Seguire gli stessi passaggi del Frontend Utente, ma con directory: `frontend-catalogo-admin`

---

## 👤 Configurazione Cognito

### Creare Primo Utente Admin

```bash
# Creare utente admin via CLI
aws cognito-idp admin-create-user \
  --user-pool-id eu-west-1_XXXXXX \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com Name=email_verified,Value=true \
  --temporary-password TempPassword123! \
  --message-action SUPPRESS

# Output:
# User created successfully
```

### Primo Login

1. Accedere al frontend admin: `https://admin.xxxxx.amplifyapp.com`
2. Inserire email e temporary password
3. Verrà richiesto di cambiare password
4. Inserire nuova password (min 8 caratteri, maiuscole, minuscole, numeri, simboli)
5. Login completato!

### Abilitare MFA (Opzionale ma Consigliato)

Nel frontend admin Amplify, l'utente può abilitare MFA da impostazioni account.

---

## ✅ Testing

### Test API Pubbliche

```bash
# Get all products
curl https://YOUR_API/production/api/public/catalogo/prodotti

# Get product by ID
curl https://YOUR_API/production/api/public/catalogo/prodotti/PRODUCT_ID

# Get categories
curl https://YOUR_API/production/api/public/catalogo/categorie

# Get products by category
curl https://YOUR_API/production/api/public/catalogo/categoria/Domestico
```

### Test API Admin (con Cognito Token)

```bash
# 1. Ottenere token Cognito (tramite frontend o CLI)
# 2. Usare token nelle richieste

curl -X POST https://YOUR_API/production/api/admin/prodotti \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": {"it": "Test", "en": "Test", "fr": "Test", "es": "Test", "de": "Test"},
    "codice": "TEST001",
    "tipo": "Test",
    "prezzo": 10,
    "unita": "€/PZ",
    "categoria": {"it": "Domestico", "en": "Domestic", "fr": "Domestique", "es": "Doméstico", "de": "Häuslich"},
    "sottocategoria": {"it": "Test", "en": "Test", "fr": "Test", "es": "Test", "de": "Test"},
    "tipoImballaggio": "Sacco 10kg"
  }'
```

---

## 📊 Monitoraggio

### CloudWatch Logs

```bash
# Visualizzare logs Lambda
aws logs tail /aws/lambda/catalogo-aws-prod-GetProducts --follow

# Visualizzare logs API Gateway
aws logs tail /aws/apigateway/catalogo-aws-prod --follow
```

### CloudWatch Metrics

Accedere alla [Console CloudWatch](https://console.aws.amazon.com/cloudwatch/):

1. **Lambda Metrics**:
   - Invocations
   - Duration
   - Errors
   - Throttles

2. **API Gateway Metrics**:
   - Count (richieste totali)
   - 4XXError
   - 5XXError
   - Latency

3. **DynamoDB Metrics**:
   - ConsumedReadCapacityUnits
   - ConsumedWriteCapacityUnits
   - UserErrors (throttling)

### Alarms Configurati

Il template SAM crea automaticamente alarms per:

- API Gateway 4xx errors > 50
- API Gateway 5xx errors > 5
- DynamoDB throttling > 10

---

## 🐛 Troubleshooting

### Lambda Cold Start Timeout

**Sintomo**: Timeout su prime richieste

**Soluzione**:
```yaml
# In template.yaml, aumentare timeout
Timeout: 30  # da 10 a 30 secondi
```

### CORS Errors

**Sintomo**: Browser blocca richieste cross-origin

**Soluzione**: Verificare che API Gateway abbia CORS abilitato:

```yaml
Cors:
  AllowOrigin: "'*'"  # O specificare domini esatti
  AllowHeaders: "'Content-Type,Authorization'"
  AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
```

### DynamoDB Throttling

**Sintomo**: Errori `ProvisionedThroughputExceededException`

**Soluzione**: DynamoDB è già in modalità On-Demand, ma se persistono:

```bash
# Verificare capacità
aws dynamodb describe-table --table-name catalogo-aws-prod-Products

# Aumentare capacità provisioned (se necessario)
```

### Cognito Token Expired

**Sintomo**: 401 Unauthorized dopo 60 minuti

**Soluzione**: Implementare refresh token automatico in frontend:

```javascript
// In apiClient.js
import { fetchAuthSession } from 'aws-amplify/auth';

apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh session
      const session = await fetchAuthSession({ forceRefresh: true });
      // Retry request with new token
    }
    return Promise.reject(error);
  }
);
```

### Immagini Non Caricate su S3

**Sintomo**: Upload immagini fallisce

**Soluzione**:

```bash
# 1. Verificare permessi S3 bucket
aws s3api get-bucket-cors --bucket YOUR_BUCKET_NAME

# 2. Verificare policy IAM Lambda
aws iam get-policy-version --policy-arn POLICY_ARN --version-id v1
```

---

## 🔐 Security Best Practices

### 1. Secrets Management

**NON** committare credenziali! Usare AWS Secrets Manager:

```bash
# Store Cloudinary credentials
aws secretsmanager create-secret \
  --name catalogo/cloudinary \
  --secret-string '{"cloud_name":"xxx","api_key":"xxx","api_secret":"xxx"}'
```

### 2. WAF per API Gateway

Abilitare AWS WAF per proteggere API Gateway:

```yaml
# In template.yaml
ApiGatewayWaf:
  Type: AWS::WAFv2::WebACL
  Properties:
    DefaultAction:
      Allow: {}
    Rules:
      - Name: RateLimitRule
        Priority: 1
        Action:
          Block: {}
        Statement:
          RateBasedStatement:
            Limit: 1000
            AggregateKeyType: IP
```

### 3. Cognito Password Policy

Già configurato nel template con:
- Minimo 8 caratteri
- Maiuscole, minuscole, numeri, simboli richiesti
- MFA opzionale

---

## 💰 Costi Stimati

### Stima Mensile (100k richieste/mese)

| Servizio | Costo Mensile |
|----------|---------------|
| Lambda (100k invocazioni) | ~$0.20 |
| API Gateway (100k richieste) | ~$0.35 |
| DynamoDB (On-Demand, 1GB) | ~$1.25 |
| S3 (10GB storage + 100k GET) | ~$0.30 |
| CloudFront (10GB transfer) | ~$0.85 |
| Cognito (1000 utenti attivi) | **Gratis** |
| Amplify (2 app hosting) | ~$0.00 (free tier) |
| **TOTALE STIMATO** | **~$3-5/mese** |

### Free Tier AWS (primo anno)

- Lambda: 1M richieste/mese gratis
- DynamoDB: 25GB storage gratis
- S3: 5GB storage gratis
- CloudFront: 50GB transfer gratis

---

## 📝 Checklist Deployment

- [ ] AWS CLI configurato
- [ ] SAM CLI installato
- [ ] Credenziali AWS configurate
- [ ] Backend deployato con `sam deploy`
- [ ] DynamoDB table creata
- [ ] Dati migrati da MongoDB
- [ ] S3 bucket creato
- [ ] CloudFront configurato
- [ ] Cognito User Pool creato
- [ ] Primo utente admin creato
- [ ] Frontend utente deployato su Amplify
- [ ] Frontend admin deployato su Amplify
- [ ] Variabili d'ambiente configurate
- [ ] Test API pubbliche OK
- [ ] Test API admin OK
- [ ] CloudWatch alarms configurati
- [ ] Domini custom configurati (opzionale)

---

## 🆘 Support

Per problemi o domande:

- Controllare CloudWatch Logs
- Verificare CloudFormation Events
- Controllare IAM Permissions
- Vedere [AWS Documentation](https://docs.aws.amazon.com/)

---

## 📚 Risorse Utili

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amazon Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**Progetto completato! 🎉**

Architettura serverless completa e fault-tolerant su AWS.
