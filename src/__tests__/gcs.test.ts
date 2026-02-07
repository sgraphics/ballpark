import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('GCS Module', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('isGcsConfigured', () => {
    it('returns false when env vars are missing', async () => {
      delete process.env.GCP_SERVICE_ACCOUNT_JSON;
      delete process.env.GCS_BUCKET;
      const { isGcsConfigured } = await import('@/lib/gcs');
      expect(isGcsConfigured()).toBe(false);
    });

    it('returns false when only bucket is set', async () => {
      delete process.env.GCP_SERVICE_ACCOUNT_JSON;
      process.env.GCS_BUCKET = 'my-bucket';
      const { isGcsConfigured } = await import('@/lib/gcs');
      expect(isGcsConfigured()).toBe(false);
    });

    it('returns true when both env vars are set', async () => {
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"test@test.iam.gserviceaccount.com","private_key":"fake"}';
      process.env.GCS_BUCKET = 'my-bucket';
      const { isGcsConfigured } = await import('@/lib/gcs');
      expect(isGcsConfigured()).toBe(true);
    });
  });

  describe('getPublicUrl', () => {
    it('builds correct URL from bucket and path', async () => {
      process.env.GCS_BUCKET = 'test-bucket';
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"a","private_key":"b"}';
      const { getPublicUrl } = await import('@/lib/gcs');
      expect(getPublicUrl('images/photo.jpg')).toBe(
        'https://storage.googleapis.com/test-bucket/images/photo.jpg'
      );
    });
  });

  describe('generateObjectPath', () => {
    it('includes userId in path', async () => {
      process.env.GCS_BUCKET = 'test-bucket';
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"a","private_key":"b"}';
      const { generateObjectPath } = await import('@/lib/gcs');
      const path = generateObjectPath('photo.jpg', 'user-123');
      expect(path).toContain('listings/user-123/');
      expect(path).toMatch(/\.jpg$/);
    });

    it('extracts extension from filename', async () => {
      process.env.GCS_BUCKET = 'test-bucket';
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"a","private_key":"b"}';
      const { generateObjectPath } = await import('@/lib/gcs');
      const path = generateObjectPath('image.png', 'user-1');
      expect(path).toMatch(/\.png$/);
    });

    it('generates unique paths for same filename', async () => {
      process.env.GCS_BUCKET = 'test-bucket';
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"a","private_key":"b"}';
      const { generateObjectPath } = await import('@/lib/gcs');
      const path1 = generateObjectPath('photo.jpg', 'user-1');
      const path2 = generateObjectPath('photo.jpg', 'user-1');
      expect(path1).not.toBe(path2);
    });
  });

  describe('generateSignedUploadUrl', () => {
    it('throws when credentials missing', async () => {
      delete process.env.GCP_SERVICE_ACCOUNT_JSON;
      process.env.GCS_BUCKET = 'bucket';
      const { generateSignedUploadUrl } = await import('@/lib/gcs');
      expect(() => generateSignedUploadUrl('test.jpg', 'image/jpeg')).toThrow(
        'GCP_SERVICE_ACCOUNT_JSON not configured'
      );
    });

    it('throws when bucket missing', async () => {
      process.env.GCP_SERVICE_ACCOUNT_JSON = '{"client_email":"a@b.com","private_key":"key"}';
      delete process.env.GCS_BUCKET;
      const { generateSignedUploadUrl } = await import('@/lib/gcs');
      expect(() => generateSignedUploadUrl('test.jpg', 'image/jpeg')).toThrow(
        'GCS_BUCKET not configured'
      );
    });
  });
});
