import React from 'react';
import { MapPin, Utensils } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NearbyCompetitorCardProps {
  id: string;
  name: string;
  distance_km: number;
  category: string;
}

const NearbyCompetitorCard: React.FC<NearbyCompetitorCardProps> = ({ name, distance_km, category }) => {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold truncate">{name}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1 text-xs text-gray-500">
        <div className="flex items-center">
          <MapPin className="w-3 h-3 mr-1 text-red-500" />
          <span>{distance_km.toFixed(2)} km de distância</span>
        </div>
        <div className="flex items-center">
          <Utensils className="w-3 h-3 mr-1 text-blue-500" />
          <span>{category}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default NearbyCompetitorCard;