import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://govedms_admin:GovSecurePassword2026!@localhost:5432/govedms_production?schema=public',
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'gov_edms_super_secret_jwt_access_token_key_2026_national_pmo',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'gov_edms_super_secret_jwt_refresh_token_key_2026_national_pmo',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    rootUser: process.env.MINIO_ROOT_USER || 'govedms_minio_root',
    rootPassword: process.env.MINIO_ROOT_PASSWORD || 'MinioGovRootSecret2026!',
    bucket: process.env.MINIO_BUCKET_DOCUMENTS || 'govedms-classified-documents',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:8000',
};
