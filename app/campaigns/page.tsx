'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Send, Plus, ArrowRight, Play, Pause, XCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterTab, setFilterTab] = React.useState('all');

  const loadCampaigns = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTab !== 'all') {
      params.set('status', filterTab.toUpperCase());
    }

    fetch(`/api/campaigns?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d.campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadCampaigns();
    const interval = setInterval(loadCampaigns, 6000);
    return () => clearInterval(interval);
  }, [filterTab]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'RUNNING':
        return <Badge variant="default" className="bg-emerald-600 animate-pulse">RUNNING</Badge>;
      case 'PAUSED':
        return <Badge variant="warning">PAUSED</Badge>;
      case 'SCHEDULED':
        return <Badge variant="info">SCHEDULED</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">CANCELLED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Campaigns</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create, schedule, track, and analyze WhatsApp message broadcast campaigns.
            </p>
          </div>
          <Link href="/campaigns/new">
            <Button variant="whatsapp" size="sm" className="shadow-md">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <Tabs
          tabs={[
            { id: 'all', label: 'All Campaigns', count: campaigns.length },
            { id: 'running', label: 'Running' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'completed', label: 'Completed' },
          ]}
          activeTab={filterTab}
          onChange={setFilterTab}
        />

        {/* Campaign List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                Loading campaigns...
              </CardContent>
            </Card>
          ) : campaigns.length > 0 ? (
            campaigns.map((camp) => {
              const processed = camp.sentCount + camp.failedCount + camp.skippedCount;
              const percent = camp.totalRecipients > 0 ? Math.min(100, Math.round((processed / camp.totalRecipients) * 100)) : 0;

              return (
                <Card key={camp.id} className="hover:border-primary/40 transition-all">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left info */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/campaigns/${camp.id}`}
                            className="font-bold text-base text-foreground hover:text-primary hover:underline"
                          >
                            {camp.name}
                          </Link>
                          {getStatusBadge(camp.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {camp.description || 'No description'} • Template:{' '}
                          <span className="font-mono text-foreground font-medium">{camp.template?.name}</span>
                        </p>
                        <div className="text-[11px] text-muted-foreground pt-1 flex items-center space-x-4">
                          <span>Created {formatDate(camp.createdAt)}</span>
                          {camp.createdBy && <span>By {camp.createdBy.name}</span>}
                        </div>
                      </div>

                      {/* Right metrics & progress bar */}
                      <div className="lg:w-80 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Progress:</span>
                          <span className="text-foreground">
                            {percent}% ({processed}/{camp.totalRecipients})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-[11px] text-center pt-1">
                          <div className="p-1 rounded bg-muted/30">
                            <span className="text-muted-foreground block text-[9px]">SENT</span>
                            <span className="font-semibold text-foreground">{camp.sentCount}</span>
                          </div>
                          <div className="p-1 rounded bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300">
                            <span className="block text-[9px]">DELIVERED</span>
                            <span className="font-semibold">{camp.deliveredCount}</span>
                          </div>
                          <div className="p-1 rounded bg-blue-50 dark:bg-blue-950/30 text-[#34B7F1]">
                            <span className="block text-[9px]">READ</span>
                            <span className="font-semibold">{camp.readCount}</span>
                          </div>
                          <div className="p-1 rounded bg-red-50 dark:bg-red-950/30 text-red-600">
                            <span className="block text-[9px]">FAILED</span>
                            <span className="font-semibold">{camp.failedCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Details Link */}
                      <div className="flex items-center justify-end">
                        <Link href={`/campaigns/${camp.id}`}>
                          <Button variant="outline" size="sm" className="h-8">
                            Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-12 text-center space-y-3">
                <Send className="w-10 h-10 text-muted-foreground mx-auto" />
                <h3 className="text-base font-bold text-foreground">No campaigns yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Create your first broadcast campaign to message your audience with personalized WhatsApp templates.
                </p>
                <div className="pt-2">
                  <Link href="/campaigns/new">
                    <Button variant="whatsapp" size="sm">
                      Create Campaign
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
