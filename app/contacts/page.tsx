'use client';

import * as React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Filter,
  Phone,
  Mail,
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp-link';
import { toast } from 'sonner';

export default function ContactsPage() {
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [pagination, setPagination] = React.useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [selectedGroup, setSelectedGroup] = React.useState('');
  const [selectedTag, setSelectedTag] = React.useState('');
  const [optedInFilter, setOptedInFilter] = React.useState('');

  // Groups and tags list for dropdowns
  const [groups, setGroups] = React.useState<any[]>([]);
  const [tags, setTags] = React.useState<any[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Modals
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<any>(null);
  const [formLoading, setFormLoading] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    country: 'IN',
    status: 'ACTIVE',
    optedIn: true,
    groupIds: [] as string[],
    tagIds: [] as string[],
  });

  const loadData = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
    });
    if (search) params.set('search', search);
    if (selectedGroup) params.set('groupId', selectedGroup);
    if (selectedTag) params.set('tagId', selectedTag);
    if (optedInFilter) params.set('optedIn', optedInFilter);

    fetch(`/api/contacts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setContacts(data.contacts || []);
        if (data.pagination) setPagination(data.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadData(1);
    fetch('/api/groups').then((r) => r.json()).then((d) => setGroups(d.groups || []));
    fetch('/api/tags').then((r) => r.json()).then((d) => setTags(d.tags || []));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(contacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : '/api/contacts';
      const method = editingContact ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to save contact');
        setFormLoading(false);
        return;
      }

      toast.success(editingContact ? 'Contact updated!' : 'Contact created successfully!');
      setIsAddOpen(false);
      setEditingContact(null);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        country: 'IN',
        status: 'ACTIVE',
        optedIn: true,
        groupIds: [],
        tagIds: [],
      });
      loadData(pagination.page);
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Contact deleted');
        loadData(pagination.page);
      } else {
        toast.error('Failed to delete contact');
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected contacts?`)) return;
    try {
      for (const id of selectedIds) {
        await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      }
      toast.success('Selected contacts deleted');
      setSelectedIds([]);
      loadData(1);
    } catch (e) {
      toast.error('Failed to delete some contacts');
    }
  };

  const openEdit = (c: any) => {
    setEditingContact(c);
    setFormData({
      firstName: c.firstName,
      lastName: c.lastName || '',
      phone: c.phone,
      email: c.email || '',
      country: c.country || 'IN',
      status: c.status,
      optedIn: c.optedIn,
      groupIds: c.groups.map((g: any) => g.id),
      tagIds: c.tags.map((t: any) => t.id),
    });
    setIsAddOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Contact Directory</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage verified opt-in recipients, groups, and tags for WhatsApp broadcasts.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <a href="/api/contacts/export" download>
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export CSV
              </Button>
            </a>
            <Link href="/contacts/import">
              <Button variant="outline" size="sm">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import Wizard
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingContact(null);
                setFormData({
                  firstName: '',
                  lastName: '',
                  phone: '',
                  email: '',
                  country: 'IN',
                  status: 'ACTIVE',
                  optedIn: true,
                  groupIds: [],
                  tagIds: [],
                });
                setIsAddOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.contactCount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">All Tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Button type="submit" size="sm" className="h-9 flex-1">
                  Filter
                </Button>
                {(search || selectedGroup || selectedTag || optedInFilter) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs"
                    onClick={() => {
                      setSearch('');
                      setSelectedGroup('');
                      setSelectedTag('');
                      setOptedInFilter('');
                      loadData(1);
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs">
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">
              {selectedIds.length} contact(s) selected
            </span>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Contacts Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase border-b border-border bg-muted/30">
                  <tr>
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={contacts.length > 0 && selectedIds.length === contacts.length}
                        onChange={handleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Phone (E.164)</th>
                    <th className="py-3 px-4">Groups</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Opt-in Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        Loading contacts...
                      </td>
                    </tr>
                  ) : contacts.length > 0 ? (
                    contacts.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c.id)}
                            onChange={() => toggleSelectOne(c.id)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">
                            {c.firstName} {c.lastName || ''}
                          </div>
                          {c.email && (
                            <div className="text-[11px] text-muted-foreground flex items-center mt-0.5">
                              <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                              {c.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-foreground">
                            {c.phone}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.groups && c.groups.length > 0 ? (
                              c.groups.map((g: any) => (
                                <Badge key={g.id} variant="secondary" className="text-[10px]">
                                  {g.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {c.tags && c.tags.length > 0 ? (
                              c.tags.map((t: any) => (
                                <span
                                  key={t.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                                >
                                  {t.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {c.optedIn ? (
                            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Opted In
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-500 font-medium">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Opted Out
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <a
                              href={buildWhatsAppLink(c.phone, `Hello ${c.firstName}!`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="Chat on WhatsApp (wa.me)"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No contacts found. Click "Add Contact" or "Import Wizard" to build your audience.
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
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contacts
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadData(pagination.page - 1)}
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
                  onClick={() => loadData(pagination.page + 1)}
                  className="h-8"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={editingContact ? 'Edit Contact' : 'Add New Contact'}
          description="Phone numbers are automatically validated into international E.164 format."
        >
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">First Name *</label>
                <Input
                  required
                  placeholder="e.g. Rahul"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Last Name</label>
                <Input
                  placeholder="e.g. Sharma"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Phone Number (E.164) *
                </label>
                <Input
                  required
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="IN">India (+91)</option>
                  <option value="US">USA (+1)</option>
                  <option value="GB">UK (+44)</option>
                  <option value="AE">UAE (+971)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Assign to Groups</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {groups.map((g) => {
                  const isSelected = formData.groupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          groupIds: isSelected
                            ? formData.groupIds.filter((id) => id !== g.id)
                            : [...formData.groupIds, g.id],
                        });
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t) => {
                  const isSelected = formData.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          tagIds: isSelected
                            ? formData.tagIds.filter((id) => id !== t.id)
                            : [...formData.tagIds, t.id],
                        });
                      }}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isSelected
                          ? 'font-bold shadow-sm'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: `${t.color}25`,
                        borderColor: t.color,
                        color: t.color,
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.optedIn}
                  onChange={(e) => setFormData({ ...formData, optedIn: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="font-semibold text-foreground">Verified Opt-in Consent</span>
              </label>

              <div className="flex space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={formLoading} size="sm">
                  {editingContact ? 'Save Changes' : 'Create Contact'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
