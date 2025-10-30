import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RestaurantAreaPageLayoutProps {
  title: string;
  icon: LucideIcon;
  backPath: string;
  children: React.ReactNode;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({ title, icon: Icon, backPath, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link to={backPath}>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Icon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto pb-12">
        {children}
      </main>
    </div>
  );
};

export default RestaurantAreaPageLayout;