import { NextRequest, NextResponse } from 'next/server';
import { generateHeroImage, isGeminiConfigured } from '@/lib/gemini';
import { uploadBase64Image, generateHeroPath, isGcsConfigured, getPublicUrl } from '@/lib/gcs';

export async function POST(req: NextRequest) {
  try {
    const { image, listingId } = await req.json();

    if (!image?.data || !image?.mimeType) {
      return NextResponse.json({ error: 'Image data required' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({
        heroUrl: null,
        demo: true,
        message: 'Gemini not configured',
      });
    }

    const heroResult = await generateHeroImage({
      data: image.data,
      mimeType: image.mimeType,
    });

    if (!isGcsConfigured()) {
      return NextResponse.json({
        heroUrl: null,
        heroBase64: heroResult.base64,
        mimeType: heroResult.mimeType,
        demo: true,
        message: 'GCS not configured - returning base64',
      });
    }

    const objectPath = generateHeroPath(listingId || crypto.randomUUID());
    const publicUrl = await uploadBase64Image(
      heroResult.base64,
      objectPath,
      heroResult.mimeType
    );

    return NextResponse.json({
      heroUrl: publicUrl,
      objectPath,
    });
  } catch (err) {
    console.error('Hero generation failed:', err);
    const message = err instanceof Error ? err.message : 'Hero generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
