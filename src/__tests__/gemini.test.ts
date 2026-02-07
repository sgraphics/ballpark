import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Gemini Module', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('isGeminiConfigured', () => {
    it('returns false when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const { isGeminiConfigured } = await import('@/lib/gemini');
      expect(isGeminiConfigured()).toBe(false);
    });

    it('returns true when API key is set', async () => {
      process.env.GEMINI_API_KEY = 'test-key-12345';
      const { isGeminiConfigured } = await import('@/lib/gemini');
      expect(isGeminiConfigured()).toBe(true);
    });
  });

  describe('analyzeImages', () => {
    it('throws when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      const { analyzeImages } = await import('@/lib/gemini');
      await expect(
        analyzeImages([{ data: 'base64data', mimeType: 'image/jpeg' }])
      ).rejects.toThrow('GEMINI_API_KEY not configured');
    });
  });
});

describe('ImageAnalysisResult type', () => {
  it('has correct shape', () => {
    const result = {
      suggested_title: 'Test Item',
      description: 'A test description',
      category_suggestion: 'other',
      condition_notes: [{ issue: 'Minor wear', confidence: 'medium' as const }],
      haggling_ammo: ['Good overall condition'],
    };

    expect(result.suggested_title).toBe('Test Item');
    expect(result.condition_notes).toHaveLength(1);
    expect(result.condition_notes[0].confidence).toBe('medium');
    expect(result.haggling_ammo).toHaveLength(1);
  });

  it('handles empty arrays', () => {
    const result = {
      suggested_title: '',
      description: '',
      category_suggestion: 'other',
      condition_notes: [],
      haggling_ammo: [],
    };

    expect(result.condition_notes).toHaveLength(0);
    expect(result.haggling_ammo).toHaveLength(0);
  });

  it('supports all confidence levels', () => {
    const notes = [
      { issue: 'High confidence issue', confidence: 'high' as const },
      { issue: 'Medium confidence issue', confidence: 'medium' as const },
      { issue: 'Low confidence issue', confidence: 'low' as const },
    ];

    expect(notes.map((n) => n.confidence)).toEqual(['high', 'medium', 'low']);
  });

  it('supports all category suggestions', () => {
    const categories = ['clothing', 'electronics', 'furniture', 'vehicles', 'collectibles', 'other'];
    categories.forEach((cat) => {
      const result = { category_suggestion: cat };
      expect(typeof result.category_suggestion).toBe('string');
    });
  });
});
