"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  menu_items: MenuItem[]; // This will be populated after fetching
}

const RestaurantFullMenuPage = () => {
  const { id: restaurantId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFullMenu = async () => {
      if (!restaurantId) {
        setError("ID do restaurante não fornecido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch restaurant name
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', restaurantId)
          .single();

        if (restaurantError) throw restaurantError;
        if (restaurantData) {
          setRestaurantName(restaurantData.name);
        }

        // Fetch categories and their items
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('menu_categories')
          .select(`
            id,
            name,
            order_index,
            is_active,
            menu_items (
              id,
              name,
              description,
              price,
              image_url,
              is_active,
              order_index
            )
          `)
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
          .order('order_index', { foreignTable: 'menu_items', ascending: true }); // Order items within categories

        if (categoriesError) throw categoriesError;

        setCategories(categoriesData || []);
      } catch (err: any) {
        console.error("Erro ao buscar o menu completo:", err.message);
        setError("Não foi possível carregar o menu completo. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchFullMenu();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Carregando menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500">
        <p>{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{restaurantName || 'Cardápio Completo'}</h1>
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-gray-600">Nenhum item de menu encontrado para este restaurante.</p>
      ) : (
        categories.map((category) => (
          <div key={category.id} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">{category.name}</h2>
            <div className="grid gap-4">
              {category.menu_items.filter(item => item.is_active).length === 0 ? (
                <p className="text-gray-500">Nenhum item ativo nesta categoria.</p>
              ) : (
                category.menu_items.filter(item => item.is_active).map((item) => (
                  <Card key={item.id} className="flex items-center p-4">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-md mr-4" />
                    )}
                    <div className="flex-grow">
                      <CardTitle className="text-lg font-bold">{item.name}</CardTitle>
                      {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                      <p className="text-md font-semibold text-highlight mt-2">
                        R$ {item.price.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default RestaurantFullMenuPage;