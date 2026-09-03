'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Send,
  CheckCheck,
  Eye,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  PlusCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchDashboardData = () => {
    fetch('/api/analytics?range=30d')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 10 seconds to show live campaign progress
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.metrics || {
    totalContacts: 0,
    activeContacts: 0,
    totalCampaigns: 0,
    messagesSent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    scheduledCampaigns: 0,
    rates: { deliveryRate: 0, readRate: 0, failureRate: 0 },
  };

  const statCards = [
    { title: 'Total Contacts', value: metrics.totalContacts.toLocaleString(), subtitle: `${metrics.activeContacts.toLocaleString()} active & opted in`, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total Campaigns', value: metrics.totalCampaigns.toLocaleString(), subtitle: `${metrics.scheduledCampaigns} scheduled`, icon: Send, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Messages Sent', value: metrics.messagesSent.toLocaleString(), subtitle: 'Dispatched to WhatsApp', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Delivered', value: metrics.delivered.toLocaleString(), subtitle: `${metrics.rates.deliveryRate}% delivery rate`, icon: CheckCheck, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { title: 'Read', value: metrics.read.toLocaleString(), subtitle: `${metrics.rates.readRate}% open/read rate`, icon: Eye, color: 'text-[#34B7F1]', bg: 'bg-blue-400/10' },
    { title: 'Failed', value: metrics.failed.toLocaleString(), subtitle: `${metrics.rates.failureRate}% failure rate`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'RUNNING':
        return <Badge variant="default" className="animate-pulse bg-emerald-600">RUNNING</Badge>;
      case 'PAUSED':
        return <Badge variant="warning">PAUSED</Badge>;
      case 'SCHEDULED':
        return <Badge variant="info">SCHEDULED</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">FAILED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Messaging Overview
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live metrics and performance for your WhatsApp Business campaigns.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/contacts/import">
              <Button variant="outline" size="sm">
                Import Audience
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button variant="whatsapp" size="sm" className="shadow-emerald-500/20 shadow-md">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Launch Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* 6 Top Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                    <div className={`p-2 rounded-xl ${stat.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="mt-2 text-xl font-bold text-foreground tracking-tight">
                    {loading ? '...' : stat.value}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{stat.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Time-series Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Message Volume & Delivery</CardTitle>
                  <CardDescription className="text-xs">Daily messages processed in the last 30 days</CardDescription>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-muted-foreground text-[11px]">Sent</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                    <span className="text-muted-foreground text-[11px]">Delivered</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34B7F1] inline-block" />
                    <span className="text-muted-foreground text-[11px]">Read</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-64 w-full">
                {data?.timeSeries && data.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34B7F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#34B7F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
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
                      <Area type="monotone" dataKey="sent" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
                      <Area type="monotone" dataKey="delivered" stroke="#14B8A6" strokeWidth={1.5} fillOpacity={0} name="Delivered" />
                      <Area type="monotone" dataKey="read" stroke="#34B7F1" strokeWidth={2} fillOpacity={1} fill="url(#colorRead)" name="Read" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No messaging activity recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Read Funnel Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Delivery Performance</CardTitle>
              <CardDescription className="text-xs">End-to-end messaging pipeline status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">Delivery Rate</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{metrics.rates.deliveryRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.rates.deliveryRate)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">Read / Open Rate</span>
                  <span className="font-bold text-[#34B7F1]">{metrics.rates.readRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#34B7F1] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.rates.readRate)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-foreground">Failure Rate</span>
                  <span className="font-bold text-red-500">{metrics.rates.failureRate}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, metrics.rates.failureRate)}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center text-foreground font-semibold">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-primary" />
                  Meta Policy Compliant
                </div>
                <p>WABulk uses official Meta Cloud API with template approval rules and automatic opt-out handling.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Campaigns Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
              <CardDescription className="text-xs">Latest broadcast batches and live status</CardDescription>
            </div>
            <Link href="/campaigns" className="text-xs font-semibold text-primary hover:underline flex items-center">
              View All Campaigns <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/30">
                  <tr>
                    <th className="py-2.5 px-3">Campaign</th>
                    <th className="py-2.5 px-3">Template</th>
                    <th className="py-2.5 px-3">Audience</th>
                    <th className="py-2.5 px-3">Sent</th>
                    <th className="py-2.5 px-3">Delivered</th>
                    <th className="py-2.5 px-3">Read</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.recentCampaigns && data.recentCampaigns.length > 0 ? (
                    data.recentCampaigns.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground">
                          <Link href={`/campaigns/${c.id}`} className="hover:text-primary hover:underline">
                            {c.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">{c.templateName}</td>
                        <td className="py-3 px-3 text-muted-foreground">{c.totalRecipients} contacts</td>
                        <td className="py-3 px-3 font-medium text-emerald-600 dark:text-emerald-400">{c.sentCount}</td>
                        <td className="py-3 px-3 font-medium text-teal-600 dark:text-teal-400">{c.deliveredCount}</td>
                        <td className="py-3 px-3 font-medium text-[#34B7F1]">{c.readCount}</td>
                        <td className="py-3 px-3">{getStatusBadge(c.status)}</td>
                        <td className="py-3 px-3 text-right">
                          <Link href={`/campaigns/${c.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                              Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No campaigns launched yet. Click "Launch Campaign" to create your first broadcast!
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
