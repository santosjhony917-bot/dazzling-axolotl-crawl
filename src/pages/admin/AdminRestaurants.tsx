import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Edit, Loader2 } from 'lucide-react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Badge } from '@/components/ui/badge';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';

export default function AdminRestaurants() {
  const { restaurants, isLoading, error, updatePlan, isUpdating } = useAdminRestaurants();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">Erro ao carregar restaurantes: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title="Gerenciar Restaurantes"
        description="Visualização e edição detalhada de todos os restaurantes cadastrados."
      />

      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Nenhum restaurante encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            restaurant.plan === 'premium' || restaurant.plan === 'premium_gift'
                              ? 'border-amber-500 text-amber-700 bg-amber-50'
                              : 'border-gray-400 text-gray-600 bg-white'
                          }
                        >
                          {restaurant.plan === 'premium' ? 'Premium' : restaurant.plan === 'premium_gift' ? 'Premium (Gift)' : 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell>{restaurant.city || 'N/A'}</TableCell>
                      <TableCell>{restaurant.state || 'N/A'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(createPageUrl('adminEditRestaurant', { restaurantId: restaurant.id }))}
                          disabled={isUpdating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}