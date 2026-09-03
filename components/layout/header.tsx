'use client';

import * as React from 'react';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  Search,
  Shield,
  LogOut,
  ArrowLeftRight,
  Check,
  User as UserIcon,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import Link from 'next/link';
import { toast } from 'sonner';

export interface HeaderProps {
  onOpenMobile: () => void;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isImpersonating?: boolean;
    originalAdminId?: string;
  } | null;
}

export function Header({ onOpenMobile, user }: HeaderProps) {
  const { theme, setTheme, isDark } = useTheme();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = React.useState(false);
  const [userList, setUserList] = React.useState<any[]>([]);
  const [switching, setSwitching] = React.useState(false);

  const notifications = [
    { id: '1', title: 'Demo Mode Active', time: 'Just now', desc: 'Simulated WhatsApp engine ready for test campaigns.' },
    { id: '2', title: 'System Initialized', time: '10m ago', desc: 'Database seeded with default templates & contacts.' },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Signed out successfully');
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  const openSwitchUserModal = async () => {
    setIsSwitchModalOpen(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUserList(data.users);
      }
    } catch (e) {
      toast.error('Failed to load user list');
    }
  };

  const handleSwitchUser = async (targetUserId: string) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to switch user');
        setSwitching(false);
        return;
      }
      toast.success(`Switched account to ${data.user.name} (${data.user.role})!`);
      setIsSwitchModalOpen(false);
      window.location.reload();
    } catch (e) {
      toast.error('Switch user error');
      setSwitching(false);
    }
  };

  const handleSwitchBack = async () => {
    try {
      const res = await fetch('/api/auth/switch-back', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to switch back');
        return;
      }
      toast.success('Returned to Super Admin account!');
      window.location.reload();
    } catch (e) {
      toast.error('Failed to restore session');
    }
  };

  return (
    <>
      {/* Impersonation Banner if active */}
      {user?.isImpersonating && (
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between z-30">
          <div className="flex items-center space-x-2">
            <span className="text-base">🎭</span>
            <span>
              Impersonation Mode: You are viewing WABulk as{' '}
              <strong className="underline underline-offset-2">{user.name}</strong> ({user.email} &bull; {user.role})
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleSwitchBack}
            className="h-7 text-xs bg-white text-purple-900 hover:bg-slate-100 font-bold shadow-sm"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
            Switch Back to Super Admin
          </Button>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMobile}
            className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Bar */}
          <div className="relative hidden sm:block w-64 md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Quick search campaigns, contacts..."
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-input bg-muted/40 text-xs focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Switch User Button for Super Admin */}
          {(user?.role === 'SUPER_ADMIN' || user?.isImpersonating) && (
            <Button
              variant="outline"
              size="sm"
              onClick={openSwitchUserModal}
              className="h-8 text-xs font-semibold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
              title="Switch user account"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Switch User</span>
            </Button>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-card border border-border shadow-2xl p-4 z-50 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  <span className="text-[10px] text-primary hover:underline cursor-pointer">Mark all read</span>
                </div>
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors text-xs">
                      <div className="flex items-center justify-between font-medium text-foreground">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-muted-foreground">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Info & Role Badge */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-border">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-foreground leading-tight">{user.name}</span>
                <span className="text-[10px] text-muted-foreground">{user.email}</span>
              </div>
              <Badge
                variant={user.role === 'SUPER_ADMIN' ? 'purple' : user.role === 'ADMIN' ? 'info' : 'secondary'}
                className="text-[10px] uppercase tracking-wider py-0.5 font-bold"
              >
                {user.role.replace('_', ' ')}
              </Badge>

              {/* Prominent Header Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 ml-1"
                title="Log Out of WABulk"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-8 text-xs">
                Login
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Switch User Modal for Super Admin */}
      <Modal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        title="Switch User Account (Super Admin Access)"
        description="Impersonate any registered operator or admin to view the application from their perspective."
      >
        <div className="space-y-4">
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {userList.map((u) => {
              const isCurrent = user?.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-muted/60 border-border opacity-70'
                      : 'hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
                  }`}
                  onClick={() => !isCurrent && handleSwitchUser(u.id)}
                >
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center">
                      {u.name}
                      {isCurrent && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{u.email}</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={u.role === 'SUPER_ADMIN' ? 'purple' : u.role === 'ADMIN' ? 'info' : 'secondary'}
                      className="text-[10px]"
                    >
                      {u.role.replace('_', ' ')}
                    </Badge>
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={switching}
                        className="h-7 text-xs border-primary/40 text-primary hover:bg-primary hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchUser(u.id);
                        }}
                      >
                        Switch ➔
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border text-xs text-muted-foreground">
            <span>You can switch back to Super Admin at any time using the banner button.</span>
            <Button variant="outline" size="sm" onClick={() => setIsSwitchModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
