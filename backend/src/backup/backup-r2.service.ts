import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BackupR2Service {
  private readonly logger = new Logger(BackupR2Service.name);
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
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
    return this.client;
  }

  /**
   * Upload a local file to R2 under database/{filename}.
   * Returns the object key.
   */
  async upload(localFilePath: string, filename: string): Promise<string> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const key = `database/${filename}`;
    const body = fs.createReadStream(localFilePath);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'application/sql',
      }),
    );

    this.logger.log(`Uploaded to R2: s3://${bucket}/${key}`);
    return key;
  }

  async listFiles(prefix = 'database/'): Promise<
    Array<{ key: string; size?: number; lastModified?: Date }>
  > {
    const client = this.getClient();
    const bucket = this.getBucket();
    const out: Array<{ key: string; size?: number; lastModified?: Date }> = [];
    let continuationToken: string | undefined;

    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents || []) {
        if (!obj.Key) continue;
        out.push({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified,
        });
      }
      continuationToken = res.IsTruncated
        ? res.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return out;
  }

  async testConnection(): Promise<{ ok: boolean; bucket: string; message: string }> {
    try {
      const client = this.getClient();
      const bucket = this.getBucket();
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return {
        ok: true,
        bucket,
        message: `Connected to R2 bucket "${bucket}"`,
      };
    } catch (err: any) {
      this.logger.warn(`R2 testConnection failed: ${err?.message || err}`);
      return {
        ok: false,
        bucket: this.config.get<string>('R2_BUCKET_NAME') || '',
        message: err?.message || String(err),
      };
    }
  }

  /** Absolute path helper for callers that only have a basename. */
  resolveLocalPath(backupDir: string, filename: string): string {
    return path.join(backupDir, filename);
  }
}
