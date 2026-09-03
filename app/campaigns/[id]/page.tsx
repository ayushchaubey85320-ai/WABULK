'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Play,
  Pause,
  XCircle,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function CampaignDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = React.useState<any>(null);
  const [recipients, setRecipients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchCampaign = () => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.campaign) setCampaign(d.campaign);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/campaigns/${id}/recipients?limit=50`)
      .then((r) => r.json())
      .then((d) => {
        if (d.recipients) setRecipients(d.recipients);
      })
      .catch(() => {});
  };

  React.useEffect(() => {
    fetchCampaign();
    // Live update interval
    const interval = setInterval(fetchCampaign, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleAction = async (action: 'start' | 'pause' | 'resume' | 'cancel') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || `Failed to ${action} campaign`);
        setActionLoading(false);
        return;
      }
      toast.success(`Campaign ${action}ed successfully!`);
      fetchCampaign();
    } catch (e) {
      toast.error('Action failed');
    } finally {
      setActionLoading(false);
    }
  };

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
      case 'CANCELLED':
        return <Badge variant="outline">CANCELLED</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecipientStatusBadge = (status: string) => {
    switch (status) {
      case 'READ':
        return <Badge variant="info" className="text-[10px]">READ</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="text-[10px]">DELIVERED</Badge>;
      case 'SENT':
        return <Badge variant="default" className="text-[10px]">SENT</Badge>;
      case 'QUEUED':
        return <Badge variant="secondary" className="text-[10px]">QUEUED</Badge>;
      case 'FAILED':
        return <Badge variant="destructive" className="text-[10px]">FAILED</Badge>;
      case 'SKIPPED':
        return <Badge variant="outline" className="text-[10px]">SKIPPED</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  if (loading || !campaign) {
    return (
      <AppShell>
        <div className="py-12 text-center text-xs text-muted-foreground">
          Loading campaign analytics...
        </div>
      </AppShell>
    );
  }

  const processed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
  const progressPercent = campaign.totalRecipients > 0
    ? Math.min(100, Math.round((processed / campaign.totalRecipients) * 100))
    : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link href="/campaigns">
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{campaign.name}</h1>
                {getStatusBadge(campaign.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Template: <strong className="font-mono text-foreground">{campaign.template?.name}</strong> • Created by {campaign.createdBy?.name || 'Admin'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {campaign.status === 'DRAFT' && (
              <Button
                variant="whatsapp"
                size="sm"
                loading={actionLoading}
                onClick={() => handleAction('start')}
              >
                <Play className="w-3.5 h-3.5 mr-1" /> Start Sending
              </Button>
            )}
            {campaign.status === 'RUNNING' && (
              <Button
                variant="outline"
                size="sm"
                loading={actionLoading}
                onClick={() => handleAction('pause')}
              >
                <Pause className="w-3.5 h-3.5 mr-1" /> Pause Campaign
              </Button>
            )}
            {campaign.status === 'PAUSED' && (
              <Button
                variant="whatsapp"
                size="sm"
                loading={actionLoading}
                onClick={() => handleAction('resume')}
              >
                <Play className="w-3.5 h-3.5 mr-1" /> Resume Campaign
              </Button>
            )}
            {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
              <Button
                variant="destructive"
                size="sm"
                loading={actionLoading}
                onClick={() => handleAction('cancel')}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Live Progress Bar Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-card to-emerald-50/10 dark:to-emerald-950/10">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center space-x-2 text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>Execution Progress</span>
              </span>
              <span className="text-foreground">
                {progressPercent}% Complete ({processed} / {campaign.totalRecipients} recipients processed)
              </span>
            </div>
            <div className="w-full h-3.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-[#128C7E] to-[#25D366] rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 6 Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border text-center shadow-sm">
            <span className="text-xs text-muted-foreground">Total Audience</span>
            <div className="text-xl font-bold text-foreground mt-1">{campaign.totalRecipients}</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-center shadow-sm">
            <span className="text-xs text-emerald-800 dark:text-emerald-300">Sent Out</span>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{campaign.sentCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-500/30 text-center shadow-sm">
            <span className="text-xs text-teal-800 dark:text-teal-300">Delivered</span>
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400 mt-1">{campaign.deliveredCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 text-center shadow-sm">
            <span className="text-xs text-blue-800 dark:text-blue-300">Read / Opened</span>
            <div className="text-xl font-bold text-[#34B7F1] mt-1">{campaign.readCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-500/30 text-center shadow-sm">
            <span className="text-xs text-red-800 dark:text-red-300">Failed</span>
            <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{campaign.failedCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-500/30 text-center shadow-sm">
            <span className="text-xs text-amber-800 dark:text-amber-300">Skipped (Opt-out)</span>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{campaign.skippedCount}</div>
          </div>
        </div>

        {/* Rates Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Delivery Rate</div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                {campaign.rates?.deliveryRate || 0}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Delivered / Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Read / Engagement Rate</div>
              <div className="text-2xl font-bold text-[#34B7F1] mt-1">
                {campaign.rates?.readRate || 0}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Read / Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Failure Rate</div>
              <div className="text-2xl font-bold text-red-500 mt-1">
                {campaign.rates?.failureRate || 0}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Failed / Total Audience</p>
            </CardContent>
          </Card>
        </div>

        {/* Recipients Log Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold">Recipients Message Log</CardTitle>
              <CardDescription className="text-xs">Individual recipient statuses and WhatsApp tracking IDs</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCampaign}>
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[11px] text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">WhatsApp ID</th>
                    <th className="py-2.5 px-4">Sent At</th>
                    <th className="py-2.5 px-4">Delivered</th>
                    <th className="py-2.5 px-4">Read</th>
                    <th className="py-2.5 px-4">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recipients.length > 0 ? (
                    recipients.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">{r.name}</td>
                        <td className="py-2.5 px-4 font-mono text-muted-foreground">{r.phone}</td>
                        <td className="py-2.5 px-4">{getRecipientStatusBadge(r.status)}</td>
                        <td className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground">
                          {r.whatsappMessageId || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(r.sentAt)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(r.deliveredAt)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(r.readAt)}</td>
                        <td className="py-2.5 px-4 text-red-500 max-w-xs truncate">{r.errorMessage || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No recipient logs recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
