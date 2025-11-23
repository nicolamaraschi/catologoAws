const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;

// Carica il file swagger.yaml
const swaggerDocument = YAML.load(
    fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8')
);

// Configura Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Catalogo Prodotti API Docs",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true
    }
}));

// Redirect dalla root a /api-docs
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// Endpoint per scaricare il file swagger.yaml
app.get('/swagger.yaml', (req, res) => {
    res.sendFile(path.join(__dirname, 'swagger.yaml'));
});

// Endpoint per scaricare il file swagger.json
app.get('/swagger.json', (req, res) => {
    res.json(swaggerDocument);
});

app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║         📚 Documentazione API Catalogo Prodotti           ║');
    console.log('║                                                            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║                                                            ║');
    console.log(`║  🌐 Swagger UI:    http://localhost:${PORT}/api-docs          ║`);
    console.log(`║  📄 YAML:          http://localhost:${PORT}/swagger.yaml      ║`);
    console.log(`║  📋 JSON:          http://localhost:${PORT}/swagger.json      ║`);
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('💡 Premi Ctrl+C per fermare il server');
    console.log('');
});
