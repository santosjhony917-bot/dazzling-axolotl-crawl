import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Users,
  Settings,
  UploadCloud,
  Shield,
  Building2,
  BarChart,
  Ticket,
  Image as ImageIcon,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/admin', icon: Home, label: 'Dashboard' },
  { href: '/admin/restaurants', icon: Building2, label: 'Restaurantes' },
  { href: '/admin/upload-info', icon: UploadCloud, label: 'Upload em Massa' },
  { href: '/admin/banners', icon: ImageIcon, label: 'Banners' },
  { href: '/admin/plans', icon: Ticket, label: 'Planos' },
  { href: '/admin/manage-admins', label: 'Administradores', icon: Users },
  { href: '/admin/popular-categories', label: 'Categorias', icon: Settings },
  { href: '/admin/files', label: 'Arquivos', icon: ClipboardList },
  { href: '/admin/import', label: 'Importar Cardápio', icon: UploadCloud },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, toggleCollapse }) => {
  const location = useLocation();

  return (
    <div 
      className={cn(
        "flex flex-col h-full bg-sidebar-background border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header & Collapse Button */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-2 transition-opacity duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
          <Shield className="w-6 h-6 text-sidebar-primary" />
          <span className="text-lg font-bold text-sidebar-primary">Admin Panel</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCollapse}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center rounded-lg transition-colors duration-200",
                isCollapsed ? "justify-center p-3" : "p-3 gap-3",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isCollapsed ? "shrink-0" : "")} />
              <span className={cn("text-sm font-medium transition-opacity duration-300", isCollapsed ? "hidden" : "block")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminSidebar;