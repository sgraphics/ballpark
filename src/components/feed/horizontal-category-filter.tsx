'use client';

import { CATEGORIES } from '@/types/categories';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

export function HorizontalCategoryFilter() {
  const { categoryFilter, setCategoryFilter } = useAppStore();

  return (
    <div className="w-full overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-2 min-w-max pb-2">
        <button
          onClick={() => setCategoryFilter('')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            !categoryFilter 
              ? 'bg-bp-black text-white shadow-sm' 
              : 'bg-white text-bp-muted hover:bg-gray-50 border border-bp-border'
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              categoryFilter === cat.id 
                ? 'bg-bp-black text-white shadow-sm' 
                : 'bg-white text-bp-muted hover:bg-gray-50 border border-bp-border'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
