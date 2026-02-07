import { NextRequest, NextResponse } from 'next/server';
import { analyzeImages, isGeminiConfigured } from '@/lib/gemini';
import type { ImageAnalysisResult } from '@/lib/gemini';

const DEMO_ANALYSIS: ImageAnalysisResult = {
  suggested_title: 'Pre-owned Item',
  description: 'Item appears to be in used condition. Multiple angles provided for inspection.',
  category_suggestion: 'other',
  condition_notes: [
    { issue: 'General wear consistent with regular use', confidence: 'medium' },
    { issue: 'No visible major damage in provided images', confidence: 'medium' },
  ],
  haggling_ammo: [
    'Item shows signs of previous use',
    'Original packaging not visible in images',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'At least one image required' }, { status: 400 });
    }

    if (images.length > 6) {
      return NextResponse.json({ error: 'Maximum 6 images allowed' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({ analysis: DEMO_ANALYSIS, demo: true });
    }

    const analysis = await analyzeImages(
      images.map((img: { data: string; mimeType: string }) => ({
        data: img.data,
        mimeType: img.mimeType || 'image/jpeg',
      }))
    );

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
