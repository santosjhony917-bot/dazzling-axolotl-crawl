import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Utensils, MapPin, Upload, Loader2, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface IncompleteRestaurant {
  id: string;
  name: string;
  external_url: string | null;
  missingPhases: string[];
}

const IncompleteRestaurantAlerts: React.FC = () => {
  const [incompleteRestaurants, setIncompleteRestaurants] = useState<IncompleteRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchIncompleteRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Buscar todos os restaurantes (limitado a 1000 para evitar sobrecarga)
      const { data: allRestaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('id, name, external_url, category, image_url, cover_image_url, latitude, longitude')
        .limit(1000);

      if (fetchError) throw fetchError;

      const incompleteList: IncompleteRestaurant[] = [];
      const restaurantIds = allRestaurants.map(r => r.id);
      
      // 2. Buscar categorias de menu para a Fase 3
      const { data: menuCategories, error: menuError } = await supabase
        .from('menu_categories')
        .select('restaurant_id');
        
      if (menuError) throw menuError;
      
      const restaurantsWithMenu = new Set(menuCategories.map(c => c.restaurant_id));

      // 3. Analisar cada restaurante
      for (const restaurant of allRestaurants) {
        const missingPhases: string[] = [];
        
        // Fase 1 Check (Info Gerais: Categoria, Logo, Capa)
        if (!restaurant.category || !restaurant.image_url || !restaurant.cover_image_url) {
          missingPhases.push('Fase 1 (Info Gerais)');
        }
        
        // Fase 2 Check (Endereço/Geo: Latitude/Longitude)
        if (!restaurant.latitude || !restaurant.longitude) {
          missingPhases.push('Fase 2 (Localização/Geo)');
        }
        
        // Fase 3 Check (Cardápio: Pelo menos 1 categoria)
        if (!restaurantsWithMenu.has(restaurant.id)) {
          missingPhases.push('Fase 3 (Cardápio)');
        }
        
        if (missingPhases.length > 0) {
          incompleteList.push({
            id: restaurant.id,
            name: restaurant.name,
            external_url: restaurant.external_url,
            missingPhases,
          });
        }
      }

      setIncompleteRestaurants(incompleteList);

    } catch (e) {
      setError(`Falha ao carregar alertas: ${(e as Error).message}`);
      console.error("Error fetching incomplete restaurants:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncompleteRestaurants();
  }, [fetchIncompleteRestaurants]);

  if (isLoading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Verificando status dos restaurantes...</p>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro de Alerta</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (incompleteRestaurants.length === 0) {
    return (
      <Alert className="border-green-500 bg-green-50 text-green-700">
        <Check className="h-4 w-4" />
        <AlertTitle>Tudo Completo!</AlertTitle>
        <AlertDescription>
          Todos os restaurantes verificados possuem dados completos nas Fases 1, 2 e 3.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 fill-red-100 text-red-600" /> {incompleteRestaurants.length} Restaurantes Incompletos
        </CardTitle>
        <CardDescription className="text-gray-600">
          Estes restaurantes precisam de atenção nas fases de upload para aparecerem corretamente no app.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 space-y-3">
        {incompleteRestaurants.map((restaurant) => (
          <div key={restaurant.id} className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-red-700 truncate">{restaurant.name}</p>
              <p className="text-sm text-red-600 mt-0.5">
                Fases Pendentes: {restaurant.missingPhases.join(', ')}
              </p>
              {restaurant.external_url && (
                <p className="text-xs text-red-500 mt-1 truncate">
                  Chave: {restaurant.external_url}
                </p>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(createPageUrl('admin/edit-restaurant'))} // Redireciona para a página de edição
              className="h-8 w-8 text-red-600 hover:bg-red-100 shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button 
          onClick={fetchIncompleteRestaurants} 
          variant="outline" 
          className="w-full mt-4 border-primary text-primary hover:bg-primary/5"
        >
          Recarregar Alertas
        </Button>
      </CardContent>
    </Card>
  );
};

export default IncompleteRestaurantAlerts;