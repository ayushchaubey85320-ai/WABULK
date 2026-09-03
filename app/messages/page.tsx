'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function MessagesPage() {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');

  const loadMessages = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '25',
    });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    fetch(`/api/messages?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        if (d.pagination) setPagination(d.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadMessages(1);
  }, [status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMessages(1);
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
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
        return <Badge variant="secondary" className="text-[10px]">{st}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Message Logs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive audit trail of all outbound and simulated WhatsApp messages with timestamps.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadMessages(pagination.page)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Logs
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by recipient name, phone, WhatsApp message ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="READ">READ</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="SENT">SENT</option>
                  <option value="FAILED">FAILED</option>
                  <option value="QUEUED">QUEUED</option>
                </select>
              </div>

              <Button type="submit" size="sm" className="h-9">
                Filter Logs
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Messages Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[11px] text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Recipient</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Campaign</th>
                    <th className="py-2.5 px-4">Template</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">WhatsApp ID</th>
                    <th className="py-2.5 px-4">Sent</th>
                    <th className="py-2.5 px-4">Delivered</th>
                    <th className="py-2.5 px-4">Read</th>
                    <th className="py-2.5 px-4">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        Loading message logs...
                      </td>
                    </tr>
                  ) : messages.length > 0 ? (
                    messages.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-foreground">{m.recipientName}</td>
                        <td className="py-2.5 px-4 font-mono text-muted-foreground">{m.phone}</td>
                        <td className="py-2.5 px-4">
                          {m.campaignId ? (
                            <Link href={`/campaigns/${m.campaignId}`} className="text-primary hover:underline">
                              {m.campaignName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">{m.templateName || '-'}</td>
                        <td className="py-2.5 px-4">{getStatusBadge(m.status)}</td>
                        <td className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground">
                          {m.whatsappMessageId || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(m.sentAt)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(m.deliveredAt)}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(m.readAt)}</td>
                        <td className="py-2.5 px-4 text-red-500 max-w-xs truncate">{m.errorMessage || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        No message records match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} messages
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadMessages(pagination.page - 1)}
                  className="h-8"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs font-semibold">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadMessages(pagination.page + 1)}
                  className="h-8"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
