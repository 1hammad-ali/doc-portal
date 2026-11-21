import * as Minio from 'minio';
import { config } from '../config/index.js';

export const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.rootUser,
  secretKey: config.minio.rootPassword,
});

export async function ensureDocumentBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(config.minio.bucket);
    if (!exists) {
      await minioClient.makeBucket(config.minio.bucket, 'us-east-1');
      console.log(`🪣 Initialized Government Classified Documents Bucket: ${config.minio.bucket}`);
    }
  } catch (err) {
    console.warn(`⚠️ MinIO Storage Service not reachable at ${config.minio.endpoint}:${config.minio.port}. Local storage fallback will be used.`);
  }
}
