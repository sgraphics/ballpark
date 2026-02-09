'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, User, Bot, Settings, AlertCircle, ExternalLink, Tag } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import type { NegMessage, ParsedMessage, Listing } from '@/types/database';

interface StatusRailProps {
  messages: NegMessage[];
  listing?: Listing | null;
  className?: string;
  darkMode?: boolean;
  showHero?: boolean;
}

function getRoleConfig(role: NegMessage['role'], dark = false) {
  if (dark) {
    switch (role) {
      case 'buyer_agent':
        return {
          label: 'Buyer Agent',
          icon: Bot,
          borderColor: 'border-l-cyan-500',
          bgColor: 'bg-cyan-500/10',
          textColor: 'text-cyan-400',
        };
      case 'seller_agent':
        return {
          label: 'Seller Agent',
          icon: Bot,
          borderColor: 'border-l-orange-500',
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-400',
        };
      case 'human':
        return {
          label: 'Human',
          icon: User,
          borderColor: 'border-l-yellow-500',
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-400',
        };
      case 'system':
      default:
        return {
          label: 'System',
          icon: Settings,
          borderColor: 'border-l-zinc-600',
          bgColor: 'bg-zinc-800/50',
          textColor: 'text-zinc-400',
        };
    }
  }

  switch (role) {
    case 'buyer_agent':
      return {
        label: 'Buyer Agent',
        icon: Bot,
        borderColor: 'border-l-bp-buyer',
        bgColor: 'bg-bp-buyer-soft/50',
        textColor: 'text-bp-buyer',
      };
    case 'seller_agent':
      return {
        label: 'Seller Agent',
        icon: Bot,
        borderColor: 'border-l-bp-seller',
        bgColor: 'bg-bp-seller-soft/50',
        textColor: 'text-bp-seller',
      };
    case 'human':
      return {
        label: 'Human',
        icon: User,
        borderColor: 'border-l-bp-black',
        bgColor: 'bg-gray-50',
        textColor: 'text-bp-black',
      };
    case 'system':
    default:
      return {
        label: 'System',
        icon: Settings,
        borderColor: 'border-l-gray-300',
        bgColor: 'bg-gray-50',
        textColor: 'text-bp-muted',
      };
  }
}

interface StatusCardProps {
  message: NegMessage;
  darkMode?: boolean;
}

function StatusCard({ message, darkMode = false }: StatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = getRoleConfig(message.role, darkMode);
  const Icon = config.icon;
  const parsed = message.parsed as ParsedMessage;

  return (
    <div
      className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-r-lg p-3 cursor-pointer transition-all hover:shadow-sm`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${config.textColor}`} />
          <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {parsed.price_proposal && (
            <Badge variant="default" className={`text-[10px] px-1.5 py-0 ${darkMode ? 'bg-zinc-700 text-white border-zinc-600' : ''}`}>
              {formatPrice(parsed.price_proposal)}
            </Badge>
          )}
          <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-bp-muted-light'}`}>
            {formatRelativeTime(message.created_at)}
          </span>
          {expanded ? (
            <ChevronUp className={`w-3 h-3 ${darkMode ? 'text-zinc-500' : 'text-bp-muted'}`} />
          ) : (
            <ChevronDown className={`w-3 h-3 ${darkMode ? 'text-zinc-500' : 'text-bp-muted'}`} />
          )}
        </div>
      </div>

      <p className={`text-sm font-body mt-1.5 line-clamp-2 ${darkMode ? 'text-zinc-300' : 'text-bp-black'}`}>
        {parsed.status_message || parsed.answer || message.raw.slice(0, 100)}
      </p>

      {parsed.concessions && parsed.concessions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {parsed.concessions.map((c, i) => (
            <span
              key={i}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                darkMode ? 'bg-white/5 text-zinc-400' : 'bg-white/80 text-bp-muted'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {parsed.user_prompt && (
        <div className={`flex items-center gap-1.5 mt-2 ${darkMode ? 'text-yellow-400' : 'text-bp-warning'}`}>
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs font-medium">Needs {parsed.user_prompt.target} input</span>
        </div>
      )}

      {expanded && (
        <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-white/10' : 'border-white/50'}`}>
          <p className={`text-xs mb-1 font-medium ${darkMode ? 'text-zinc-500' : 'text-bp-muted'}`}>Full Response:</p>
          <p className={`text-xs font-body whitespace-pre-wrap ${darkMode ? 'text-zinc-300' : 'text-bp-black'}`}>
            {parsed.answer || message.raw}
          </p>
          {message.raw !== parsed.answer && (
            <>
              <p className={`text-xs mt-2 mb-1 font-medium ${darkMode ? 'text-zinc-500' : 'text-bp-muted'}`}>Raw Output:</p>
              <pre className={`text-[10px] font-mono p-2 rounded overflow-auto max-h-32 ${
                darkMode ? 'text-zinc-400 bg-black/30' : 'text-bp-muted bg-white/50'
              }`}>
                {message.raw}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HeroThumbnail({ listing }: { listing: Listing }) {
  const heroImage = listing.hero_thumbnail_url || listing.hero_image_url || listing.image_urls?.[0];

  return (
    <div className="mb-4 pb-4 border-b border-bp-border">
      <div className="flex gap-3">
        {heroImage ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            <img
              src={heroImage}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
            <Tag className="w-6 h-6 text-bp-muted-light" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-heading text-sm text-bp-black truncate">
            {listing.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              {listing.category}
            </Badge>
            <span className="text-xs font-medium text-bp-seller">
              {formatPrice(listing.ask_price)}
            </span>
          </div>
          <Link
            href={`/listings/${listing.id}`}
            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-bp-buyer hover:text-bp-buyer/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View Listing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function StatusRail({ messages, listing, className = '', darkMode = false, showHero = true }: StatusRailProps) {
  if (messages.length === 0) {
    if (darkMode) {
      return (
        <div className={`bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 ${className}`}>
          <h3 className="font-heading text-sm mb-3 text-zinc-400">
            Status Rail
          </h3>
          <div className="text-center py-8">
            <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No messages yet</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Start the negotiation to see updates
            </p>
          </div>
        </div>
      );
    }

    return (
      <Card className={`p-4 ${className}`}>
        <h3 className="font-heading text-sm mb-3">Status Rail</h3>
        {showHero && listing && <HeroThumbnail listing={listing} />}
        <div className="text-center py-8">
          <Bot className="w-8 h-8 text-bp-muted-light mx-auto mb-2" />
          <p className="text-xs text-bp-muted">No messages yet</p>
          <p className="text-[10px] text-bp-muted-light mt-1">
            Start the negotiation to see updates
          </p>
        </div>
      </Card>
    );
  }

  const content = (
    <>
      <h3 className={`font-heading text-sm mb-3 ${darkMode ? 'text-zinc-400' : ''}`}>
        Status Rail
        <span className={`font-normal ml-2 ${darkMode ? 'text-zinc-600' : 'text-bp-muted'}`}>
          ({messages.length})
        </span>
      </h3>
      {showHero && !darkMode && listing && <HeroThumbnail listing={listing} />}
      <div className={`space-y-2 overflow-y-auto pr-1 max-h-[70vh]`}>
        {[...messages].reverse().map((msg) => (
          <StatusCard key={msg.id} message={msg} darkMode={darkMode} />
        ))}
      </div>
    </>
  );

  if (darkMode) {
    return (
      <div className={`bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 h-full flex flex-col ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      {content}
    </Card>
  );
}
