import React from 'react';
import { ArrowLeft, LucideProps } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { cn } from '@/lib/utils';

interface RestaurantAreaPageLayoutProps {
  title: string;
  icon?: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  backPath?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  dark?: boolean;
}

const RestaurantAreaPageLayout: React.FC<RestaurantAreaPageLayoutProps> = ({
  title,
  backPath,
  children,
  dark = false,
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (backPath) {
      navigate(backPath.startsWith('/') ? backPath : `/${backPath}`);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn(
      "flex flex-col w-full flex-grow font-['Poppins'] transition-colors duration-200",
      dark ? "bg-[#090D1A]" : "bg-white"
    )}>
      <Header 
        title={title} 
        leftAction={{ icon: ArrowLeft, onClick: handleBackClick }}
        dark={dark}
      />
      
      <main className={cn(
        "px-4 pt-2 pb-6 space-y-6 max-w-md mx-auto w-full relative z-20 mt-1 transition-colors duration-200",
        dark ? "text-white" : "text-slate-800"
      )}>
        {children}
      </main>
    </div>
  );
};

export default RestaurantAreaPageLayout;