'use client';

import { getCategoryById } from '@/types/categories';

interface StructuredFieldsProps {
  category: string;
  structured: Record<string, unknown>;
}

export function StructuredFields({ category, structured }: StructuredFieldsProps) {
  const cat = getCategoryById(category);
  if (!cat) return null;

  const entries = cat.fields
    .filter((f) => structured[f.key] !== undefined && structured[f.key] !== '')
    .map((f) => ({ label: f.label, value: String(structured[f.key]) }));

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {entries.map((entry) => (
        <div key={entry.label}>
          <span className="text-[11px] text-bp-muted uppercase tracking-wide">{entry.label}</span>
          <p className="text-sm font-medium">{entry.value}</p>
        </div>
      ))}
    </div>
  );
}
