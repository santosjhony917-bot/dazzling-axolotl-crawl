import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LucideProps } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface RestaurantAreaPageLayoutProps {
  title: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  backPath?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({
  title,
  icon: Icon,
  backPath,
  children,
  actions,
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-soft-md border-b dark:border-gray-700 h-16 flex items-center">
        <div className="max-w-4xl mx-auto px-4 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBackClick} 
                className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-primary" />
              </button>
              <div className="flex items-center space-x-2">
                <Icon className="w-5 h-5 text-highlight" />
                <h1 className="text-xl font-extrabold text-primary dark:text-white tracking-tight truncate">{title}</h1>
              </div>
            </div>
            {/* Actions slot */}
            {actions && <div>{actions}</div>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default RestaurantAreaPageLayout;