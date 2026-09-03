'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

export function DemoBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  const [isDemo, setIsDemo] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.whatsapp?.isConfigured) {
          setIsDemo(false);
        }
      })
      .catch(() => {});
  }, []);

  if (!isDemo || dismissed) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
          <span>
            <strong className="font-semibold">Safe Demo Mode Active:</strong> WhatsApp Cloud API credentials are not configured. Message sending and webhooks are safely simulated for local testing without contacting Meta servers.
          </span>
        </div>
        <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
          <Link
            href="/settings"
            className="font-medium underline hover:text-amber-700 dark:hover:text-white flex items-center"
          >
            Configure WhatsApp API <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-700 dark:text-amber-300 hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
