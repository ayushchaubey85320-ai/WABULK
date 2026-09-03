'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderTree,
  FileText,
  Send,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  History,
  PhoneCall,
  UserCheck,
  Upload,
  LogOut,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  userRole?: string;
}

export function Sidebar({ mobileOpen = false, onCloseMobile, userRole }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Contacts', href: '/contacts', icon: Users },
    { label: 'Groups & Tags', href: '/groups', icon: FolderTree },
    { label: 'Message Templates', href: '/templates', icon: FileText },
    { label: 'Campaigns', href: '/campaigns', icon: Send },
    { label: 'Click-to-Chat (wa.me)', href: '/direct-send', icon: ExternalLink },
    { label: 'Message Logs', href: '/messages', icon: MessageSquare },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'WhatsApp Config', href: '/settings?tab=whatsapp', icon: PhoneCall },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  // Admin & Super Admin items
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    navItems.push(
      { label: 'Team & Users', href: '/users', icon: UserCheck },
      { label: 'Audit Logs', href: '/audit-logs', icon: History }
    );
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (e) {}
  };

  const content = (
    <div className="flex h-full flex-col justify-between bg-card text-card-foreground border-r border-border">
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center text-white shadow-md">
              <MessageSquare className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-foreground flex items-center">
                WABulk
                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  OFFICIAL
                </span>
              </span>
              <p className="text-[10px] text-muted-foreground tracking-tight -mt-0.5">WhatsApp Cloud API</p>
            </div>
          </Link>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Action Button */}
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/campaigns/new"
            className="w-full flex items-center justify-center space-x-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600 active:scale-[0.98] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Campaign</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && !item.href.includes('?'));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center space-x-3 rounded-xl px-3 py-2 text-xs font-medium transition-all group',
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Logout */}
      <div className="p-4 border-t border-border space-y-3">
        <Link
          href="/contacts/import"
          className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted"
        >
          <Upload className="w-4 h-4" />
          <span>Import CSV / Excel</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors p-2 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
