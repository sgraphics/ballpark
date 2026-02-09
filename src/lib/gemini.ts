import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ConditionNote } from '@/types/database';

const ANALYSIS_PROMPT = `You are an expert product analyst for a marketplace. Analyze the provided images and return a JSON object with the following fields. Be factual and objective.

Required JSON schema:
{
  "suggested_title": "Short, descriptive product title (max 60 chars)",
  "description": "Neutral, factual description of the item (2-3 sentences). Do NOT embellish.",
  "category_suggestion": "One of: clothing, electronics, furniture, vehicles, collectibles, other",
  "condition_notes": [
    { "issue": "Specific observable condition detail", "confidence": "high|medium|low" }
  ],
  "haggling_ammo": ["Objective fact that either side could use in negotiation"]
}

Rules:
- ONLY describe what you can actually see in the images
- Label uncertain observations with "low" or "medium" confidence
- Never invent details about brand, model, year, size, or other structured fields
- condition_notes should list BOTH positives and negatives
- haggling_ammo should be objective facts, not opinions
- Return ONLY valid JSON, no markdown, no code fences`;

const HERO_IMAGE_PROMPT = `Create a professional product photography studio version of this item. Requirements:
- Pure white seamless background
- Professional studio lighting with soft shadows
- Photo should be taken from three-quarter angle, not directly from the side or front
- The product should look EXACTLY the same: same color, brand, type, any visible use marks, scuffs, wear patterns, labels, and details
- Do NOT improve, repair, or idealize the product condition
- Keep all visible imperfections, wear, scratches, stains exactly as shown
- High-quality commercial product photography style
- The product should be the clear focal point, centered and well-lit`;

export interface ImageAnalysisResult {
  suggested_title: string;
  description: string;
  category_suggestion: string;
  condition_notes: ConditionNote[];
  haggling_ammo: string[];
}

export interface HeroImageResult {
  base64: string;
  mimeType: string;
}

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(key);
}

export async function analyzeImages(
  images: { data: string; mimeType: string }[]
): Promise<ImageAnalysisResult> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const parts = [
    { text: ANALYSIS_PROMPT },
    ...images.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
  ];

  const result = await model.generateContent(parts);
  const text = result.response.text();

  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    suggested_title: String(parsed.suggested_title || ''),
    description: String(parsed.description || ''),
    category_suggestion: String(parsed.category_suggestion || 'other'),
    condition_notes: Array.isArray(parsed.condition_notes)
      ? parsed.condition_notes.map((n: Record<string, string>) => ({
          issue: String(n.issue || ''),
          confidence: (['high', 'medium', 'low'].includes(n.confidence) ? n.confidence : 'medium') as ConditionNote['confidence'],
        }))
      : [],
    haggling_ammo: Array.isArray(parsed.haggling_ammo)
      ? parsed.haggling_ammo.map(String)
      : [],
  };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateHeroImage(
  sourceImage: { data: string; mimeType: string }
): Promise<HeroImageResult> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: 'gemini-3-pro-image-preview',
  });

  const parts = [
    { text: HERO_IMAGE_PROMPT },
    { inlineData: { data: sourceImage.data, mimeType: sourceImage.mimeType } },
  ];

  const result = await model.generateContent(parts);
  const response = result.response;

  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      const inlineData = part.inlineData as { data: string; mimeType: string } | undefined;
      if (inlineData?.data) {
        return {
          base64: inlineData.data,
          mimeType: inlineData.mimeType || 'image/png',
        };
      }
    }
  }

  throw new Error('No image generated in response');
}
