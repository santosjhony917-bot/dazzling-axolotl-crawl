import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import RestaurantBottomNav from './RestaurantBottomNav';
import { Restaurant } from '@/types/supabase';

interface RestaurantAreaPageLayoutProps {
  restaurant: Restaurant;
  title: string;
  children: ReactNode;
  backPath: string;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({ restaurant, title, children, backPath }) => {
  // const isFree = restaurant.plan === 'free'; // isFree is not used here

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <Link to={backPath} className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate flex-grow text-center mx-4">
            {title}
          </h1>
          <div className="w-6 h-6">
            {/* Placeholder for alignment */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
        {children}
      </div>

      {/* Bottom Navigation */}
      <RestaurantBottomNav />
    </div>
  );
};

export default RestaurantAreaPageLayout;