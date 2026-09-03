'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Users,
  Send,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp-link';
import { interpolateTemplate } from '@/lib/utils/interpolation';
import { toast } from 'sonner';

interface QueueItem {
  id: string;
  name: string;
  phone: string;
  message: string;
  link: string;
  sent: boolean;
}

export default function DirectSendPage() {
  // Setup state
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Audience & Message configuration
  const [selectedGroup, setSelectedGroup] = React.useState('');
  const [messageText, setMessageText] = React.useState(
    'Hello {{firstName}},\n\nThis is a quick update from our team. Please let us know if you have any questions!\n\nThank you.'
  );

  // Active Dispatch Queue
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [queueStarted, setQueueStarted] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/contacts?limit=100').then((r) => r.json()),
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/templates').then((r) => r.json()),
    ])
      .then(([cData, gData, tData]) => {
        setContacts(cData.contacts || []);
        setGroups(gData.groups || []);
        setTemplates(tData.templates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter contacts by group
  const targetContacts = React.useMemo(() => {
    if (!selectedGroup) return contacts;
    return contacts.filter((c) => c.groups?.some((g: any) => g.id === selectedGroup));
  }, [contacts, selectedGroup]);

  // Generate Queue
  const handleGenerateQueue = () => {
    if (targetContacts.length === 0) {
      toast.error('No contacts available in selected audience');
      return;
    }
    if (!messageText.trim()) {
      toast.error('Please enter message text');
      return;
    }

    const items: QueueItem[] = targetContacts.map((c) => {
      const personalized = interpolateTemplate(messageText, {}, c);
      const link = buildWhatsAppLink(c.phone, personalized);
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName || ''}`.trim(),
        phone: c.phone,
        message: personalized,
        link,
        sent: false,
      };
    });

    setQueue(items);
    setCurrentIndex(0);
    setQueueStarted(true);
    toast.success(`Generated WhatsApp queue for ${items.length} contacts!`);
  };

  // Open in WhatsApp and advance
  const handleSendCurrentAndNext = () => {
    if (currentIndex >= queue.length) return;

    const currentItem = queue[currentIndex];
    // Open wa.me link in new tab or WhatsApp app
    window.open(currentItem.link, '_blank', 'noopener,noreferrer');

    // Mark as sent
    const updated = [...queue];
    updated[currentIndex].sent = true;
    setQueue(updated);

    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      toast.success('You have reached the end of the dispatch queue!');
    }
  };

  const handleOpenSpecific = (idx: number) => {
    const item = queue[idx];
    window.open(item.link, '_blank', 'noopener,noreferrer');
    const updated = [...queue];
    updated[idx].sent = true;
    setQueue(updated);
  };

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tplId = e.target.value;
    if (!tplId) return;
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setMessageText(tpl.body);
    }
  };

  const completedCount = queue.filter((q) => q.sent).length;
  const percentComplete = queue.length > 0 ? Math.round((completedCount / queue.length) * 100) : 0;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                WhatsApp Click-to-Chat (<code className="text-primary font-mono text-xl font-bold">wa.me</code>)
              </h1>
              <Badge variant="success" className="text-[10px]">
                ZERO META SETUP NEEDED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Send personalized WhatsApp messages from your own personal or business WhatsApp app. 100% free, no Meta developer accounts or approvals needed.
            </p>
          </div>
          {queueStarted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQueueStarted(false);
                setQueue([]);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Campaign
            </Button>
          )}
        </div>

        {/* Info Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
              How WhatsApp Click-to-Chat Protocol Works
            </div>
            <p className="leading-relaxed">
              WABulk creates verified <code>https://wa.me/&lt;phone&gt;?text=...</code> links with your recipient's name and personalized message pre-filled. Clicking <strong>"Open in WhatsApp"</strong> opens WhatsApp Web or your phone's WhatsApp app with the message pre-typed into the chat box so you just press Send!
            </p>
          </div>
        </div>

        {!queueStarted ? (
          /* STEP 1: CONFIGURE QUEUE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Audience & Template Picker */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold">1. Select Audience & Template</CardTitle>
                  <CardDescription className="text-xs">
                    Choose which contact group to message and compose your message.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Select Audience Group
                      </label>
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">All Contacts ({contacts.length})</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.contactCount} contacts)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Load from Template (Optional)
                      </label>
                      <select
                        onChange={handleSelectTemplate}
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                      >
                        <option value="">-- Choose a template --</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-foreground">
                        Message Text (Supports personalization variables)
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        Available: <code>{`{{firstName}}`}</code>, <code>{`{{lastName}}`}</code>, <code>{`{{phone}}`}</code>
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none leading-relaxed"
                      placeholder="Type your message here..."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="whatsapp"
                      size="sm"
                      onClick={handleGenerateQueue}
                      disabled={targetContacts.length === 0}
                      className="shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Build Click-to-Chat Queue ({targetContacts.length} recipients)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Preview */}
            <div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Preview on First Contact</CardTitle>
                  <CardDescription className="text-xs">
                    {targetContacts[0]
                      ? `Personalized for: ${targetContacts[0].firstName} (${targetContacts[0].phone})`
                      : 'No contacts selected'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="p-4 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-border text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed shadow-inner font-sans">
                    {targetContacts[0]
                      ? interpolateTemplate(messageText, {}, targetContacts[0])
                      : 'Hello there! Select a contact to preview.'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* STEP 2: SEQUENTIAL ASSISTED DISPATCHER */
          <div className="space-y-6">
            {/* Progress Card */}
            <Card className="border-primary/30">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>
                    Queue Progress: {completedCount} of {queue.length} sent
                  </span>
                  <span className="text-primary font-bold">{percentComplete}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                  <div
                    className="h-full bg-gradient-to-r from-[#128C7E] to-[#25D366] rounded-full transition-all duration-300"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Recipient Card (Assisted Send) */}
            {currentIndex < queue.length ? (
              <Card className="border-2 border-primary shadow-xl bg-card">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Recipient {currentIndex + 1} of {queue.length}
                        </span>
                        {queue[currentIndex].sent && (
                          <Badge variant="success" className="text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Sent
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mt-1">
                        {queue[currentIndex].name}
                      </h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        {queue[currentIndex].phone}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentIndex >= queue.length - 1}
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                      >
                        Skip <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* WhatsApp Chat Preview */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                      Pre-filled Message Text:
                    </label>
                    <div className="p-4 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-border text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner">
                      {queue[currentIndex].message}
                    </div>
                  </div>

                  {/* Big Action Button */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground">
                      Clicking will open WhatsApp with this recipient and message ready to send.
                    </div>
                    <Button
                      variant="whatsapp"
                      size="lg"
                      onClick={handleSendCurrentAndNext}
                      className="w-full sm:w-auto shadow-emerald-500/20 shadow-lg text-sm font-bold h-12 px-8"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in WhatsApp &amp; Next ➔
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-lg font-bold text-foreground">All Messages Dispatched!</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You have cycled through all {queue.length} contacts in this Click-to-Chat broadcast.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQueueStarted(false);
                      setQueue([]);
                    }}
                  >
                    Start Another Broadcast
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Complete Batch Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">Complete Batch List ({queue.length})</CardTitle>
                <CardDescription className="text-xs">
                  Click on any contact below to open their direct WhatsApp chat individually.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/30 text-[11px] text-muted-foreground uppercase border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">#</th>
                        <th className="py-2.5 px-4">Recipient</th>
                        <th className="py-2.5 px-4">Phone</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {queue.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            idx === currentIndex ? 'bg-primary/5 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 px-4 text-foreground">{item.name}</td>
                          <td className="py-2.5 px-4 font-mono text-muted-foreground">{item.phone}</td>
                          <td className="py-2.5 px-4">
                            {item.sent ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sent
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Pending</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSpecific(idx)}
                              className="h-7 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" /> Send on WhatsApp
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
