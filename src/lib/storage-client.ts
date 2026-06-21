import { S3Storage } from 'coze-coding-dev-sdk';

let storageInstance: S3Storage | null = null;

export function createStorageClient(): S3Storage {
  if (!storageInstance) {
    storageInstance = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }
  return storageInstance;
}

// Helper to get presigned URL from a key
export async function getPresignedUrl(key: string, expireTime: number = 3600): Promise<string> {
  const storage = createStorageClient();
  const url = await storage.generatePresignedUrl({ key, expireTime });
  return url;
}
