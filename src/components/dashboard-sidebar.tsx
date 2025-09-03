'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import {
  Calculator,
  Users,
  FileText,
  LayoutDashboard,
  Gem,
  Settings,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Developer', 'Admin', 'Accountant'] },
  { href: '/dashboard/invoices', label: 'Invoices', icon: FileText, roles: ['Developer', 'Admin', 'Accountant'] },
  { href: '/dashboard/customers', label: 'Customers', icon: Users, roles: ['Developer', 'Admin', 'Accountant'] },
  { href: '/dashboard/items', label: 'Items', icon: Gem, roles: ['Developer', 'Accountant'] },
  { href: '/dashboard/payments', label: 'Payments', icon: DollarSign, roles: ['Developer', 'Admin'] },
  { href: '/dashboard/interest-calculator', label: 'Interest Calculator', icon: Calculator, roles: ['Developer', 'Admin'] },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['Developer', 'Admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['Developer'] },
];

export function DashboardSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const userCanSee = (item: typeof menuItems[number]) => {
    return user && item.roles.includes(user.role);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-8 w-8" />
          <h2 className="text-xl font-bold text-primary">GemsAccurate</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.filter(userCanSee).map((item) => (
            <SidebarMenuItem key={item.href}>
              <Button asChild variant={pathname === item.href ? 'secondary' : 'ghost'} className="w-full justify-start">
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Link>
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <Button variant="outline" onClick={logout}>Log Out</Button>
      </SidebarFooter>
    </Sidebar>
  );
}
