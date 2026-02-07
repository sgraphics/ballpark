'use client';

import { Sparkles, AlertTriangle, Shield, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getConfidenceColor } from '@/lib/utils';
import type { ImageAnalysisResult } from '@/lib/gemini';

interface AiAnalysisProps {
  analysis: ImageAnalysisResult;
  isDemo?: boolean;
}

export function AiAnalysis({ analysis, isDemo }: AiAnalysisProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {isDemo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-bp-warning-soft rounded-lg text-xs text-bp-warning">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Demo mode: Gemini API not configured. Showing placeholder analysis.
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-bp-seller" />
        <h3 className="font-heading text-base font-medium">AI Analysis</h3>
      </div>

      <Card>
        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-bp-muted uppercase tracking-wide">Suggested Title</span>
            <p className="text-sm font-medium mt-0.5">{analysis.suggested_title}</p>
          </div>

          <div>
            <span className="text-[11px] text-bp-muted uppercase tracking-wide">Description</span>
            <p className="text-sm text-bp-muted mt-0.5">{analysis.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-bp-muted" />
            <span className="text-[11px] text-bp-muted uppercase tracking-wide">Category Suggestion:</span>
            <Badge variant="default">{analysis.category_suggestion}</Badge>
          </div>
        </div>
      </Card>

      {analysis.condition_notes.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5 text-bp-muted" />
            <span className="text-xs font-medium uppercase tracking-wide text-bp-muted">Condition Notes</span>
          </div>
          <div className="space-y-2">
            {analysis.condition_notes.map((note, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 text-sm"
              >
                <span className="flex-1">{note.issue}</span>
                <span className={`text-[10px] font-medium uppercase ${getConfidenceColor(note.confidence)}`}>
                  {note.confidence}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysis.haggling_ammo.length > 0 && (
        <Card>
          <span className="text-xs font-medium uppercase tracking-wide text-bp-muted block mb-3">
            Haggling Ammo
          </span>
          <div className="flex flex-wrap gap-2">
            {analysis.haggling_ammo.map((item, i) => (
              <span
                key={i}
                className="inline-block px-2.5 py-1 bg-gray-50 border border-bp-border rounded-full text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
