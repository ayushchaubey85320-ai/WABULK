'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, ChevronLeft, ChevronRight, RefreshCw, Shield } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AuditLogsPage() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);

  const loadLogs = (page = 1) => {
    setLoading(true);
    fetch(`/api/audit-logs?page=${page}&limit=25`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || []);
        if (d.pagination) setPagination(d.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadLogs(1);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit & Security Trail</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Immutable historical activity logging for compliance and organizational security.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadLogs(pagination.page)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Trail
          </Button>
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[11px] text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Metadata</th>
                    <th className="py-2.5 px-4">IP Address</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-muted font-bold text-foreground">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">{log.entity}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{log.userEmail || 'System Engine'}</td>
                        <td className="py-2.5 px-4 font-mono text-[10px] text-muted-foreground max-w-sm truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '-'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground">{log.ipAddress || '-'}</td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No audit events recorded yet.
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadLogs(pagination.page - 1)}
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
                  onClick={() => loadLogs(pagination.page + 1)}
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
