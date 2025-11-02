"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Utensils, Users, Settings, LayoutDashboard, DollarSign, Image as ImageIcon, FileText, UploadCloud, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthData } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';

interface AdminPageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

const AdminPageLayout: React.FC<AdminPageLayoutProps> = ({ children, title, description }) => {
  const location = useLocation();
  const { signOut } = useAuthData();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: createPageUrl('adminDashboard') },
    { name: 'Restaurantes', icon: Utensils, path: createPageUrl('adminRestaurants') },
    { name: 'Planos', icon: DollarSign, path: createPageUrl('adminPlans') },
    { name: 'Usuários Admin', icon: Users, path: createPageUrl('adminUsers') },
    { name: 'Categorias Populares', icon: Home, path: createPageUrl('adminCategories') },
    { name: 'Arquivos', icon: FileText, path: createPageUrl('adminFiles') },
    { name: 'Importar Menu', icon: UploadCloud, path: createPageUrl('adminImport') },
    { name: 'Banners', icon: Megaphone, path: '/admin/banners' }, // NOVO: Link para Banners
    { name: 'Configurações', icon: Settings, path: createPageUrl('adminSettings') },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <Link
            to={createPageUrl('adminDashboard')}
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Utensils className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Admin Dashboard</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary w-full",
                location.pathname === item.path && "bg-muted text-primary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <Button variant="secondary" className="w-full" onClick={signOut}>
            Sair
          </Button>
        </div>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="flex items-center">
            <div className="grid gap-1">
              <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <Card className="p-6">
            {children}
          </Card>
        </main>
      </div>
    </div>
  );
};

export default AdminPageLayout;