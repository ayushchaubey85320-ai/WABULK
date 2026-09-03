'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FileText, Plus, CheckCircle, Clock, XCircle, Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [form, setForm] = React.useState({
    name: '',
    language: 'en_US',
    category: 'MARKETING',
    status: 'APPROVED',
    header: '',
    body: '',
    footer: '',
    metaTemplateId: '',
  });

  const loadTemplates = () => {
    setLoading(true);
    fetch('/api/templates')
      .then((r) => r.json())
      .then((d) => {
        setTemplates(d.templates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create template');
        return;
      }
      toast.success('Template created!');
      setIsModalOpen(false);
      setForm({
        name: '',
        language: 'en_US',
        category: 'MARKETING',
        status: 'APPROVED',
        header: '',
        body: '',
        footer: '',
        metaTemplateId: '',
      });
      loadTemplates();
    } catch (e) {
      toast.error('Error creating template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Delete failed');
        return;
      }
      toast.success('Template deleted');
      loadTemplates();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'PENDING_META':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1" /> Pending Meta</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Message Templates</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official WhatsApp pre-approved message templates with parameterized variables.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Template
          </Button>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col justify-between hover:border-primary/40 transition-all">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-sm font-bold font-mono text-foreground">{tpl.name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          {tpl.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{tpl.language}</span>
                      </div>
                    </div>
                    {getStatusBadge(tpl.status)}
                  </div>
                </CardHeader>

                {/* WhatsApp Chat Preview Bubble */}
                <CardContent className="pt-0">
                  <div className="p-3.5 rounded-2xl bg-[#efeae2] dark:bg-slate-900 border border-border shadow-inner font-sans">
                    {tpl.header && (
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1 pb-1 border-b border-black/5 dark:border-white/5">
                        {tpl.header}
                      </div>
                    )}
                    <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {tpl.body}
                    </div>
                    {tpl.footer && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic">
                        {tpl.footer}
                      </div>
                    )}
                  </div>

                  {/* Variables */}
                  {tpl.variables && (tpl.variables as string[]).length > 0 && (
                    <div className="mt-3 flex items-center space-x-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
                      {(tpl.variables as string[]).map((v) => (
                        <span key={v} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-primary">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="text-[11px] font-mono">
                  {tpl.metaTemplateId ? `ID: ${tpl.metaTemplateId}` : 'Local Template'}
                </span>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="text-muted-foreground hover:text-red-500 p-1 rounded"
                  title="Delete Template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create WhatsApp Template"
          description="Placeholders like {{1}}, {{2}} are automatically indexed into variables."
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Template Name * (lowercase & underscores)
                </label>
                <Input
                  required
                  placeholder="e.g. order_confirmation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="MARKETING">MARKETING</option>
                  <option value="UTILITY">UTILITY</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Language</label>
                <Input
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  placeholder="en_US"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Approval Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="APPROVED">APPROVED (Ready to Send)</option>
                  <option value="PENDING_META">PENDING META</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Header (Optional)</label>
              <Input
                placeholder="e.g. Appointment Reminder"
                value={form.header}
                onChange={(e) => setForm({ ...form, header: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Message Body *</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-lg border border-input bg-background p-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                placeholder="Hello {{1}}, your order {{2}} has arrived!"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Footer (Optional)</label>
              <Input
                placeholder="e.g. Reply STOP to unsubscribe"
                value={form.footer}
                onChange={(e) => setForm({ ...form, footer: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Save Template
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
