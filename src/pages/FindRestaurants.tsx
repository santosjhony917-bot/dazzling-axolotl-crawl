import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Mock data for restaurants
const mockRestaurants = [
  {
    id: 1,
    name: "Cantina Italiana",
    cuisine: "Italiana",
    rating: 4.5,
    distance: "1.2km",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80",
  },
  {
    id: 2,
    name: "Sushi Master",
    cuisine: "Japonesa",
    rating: 4.8,
    distance: "2.5km",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&q=80",
  },
  {
    id: 3,
    name: "Burger Queen",
    cuisine: "Hambúrguer",
    rating: 4.2,
    distance: "0.8km",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80",
  },
  {
    id: 4,
    name: "Taco Fiesta",
    cuisine: "Mexicana",
    rating: 4.6,
    distance: "3.1km",
    image: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=500&q=80",
  },
    {
    id: 5,
    name: "Padaria Pão Dourado",
    cuisine: "Padaria",
    rating: 4.9,
    distance: "0.5km",
    image: "https://images.unsplash.com/photo-1555952517-2e8e729e0b44?w=500&q=80",
  },
  {
    id: 6,
    name: "Steak House Grill",
    cuisine: "Churrasco",
    rating: 4.7,
    distance: "4.0km",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80",
  },
];

const FindRestaurants = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Restaurantes</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>São Paulo, SP</span>
              </div>
              <Button onClick={handleSignOut} variant="outline">Sair</Button>
            </div>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por nome ou tipo de comida..."
              className="w-full pl-10 h-12 text-base"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockRestaurants.map((restaurant) => (
            <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <img src={restaurant.image} alt={restaurant.name} className="w-full h-48 object-cover" />
              <CardHeader>
                <CardTitle>{restaurant.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold">{restaurant.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{restaurant.distance}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FindRestaurants;