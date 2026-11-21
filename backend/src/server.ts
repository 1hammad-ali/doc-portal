import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './lib/prisma.js';
import { ensureDocumentBucket } from './lib/minio.js';

async function bootstrap() {
  try {
    console.log('🏛️  Bootstrapping GovEDMS National e-Office API Service...');

    // 1. Ensure MinIO Document Bucket exists
    await ensureDocumentBucket();

    // 2. Test PostgreSQL Database Connection
    await prisma.$connect();
    console.log('✅ Connected to Sovereign PostgreSQL Database');

    // 3. Start Express HTTP Server
    app.listen(config.port, () => {
      console.log(`================================================================`);
      console.log(`🚀 GovEDMS API Server listening on: http://localhost:${config.port}/api/v1`);
      console.log(`🛡️  Role-Based Access Control & Audit Ledger: ACTIVE`);
      console.log(`📦 S3 MinIO Vault: ${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}`);
      console.log(`================================================================`);
    });
  } catch (err) {
    console.error('❌ Critical Startup Failure:', err);
    process.exit(1);
  }
}

bootstrap();
