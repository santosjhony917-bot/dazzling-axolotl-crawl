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
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={handleBackClick} className="text-gray-500 hover:text-primary transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-3">
                <Icon className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
              </div>
            </div>
            {/* Actions slot */}
            {actions && <div>{actions}</div>}
          </div>
        </div>
        <Separator />
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default RestaurantAreaPageLayout;