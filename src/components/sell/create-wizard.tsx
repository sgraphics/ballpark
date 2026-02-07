'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Check, Camera, Sparkles, ClipboardCheck, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageUpload, type ImageFile } from './image-upload';
import { AiAnalysis } from './ai-analysis';
import { ConfirmForm, type ListingFormData } from './confirm-form';
import { cn } from '@/lib/utils';
import type { ImageAnalysisResult } from '@/lib/gemini';
import { useAuth } from '@/hooks/use-auth';

const STEPS = [
  { id: 'upload', label: 'Upload Photos', icon: Camera },
  { id: 'analysis', label: 'AI Analysis', icon: Sparkles },
  { id: 'confirm', label: 'Confirm & Save', icon: ClipboardCheck },
] as const;

interface CreateWizardProps {
  onComplete: (data: {
    listing: Record<string, unknown>;
    agent: Record<string, unknown>;
  }) => void;
}

export function CreateWizard({ onComplete }: CreateWizardProps) {
  const { fetchWithAuth, userId, authenticated } = useAuth();
  const [step, setStep] = useState(0);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroGenerating, setHeroGenerating] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    category: '',
    structured: {},
    ask_price: '',
    condition_notes: [],
    min_price: '',
    urgency: 'medium',
    agent_name: '',
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setHeroGenerating(true);
    setHeroImageUrl(null);

    const mainImage = images[0];
    const payload = images.map((img) => ({
      data: img.base64 || '',
      mimeType: img.file.type || 'image/jpeg',
    }));

    const analysisPromise = fetch('/api/analyze-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: payload }),
    }).then((res) => res.json());

    const heroPromise = fetch('/api/generate-hero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: {
          data: mainImage.base64 || '',
          mimeType: mainImage.file.type || 'image/jpeg',
        },
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.heroUrl) {
          setHeroImageUrl(data.heroUrl);
        } else if (data.heroBase64) {
          setHeroImageUrl(`data:${data.mimeType};base64,${data.heroBase64}`);
        }
      })
      .catch((err) => {
        console.error('Hero generation failed:', err);
      })
      .finally(() => {
        setHeroGenerating(false);
      });

    try {
      const [analysisData] = await Promise.all([analysisPromise, heroPromise]);

      if (analysisData.error) {
        throw new Error(analysisData.error);
      }

      const a = analysisData.analysis as ImageAnalysisResult;
      setAnalysis(a);
      setIsDemo(!!analysisData.demo);

      setFormData((prev) => ({
        ...prev,
        title: prev.title || a.suggested_title,
        description: prev.description || a.description,
        category: prev.category || a.category_suggestion,
        condition_notes: a.condition_notes,
        agent_name: prev.agent_name || `Agent: ${a.suggested_title}`,
      }));

      setStep(1);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const imageUrls = images.map(
        (_, i) =>
          `https://images.pexels.com/photos/${3944405 + i * 100}/pexels-photo-${3944405 + i * 100}.jpeg?auto=compress&cs=tinysrgb&w=800`
      );

      const listingPayload = {
        user_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        structured: formData.structured,
        ask_price: parseFloat(formData.ask_price) || 0,
        condition_notes: formData.condition_notes,
        haggling_ammo: analysis?.haggling_ammo || [],
        image_urls: imageUrls,
        hero_image_url: heroImageUrl?.startsWith('data:') ? null : heroImageUrl,
      };

      const listingRes = authenticated
        ? await fetchWithAuth('/api/listings', {
            method: 'POST',
            body: JSON.stringify(listingPayload),
          })
        : await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listingPayload),
          });

      const listingData = await listingRes.json();

      if (listingData.error) throw new Error(listingData.error);

      const listing = listingData.listing;

      const agentPayload = {
        user_id: userId,
        listing_id: listing.id,
        name: formData.agent_name || `Agent: ${formData.title}`,
        min_price: parseFloat(formData.min_price) || 0,
        urgency: formData.urgency,
        preferences: {},
      };

      const agentRes = authenticated
        ? await fetchWithAuth('/api/sell-agents', {
            method: 'POST',
            body: JSON.stringify(agentPayload),
          })
        : await fetch('/api/sell-agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agentPayload),
          });

      const agentData = await agentRes.json();

      onComplete({ listing, agent: agentData.agent || agentData });
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return images.length >= 3;
    if (step === 1) return !!analysis;
    if (step === 2) return !!formData.title && !!formData.category && !!formData.ask_price;
    return false;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    isDone
                      ? 'bg-bp-success text-white'
                      : isActive
                        ? 'bg-bp-black text-white'
                        : 'bg-gray-100 text-bp-muted'
                  )}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:block',
                    isActive ? 'text-bp-black' : 'text-bp-muted'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-4',
                    i < step ? 'bg-bp-success' : 'bg-bp-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-medium">Upload Product Photos</h2>
              <p className="text-sm text-bp-muted mt-0.5">
                Add 3-6 clear photos from different angles. Our AI will analyze them for you.
              </p>
            </div>
            <ImageUpload images={images} onChange={setImages} />
          </div>
        )}

        {step === 1 && analysis && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-medium">Review AI Analysis</h2>
              <p className="text-sm text-bp-muted mt-0.5">
                Review what our AI detected. You will customize everything in the next step.
              </p>
            </div>
            <AiAnalysis analysis={analysis} isDemo={isDemo} />
          </div>
        )}

        {step === 2 && analysis && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-medium">Confirm & Create Listing</h2>
              <p className="text-sm text-bp-muted mt-0.5">
                Finalize your listing details and sell agent configuration.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden bg-gray-100 relative">
              <div className="aspect-[16/9] flex items-center justify-center">
                {heroGenerating ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-bp-seller/10 flex items-center justify-center mx-auto mb-3">
                      <Loader2 className="w-6 h-6 text-bp-seller animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-bp-muted">Generating Hero Image...</p>
                    <p className="text-xs text-bp-muted-light mt-1">Creating a professional studio photo</p>
                  </div>
                ) : heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt="Professional hero image"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6 text-bp-muted" />
                    </div>
                    <p className="text-sm font-medium text-bp-muted">Hero Image</p>
                    <p className="text-xs text-bp-muted-light mt-1">Could not generate - will use original</p>
                  </div>
                )}
              </div>
              {heroImageUrl && !heroGenerating && (
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-bp-seller text-white text-[10px] font-medium rounded">
                  AI-Generated Studio Photo
                </div>
              )}
            </div>

            <ConfirmForm analysis={analysis} formData={formData} onChange={setFormData} />
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        {step === 0 && (
          <Button
            variant="seller"
            onClick={handleAnalyze}
            disabled={!canProceed()}
            loading={analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            {!analyzing && <Sparkles className="w-4 h-4 ml-2" />}
          </Button>
        )}

        {step === 1 && (
          <Button variant="primary" onClick={() => setStep(2)}>
            Continue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {step === 2 && (
          <Button
            variant="seller"
            onClick={handleSave}
            disabled={!canProceed()}
            loading={saving}
          >
            {saving ? 'Creating...' : 'Create Listing & Agent'}
            {!saving && <Check className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </div>
    </div>
  );
}
