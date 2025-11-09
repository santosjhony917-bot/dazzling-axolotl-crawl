import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  image_url?: string;
  category: string;
  distance_km: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className="block">
      <Card className="flex items-center p-3 space-x-4 hover:bg-gray-50 transition-colors dark:hover:bg-gray-800">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/80'}
          alt={restaurant.name}
          className="w-20 h-20 rounded-md object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-md">{restaurant.name}</h3>
          <p className="text-sm text-muted-foreground">{restaurant.category}</p>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{restaurant.distance_km.toFixed(1)} km</span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default RestaurantCard;