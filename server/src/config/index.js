require('dotenv').config();

const defaultCorsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultCorsOrigins;

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  jwtExpiresIn: process.env.JWT_EXPIRES || process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME || 'gitoffice',
  dbUser: process.env.DB_USER || 'postgres',
  dbPass: process.env.DB_PASS || '',
  corsOrigins,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: String(process.env.SMTP_SECURE || 'true') === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || ''
};
