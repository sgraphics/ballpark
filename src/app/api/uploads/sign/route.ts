import { NextRequest, NextResponse } from 'next/server';
import { isGcsConfigured, generateSignedUploadUrl, getPublicUrl, generateObjectPath } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, userId } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 });
    }

    if (!isGcsConfigured()) {
      return NextResponse.json({
        demo: true,
        uploadUrl: null,
        publicUrl: `https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=800`,
        objectPath: `demo/${filename}`,
      });
    }

    const objectPath = generateObjectPath(filename, userId || 'anonymous');
    const uploadUrl = generateSignedUploadUrl(objectPath, contentType);
    const publicUrl = getPublicUrl(objectPath);

    return NextResponse.json({ uploadUrl, publicUrl, objectPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload signing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
