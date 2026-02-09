'use client';

import Link from 'next/link';
import { Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getStateBadge, getStateLabel } from '@/lib/utils';
import { getCategoryById } from '@/types/categories';
import type { Listing } from '@/types/database';

const PLACEHOLDER_IMAGES = [
  'https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/2783873/pexels-photo-2783873.jpeg?auto=compress&cs=tinysrgb&w=400',
];

function getPlaceholder(id: string): string {
  const idx = id.charCodeAt(0) % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[idx];
}

export function ListingCard({ listing }: { listing: Listing }) {
  const cat = getCategoryById(listing.category);
  const imgSrc = listing.hero_thumbnail_url || listing.hero_image_url || listing.image_urls?.[0] || getPlaceholder(listing.id);
  const badge = getStateBadge(listing.status);
  const conditionField = listing.structured?.condition as string | undefined;

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card interactive className="overflow-hidden p-0 group">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={imgSrc}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2">
            <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.bg} ${badge.text}`}>
              {getStateLabel(listing.status)}
            </span>
          </div>
          {listing.condition_notes?.length > 0 && (
            <div className="absolute bottom-2 right-2">
              <span className="inline-block px-1.5 py-0.5 text-[10px] bg-black/60 text-white rounded">
                {listing.condition_notes.length} note{listing.condition_notes.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm truncate flex-1">{listing.title}</h3>
            <span className="text-sm font-semibold whitespace-nowrap">{formatPrice(listing.ask_price)}</span>
          </div>
          {listing.description && (
            <p className="text-xs text-bp-muted line-clamp-2 mb-2">{listing.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {cat && (
              <Badge variant="default">
                <Tag className="w-2.5 h-2.5 mr-1" />
                {cat.name}
              </Badge>
            )}
            {conditionField && typeof conditionField === 'string' && (
              <span className="text-[10px] text-bp-muted">{conditionField}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
