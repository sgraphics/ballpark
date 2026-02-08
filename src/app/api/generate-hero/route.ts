import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { generateHeroImage, isGeminiConfigured } from '@/lib/gemini';
import { uploadBase64Image, generateHeroPath, generateThumbnailPath, isGcsConfigured } from '@/lib/gcs';

async function createThumbnail(base64Data: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const thumbnailBuffer = await sharp(buffer)
    .resize(600, 450, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  return thumbnailBuffer.toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    const { image, listingId } = await req.json();

    if (!image?.data || !image?.mimeType) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({
        heroUrl: null,
        thumbnailUrl: null,
        demo: true,
        message: 'Gemini not configured',
      });
    }

    const heroResult = await generateHeroImage({
      data: image.data,
      mimeType: image.mimeType,
    });

    if (!isGcsConfigured()) {
      const thumbnailBase64 = await createThumbnail(heroResult.base64);
      return NextResponse.json({
        heroUrl: null,
        thumbnailUrl: null,
        heroBase64: heroResult.base64,
        thumbnailBase64,
        mimeType: heroResult.mimeType,
        demo: true,
        message: 'GCS not configured - returning base64',
      });
    }

    const id = listingId || crypto.randomUUID();
    const heroPath = generateHeroPath(id);
    const thumbnailPath = generateThumbnailPath(id);

    const thumbnailBase64 = await createThumbnail(heroResult.base64);

    const [heroUrl, thumbnailUrl] = await Promise.all([
      uploadBase64Image(heroResult.base64, heroPath, heroResult.mimeType),
      uploadBase64Image(thumbnailBase64, thumbnailPath, 'image/webp'),
    ]);

    return NextResponse.json({
      heroUrl,
      thumbnailUrl,
      heroPath,
      thumbnailPath,
    });
  } catch (err) {
    console.error('Hero generation failed:', err);
    const message = err instanceof Error ? err.message : 'Hero generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
