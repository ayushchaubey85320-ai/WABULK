'use client';

import * as React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { UserCheck, Plus, Trash2, Edit2, Shield, Mail, ArrowLeftRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function UsersPage() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any>(null);

  const [form, setForm] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERATOR',
    status: 'ACTIVE',
  });

  const loadUsers = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/me').then((r) => r.json()),
    ])
      .then(([userData, meData]) => {
        setUsers(userData.users || []);
        if (meData?.user) setCurrentUser(meData.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const handleSwitchUser = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to switch user');
        return;
      }
      toast.success(`Switched account to ${data.user.name}!`);
      window.location.reload();
    } catch (e) {
      toast.error('Switch user error');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save user');
        return;
      }

      toast.success(editingUser ? 'User updated' : 'User created');
      setIsAddOpen(false);
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'OPERATOR', status: 'ACTIVE' });
      loadUsers();
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete user');
        return;
      }
      toast.success('User deleted');
      loadUsers();
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Team & Access Control</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage user roles, operator permissions, and platform credentials.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditingUser(null);
              setForm({ name: '', email: '', password: '', role: 'OPERATOR', status: 'ACTIVE' });
              setIsAddOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Team Member
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/30 text-[11px] text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Last Login</th>
                    <th className="py-2.5 px-4">Created</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={u.role === 'SUPER_ADMIN' ? 'purple' : u.role === 'ADMIN' ? 'info' : 'secondary'}
                          className="text-[10px]"
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(u.lastLoginAt)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.isImpersonating) && currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleSwitchUser(u.id)}
                              className="px-2 py-1 rounded-md text-[11px] font-semibold border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center mr-1"
                              title={`Switch to ${u.name}`}
                            >
                              <ArrowLeftRight className="w-3 h-3 mr-1" /> Switch
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setForm({
                                name: u.name,
                                email: u.email,
                                password: '',
                                role: u.role,
                                status: u.status,
                              });
                              setIsAddOpen(true);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1 rounded text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={editingUser ? 'Edit User' : 'Add New User'}
        >
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name *</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email Address *</label>
              <Input
                type="email"
                required
                disabled={!!editingUser}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@company.com"
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Password *</label>
                <Input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs"
                >
                  <option value="OPERATOR">OPERATOR (Campaigns & Contacts)</option>
                  <option value="ADMIN">ADMIN (Templates, Reports, Settings)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
