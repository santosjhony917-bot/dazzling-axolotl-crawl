import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientBottomNav from '@/components/ClientBottomNav';
import { useAuth } from '@/integrations/supabase/auth';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { session } = useAuth();

  // Determine if the current route is one that should display the bottom navigation bar
  const clientRoutes = ['/', '/search', '/favorites', '/profile'];
  const showClientNav = clientRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

  // Determine if the current route is a public route (e.g., restaurant profile)
  const isPublicRoute = location.pathname.startsWith('/restaurant/');

  // Determine if the current route is a management route (e.g., /restaurant-management)
  const isManagementRoute = location.pathname.startsWith('/restaurant-management');

  // Determine the key for the selected tab (no longer needed for ClientBottomNav, but kept for context)
  // const selectedTabKey = clientRoutes.find(route => location.pathname === route || location.pathname.startsWith(route + '/')) || '/';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <main
        className={cn(
          "flex-grow",
          // Add padding bottom only if client nav is shown
          showClientNav ? 'pb-20' : 'pb-0',
          // Center content for public/management routes if needed, otherwise full width
          isPublicRoute || isManagementRoute ? 'mx-auto w-full' : 'mx-auto w-full max-w-md'
        )}
      >
        <Outlet />
      </main>
      
      {/* Bottom Navigation Bar for Client Routes */}
      {showClientNav && (
        <ClientBottomNav />
      )}
    </div>
  );
};

export default SharedLayoutWrapper;