# ⚡ Quick Start Guide - Catalogo AWS

Deploy rapido dell'intera infrastruttura in **meno di 30 minuti**.

---

## 🚀 Deploy in 5 Step

### 1️⃣ Prerequisiti (5 min)

```bash
# Verifica installazioni
aws --version        # >= 2.0
sam --version        # >= 1.100.0
node --version       # >= 20.x

# Configura AWS
aws configure
# Region: eu-west-1
```

### 2️⃣ Deploy Backend (10 min)

```bash
# Build e deploy
sam build --use-container
sam deploy --guided

# Salva gli outputs:
# - ApiEndpoint
# - CognitoUserPoolId
# - CognitoUserPoolClientId
# - CloudFrontDomain
```

### 3️⃣ Migrazione Dati (5 min)

```bash
cd backend-lambda
npm install

# Configura MongoDB URI
export MONGO_URI="mongodb+srv://YOUR_URI"
export PRODUCTS_TABLE="catalogo-aws-prod-Products"

# Migra dati
npm run migrate
```

### 4️⃣ Deploy Frontend Utente (5 min)

1. Vai su [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. **New app** → **Host web app** → Seleziona repo GitHub
3. Branch: `claude/mongodb-atlas-jwt-setup-01ERW7MkJt1cA8RvE6t2qbDJ`
4. Root directory: `frontend-catalogo-utente`
5. **Environment variables**:
   ```
   REACT_APP_API_BASE_URL=https://YOUR_API/production/api/public/catalogo
   REACT_APP_CLOUDFRONT_URL=https://YOUR_CLOUDFRONT_DOMAIN
   ```
6. **Save and deploy**

### 5️⃣ Deploy Frontend Admin (5 min)

Stesso processo del frontend utente, ma:

1. Root directory: `frontend-catalogo-admin`
2. **Environment variables**:
   ```
   REACT_APP_COGNITO_REGION=eu-west-1
   REACT_APP_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
   REACT_APP_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
   REACT_APP_API_BASE_URL=https://YOUR_API/production/api/admin
   ```

3. **Prima del build**, aggiorna `App.js`:
   ```bash
   cd frontend-catalogo-admin
   mv src/App.js src/App-old.js
   mv src/App-cognito.js src/App.js
   npm install aws-amplify @aws-amplify/ui-react
   ```

---

## 🎯 Crea Utente Admin

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com Name=email_verified,Value=true \
  --temporary-password TempPass123!
```

---

## ✅ Verifica Deployment

### Test API Pubbliche

```bash
# Sostituisci YOUR_API_ENDPOINT con il valore da CloudFormation outputs
curl https://YOUR_API_ENDPOINT/production/api/public/catalogo/prodotti
```

**Output atteso:**
```json
{
  "success": true,
  "data": [...],
  "metadata": { "count": 50 }
}
```

### Test Frontend

- **Catalogo Utente**: `https://main.xxxxxx.amplifyapp.com`
- **Admin Panel**: `https://main.yyyyyy.amplifyapp.com`

---

## 🔧 Comandi Utili

```bash
# Rebuild e redeploy backend
sam build && sam deploy

# Visualizzare logs Lambda
aws logs tail /aws/lambda/catalogo-aws-prod-GetProducts --follow

# Eliminare stack completo
aws cloudformation delete-stack --stack-name catalogo-aws-prod
```

---

## 📊 Monitoring

Dashboard CloudWatch: [Console](https://console.aws.amazon.com/cloudwatch/)

- **Lambda**: Invocations, Duration, Errors
- **API Gateway**: Request count, 4xx/5xx errors
- **DynamoDB**: Read/Write capacity

---

## ❌ Troubleshooting Rapido

| Problema | Soluzione |
|----------|-----------|
| CORS errors | Verifica `AllowOrigin` in API Gateway |
| 401 Unauthorized | Verifica Cognito token in header Authorization |
| Lambda timeout | Aumenta `Timeout` in template.yaml a 30s |
| DynamoDB throttle | Passa da On-Demand a Provisioned |

---

## 💡 Tips

- **Free Tier**: Primi 12 mesi quasi tutto gratis
- **Costi**: ~$3-5/mese dopo free tier (per 100k req/mese)
- **Backup**: DynamoDB Point-in-Time Recovery abilitato
- **Security**: MFA su Cognito consigliato

---

**Fatto! 🎉**

La tua applicazione è live e scalabile su AWS!

Per documentazione completa: vedi `README-AWS-DEPLOYMENT.md`
