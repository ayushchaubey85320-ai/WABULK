'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, CheckCheck, Eye, AlertCircle, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function AnalyticsPage() {
  const [range, setRange] = React.useState('30d');
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const loadAnalytics = () => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadAnalytics();
  }, [range]);

  const metrics = data?.metrics || {
    totalContacts: 0,
    activeContacts: 0,
    totalCampaigns: 0,
    messagesSent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    rates: { deliveryRate: 0, readRate: 0, failureRate: 0 },
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Reporting</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive performance intelligence and delivery KPIs across all campaigns.
            </p>
          </div>
          <Tabs
            tabs={[
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ]}
            activeTab={range}
            onChange={setRange}
          />
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-muted-foreground">Total Messages Sent</span>
              <div className="text-2xl font-bold text-foreground mt-1">
                {loading ? '...' : metrics.messagesSent.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> WhatsApp Cloud API
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-muted-foreground">Delivery Rate</span>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                {loading ? '...' : `${metrics.rates.deliveryRate}%`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {metrics.delivered.toLocaleString()} delivered successfully
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-muted-foreground">Read / Engagement Rate</span>
              <div className="text-2xl font-bold text-[#34B7F1] mt-1">
                {loading ? '...' : `${metrics.rates.readRate}%`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {metrics.read.toLocaleString()} confirmed opens
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <span className="text-xs font-semibold text-muted-foreground">Failure Rate</span>
              <div className="text-2xl font-bold text-red-500 mt-1">
                {loading ? '...' : `${metrics.rates.failureRate}%`}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {metrics.failed.toLocaleString()} dropped / failed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Delivery Progression Trend</CardTitle>
              <CardDescription className="text-xs">Daily messages sent, delivered, and read over time</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64 w-full">
                {data?.timeSeries && data.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.75rem',
                          fontSize: '11px',
                        }}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#10B981" fill="#10B981" fillOpacity={0.1} name="Sent" />
                      <Area type="monotone" dataKey="delivered" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.2} name="Delivered" />
                      <Area type="monotone" dataKey="read" stroke="#34B7F1" fill="#34B7F1" fillOpacity={0.3} name="Read" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No data in range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bar Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Outcome Volume Comparison</CardTitle>
              <CardDescription className="text-xs">Comparison between successfully delivered vs failed</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64 w-full">
                {data?.timeSeries && data.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.75rem',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="delivered" fill="#10B981" name="Delivered" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" fill="#EF4444" name="Failed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No data in range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
