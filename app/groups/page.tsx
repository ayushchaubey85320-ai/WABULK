'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { FolderTree, Tag as TagIcon, Plus, Trash2, Edit2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function GroupsPage() {
  const [activeTab, setActiveTab] = React.useState('groups');

  const [groups, setGroups] = React.useState<any[]>([]);
  const [tags, setTags] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Group Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<any>(null);
  const [groupForm, setGroupForm] = React.useState({ name: '', description: '' });

  // Tag Modal
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
  const [tagForm, setTagForm] = React.useState({ name: '', color: '#10B981' });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([gData, tData]) => {
        setGroups(gData.groups || []);
        setTags(tData.tags || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save group');
        return;
      }

      toast.success(editingGroup ? 'Group updated' : 'Group created');
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      setGroupForm({ name: '', description: '' });
      loadData();
    } catch (e) {
      toast.error('Error saving group');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? Contacts will not be deleted.')) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Group deleted');
        loadData();
      } else {
        toast.error('Failed to delete group');
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create tag');
        return;
      }
      toast.success('Tag created');
      setIsTagModalOpen(false);
      setTagForm({ name: '', color: '#10B981' });
      loadData();
    } catch (e) {
      toast.error('Failed to create tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    try {
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Tag deleted');
        loadData();
      } else {
        toast.error('Failed to delete tag');
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Audience Segmentation</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organize contacts into functional groups and behavioral tags to target campaigns.
            </p>
          </div>
          <div>
            {activeTab === 'groups' ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupForm({ name: '', description: '' });
                  setIsGroupModalOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> New Group
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsTagModalOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Tag
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <Tabs
          tabs={[
            { id: 'groups', label: 'Contact Groups', count: groups.length, icon: <FolderTree className="w-3.5 h-3.5" /> },
            { id: 'tags', label: 'Tags', count: tags.length, icon: <TagIcon className="w-3.5 h-3.5" /> },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="w-full sm:w-auto"
        />

        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <Card key={g.id} className="hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{g.name}</CardTitle>
                        <span className="text-[11px] text-muted-foreground flex items-center mt-0.5">
                          <Users className="w-3 h-3 mr-1" /> {g.contactCount} contacts
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setGroupForm({ name: g.name, description: g.description || '' });
                          setIsGroupModalOpen(true);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {g.description || 'No description provided.'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* TAGS TAB */}
        {activeTab === 'tags' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {tags.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm transition-all text-xs font-semibold"
                    style={{
                      backgroundColor: `${t.color}15`,
                      borderColor: `${t.color}40`,
                      color: t.color,
                    }}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] opacity-70">({t.contactCount})</span>
                    <button
                      onClick={() => handleDeleteTag(t.id)}
                      className="opacity-50 hover:opacity-100 hover:text-red-600 transition-opacity ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Modal */}
        <Modal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          title={editingGroup ? 'Edit Group' : 'Create Contact Group'}
        >
          <form onSubmit={handleSaveGroup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Group Name *</label>
              <Input
                required
                placeholder="e.g. VIP Customers"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
              <Input
                placeholder="Brief purpose of this audience group"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsGroupModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {editingGroup ? 'Update Group' : 'Create Group'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Tag Modal */}
        <Modal
          isOpen={isTagModalOpen}
          onClose={() => setIsTagModalOpen(false)}
          title="Create New Tag"
        >
          <form onSubmit={handleSaveTag} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tag Name *</label>
              <Input
                required
                placeholder="e.g. High Priority"
                value={tagForm.name}
                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tag Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-input p-1"
                />
                <Input
                  value={tagForm.color}
                  onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                  className="font-mono text-xs w-32"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTagModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Create Tag
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
