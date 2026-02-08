import { NextRequest, NextResponse } from 'next/server';
import { isGcsConfigured, uploadBase64Image, getPublicUrl, generateObjectPath } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType, data, userId } = await req.json();

    if (!filename || !contentType || !data) {
      return NextResponse.json(
        { error: 'filename, contentType, and data (base64) are required' },
        { status: 400 }
      );
    }

    if (!isGcsConfigured()) {
      return NextResponse.json({
        demo: true,
        publicUrl: `https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=800`,
      });
    }

    const objectPath = generateObjectPath(filename, userId || 'anonymous');
    const publicUrl = await uploadBase64Image(data, objectPath, contentType);

    return NextResponse.json({ publicUrl, objectPath });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('Upload error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
