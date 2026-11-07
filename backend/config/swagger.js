const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const setupSwagger = (app) => {
  // Relax CSP specifically for Swagger UI
  app.use('/api-docs', (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;"
    );
    next();
  }, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Spark ERP - API Documentation',
    explorer: true
  }));

  // Raw JSON specification endpoint
  app.get('/api-docs-json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  console.log('📖 Swagger UI mounted at /api-docs');
};

module.exports = setupSwagger;
