'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, LayoutGrid, List, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { ListingCard } from '@/components/listings/listing-card';
import { HorizontalCategoryFilter } from '@/components/feed/horizontal-category-filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/store/app-store';

export default function ListingsPage() {
  const { listings, setListings, categoryFilter, searchQuery } = useAppStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);
      const qs = params.toString();
      const res = await fetch(`/api/listings${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(`Failed to fetch listings (${res.status})`);
      const data = await res.json();
      setListings(data.listings ?? []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, setListings]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filtered = listings;

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
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-bp-muted" />
            <p className="text-sm text-bp-muted">Loading listings...</p>
          </div>
        ) : error ? (
          <Card className="text-center py-16">
            <p className="text-bp-muted">{error}</p>
            <button onClick={fetchListings} className="text-xs text-blue-600 hover:underline mt-2">Retry</button>
          </Card>
        ) : filtered.length === 0 ? (
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
