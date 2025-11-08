import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
}

interface MenuCategory {
  id: string;
  name: string;
  menu_items: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

const PublicMenuPage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;

      try {
        setLoading(true);

        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, name, description, image_url')
          .eq('id', restaurantId)
          .single();

        if (restaurantError) throw restaurantError;
        setRestaurant(restaurantData);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('menu_categories')
          .select(`
            id,
            name,
            menu_items (
              id, name, description, price, image_url
            )
          `)
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (categoriesError) throw categoriesError;
        
        setMenu(categoriesData as MenuCategory[]);

      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching menu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando cardápio...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Erro ao carregar o cardápio: {error}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center h-screen">Restaurante não encontrado.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link to={`/restaurant/${restaurantId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Restaurante
          </Link>
        </Button>
      </div>

      <header className="mb-8 text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-primary">
          <AvatarImage src={restaurant.image_url} alt={restaurant.name} />
          <AvatarFallback>{restaurant.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{restaurant.name}</h1>
        <p className="text-muted-foreground mt-2">{restaurant.description}</p>
      </header>

      <div className="space-y-8">
        {menu.map((category) => (
          <div key={category.id}>
            <h2 className="text-2xl font-bold mb-4 pb-2 border-b">{category.name}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {category.menu_items.map((item) => (
                <Card key={item.id} className="flex flex-col sm:flex-row items-start p-4 space-y-4 sm:space-y-0 sm:space-x-4">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-full sm:w-28 h-28 rounded-md object-cover" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{item.name}</h4>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                    <p className="font-semibold text-primary mt-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicMenuPage;