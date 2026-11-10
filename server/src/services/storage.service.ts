import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface IStorageService {
  uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ fileUrl: string; fileKey: string }>;
  deleteFile(fileKey: string): Promise<void>;
  getFileStream(fileKey: string): Promise<fs.ReadStream | NodeJS.ReadableStream | null>;
}

class LocalStorageDriver implements IStorageService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    _mimeType: string
  ): Promise<{ fileUrl: string; fileKey: string }> {
    const uniqueKey = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${fileName}`;
    const filePath = path.join(this.uploadsDir, uniqueKey);
    await fs.promises.writeFile(filePath, fileBuffer);
    const fileUrl = `${env.CLIENT_URL.replace(/:\d+$/, '')}:${env.PORT}/uploads/${uniqueKey}`;
    return { fileUrl, fileKey: uniqueKey };
  }

  async deleteFile(fileKey: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, fileKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async getFileStream(fileKey: string): Promise<fs.ReadStream | null> {
    const filePath = path.join(this.uploadsDir, fileKey);
    if (fs.existsSync(filePath)) {
      return fs.createReadStream(filePath);
    }
    return null;
  }
}

class S3StorageDriver implements IStorageService {
  constructor() {
    logger.info('Initialized S3 storage driver configuration');
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ fileUrl: string; fileKey: string }> {
    // S3 implementation when AWS credentials and bucket are provided
    if (env.S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });
        const key = `uploads/${Date.now()}-${fileName}`;
        await s3.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
          })
        );
        const fileUrl = `https://${env.S3_BUCKET}.s3.${env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        return { fileUrl, fileKey: key };
      } catch (err) {
        logger.error({ err }, 'S3 upload failed, falling back to local driver');
      }
    }
    // Fallback to local
    const local = new LocalStorageDriver();
    return local.uploadFile(fileBuffer, fileName, mimeType);
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (env.S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });
        await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: fileKey }));
        return;
      } catch (err) {
        logger.error({ err }, 'S3 delete failed');
      }
    }
    const local = new LocalStorageDriver();
    return local.deleteFile(fileKey);
  }

  async getFileStream(fileKey: string): Promise<fs.ReadStream | NodeJS.ReadableStream | null> {
    if (env.S3_BUCKET && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({
          region: env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        });
        const response = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: fileKey }));
        return (response.Body as NodeJS.ReadableStream) || null;
      } catch (err) {
        logger.error({ err }, 'S3 getFileStream failed, falling back to local driver');
      }
    }
    const local = new LocalStorageDriver();
    return local.getFileStream(fileKey);
  }
}

export const storageService: IStorageService =
  env.STORAGE_DRIVER === 's3' ? new S3StorageDriver() : new LocalStorageDriver();
