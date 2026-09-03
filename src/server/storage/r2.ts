import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '@/env';

/**
 * Cloudflare R2 through its S3-compatible endpoint. The bucket is public
 * (read-only, unguessable uuid keys); writes always go through this client,
 * either directly from the server or via a short-lived presigned PUT that
 * lets the browser stream large files without touching Vercel.
 */
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/** Public URL of an object; the base domain lives in env so it can change without touching data. */
const publicUrl = (key: string) => `${env.R2_PUBLIC_URL}/${key}`;

/** Presigned PUT for a browser upload; the content type is part of the signature so it can't be swapped. */
const presignUpload = (key: string, contentType: string) =>
  getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 60 },
  );

const putObject = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> => {
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
};

/** Size and type of an object, or null when nothing was uploaded under that key. */
const headObject = async (
  key: string,
): Promise<{ size: number; contentType: string | null } | null> => {
  try {
    const result = await r2.send(
      new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'NotFound' || error.name === 'NoSuchKey')
    ) {
      return null;
    }
    throw error;
  }
};

const getObject = async (key: string): Promise<Buffer> => {
  const result = await r2.send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
  if (!result.Body) {
    throw new Error(`R2 object not found: ${key}`);
  }
  return Buffer.from(await result.Body.transformToByteArray());
};

/**
 * Rewrites an object's headers in place (a server-side copy onto itself,
 * so nothing streams through Vercel). Used after a browser upload to pin
 * the download name and disposition of documents.
 */
const setObjectHeaders = async (
  key: string,
  headers: { contentType: string; contentDisposition: string },
): Promise<void> => {
  await r2.send(
    new CopyObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      CopySource: `${env.R2_BUCKET_NAME}/${key}`,
      MetadataDirective: 'REPLACE',
      ContentType: headers.contentType,
      ContentDisposition: headers.contentDisposition,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
};

const deleteObjects = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) {
    return;
  }
  await r2.send(
    new DeleteObjectsCommand({
      Bucket: env.R2_BUCKET_NAME,
      Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
};

export {
  deleteObjects,
  getObject,
  headObject,
  presignUpload,
  publicUrl,
  putObject,
  setObjectHeaders,
};
