import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface RestaurantData {
  name: string;
  followersCount: number;
  logoUrl: string;
  isFollowing: boolean;
  onFollowToggle: () => void;
}

interface RestaurantPublicHeaderProps {
  restaurant: RestaurantData;
}

const RestaurantPublicHeader: React.FC<RestaurantPublicHeaderProps> = ({ restaurant }) => {
  const { name, followersCount, logoUrl, isFollowing, onFollowToggle } = restaurant;
  
  // Mock: Assumindo que o plano é Free para exibir o badge
  const plan = 'Free'; 
  
  const formattedFollowers = followersCount > 0 ? `${followersCount} seguidores` : '0 seguidores';

  return (
    <div className="flex w-full flex-col gap-4 p-4">
      <div className="flex gap-4">
        {/* Logo */}
        <div 
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-24 w-24" 
          style={{ backgroundImage: `url("${logoUrl}")` }}
          data-alt="restaurant logo"
        />
        
        {/* Info */}
        <div className="flex flex-col justify-center">
          <p className="text-[#111418] dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">{name}</p>
          <p className="text-[#5f728c] dark:text-gray-400 text-base font-normal leading-normal">{formattedFollowers}</p>
          <span className="mt-1 inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10 dark:ring-gray-600/20 w-fit">
            {plan}
          </span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex w-full max-w-[480px] gap-3">
        <Button 
          onClick={onFollowToggle}
          className={cn(
            "flex-1 rounded-xl h-10 px-4 text-sm font-bold leading-normal tracking-[0.015em]",
            isFollowing 
              ? "bg-white border border-primary text-primary hover:bg-gray-50"
              : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          <span className="truncate">{isFollowing ? 'Seguindo' : 'Seguir'}</span>
        </Button>
        <Button 
          variant="outline"
          className="flex-1 rounded-xl h-10 px-4 bg-transparent border border-primary text-primary text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/5"
        >
          <Heart className="w-4 h-4 mr-1" />
          <span className="truncate">Favoritar</span>
        </Button>
      </div>
    </div>
  );
};

export default RestaurantPublicHeader;