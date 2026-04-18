const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn('Cloudflare R2 not configured. Storage operations will be mocked.');
    return null;
  }

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestore.com`;

  s3Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  console.log('Cloudflare R2 client initialized');
  return s3Client;
}

class StorageService {
  constructor() {
    this.bucket = R2_BUCKET_NAME;
    this.publicUrl = R2_PUBLIC_URL;
    this.isConfigured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
  }

  getPublicUrl(key) {
    if (!this.publicUrl || !key) return null;
    return `${this.publicUrl}/${key}`;
  }

  async uploadBuffer(buffer, key, options = {}) {
    const client = getS3Client();
    
    if (!client) {
      console.warn(`[Storage] R2 not configured, storing mock key: ${key}`);
      return { success: true, key, url: null, mocked: true };
    }

    const contentType = options.contentType || 'image/png';
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: options.isPublic ? 'public-read' : 'private',
      });

      await client.send(command);

      const url = this.getPublicUrl(key);
      console.log(`[Storage] Uploaded: ${key}`);
      
      return { success: true, key, url };
    } catch (error) {
      console.error('[Storage] Upload failed:', error.message);
      throw error;
    }
  }

  async uploadBase64Image(base64Data, key, options = {}) {
    const base64Buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const contentType = base64Data.match(/^data:(\w+\/\w+);base64,/)?.[1] || 'image/png';
    
    return this.uploadBuffer(base64Buffer, key, { ...options, contentType });
  }

  async getBuffer(key) {
    const client = getS3Client();
    
    if (!client) {
      console.warn(`[Storage] R2 not configured, cannot get: ${key}`);
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await client.send(command);
      const chunks = [];
      
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('[Storage] Get failed:', error.message);
      throw error;
    }
  }

  async getSignedUrl(key, expiresInSeconds = 3600) {
    const client = getS3Client();
    
    if (!client) {
      console.warn(`[Storage] R2 not configured, cannot sign: ${key}`);
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(client, command, { expiresInSeconds });
      return url;
    } catch (error) {
      console.error('[Storage] Signed URL failed:', error.message);
      throw error;
    }
  }

  async delete(key) {
    const client = getS3Client();
    
    if (!client) {
      console.warn(`[Storage] R2 not configured, cannot delete: ${key}`);
      return { success: true, mocked: true };
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await client.send(command);
      console.log(`[Storage] Deleted: ${key}`);
      
      return { success: true };
    } catch (error) {
      console.error('[Storage] Delete failed:', error.message);
      throw error;
    }
  }

  async list(prefix = '') {
    const client = getS3Client();
    
    if (!client) {
      console.warn(`[Storage] R2 not configured, cannot list: ${prefix}`);
      return [];
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });

      const response = await client.send(command);
      return response.Contents?.map(obj => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
      })) || [];
    } catch (error) {
      console.error('[Storage] List failed:', error.message);
      throw error;
    }
  }

  generateQRKey(type, id) {
    const timestamp = Date.now();
    return `qrcodes/${type}/${id}-${timestamp}.png`;
  }

  generateImageKey(type, id, filename) {
    const ext = filename?.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    return `images/${type}/${id}-${timestamp}.${ext}`;
  }
}

module.exports = new StorageService();