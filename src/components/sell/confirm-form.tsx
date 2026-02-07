'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CATEGORIES, getCategoryFields, type CategoryField } from '@/types/categories';
import type { ImageAnalysisResult } from '@/lib/gemini';
import type { ConditionNote } from '@/types/database';

export interface ListingFormData {
  title: string;
  description: string;
  category: string;
  structured: Record<string, string>;
  ask_price: string;
  condition_notes: ConditionNote[];
  min_price: string;
  urgency: string;
  agent_name: string;
}

interface ConfirmFormProps {
  analysis: ImageAnalysisResult;
  formData: ListingFormData;
  onChange: (data: ListingFormData) => void;
}

export function ConfirmForm({ analysis, formData, onChange }: ConfirmFormProps) {
  const [fields, setFields] = useState<CategoryField[]>([]);

  useEffect(() => {
    const f = getCategoryFields(formData.category);
    setFields(f);
  }, [formData.category]);

  const update = (key: keyof ListingFormData, value: unknown) => {
    onChange({ ...formData, [key]: value });
  };

  const updateStructured = (key: string, value: string) => {
    onChange({ ...formData, structured: { ...formData.structured, [key]: value } });
  };

  const categoryOptions = CATEGORIES.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-base font-medium mb-4">Listing Details</h3>
        <div className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={analysis.suggested_title}
          />

          <div>
            <label className="block text-sm font-medium text-bp-muted mb-1 font-body">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={analysis.description}
              rows={3}
              className="w-full px-3 py-2 text-sm font-body border border-bp-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-bp-black/10 focus:border-bp-black
                placeholder:text-bp-muted-light transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => update('category', e.target.value)}
              options={categoryOptions}
              placeholder="Select category"
            />
            <Input
              label="Ask Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.ask_price}
              onChange={(e) => update('ask_price', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {fields.length > 0 && (
        <div>
          <h3 className="font-heading text-base font-medium mb-4">Category Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) =>
              field.type === 'select' && field.options ? (
                <Select
                  key={field.key}
                  label={field.label + (field.required ? ' *' : '')}
                  value={formData.structured[field.key] || ''}
                  onChange={(e) => updateStructured(field.key, e.target.value)}
                  options={field.options.map((o) => ({ value: o, label: o }))}
                  placeholder={`Select ${field.label.toLowerCase()}`}
                />
              ) : (
                <Input
                  key={field.key}
                  label={field.label + (field.required ? ' *' : '')}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={formData.structured[field.key] || ''}
                  onChange={(e) => updateStructured(field.key, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-heading text-base font-medium mb-4">Sell Agent Settings</h3>
        <div className="space-y-4">
          <Input
            label="Agent Name"
            value={formData.agent_name}
            onChange={(e) => update('agent_name', e.target.value)}
            placeholder="My Sell Agent"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Acceptable Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.min_price}
              onChange={(e) => update('min_price', e.target.value)}
              placeholder="0.00"
            />
            <Select
              label="Urgency"
              value={formData.urgency}
              onChange={(e) => update('urgency', e.target.value)}
              options={[
                { value: 'low', label: 'Low - No rush' },
                { value: 'medium', label: 'Medium - Reasonable timeline' },
                { value: 'high', label: 'High - Sell quickly' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
