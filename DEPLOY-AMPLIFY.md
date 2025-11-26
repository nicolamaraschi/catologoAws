# Deploy AWS Amplify - Catalogo Orsi

Guida completa per il deploy dei frontend (utente e admin) su AWS Amplify usando il profilo AWS `personale`.

## 📋 Prerequisiti

- AWS CLI installato e configurato
- Profilo AWS `personale` configurato
- Node.js e npm installati
- Repository Git (opzionale, per deploy automatico)

## 🚀 Quick Start

### 1. Verifica configurazione AWS

```bash
# Verifica profili disponibili
aws configure list-profiles

# Verifica credenziali profilo personale
aws sts get-caller-identity --profile personale
```

### 2. Esegui lo script di deploy

```bash
# Rendi eseguibile lo script
chmod +x deploy-amplify.sh

# Esegui lo script
./deploy-amplify.sh
```

### 3. Scegli l'operazione

Lo script offre un menu interattivo:
1. **Configura entrambe le app** - Setup completo di frontend utente e admin
2. **Configura solo frontend utente** - Setup del catalogo pubblico
3. **Configura solo frontend admin** - Setup del pannello amministrativo
4. **Deploy manuale** - Build locale e preparazione per upload
5. **Mostra info app** - Lista delle app Amplify esistenti
6. **Elimina app** - Rimuovi app Amplify

## 📁 Struttura File

```
schede-tecniche-sicurezza-Orsi/
├── frontend-catalogo-utente/
│   ├── amplify.yml          # Configurazione build Amplify
│   ├── .amplify-app-id      # ID app (generato automaticamente)
│   └── ...
├── frontend-catalogo-admin/
│   ├── amplify.yml          # Configurazione build Amplify
│   ├── .amplify-app-id      # ID app (generato automaticamente)
│   └── ...
└── deploy-amplify.sh        # Script di deploy
```

## ⚙️ Configurazione Manuale AWS Amplify

### Opzione A: Deploy da Repository Git (Consigliato)

1. **Crea le app Amplify**
   ```bash
   ./deploy-amplify.sh
   # Scegli opzione 1 o 2/3
   ```

2. **Collega il repository nella Console AWS**
   - Vai su [AWS Amplify Console](https://console.aws.amazon.com/amplify)
   - Seleziona l'app creata
   - Clicca "Connect branch"
   - Scegli il provider (GitHub/GitLab/Bitbucket)
   - Autorizza AWS Amplify
   - Seleziona repository e branch

3. **Configura le impostazioni di build**
   - Il file `amplify.yml` verrà rilevato automaticamente
   - Verifica le impostazioni nella sezione "Build settings"

4. **Configura le variabili d'ambiente**
   - Vai su "Environment variables"
   - Aggiungi le variabili necessarie:
     ```
     REACT_APP_API_URL=https://your-api-url.com
     REACT_APP_ENV=production
     ```

5. **Avvia il deploy**
   - Il deploy partirà automaticamente al primo commit
   - Oppure clicca "Redeploy this version"

### Opzione B: Deploy Manuale (senza Git)

1. **Build locale**
   ```bash
   # Frontend utente
   cd frontend-catalogo-utente
   npm run build
   
   # Frontend admin
   cd frontend-catalogo-admin
   npm run build
   ```

2. **Crea app Amplify manualmente**
   ```bash
   aws amplify create-app \
     --name catalogo-orsi-utente \
     --platform WEB \
     --profile personale \
     --region eu-west-1
   ```

3. **Upload tramite Console**
   - Vai su AWS Amplify Console
   - Seleziona "Deploy without Git"
   - Carica il contenuto della cartella `build/`

## 🔧 Configurazione Avanzata

### Personalizzazione amplify.yml

Il file `amplify.yml` può essere personalizzato per esigenze specifiche:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        # Aggiungi comandi pre-build personalizzati
        - echo "REACT_APP_API_URL=$API_URL" >> .env.production
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Variabili d'Ambiente per Frontend Utente

```bash
REACT_APP_API_URL=https://api.catalogo-orsi.com
REACT_APP_ENV=production
REACT_APP_ENABLE_ANALYTICS=true
```

### Variabili d'Ambiente per Frontend Admin

```bash
REACT_APP_API_URL=https://api.catalogo-orsi.com
REACT_APP_ENV=production
REACT_APP_COGNITO_USER_POOL_ID=eu-west-1_xxxxx
REACT_APP_COGNITO_CLIENT_ID=xxxxx
```

## 🌐 Domini Personalizzati

### Configurare un dominio custom

1. **Nella Console AWS Amplify**
   - Vai su "Domain management"
   - Clicca "Add domain"
   - Inserisci il tuo dominio (es. `catalogo.orsi.it`)

2. **Configura DNS**
   - Aggiungi i record CNAME forniti da Amplify
   - Esempio:
     ```
     catalogo.orsi.it     CNAME  xxxxx.amplifyapp.com
     www.catalogo.orsi.it CNAME  xxxxx.amplifyapp.com
     ```

3. **Certificato SSL**
   - Amplify gestisce automaticamente il certificato SSL
   - Attendi la verifica del dominio (può richiedere fino a 48h)

### Sottodomini suggeriti

- Frontend Utente: `catalogo.orsi.it` o `shop.orsi.it`
- Frontend Admin: `admin.catalogo.orsi.it` o `admin.orsi.it`

## 🔐 Sicurezza e Best Practices

### 1. Protezione Frontend Admin

Aggiungi autenticazione Cognito o basic auth:

```yaml
# In amplify.yml per frontend admin
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
# Abilita password protection nella console
```

### 2. Variabili d'Ambiente Sensibili

- Non committare mai file `.env` con credenziali
- Usa AWS Amplify Environment Variables
- Usa AWS Secrets Manager per dati sensibili

### 3. CORS e API Gateway

Assicurati che l'API Gateway accetti richieste dai domini Amplify:

```json
{
  "AllowOrigins": [
    "https://main.xxxxx.amplifyapp.com",
    "https://catalogo.orsi.it"
  ]
}
```

## 📊 Monitoring e Logs

### Visualizza i log di build

```bash
# Ottieni l'App ID
APP_ID=$(cat frontend-catalogo-utente/.amplify-app-id)

# Lista i job di build
aws amplify list-jobs \
  --app-id $APP_ID \
  --branch-name main \
  --profile personale \
  --region eu-west-1
```

### Metriche nella Console

- Vai su AWS Amplify Console
- Seleziona l'app
- Sezione "Monitoring" per:
  - Traffico
  - Errori
  - Performance

## 🔄 CI/CD Automatico

### Configurazione Branch

Amplify supporta deploy automatico per branch:

- `main` → Produzione
- `develop` → Staging
- `feature/*` → Preview temporanee

### Configurare Preview per PR

1. Nella Console Amplify
2. "Previews" → "Enable previews"
3. Ogni Pull Request avrà un URL di preview unico

## 🛠️ Troubleshooting

### Build fallisce

1. **Verifica i log**
   ```bash
   # Nella console Amplify, vai su "Build history"
   ```

2. **Testa build in locale**
   ```bash
   cd frontend-catalogo-utente
   npm ci
   npm run build
   ```

3. **Verifica Node version**
   - Amplify usa Node 18 di default
   - Specifica versione in `amplify.yml`:
     ```yaml
     version: 1
     frontend:
       phases:
         preBuild:
           commands:
             - nvm use 18
             - npm ci
     ```

### Variabili d'ambiente non funzionano

- Le variabili devono iniziare con `REACT_APP_`
- Riavvia il build dopo aver aggiunto variabili
- Verifica che siano nella sezione "Environment variables"

### Dominio custom non funziona

- Verifica i record DNS
- Attendi propagazione DNS (fino a 48h)
- Controlla lo stato del certificato SSL

## 📞 Comandi Utili

```bash
# Lista tutte le app Amplify
aws amplify list-apps --profile personale --region eu-west-1

# Ottieni dettagli app
aws amplify get-app --app-id <APP_ID> --profile personale --region eu-west-1

# Avvia nuovo build
aws amplify start-job \
  --app-id <APP_ID> \
  --branch-name main \
  --job-type RELEASE \
  --profile personale \
  --region eu-west-1

# Elimina app
aws amplify delete-app --app-id <APP_ID> --profile personale --region eu-west-1
```

## 💰 Costi Stimati

AWS Amplify pricing (eu-west-1):
- **Build**: $0.01 per minuto di build
- **Hosting**: $0.15 per GB servito
- **Storage**: $0.023 per GB/mese

**Stima mensile** per entrambi i frontend:
- Build (10 build/mese, 5 min ciascuno): ~$0.50
- Hosting (10 GB traffico): ~$1.50
- Storage (500 MB): ~$0.01
- **Totale**: ~$2/mese

## 📚 Risorse

- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Amplify CLI Reference](https://docs.amplify.aws/cli/)
- [AWS Amplify Pricing](https://aws.amazon.com/amplify/pricing/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

## 🎯 Checklist Deploy

- [ ] Profilo AWS `personale` configurato
- [ ] Script `deploy-amplify.sh` eseguito
- [ ] App Amplify create (utente e/o admin)
- [ ] Repository Git collegato (opzionale)
- [ ] Variabili d'ambiente configurate
- [ ] Build di test completata con successo
- [ ] Domini custom configurati (opzionale)
- [ ] SSL certificate verificato
- [ ] CORS configurato su API Gateway
- [ ] Monitoring attivato
- [ ] Backup configurato

---

**Nota**: Questo setup usa il profilo AWS `personale` per evitare conflitti con il profilo aziendale `default`.
