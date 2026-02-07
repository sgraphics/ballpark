'use client';

import { CATEGORIES } from '@/types/categories';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

export function CategoryFilter() {
  const { categoryFilter, setCategoryFilter } = useAppStore();

  return (
    <div className="bg-white border border-bp-border rounded-xl p-4">
      <h3 className="font-heading text-sm font-medium mb-3">Categories</h3>
      <div className="space-y-0.5">
        <button
          onClick={() => setCategoryFilter('')}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-sm font-body transition-all',
            !categoryFilter ? 'bg-bp-black text-white' : 'text-bp-muted hover:bg-gray-50'
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg text-sm font-body transition-all',
              categoryFilter === cat.id ? 'bg-bp-black text-white' : 'text-bp-muted hover:bg-gray-50'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
