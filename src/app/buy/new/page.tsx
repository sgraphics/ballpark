'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Search, Bot } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuyAgentForm, type BuyAgentFormData } from '@/components/buy/buy-agent-form';
import { useAppStore } from '@/store/app-store';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export default function NewBuyAgentPage() {
  const { addBuyAgent } = useAppStore();
  const { fetchWithAuth, userId, authenticated } = useAuth();
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const [formData, setFormData] = useState<BuyAgentFormData>({
    name: '',
    category: '',
    filters: {},
    prompt: '',
    max_price: '',
    urgency: 'medium',
  });

  const canSave = !!formData.name && !!formData.category;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        name: formData.name,
        category: formData.category,
        filters: formData.filters,
        prompt: formData.prompt,
        max_price: parseFloat(formData.max_price) || 0,
        urgency: formData.urgency,
      };

      const res = authenticated
        ? await fetchWithAuth('/api/buy-agents', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
        : await fetch('/api/buy-agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const agent = data.agent;
      addBuyAgent(agent);
      setCreated({ id: agent.id, name: agent.name });
    } catch (err) {
      console.error('Failed to create buy agent:', err);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-bp-buyer-soft flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-bp-buyer" />
          </div>
          <h1 className="font-heading text-2xl font-light mb-2">Buy Agent Created</h1>
          <p className="text-bp-muted text-sm mb-1">
            <span className="font-medium text-bp-black">{created.name}</span> is ready to find matches.
          </p>
          {formData.max_price && (
            <p className="text-bp-muted text-sm mb-6">
              Budget up to {formatPrice(parseFloat(formData.max_price))}
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <Link href="/buy">
              <Button variant="buyer">
                <Search className="w-4 h-4 mr-2" /> View My Agents
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="secondary">Browse Products</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/buy">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-light tracking-tight">New Buy Agent</h1>
            <p className="text-sm text-bp-muted mt-0.5">
              Configure an AI agent to find and negotiate deals for you.
            </p>
          </div>
        </div>

        <Card className="p-6">
          <BuyAgentForm formData={formData} onChange={setFormData} />
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Link href="/buy">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </Link>
          <Button
            variant="buyer"
            onClick={handleSave}
            disabled={!canSave}
            loading={saving}
          >
            {saving ? 'Creating...' : 'Create Buy Agent'}
            {!saving && <Check className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
