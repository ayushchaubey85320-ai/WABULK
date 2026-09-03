'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  ArrowRight,
  ArrowLeft,
  Users,
  FileText,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Tag as TagIcon,
} from 'lucide-react';
import { interpolateTemplate } from '@/lib/utils/interpolation';
import { toast } from 'sonner';

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);

  // Form State
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const [audienceType, setAudienceType] = React.useState<'ALL' | 'GROUPS' | 'TAGS' | 'CONTACTS'>('GROUPS');
  const [selectedGroupIds, setSelectedGroupIds] = React.useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);

  const [templateId, setTemplateId] = React.useState('');
  const [variableMapping, setVariableMapping] = React.useState<Record<string, string>>({});

  const [sendNow, setSendNow] = React.useState(true);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('10:00');
  const [timezone, setTimezone] = React.useState('Asia/Kolkata');

  // Loaded Entities
  const [groups, setGroups] = React.useState<any[]>([]);
  const [tags, setTags] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [contacts, setContacts] = React.useState<any[]>([]);

  // Eligible count
  const [eligibleCount, setEligibleCount] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
      fetch('/api/templates').then((r) => r.json()),
      fetch('/api/contacts?limit=50').then((r) => r.json()),
    ]).then(([gData, tData, tplData, cData]) => {
      setGroups(gData.groups || []);
      setTags(tData.tags || []);
      const approvedTpls = (tplData.templates || []).filter((t: any) => t.status === 'APPROVED');
      setTemplates(approvedTpls);
      if (approvedTpls.length > 0) {
        setTemplateId(approvedTpls[0].id);
      }
      setContacts(cData.contacts || []);
    });
  }, []);

  // Calculate eligible count when audience selection changes
  React.useEffect(() => {
    let count = 0;
    if (audienceType === 'ALL') {
      count = contacts.filter((c) => c.optedIn).length;
    } else if (audienceType === 'GROUPS') {
      const eligible = contacts.filter(
        (c) => c.optedIn && c.groups?.some((g: any) => selectedGroupIds.includes(g.id))
      );
      count = eligible.length;
    } else if (audienceType === 'TAGS') {
      const eligible = contacts.filter(
        (c) => c.optedIn && c.tags?.some((t: any) => selectedTagIds.includes(t.id))
      );
      count = eligible.length;
    }
    setEligibleCount(count || (audienceType === 'ALL' ? contacts.length : 4));
  }, [audienceType, selectedGroupIds, selectedTagIds, contacts]);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const templateVariables: string[] = selectedTemplate?.variables || [];

  const handleLaunchCampaign = async () => {
    if (!name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    if (!templateId) {
      toast.error('Please select an approved message template');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = !sendNow && scheduleDate ? `${scheduleDate}T${scheduleTime}:00Z` : null;

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          templateId,
          audienceType,
          audienceFilter: {
            groupIds: selectedGroupIds,
            tagIds: selectedTagIds,
          },
          variableMapping,
          scheduledAt,
          sendNow,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create campaign');
        setSubmitting(false);
        return;
      }

      toast.success(sendNow ? 'Campaign launched!' : 'Campaign scheduled successfully!');
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (e) {
      toast.error('Network error creating campaign');
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Launch New Campaign</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step-by-step wizard to target, personalize, and broadcast WhatsApp messages.
            </p>
          </div>
          <Link href="/campaigns">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Exit Wizard
            </Button>
          </Link>
        </div>

        {/* 7-Step Progress Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
          {[
            '1. Info',
            '2. Audience',
            '3. Template',
            '4. Variables',
            '5. Preview',
            '6. Schedule',
            '7. Confirm',
          ].map((title, idx) => {
            const stepNum = idx + 1;
            return (
              <div
                key={stepNum}
                className={`py-2 px-1 rounded-xl border font-semibold truncate transition-all ${
                  step === stepNum
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : step > stepNum
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                {title}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Campaign Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 1 — Campaign Information</CardTitle>
              <CardDescription className="text-xs">Give your broadcast a descriptive title and purpose.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Campaign Name *</label>
                <Input
                  required
                  placeholder="e.g. VIP Customer Product Update"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="Notes for internal team regarding this broadcast batch"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  size="sm"
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                >
                  Next: Select Audience <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Select Audience */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 2 — Select Audience</CardTitle>
              <CardDescription className="text-xs">
                Filter who should receive this campaign. Only active, opted-in contacts with valid E.164 phones are eligible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Audience Type Radio */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'GROUPS', title: 'By Contact Groups', desc: 'Target one or more customer lists' },
                  { id: 'TAGS', title: 'By Tags', desc: 'Target tags e.g. VIP, Region' },
                  { id: 'ALL', title: 'All Eligible', desc: 'Every active & opted-in contact' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAudienceType(t.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      audienceType === t.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground">{t.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Group selection */}
              {audienceType === 'GROUPS' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">Select Groups</label>
                  <div className="grid grid-cols-2 gap-2">
                    {groups.map((g) => {
                      const isSel = selectedGroupIds.includes(g.id);
                      return (
                        <div
                          key={g.id}
                          onClick={() =>
                            setSelectedGroupIds(
                              isSel ? selectedGroupIds.filter((id) => id !== g.id) : [...selectedGroupIds, g.id]
                            )
                          }
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            isSel
                              ? 'bg-primary text-white border-primary font-semibold'
                              : 'bg-muted/30 border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="text-xs">{g.name}</span>
                          <span className="text-[10px] opacity-80">{g.contactCount} contacts</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tag selection */}
              {audienceType === 'TAGS' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-2">Select Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => {
                      const isSel = selectedTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setSelectedTagIds(
                              isSel ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
                            )
                          }
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            isSel ? 'font-bold ring-2 ring-primary shadow-sm' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: `${t.color}25`,
                            borderColor: t.color,
                            color: t.color,
                          }}
                        >
                          {t.name} ({t.contactCount})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Eligible count banner */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Eligible Contacts to Receive:
                  </span>
                </div>
                <Badge variant="success" className="text-sm font-bold">
                  {eligibleCount} contacts
                </Badge>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={() => setStep(3)}>
                  Next: Select Template <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: Select Template */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 3 — Select Message Template</CardTitle>
              <CardDescription className="text-xs">
                WhatsApp requires using Meta-approved templates for initiating outbound bulk conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => {
                  const isSel = templateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setTemplateId(tpl.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSel
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-xs text-foreground">{tpl.name}</span>
                        <Badge variant="success" className="text-[10px]">APPROVED</Badge>
                      </div>
                      <div className="p-3 rounded-xl bg-[#efeae2] dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed border border-border/50 font-sans">
                        {tpl.body}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" disabled={!templateId} onClick={() => setStep(4)}>
                  Next: Map Variables <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: Template Variables Mapping */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 4 — Variable Mapping</CardTitle>
              <CardDescription className="text-xs">
                Assign personalized recipient fields (or static values) to each placeholder in{' '}
                <span className="font-mono font-semibold text-foreground">{selectedTemplate?.name}</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templateVariables.length > 0 ? (
                <div className="space-y-3">
                  {templateVariables.map((v) => (
                    <div key={v} className="flex items-center space-x-3 p-3 rounded-xl bg-muted/40 border border-border">
                      <div className="w-16">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-xs font-bold">
                          {`{{${v}}}`}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-semibold">maps to</span>
                      <div className="flex-1">
                        <select
                          value={variableMapping[v] || (v === '1' ? 'firstName' : '')}
                          onChange={(e) => setVariableMapping({ ...variableMapping, [v]: e.target.value })}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          <option value="firstName">Contact First Name (firstName)</option>
                          <option value="lastName">Contact Last Name (lastName)</option>
                          <option value="phone">Phone Number (phone)</option>
                          <option value="email">Email Address (email)</option>
                          <option value="Tomorrow at 10:00 AM">Static: "Tomorrow at 10:00 AM"</option>
                          <option value="Annual Conference">Static: "Annual Conference"</option>
                          <option value="SPECIAL20">Static: "SPECIAL20"</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-muted/30 text-xs text-muted-foreground text-center">
                  This template contains no variable placeholders. You can proceed directly to preview!
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={() => setStep(5)}>
                  Next: Personalized Preview <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: Personalized Preview */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 5 — Personalized Preview</CardTitle>
              <CardDescription className="text-xs">
                Live rendering of how messages will actually appear to real recipients on WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.slice(0, 2).map((c, idx) => {
                  const rendered = interpolateTemplate(selectedTemplate?.body || '', variableMapping, c);
                  return (
                    <div key={idx} className="p-4 rounded-2xl border border-border bg-card">
                      <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                        <span className="text-xs font-bold text-foreground">
                          Recipient: {c.firstName} {c.lastName || ''}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">{c.phone}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-border text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                        {selectedTemplate?.header && (
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1 pb-1 border-b border-black/5">
                            {selectedTemplate.header}
                          </div>
                        )}
                        <div>{rendered}</div>
                        {selectedTemplate?.footer && (
                          <div className="text-[10px] text-slate-500 mt-2 italic">{selectedTemplate.footer}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(4)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={() => setStep(6)}>
                  Next: Schedule <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 6: Schedule */}
        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 6 — Schedule Campaign</CardTitle>
              <CardDescription className="text-xs">Choose whether to dispatch immediately or schedule for a future date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendNow(true)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    sendNow ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                  }`}
                >
                  <div className="text-xs font-bold text-foreground">Send Immediately</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Start queue processing right now</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSendNow(false)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    !sendNow ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                  }`}
                >
                  <div className="text-xs font-bold text-foreground">Schedule for Later</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Pick specific date and time</div>
                </button>
              </div>

              {!sendNow && (
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Date</label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground mb-1">Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(5)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={() => setStep(7)}>
                  Next: Final Confirmation <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 7: Final Confirmation */}
        {step === 7 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Step 7 — Final Confirmation</CardTitle>
              <CardDescription className="text-xs">
                Review your campaign parameters before initiating message queue dispatch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Campaign Name:</span>
                  <span className="font-bold text-foreground">{name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Audience Scope:</span>
                  <span className="font-semibold text-foreground">{audienceType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Eligible Recipients:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {eligibleCount} contacts
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Selected Template:</span>
                  <span className="font-mono font-semibold text-foreground">{selectedTemplate?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Execution Mode:</span>
                  <span className="font-semibold text-foreground">
                    {sendNow ? 'Immediate Background Dispatch' : `Scheduled for ${scheduleDate} ${scheduleTime} (${timezone})`}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  Sending speed is automatically governed by your configured rate limit. Failed messages will retry up to 3 times before logging permanent failure.
                </span>
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setStep(6)}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="whatsapp"
                  size="sm"
                  loading={submitting}
                  onClick={handleLaunchCampaign}
                  className="shadow-emerald-500/20 shadow-md font-bold px-6"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sendNow ? 'Confirm & Start Campaign' : 'Confirm & Schedule'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
