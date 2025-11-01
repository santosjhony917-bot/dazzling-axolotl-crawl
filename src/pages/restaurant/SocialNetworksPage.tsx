import React from 'react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import SocialNetworksSettings from '@/components/restaurant/SocialNetworksSettings';
import { Link } from 'lucide-react';

const SocialNetworksPage: React.FC = () => {
  return (
    <RestaurantAreaPageLayout 
      title="Outras Redes" 
      icon={Link} 
      backPath="restaurant-area/profile-menu"
    >
      <div className="p-4">
        <SocialNetworksSettings />
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default SocialNetworksPage;