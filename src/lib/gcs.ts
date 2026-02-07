import crypto from 'crypto';

interface GcsCredentials {
  client_email: string;
  private_key: string;
}

function getCredentials(): GcsCredentials {
  const raw = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_JSON not configured');
  const decoded = Buffer.from(raw, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

function getBucket(): string {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error('GCS_BUCKET not configured');
  return bucket;
}

export function isGcsConfigured(): boolean {
  return !!(process.env.GCP_SERVICE_ACCOUNT_JSON && process.env.GCS_BUCKET);
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

export function generateSignedUploadUrl(
  objectPath: string,
  contentType: string,
  expiresSeconds = 900
): string {
  const creds = getCredentials();
  const bucket = getBucket();
  const host = 'storage.googleapis.com';

  const now = new Date();
  const timestamp = formatTimestamp(now);
  const datestamp = timestamp.substring(0, 8);

  const credScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${creds.client_email}/${credScope}`;

  const params: [string, string][] = [
    ['X-Goog-Algorithm', 'GOOG4-RSA-SHA256'],
    ['X-Goog-Credential', credential],
    ['X-Goog-Date', timestamp],
    ['X-Goog-Expires', expiresSeconds.toString()],
    ['X-Goog-SignedHeaders', 'content-type;host'],
  ];

  params.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQuery = params
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalUri = `/${bucket}/${objectPath}`;
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'content-type;host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashedRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    timestamp,
    credScope,
    hashedRequest,
  ].join('\n');

  const signature = crypto
    .sign('sha256', Buffer.from(stringToSign), creds.private_key)
    .toString('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

export function generateSignedReadUrl(objectPath: string, expiresSeconds = 3600): string {
  const creds = getCredentials();
  const bucket = getBucket();
  const host = 'storage.googleapis.com';

  const now = new Date();
  const timestamp = formatTimestamp(now);
  const datestamp = timestamp.substring(0, 8);

  const credScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${creds.client_email}/${credScope}`;

  const params: [string, string][] = [
    ['X-Goog-Algorithm', 'GOOG4-RSA-SHA256'],
    ['X-Goog-Credential', credential],
    ['X-Goog-Date', timestamp],
    ['X-Goog-Expires', expiresSeconds.toString()],
    ['X-Goog-SignedHeaders', 'host'],
  ];

  params.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQuery = params
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const canonicalUri = `/${bucket}/${objectPath}`;
  const canonicalHeaders = `host:${host}\n`;

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashedRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    timestamp,
    credScope,
    hashedRequest,
  ].join('\n');

  const signature = crypto
    .sign('sha256', Buffer.from(stringToSign), creds.private_key)
    .toString('hex');

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signature}`;
}

export function getPublicUrl(objectPath: string): string {
  const bucket = getBucket();
  return `https://storage.googleapis.com/${bucket}/${objectPath}`;
}

export function generateObjectPath(filename: string, userId: string): string {
  const ext = filename.split('.').pop() || 'jpg';
  const id = crypto.randomUUID();
  return `listings/${userId}/${id}.${ext}`;
}

export function generateHeroPath(listingId: string): string {
  return `hero/${listingId}.png`;
}

export async function uploadBase64Image(
  base64Data: string,
  objectPath: string,
  contentType: string
): Promise<string> {
  const creds = getCredentials();
  const bucket = getBucket();

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;

  const buffer = Buffer.from(base64Data, 'base64');

  const token = await getAccessToken(creds);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GCS upload failed: ${res.status} ${text}`);
  }

  return getPublicUrl(objectPath);
}

async function getAccessToken(creds: GcsCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .sign('sha256', Buffer.from(signatureInput), creds.private_key)
    .toString('base64url');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await tokenRes.json();
  return data.access_token;
}
