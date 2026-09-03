'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  PhoneCall,
  Sliders,
  Bell,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = React.useState(initialTab);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<any>(null);

  // Form states
  const [general, setGeneral] = React.useState({
    orgName: '',
    defaultTimezone: 'Asia/Kolkata',
    defaultCountry: 'IN',
  });

  const [whatsapp, setWhatsapp] = React.useState({
    businessAccountId: '',
    phoneNumberId: '',
    apiVersion: 'v20.0',
    accessToken: '',
    verifyToken: '',
    maskedToken: '',
    isConfigured: false,
    testStatus: 'DEMO',
    testMessage: '',
  });

  const [messaging, setMessaging] = React.useState({
    messagesPerMinute: 60,
    maxConcurrentJobs: 5,
    retryLimit: 3,
  });

  const loadSettings = () => {
    setLoading(true);
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setGeneral({
            orgName: d.settings.orgName || '',
            defaultTimezone: d.settings.defaultTimezone || 'Asia/Kolkata',
            defaultCountry: d.settings.defaultCountry || 'IN',
          });
          setMessaging({
            messagesPerMinute: d.settings.messagesPerMinute || 60,
            maxConcurrentJobs: d.settings.maxConcurrentJobs || 5,
            retryLimit: d.settings.retryLimit || 3,
          });
        }
        if (d.whatsapp) {
          setWhatsapp({
            businessAccountId: d.whatsapp.businessAccountId || '',
            phoneNumberId: d.whatsapp.phoneNumberId || '',
            apiVersion: d.whatsapp.apiVersion || 'v20.0',
            accessToken: '',
            verifyToken: d.whatsapp.verifyToken || '',
            maskedToken: d.whatsapp.maskedToken || '',
            isConfigured: d.whatsapp.isConfigured,
            testStatus: d.whatsapp.testStatus || 'DEMO',
            testMessage: d.whatsapp.testMessage || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general,
          messaging,
          whatsapp: {
            businessAccountId: whatsapp.businessAccountId,
            phoneNumberId: whatsapp.phoneNumberId,
            apiVersion: whatsapp.apiVersion,
            verifyToken: whatsapp.verifyToken,
            ...(whatsapp.accessToken ? { accessToken: whatsapp.accessToken } : {}),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings');
        setSaving(false);
        return;
      }

      toast.success('Settings saved successfully!');
      loadSettings();
    } catch (e) {
      toast.error('Network error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.info(data.message);
      }
    } catch (e) {
      toast.error('Failed to run connection test');
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Integrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure WhatsApp Cloud API credentials, messaging rate controls, and organization profile.
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={[
            { id: 'general', label: 'General', icon: <SettingsIcon className="w-3.5 h-3.5" /> },
            { id: 'whatsapp', label: 'WhatsApp API', icon: <PhoneCall className="w-3.5 h-3.5" /> },
            { id: 'messaging', label: 'Rate & Limits', icon: <Sliders className="w-3.5 h-3.5" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <form onSubmit={handleSave} className="space-y-6">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">General Organization Profile</CardTitle>
                <CardDescription className="text-xs">Default regional and branding configurations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Organization Name</label>
                  <Input
                    value={general.orgName}
                    onChange={(e) => setGeneral({ ...general, orgName: e.target.value })}
                    placeholder="e.g. Acme Corp"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Default Timezone</label>
                    <select
                      value={general.defaultTimezone}
                      onChange={(e) => setGeneral({ ...general, defaultTimezone: e.target.value })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Default Country Calling Code</label>
                    <select
                      value={general.defaultCountry}
                      onChange={(e) => setGeneral({ ...general, defaultCountry: e.target.value })}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs"
                    >
                      <option value="IN">India (+91)</option>
                      <option value="US">USA (+1)</option>
                      <option value="GB">UK (+44)</option>
                      <option value="AE">UAE (+971)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* WHATSAPP TAB */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              {/* Connection Status Banner */}
              <Card className="border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        whatsapp.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center">
                        Connection Status:
                        <span className="ml-1.5 font-mono">
                          {whatsapp.isConfigured ? 'CONNECTED TO META' : 'SAFE DEMO MODE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {whatsapp.isConfigured
                          ? 'Messages will be dispatched directly through official Meta WhatsApp Graph API.'
                          : 'Live credentials not detected. System simulates message queue & webhooks safely.'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={testing}
                    onClick={handleTestConnection}
                  >
                    <Zap className="w-3.5 h-3.5 mr-1 text-primary" /> Test Connection
                  </Button>
                </CardContent>
              </Card>

              {testResult && (
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    testResult.valid
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/30 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  <div className="font-bold flex items-center mb-1">
                    {testResult.valid ? <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> : <AlertCircle className="w-4 h-4 mr-1 text-amber-600" />}
                    {testResult.status}
                  </div>
                  <p>{testResult.message}</p>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Meta WhatsApp Business API Credentials</CardTitle>
                  <CardDescription className="text-xs">
                    Obtained from your Meta Developer Portal (Facebook Apps &gt; WhatsApp &gt; API Setup).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Phone Number ID *</label>
                      <Input
                        placeholder="e.g. 109876543210987"
                        value={whatsapp.phoneNumberId}
                        onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">WhatsApp Business Account ID</label>
                      <Input
                        placeholder="e.g. 102345678901234"
                        value={whatsapp.businessAccountId}
                        onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      System User Permanent Access Token
                    </label>
                    <Input
                      type="password"
                      placeholder={whatsapp.maskedToken || 'EAAG... (Enter new token to update)'}
                      value={whatsapp.accessToken}
                      onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tokens are encrypted in database and never returned to the frontend.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Graph API Version</label>
                      <Input
                        value={whatsapp.apiVersion}
                        onChange={(e) => setWhatsapp({ ...whatsapp, apiVersion: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">Webhook Verify Token</label>
                      <Input
                        value={whatsapp.verifyToken}
                        onChange={(e) => setWhatsapp({ ...whatsapp, verifyToken: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
                    <span className="font-semibold text-foreground">Your Webhook Callback URL:</span>
                    <div className="font-mono text-[11px] p-2 rounded bg-card border border-border select-all">
                      https://your-domain.com/api/webhooks/whatsapp
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MESSAGING & LIMITS TAB */}
          {activeTab === 'messaging' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Queue Tuning & Rate Limits</CardTitle>
                <CardDescription className="text-xs">
                  Ensure compliance with WhatsApp messaging tiers and prevent API rate throttling.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Messages Per Minute</label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={messaging.messagesPerMinute}
                      onChange={(e) => setMessaging({ ...messaging, messagesPerMinute: parseInt(e.target.value) || 60 })}
                    />
                    <span className="text-[10px] text-muted-foreground">Default: 60/min</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Max Concurrent Jobs</label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={messaging.maxConcurrentJobs}
                      onChange={(e) => setMessaging({ ...messaging, maxConcurrentJobs: parseInt(e.target.value) || 5 })}
                    />
                    <span className="text-[10px] text-muted-foreground">Parallel worker threads</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Retry Limit (Temporary Errors)</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={messaging.retryLimit}
                      onChange={(e) => setMessaging({ ...messaging, retryLimit: parseInt(e.target.value) || 3 })}
                    />
                    <span className="text-[10px] text-muted-foreground">Attempts before logging fail</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                  Sending speed is automatically limited according to configured limits.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" loading={saving} size="sm">
              <Save className="w-3.5 h-3.5 mr-1" /> Save All Settings
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-muted-foreground">
          Loading settings...
        </div>
      }
    >
      <SettingsContent />
    </React.Suspense>
  );
}
