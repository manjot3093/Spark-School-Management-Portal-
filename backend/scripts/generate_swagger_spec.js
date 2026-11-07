const fs = require('fs');
const path = require('path');

const endpoints = require('../scripts/discovered_endpoints.json');

// OpenAPI 3.0 base specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Master Portal / Spark ERP Backend API',
    version: '1.0.0',
    description: 'Comprehensive OpenAPI 3.0 documentation for all backend routes of Spark ERP Multi-School Management System.',
    contact: {
      name: 'Backend QA & Engineering Team',
      email: 'admin@masterportal.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    },
    {
      url: 'https://api.sparkerp.com',
      description: 'Production Server'
    }
  ],
  tags: [
    { name: 'Authentication APIs', description: 'User login, registration, password management, profile & tokens' },
    { name: 'User Management APIs', description: 'User accounts, teachers, students, parents, staff directory' },
    { name: 'Company Management APIs', description: 'Schools, classes, sections, houses, academic settings' },
    { name: 'Financial APIs', description: 'Billing, fee categories, fee structures, collections, receipts, salaries, invoices, payments, e-commerce cart/orders' },
    { name: 'CRUD APIs', description: 'Library books, borrowings, inventory items, transport routes, vehicles, drivers' },
    { name: 'Business Logic APIs', description: 'Student & teacher attendance, exams, quizzes, syllabus, assignments, schedules, announcements, messages, doubts, notes' },
    { name: 'File Upload and Download APIs', description: 'Document, avatar, photo, and media file uploads & Cloudinary integration' },
    { name: 'Admin APIs', description: 'Administrative quizzes, analytics, system maintenance, and bulk operations' },
    { name: 'System / Health APIs', description: 'Root health check, uptime, CORS validation' },
    { name: 'Other APIs', description: 'Admissions, dormitories, student transport mappings, AI assistant, promo codes, ads' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token generated via `/api/auth/login`'
      }
    },
    schemas: {
      GenericResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Error message description' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', example: 'admin@masterportal.com' },
          password: { type: 'string', example: 'admin123' }
        }
      }
    }
  },
  paths: {}
};

// Map each endpoint
for (const ep of endpoints) {
  // Convert express path '/api/users/:id' -> '/api/users/{id}'
  const paramNames = [];
  const openApiPath = ep.path.replace(/:([a-zA-Z0-9_]+)/g, (match, paramName) => {
    paramNames.push(paramName);
    return `{${paramName}}`;
  });

  if (!openApiSpec.paths[openApiPath]) {
    openApiSpec.paths[openApiPath] = {};
  }

  const method = ep.method.toLowerCase();
  
  // Tag categorization
  let tag = ep.category;
  if (!tag) tag = 'Other APIs';

  // Build parameters
  const parameters = paramNames.map(paramName => ({
    name: paramName,
    in: 'path',
    required: true,
    description: `Parameter ${paramName}`,
    schema: {
      type: 'string'
    }
  }));

  // Build operation
  const operation = {
    tags: [tag],
    summary: `${ep.method} ${ep.path}`,
    description: ep.description || `Handler from ${ep.sourceFile || 'routes'}. Middleware stack: [${(ep.stack || []).join(', ')}]`,
    parameters: parameters.length ? parameters : undefined,
    responses: {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/GenericResponse'
            }
          }
        }
      },
      '400': {
        description: 'Validation Error / Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      '401': {
        description: 'Unauthorized - Missing or invalid JWT'
      },
      '403': {
        description: 'Forbidden - Insufficient privileges'
      },
      '404': {
        description: 'Resource not found'
      },
      '500': {
        description: 'Internal Server Error'
      }
    }
  };

  // Add security if protected
  if (ep.auth && ep.auth.includes('JWT')) {
    operation.security = [{ bearerAuth: [] }];
  }

  // Add request body for POST/PUT/PATCH
  if (['post', 'put', 'patch'].includes(method)) {
    if (openApiPath === '/api/auth/login') {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginRequest'
            }
          }
        }
      };
    } else {
      operation.requestBody = {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      };
    }
  }

  openApiSpec.paths[openApiPath][method] = operation;
}

const outputPath = path.join(__dirname, '../config/swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));

console.log(`Successfully generated Swagger OpenAPI 3.0 specification at: ${outputPath}`);
console.log(`Total documented paths: ${Object.keys(openApiSpec.paths).length}`);
