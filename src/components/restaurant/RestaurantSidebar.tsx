import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Utensils, Image, User } from 'lucide-react';
import { Routes } from '@/router/routes';
import { Separator } from '@/components/ui/separator';

const navItems = [
  {
    name: 'Conteúdo',
    links: [
      { to: Routes.MENU_MANAGEMENT, icon: Utensils, label: 'Cardápio e Categorias' },
      { to: Routes.GALLERY, icon: Image, label: 'Galeria de Imagens' },
    ],
  },
  {
    name: 'Configurações',
    links: [
      { to: Routes.PROFILE, icon: User, label: 'Perfil do Restaurante' },
    ],
  },
];

export const RestaurantSidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r p-4 flex flex-col sticky top-0 h-screen">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary">Gestão</h2>
      </div>
      
      <nav className="space-y-6 flex-1">
        {navItems.map((section, index) => (
          <div key={index}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{section.name}</h3>
            <div className="space-y-1">
              {section.links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            {index < navItems.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </nav>
    </aside>
  );
};