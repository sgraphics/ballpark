'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CATEGORIES, getCategoryFields, type CategoryField } from '@/types/categories';

export interface BuyAgentFormData {
  name: string;
  category: string;
  filters: Record<string, string>;
  prompt: string;
  max_price: string;
  urgency: string;
}

interface BuyAgentFormProps {
  formData: BuyAgentFormData;
  onChange: (data: BuyAgentFormData) => void;
}

export function BuyAgentForm({ formData, onChange }: BuyAgentFormProps) {
  const [fields, setFields] = useState<CategoryField[]>([]);

  useEffect(() => {
    const f = getCategoryFields(formData.category);
    setFields(f);
  }, [formData.category]);

  const update = (key: keyof BuyAgentFormData, value: unknown) => {
    onChange({ ...formData, [key]: value });
  };

  const updateFilter = (key: string, value: string) => {
    onChange({ ...formData, filters: { ...formData.filters, [key]: value } });
  };

  const categoryOptions = CATEGORIES.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-base font-medium mb-4">Agent Identity</h3>
        <div className="space-y-4">
          <Input
            label="Agent Name"
            value={formData.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Leather Jacket Hunter"
          />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-base font-medium mb-4">What are you looking for?</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category *"
              value={formData.category}
              onChange={(e) => {
                update('category', e.target.value);
              }}
              options={categoryOptions}
              placeholder="Select category"
            />
            <Input
              label="Max Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.max_price}
              onChange={(e) => update('max_price', e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {fields.length > 0 && (
        <div>
          <h3 className="font-heading text-base font-medium mb-2">Category Filters</h3>
          <p className="text-xs text-bp-muted mb-4">
            Set preferences for each field. Leave blank for no preference.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {fields.map((field) =>
              field.type === 'select' && field.options ? (
                <Select
                  key={field.key}
                  label={field.label}
                  value={formData.filters[field.key] || ''}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  options={[
                    { value: '', label: 'Any' },
                    ...field.options.map((o) => ({ value: o, label: o })),
                  ]}
                />
              ) : (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={formData.filters[field.key] || ''}
                  onChange={(e) => updateFilter(field.key, e.target.value)}
                  placeholder={`Preferred ${field.label.toLowerCase()}`}
                />
              )
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-heading text-base font-medium mb-4">Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bp-muted mb-1 font-body">
              Free-text Preferences
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => update('prompt', e.target.value)}
              placeholder="Describe what you're looking for in detail. E.g. 'Looking for a vintage leather jacket, preferably brown or black, broken in but no major damage. Willing to pay more for rare brands.'"
              rows={4}
              className="w-full px-3 py-2 text-sm font-body border border-bp-border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-bp-black/10 focus:border-bp-black
                placeholder:text-bp-muted-light transition-all resize-none"
            />
          </div>

          <Select
            label="Urgency"
            value={formData.urgency}
            onChange={(e) => update('urgency', e.target.value)}
            options={[
              { value: 'low', label: 'Low - No rush, wait for the right deal' },
              { value: 'medium', label: 'Medium - Reasonable timeline' },
              { value: 'high', label: 'High - Need it soon, flexible on price' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
