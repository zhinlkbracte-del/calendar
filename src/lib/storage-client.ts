/**
 * Supabase Storage REST API 直连方案
 * 不依赖 coze-coding-dev-sdk，使用 COZE_SUPABASE_SERVICE_ROLE_KEY 做 Bearer 认证
 * 仅用于头像存储（avatars bucket）
 */

function getSupabaseUrl(): string {
  const url = process.env.COZE_SUPABASE_URL;
  if (!url) throw new Error('COZE_SUPABASE_URL is not set');
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('COZE_SUPABASE_SERVICE_ROLE_KEY is not set');
  return key;
}

const BUCKET_NAME = 'avatars';
let bucketEnsured = false;

async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return;
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET_NAME}`, {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (res.status === 404) {
      await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: BUCKET_NAME, name: BUCKET_NAME, public: true }),
      });
    } else if (res.ok) {
      bucketEnsured = true;
    }
  } catch {
    // Bucket check failed, will retry next time
  }
}

/**
 * 上传头像到 Supabase Storage
 */
export async function uploadAvatar(key: string, body: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
  await ensureBucket();
  const url = getSupabaseUrl();
  const token = getServiceRoleKey();

  const response = await fetch(
    `${url}/storage/v1/object/${BUCKET_NAME}/${key}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: body as BodyInit,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }
}

/**
 * 获取头像公开访问 URL
 * avatars bucket 已设为 public，直接拼接公开 URL
 */
export function getAvatarUrl(key: string): string {
  if (!key) return '';
  const url = getSupabaseUrl();
  return `${url}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
}

/**
 * 删除文件
 */
export async function deleteFile(key: string): Promise<void> {
  const url = getSupabaseUrl();
  const token = getServiceRoleKey();

  const response = await fetch(
    `${url}/storage/v1/object/${BUCKET_NAME}/${key}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Delete failed (${response.status}): ${errorText}`);
  }
}
