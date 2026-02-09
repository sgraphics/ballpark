'use client';

import { Bot, Search, ChevronRight, Zap, Play, Pause, Square } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatRelativeTime } from '@/lib/utils';
import { getCategoryById } from '@/types/categories';
import type { BuyAgent, BuyAgentStatus } from '@/types/database';

interface BuyAgentCardProps {
  agent: BuyAgent;
  matchCount?: number;
  onClick: () => void;
  onStatusChange?: (agentId: string, status: BuyAgentStatus) => void;
  selected?: boolean;
}

function StatusBadge({ status }: { status: BuyAgentStatus }) {
  const config = {
    active: { label: 'Active', bg: 'bg-bp-success-soft', text: 'text-bp-success', dot: 'bg-bp-success animate-pulse' },
    paused: { label: 'Paused', bg: 'bg-bp-warning-soft', text: 'text-bp-warning', dot: 'bg-bp-warning' },
    stopped: { label: 'Stopped', bg: 'bg-gray-100', text: 'text-bp-muted', dot: 'bg-bp-muted' },
  };
  const c = config[status] || config.active;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function BuyAgentCard({ agent, matchCount = 0, onClick, onStatusChange, selected }: BuyAgentCardProps) {
  const category = getCategoryById(agent.category);
  const filters = agent.filters as Record<string, string>;
  const activeFilters = Object.entries(filters).filter(([, v]) => v);
  const status = agent.status || 'active';

  const handleStatusToggle = (e: React.MouseEvent, newStatus: BuyAgentStatus) => {
    e.stopPropagation();
    onStatusChange?.(agent.id, newStatus);
  };

  return (
    <Card
      interactive
      onClick={onClick}
      className={`group ${selected ? 'ring-2 ring-bp-buyer border-bp-buyer' : ''} ${status === 'stopped' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            status === 'active' ? 'bg-bp-buyer-soft' : 'bg-gray-100'
          }`}>
            <Bot className={`w-5 h-5 ${status === 'active' ? 'text-bp-buyer' : 'text-bp-muted'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm truncate">{agent.name}</h3>
              <StatusBadge status={status} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {category && <Badge variant="buyer">{category.name}</Badge>}
              {agent.max_price > 0 && (
                <span className="text-xs text-bp-muted font-body">
                  up to {formatPrice(agent.max_price)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {matchCount > 0 && (
            <div className="flex items-center gap-1 bg-bp-buyer-soft text-bp-buyer px-2 py-0.5 rounded-full">
              <Search className="w-3 h-3" />
              <span className="text-xs font-medium font-body">{matchCount}</span>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-bp-muted-light group-hover:text-bp-black transition-colors" />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {activeFilters.slice(0, 4).map(([key, value]) => (
            <span
              key={key}
              className="text-[11px] font-body px-2 py-0.5 bg-gray-50 text-bp-muted rounded-md"
            >
              {key}: {value}
            </span>
          ))}
          {activeFilters.length > 4 && (
            <span className="text-[11px] text-bp-muted-light">
              +{activeFilters.length - 4} more
            </span>
          )}
        </div>
      )}

      {agent.prompt && (
        <p className="text-xs text-bp-muted mt-2 line-clamp-2 font-body">{agent.prompt}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-bp-border">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3 h-3 ${
            agent.urgency === 'high'
              ? 'text-bp-error'
              : agent.urgency === 'medium'
                ? 'text-bp-warning'
                : 'text-bp-muted'
          }`} />
          <span className="text-[11px] text-bp-muted font-body capitalize">{agent.urgency} urgency</span>
        </div>

        {/* Status controls */}
        {onStatusChange && (
          <div className="flex items-center gap-1">
            {status === 'active' && (
              <button
                onClick={(e) => handleStatusToggle(e, 'paused')}
                className="p-1 rounded hover:bg-bp-warning-soft text-bp-muted hover:text-bp-warning transition-colors"
                title="Pause agent"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            )}
            {status === 'paused' && (
              <button
                onClick={(e) => handleStatusToggle(e, 'active')}
                className="p-1 rounded hover:bg-bp-success-soft text-bp-muted hover:text-bp-success transition-colors"
                title="Resume agent"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {status !== 'stopped' && (
              <button
                onClick={(e) => handleStatusToggle(e, 'stopped')}
                className="p-1 rounded hover:bg-bp-error-soft text-bp-muted hover:text-bp-error transition-colors"
                title="Stop agent"
              >
                <Square className="w-3 h-3" />
              </button>
            )}
            {status === 'stopped' && (
              <button
                onClick={(e) => handleStatusToggle(e, 'active')}
                className="p-1 rounded hover:bg-bp-success-soft text-bp-muted hover:text-bp-success transition-colors"
                title="Reactivate agent"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {!onStatusChange && (
          <span className="text-[11px] text-bp-muted-light font-body">
            {formatRelativeTime(agent.created_at)}
          </span>
        )}
      </div>
    </Card>
  );
}
