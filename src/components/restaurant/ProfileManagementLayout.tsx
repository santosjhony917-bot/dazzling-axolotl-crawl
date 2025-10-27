import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainProfileCard from './MainProfileCard';

interface ProfileManagementLayoutProps {
  children: React.ReactNode;
  // Assuming the restaurant ID is passed to the layout
  restaurantId: string; 
}

const ProfileManagementLayout: React.FC<ProfileManagementLayoutProps> = ({ children, restaurantId }) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Button to view public profile */}
      <div className="flex justify-end p-4">
        <Button asChild variant="outline">
          {/* Links to the public restaurant page. Assuming route structure /r/:restaurantId */}
          <Link to={`/r/${restaurantId}`}>
            Ver Perfil Premium
          </Link>
        </Button>
      </div>
      
      <main className="p-4 space-y-6">
        
        {/* 1. Card Principal (Logo e Nome) */}
        <MainProfileCard />
        
        {children}
      </main>
    </div>
  );
};

export default ProfileManagementLayout;