import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/** Sanitize original filename for use inside an R2 object key. */
export function sanitizeUploadFilename(originalname: string): string {
  return path
    .basename(originalname || 'file')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * True when the stored path is a legacy local disk reference
 * (relative uploads/… or absolute /var/www/… path).
 */
export function isLegacyLocalFilePath(stored: string | null | undefined): boolean {
  if (!stored) return false;
  const s = stored.trim().replace(/\\/g, '/');
  if (path.isAbsolute(stored) || path.isAbsolute(s)) return true;
  if (s.startsWith('uploads/') || s.startsWith('./uploads/')) return true;
  return false;
}

/** In-house legacy: filename only (no slash) or timestamp_… local multer name. */
export function isLegacyInhouseDocumentPath(
  stored: string | null | undefined,
): boolean {
  if (!stored) return false;
  const s = stored.trim().replace(/\\/g, '/');
  if (s.startsWith('inhouse-documents/')) return false;
  if (!s.includes('/')) return true;
  if (/^\d+_/.test(path.basename(s))) return true;
  return isLegacyLocalFilePath(s);
}

@Injectable()
export class R2FilesService {
  private readonly logger = new Logger(R2FilesService.name);
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private getBucket(): string {
    const bucket = this.config.get<string>('R2_BUCKET_NAME');
    if (!bucket) {
      throw new ServiceUnavailableException('R2_BUCKET_NAME is not configured');
    }
    return bucket;
  }

  private getClient(): S3Client {
    if (this.client) return this.client;

    const endpoint =
      this.config.get<string>('R2_ENDPOINT') ||
      (this.config.get<string>('R2_ACCOUNT_ID')
        ? `https://${this.config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`
        : undefined);
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        'R2 credentials incomplete (R2_ENDPOINT / R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    return this.client;
  }

  /**
   * Upload a local file path or Buffer to R2.
   * Returns the object key.
   */
  async uploadFile(
    localPathOrBuffer: string | Buffer,
    r2Key: string,
    mimeType: string,
  ): Promise<string> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const body =
      typeof localPathOrBuffer === 'string'
        ? fs.createReadStream(localPathOrBuffer)
        : localPathOrBuffer;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: body,
        ContentType: mimeType || 'application/octet-stream',
      }),
    );

    this.logger.log(`Uploaded to R2: s3://${bucket}/${r2Key}`);
    return r2Key;
  }

  async getPresignedUrl(
    r2Key: string,
    expiresInSeconds = 900,
    options?: {
      responseContentDisposition?: string;
      responseContentType?: string;
    },
  ): Promise<string> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      ...(options?.responseContentDisposition
        ? { ResponseContentDisposition: options.responseContentDisposition }
        : {}),
      ...(options?.responseContentType
        ? { ResponseContentType: options.responseContentType }
        : {}),
    });
    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }

  /** Fetch object bytes from R2 for server-side proxy (avoids browser CORS on presigned redirects). */
  async getObjectBuffer(
    r2Key: string,
  ): Promise<{ buffer: Buffer; contentType?: string }> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const result = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: r2Key }),
    );
    if (!result.Body) {
      throw new ServiceUnavailableException(`R2 object body empty: ${r2Key}`);
    }
    const bytes = await result.Body.transformToByteArray();
    return {
      buffer: Buffer.from(bytes),
      contentType: result.ContentType || undefined,
    };
  }

  async deleteFile(r2Key: string): Promise<void> {
    if (!r2Key) return;
    const client = this.getClient();
    const bucket = this.getBucket();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }),
    );
    this.logger.log(`Deleted from R2: s3://${bucket}/${r2Key}`);
  }

  async fileExists(r2Key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const bucket = this.getBucket();
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: r2Key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Upload local Multer file to R2 then unlink local disk copy. */
  async promoteLocalFileToR2(
    localAbsPath: string,
    r2Key: string,
    mimeType: string,
  ): Promise<string> {
    try {
      await this.uploadFile(localAbsPath, r2Key, mimeType);
    } catch (err) {
      try {
        if (fs.existsSync(localAbsPath)) fs.unlinkSync(localAbsPath);
      } catch {
        /* ignore */
      }
      throw err;
    }
    try {
      if (fs.existsSync(localAbsPath)) fs.unlinkSync(localAbsPath);
    } catch (e) {
      this.logger.warn(`Failed to delete local after R2 upload: ${localAbsPath}`);
    }
    return r2Key;
  }

  /** Best-effort delete of a stored reference (local legacy or R2 key). */
  async deleteStoredFile(stored: string | null | undefined): Promise<void> {
    if (!stored) return;
    if (isLegacyLocalFilePath(stored)) {
      const abs = path.isAbsolute(stored)
        ? stored
        : path.join(process.cwd(), stored.replace(/^\.\//, ''));
      if (fs.existsSync(abs)) {
        try {
          fs.unlinkSync(abs);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    try {
      await this.deleteFile(stored);
    } catch (e) {
      this.logger.warn(`Failed to delete R2 object ${stored}: ${e}`);
    }
  }
}
