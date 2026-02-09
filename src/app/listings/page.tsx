'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { ListingCard } from '@/components/listings/listing-card';
import { HorizontalCategoryFilter } from '@/components/feed/horizontal-category-filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';
import type { Listing } from '@/types/database';

const DEMO_LISTINGS: Listing[] = [
  {
    id: 'demo-1',
    seller_user_id: '',
    title: 'Vintage Leather Jacket',
    description: 'Genuine Italian leather, minimal wear. Beautiful patina developing on the shoulders and arms.',
    category: 'clothing',
    structured: { size: 'L', gender: 'Men', brand: 'Schott NYC', condition: 'Good' },
    ask_price: 450,
    condition_notes: [
      { issue: 'Light scuffing on left elbow', confidence: 'high' },
      { issue: 'Minor fading on collar', confidence: 'medium' },
    ],
    haggling_ammo: ['Vintage patina adds character', 'Original zippers intact'],
    image_urls: ['https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-2',
    seller_user_id: '',
    title: 'MacBook Pro 16" M2 Pro',
    description: 'Lightly used MacBook Pro with M2 Pro chip. Includes original charger and box.',
    category: 'electronics',
    structured: { brand: 'Apple', model: 'MacBook Pro 16"', storage: '512', condition: 'Like New' },
    ask_price: 1800,
    condition_notes: [
      { issue: 'Battery cycle count: 47', confidence: 'high' },
      { issue: 'Hairline mark near trackpad', confidence: 'low' },
    ],
    haggling_ammo: ['AppleCare+ valid until 2025', 'Low battery cycle count'],
    image_urls: ['https://images.pexels.com/photos/303383/pexels-photo-303383.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'demo-3',
    seller_user_id: '',
    title: 'Mid-Century Modern Desk',
    description: 'Walnut writing desk, solid wood construction. Sleek tapered legs, two drawers.',
    category: 'furniture',
    structured: { material: 'Wood', color: 'Walnut', dimensions: '140x60x75cm', condition: 'Good' },
    ask_price: 650,
    condition_notes: [
      { issue: 'Small water ring on top surface', confidence: 'high' },
      { issue: 'One drawer slightly stiff', confidence: 'medium' },
    ],
    haggling_ammo: ['Solid walnut, not veneer', 'Timeless mid-century design'],
    image_urls: ['https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    updated_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'demo-4',
    seller_user_id: '',
    title: '1965 Fender Stratocaster',
    description: 'Original 1965 Fender Stratocaster in sunburst. All-original electronics and hardware.',
    category: 'collectibles',
    structured: { era: '1960s', authenticity: 'Certified', condition: 'Very Good' },
    ask_price: 28000,
    condition_notes: [
      { issue: 'Original finish with natural checking', confidence: 'high' },
      { issue: 'Tuning pegs show patina', confidence: 'high' },
      { issue: 'Possible neck pocket date stamp visible', confidence: 'medium' },
    ],
    haggling_ammo: ['All-original electronics verified', 'Comes with COA from Gruhn Guitars'],
    image_urls: ['https://images.pexels.com/photos/1407322/pexels-photo-1407322.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    updated_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'demo-5',
    seller_user_id: '',
    title: 'Herman Miller Aeron Chair',
    description: 'Size B, fully loaded with PostureFit SL. Remastered model, graphite frame.',
    category: 'furniture',
    structured: { material: 'Metal', color: 'Graphite', condition: 'Like New' },
    ask_price: 890,
    condition_notes: [
      { issue: 'Mesh in excellent condition, no sag', confidence: 'high' },
    ],
    haggling_ammo: ['12-year Herman Miller warranty remaining', 'Remastered model (current gen)'],
    image_urls: ['https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 432000000).toISOString(),
    updated_at: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: 'demo-6',
    seller_user_id: '',
    title: 'Nike Air Jordan 1 Retro High OG',
    description: 'Bred colorway, DS with original box and tissue paper. Size 10 US.',
    category: 'clothing',
    structured: { size: 'L', gender: 'Men', brand: 'Nike', condition: 'New' },
    ask_price: 380,
    condition_notes: [
      { issue: 'Deadstock, never worn', confidence: 'high' },
      { issue: 'Box has minor shelf wear', confidence: 'medium' },
    ],
    haggling_ammo: ['Deadstock condition', 'Original everything included'],
    image_urls: ['https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800'],
    hero_image_url: null,
    hero_thumbnail_url: null,
    status: 'active',
    created_at: new Date(Date.now() - 518400000).toISOString(),
    updated_at: new Date(Date.now() - 518400000).toISOString(),
  },
];

export default function ListingsPage() {
  const { listings, setListings, categoryFilter, searchQuery } = useAppStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (listings.length === 0) {
      setListings(DEMO_LISTINGS);
    }
  }, [listings.length, setListings]);

  const filtered = useMemo(() => {
    let result = listings;

    if (categoryFilter) {
      result = result.filter((l) => l.category === categoryFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [listings, categoryFilter, searchQuery]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Products</h1>
            <p className="text-sm text-bp-muted mt-0.5">{filtered.length} listing{filtered.length !== 1 ? 's' : ''} available</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-bp-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-bp-black text-white' : 'text-bp-muted hover:bg-gray-50'}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-bp-black text-white' : 'text-bp-muted hover:bg-gray-50'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <Link href="/sell/new" className="hidden md:inline-block">
              <Button variant="seller" size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Listing
              </Button>
            </Link>
          </div>
        </div>

        {/* Horizontal category filter */}
        <div className="mb-6">
          <HorizontalCategoryFilter />
        </div>

        {/* Main content */}
        {filtered.length === 0 ? (
          <Card className="text-center py-16">
            <p className="text-bp-muted">No listings found</p>
            <p className="text-xs text-bp-muted-light mt-1">Try adjusting your filters or create a new listing</p>
          </Card>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
          }>
            {filtered.map((listing, i) => (
              <div key={listing.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
