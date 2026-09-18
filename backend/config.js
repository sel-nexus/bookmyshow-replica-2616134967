// Configuration surface for deployment tooling; runtime validation lives in src/config.ts.
module.exports = {
  environment: ['PORT', 'CORS_ORIGIN', 'DATABASE_PATH', 'JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE']
};
