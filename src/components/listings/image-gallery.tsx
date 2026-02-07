'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

export function ImageGallery({ images, alt = 'Product image' }: ImageGalleryProps) {
  const [active, setActive] = useState(0);
  const urls = images.length > 0
    ? images
    : ['https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=800'];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 group">
        <img
          src={urls[active]}
          alt={`${alt} ${active + 1}`}
          className="w-full h-full object-cover transition-opacity duration-200"
        />
        {urls.length > 1 && (
          <>
            <button
              onClick={() => setActive((p) => (p - 1 + urls.length) % urls.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white
                flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-black/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActive((p) => (p + 1) % urls.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white
                flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                hover:bg-black/60"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === active ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                i === active ? 'border-bp-black' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
