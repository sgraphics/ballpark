'use client';

import { useState } from 'react';
import { MessageSquare, Send, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ParsedMessage } from '@/types/database';

interface HumanInputProps {
  prompt: NonNullable<ParsedMessage['user_prompt']>;
  onSubmit: (response: string) => void;
  isSubmitting?: boolean;
}

export function HumanInput({ prompt, onSubmit, isSubmitting }: HumanInputProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const hasChoices = Array.isArray(prompt.choices) && prompt.choices.length > 0;

  const handleSubmit = () => {
    const response = hasChoices ? selectedChoice : freeText;
    if (response) {
      onSubmit(response);
    }
  };

  const canSubmit = hasChoices ? !!selectedChoice : freeText.trim().length > 0;

  return (
    <Card className="p-5 border-2 border-bp-warning bg-bp-warning-soft/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-bp-warning/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-bp-warning" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-bp-warning font-medium">
            Input Required ({prompt.target})
          </p>
          <p className="font-heading text-base text-bp-black mt-1">{prompt.question}</p>
        </div>
      </div>

      {hasChoices ? (
        <div className="space-y-2 mb-4">
          {prompt.choices!.map((choice) => (
            <button
              key={choice}
              onClick={() => setSelectedChoice(choice)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedChoice === choice
                  ? 'border-bp-black bg-bp-black text-white'
                  : 'border-bp-border bg-white hover:border-bp-black/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedChoice === choice
                    ? 'border-white bg-white'
                    : 'border-bp-muted-light'
                }`}>
                  {selectedChoice === choice && (
                    <Check className="w-3 h-3 text-bp-black" />
                  )}
                </div>
                <span className="text-sm font-body">{choice}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Type your response..."
            rows={3}
            className="w-full px-3 py-2 text-sm font-body border border-bp-border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-bp-warning/30 focus:border-bp-warning
              placeholder:text-bp-muted-light transition-all resize-none"
          />
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          loading={isSubmitting}
          className="bg-bp-warning hover:bg-bp-warning/90 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Response'}
          {!isSubmitting && <Send className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </Card>
  );
}
