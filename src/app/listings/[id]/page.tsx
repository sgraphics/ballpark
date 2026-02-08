'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Tag, Shield, Crosshair, DollarSign, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { ImageGallery } from '@/components/listings/image-gallery';
import { StructuredFields } from '@/components/listings/structured-fields';
import { EventFeed } from '@/components/feed/event-feed';
import { ListingNegotiations } from '@/components/negotiation/listing-negotiations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, getStateBadge, getStateLabel, getConfidenceColor } from '@/lib/utils';
import { getCategoryById } from '@/types/categories';
import { useAppStore } from '@/store/app-store';
import type { Listing } from '@/types/database';

const DEMO_LISTING: Listing = {
  id: 'demo-1',
  seller_user_id: '',
  title: 'Vintage Leather Jacket',
  description:
    'Genuine Italian leather, minimal wear. Beautiful patina developing on the shoulders and arms. Classic cut that never goes out of style.',
  category: 'clothing',
  structured: { size: 'L', gender: 'Men', brand: 'Schott NYC', condition: 'Good' },
  ask_price: 450,
  condition_notes: [
    { issue: 'Light scuffing on left elbow', confidence: 'high' },
    { issue: 'Minor fading on collar', confidence: 'medium' },
    { issue: 'Interior lining intact with no tears', confidence: 'high' },
  ],
  haggling_ammo: [
    'Vintage patina adds character',
    'Original zippers intact',
    'Leather has natural wear pattern',
    'Schott NYC is a premium heritage brand',
  ],
  image_urls: [
    'https://images.pexels.com/photos/1124468/pexels-photo-1124468.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
  hero_image_url: null,
  hero_thumbnail_url: null,
  status: 'active',
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date(Date.now() - 86400000).toISOString(),
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { listings, addListing } = useAppStore();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetchedListing, setFetchedListing] = useState<Listing | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const storeListing = useMemo(() => {
    return listings.find((l) => l.id === id) || null;
  }, [listings, id]);

  useEffect(() => {
    if (!storeListing && !fetchedListing && !loading && !fetchError && !id.startsWith('demo')) {
      setLoading(true);
      fetch(`/api/listings?id=${encodeURIComponent(id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.listings && data.listings.length > 0) {
            setFetchedListing(data.listings[0]);
            addListing(data.listings[0]);
          } else {
            setFetchError(true);
          }
        })
        .catch(() => {
          setFetchError(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, storeListing, fetchedListing, loading, fetchError, addListing]);

  const listing = storeListing || fetchedListing || (id.startsWith('demo') ? DEMO_LISTING : null);

  const galleryImages = useMemo(() => {
    if (!listing) return [];
    const images = [...(listing.image_urls || [])];
    if (listing.hero_image_url) {
      images.unshift(listing.hero_image_url);
    }
    return images;
  }, [listing]);

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-bp-muted" />
          <p className="text-bp-muted">Loading listing...</p>
        </div>
      </MainLayout>
    );
  }

  if (!listing) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-bp-muted mb-4">Listing not found</p>
          <Button variant="secondary" onClick={() => router.push('/listings')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Listings
          </Button>
        </div>
      </MainLayout>
    );
  }

  const cat = getCategoryById(listing.category);
  const badge = getStateBadge(listing.status);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-bp-muted hover:text-bp-black transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-7 space-y-6">
            <ImageGallery images={galleryImages} alt={listing.title} />

            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-heading text-2xl font-medium">{listing.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    {cat && (
                      <Badge variant="default">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {cat.name}
                      </Badge>
                    )}
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.bg} ${badge.text}`}>
                      {getStateLabel(listing.status)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-2xl font-semibold">
                    <DollarSign className="w-5 h-5 text-bp-muted" />
                    {formatPrice(listing.ask_price).replace('$', '')}
                  </div>
                  <span className="text-xs text-bp-muted">asking price</span>
                </div>
              </div>

              {listing.description && (
                <p className="text-sm text-bp-muted leading-relaxed mb-4">{listing.description}</p>
              )}

              {listing.structured && Object.keys(listing.structured).length > 0 && (
                <div className="pt-4 border-t border-bp-border">
                  <StructuredFields category={listing.category} structured={listing.structured} />
                </div>
              )}
            </Card>
          </div>

          <div className="col-span-5 space-y-4">
            <Card>
              <h3 className="font-heading text-sm font-medium mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-bp-muted" />
                Condition Notes
              </h3>
              {listing.condition_notes?.length > 0 ? (
                <div className="space-y-2">
                  {listing.condition_notes.map((note, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-gray-50"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          note.confidence === 'high'
                            ? 'bg-bp-error'
                            : note.confidence === 'medium'
                              ? 'bg-bp-warning'
                              : 'bg-bp-muted'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{note.issue}</p>
                        <span
                          className={`text-[10px] font-medium uppercase ${getConfidenceColor(note.confidence)}`}
                        >
                          {note.confidence} confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-bp-muted">No condition notes available</p>
              )}
            </Card>

            {listing.haggling_ammo?.length > 0 && (
              <Card>
                <h3 className="font-heading text-sm font-medium mb-4 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-bp-muted" />
                  Haggling Ammo
                </h3>
                <div className="space-y-1.5">
                  {listing.haggling_ammo.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-bp-muted mt-0.5">-</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <ListingNegotiations
                listingId={listing.id}
                title="Negotiations"
              />
            </Card>

            <Card dark>
              <EventFeed
                listingId={listing.id}
                title="Activity Feed"
                showPromptFilter={true}
                compact={true}
                emptyMessage="No activity yet. Waiting for buy agents to discover this listing."
                autoScroll={true}
              />
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
