'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, User, Bot, Settings, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import type { NegMessage, ParsedMessage } from '@/types/database';

interface StatusRailProps {
  messages: NegMessage[];
  className?: string;
}

function getRoleConfig(role: NegMessage['role']) {
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
}

function StatusCard({ message }: StatusCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = getRoleConfig(message.role);
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
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              {formatPrice(parsed.price_proposal)}
            </Badge>
          )}
          <span className="text-[10px] text-bp-muted-light">
            {formatRelativeTime(message.created_at)}
          </span>
          {expanded ? (
            <ChevronUp className="w-3 h-3 text-bp-muted" />
          ) : (
            <ChevronDown className="w-3 h-3 text-bp-muted" />
          )}
        </div>
      </div>

      <p className="text-sm font-body mt-1.5 text-bp-black line-clamp-2">
        {parsed.status_message || parsed.answer || message.raw.slice(0, 100)}
      </p>

      {parsed.concessions && parsed.concessions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {parsed.concessions.map((c, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 bg-white/80 rounded text-bp-muted"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {parsed.user_prompt && (
        <div className="flex items-center gap-1.5 mt-2 text-bp-warning">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs font-medium">Needs {parsed.user_prompt.target} input</span>
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/50">
          <p className="text-xs text-bp-muted mb-1 font-medium">Full Response:</p>
          <p className="text-xs font-body text-bp-black whitespace-pre-wrap">
            {parsed.answer || message.raw}
          </p>
          {message.raw !== parsed.answer && (
            <>
              <p className="text-xs text-bp-muted mt-2 mb-1 font-medium">Raw Output:</p>
              <pre className="text-[10px] font-mono text-bp-muted bg-white/50 p-2 rounded overflow-auto max-h-32">
                {message.raw}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusRail({ messages, className = '' }: StatusRailProps) {
  if (messages.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <h3 className="font-heading text-sm font-medium mb-3">Status Rail</h3>
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

  return (
    <Card className={`p-4 ${className}`}>
      <h3 className="font-heading text-sm font-medium mb-3">
        Status Rail
        <span className="text-bp-muted font-normal ml-2">({messages.length})</span>
      </h3>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {[...messages].reverse().map((msg) => (
          <StatusCard key={msg.id} message={msg} />
        ))}
      </div>
    </Card>
  );
}
