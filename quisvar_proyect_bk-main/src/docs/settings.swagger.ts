import swaggerJSDoc from 'swagger-jsdoc';
export const setUpSwagger = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'DHYRIUM APIs',
      description: `Welcome to DHYRIUM API Documentation`,
      version: '1.0.0',
    },
    externalDocs: {
      description: 'REPOSITORY',
      url: 'https://github.com/juancotrado/quisvar_proyect_bk',
    },
    servers: [
      { url: 'http://localhost:8081/api/v1' },
      { url: 'http://localhost:8082/api/v1' },
    ],
    basePath: '/api/v1',
  },
  apis: [
    './src/docs/swagger.yaml',
    './src/docs/global.yaml',
    './src/docs/schemas/*.yaml',
    // './src/docs/schemas/auth.yaml',
    // './src/docs/schemas/task.yaml',
    // './src/docs/schemas/basictask.yaml',
    // './src/docs/schemas/stages.yaml',
  ],
});
