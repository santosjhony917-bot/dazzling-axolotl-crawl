import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Utensils, Edit, Loader2, Notebook, Copy } from 'lucide-react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Badge } from '@/components/ui/badge';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Restaurant, RestaurantPlan, VisitStatus } from '@/types/supabase';
import VisitNotesDialog from '@/components/admin/VisitNotesDialog';
import { showSuccess } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const visitStatusOptions: VisitStatus[] = [
  'Pendente',
  'Contatado',
  'Interessado',
  'Não Interessado',
  'Não Localizado',
];

const allVisitStatusOptions: (VisitStatus | 'all')[] = ['all', ...visitStatusOptions];
const visitStatusLabels: Record<VisitStatus | 'all', string> = {
  all: 'Todos os Status',
  Pendente: 'Pendente',
  Contatado: 'Contatado',
  Interessado: 'Interessado',
  'Não Interessado': 'Não Interessado',
  'Não Localizado': 'Não Localizado',
};

const planOptions: (RestaurantPlan | 'all')[] = ['all', 'free', 'basic', 'premium', 'premium_gift'];
const planLabels: Record<RestaurantPlan | 'all', string> = {
  all: 'Todos os Planos',
  free: 'Free',
  basic: 'Basic',
  premium: 'Premium',
  premium_gift: 'Premium (Gift)',
};

export default function AdminRestaurants() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ city: '', neighborhood: '', state: '', plan: 'all', visit_status: 'all' });
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

  const {
    restaurants,
    isLoading,
    error,
    updateStatus,
    isUpdatingStatus,
    updateNotes,
    isUpdatingNotes,
  } = useAdminRestaurants(filters);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value === 'all' ? '' : value }));
  };

  const handleOpenNotes = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = (notes: string) => {
    if (!selectedRestaurant) return;
    updateNotes({ restaurantId: selectedRestaurant.id, newNotes: notes }, {
      onSuccess: () => setIsNotesDialogOpen(false),
    });
  };

  const handleStatusChange = (restaurantId: string, newStatus: VisitStatus) => {
    updateStatus({ restaurantId, newStatus });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Código copiado para a área de transferência!');
  };

  const uniqueStates = useMemo(() => {
    const states = new Set(restaurants.map(r => r.state).filter(Boolean));
    return ['all', ...Array.from(states).sort()];
  }, [restaurants]);

  if (isLoading && !restaurants.length) {
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
        description="Filtre, visualize e gerencie todos os restaurantes e o status de prospecção."
      />

      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Filtrar por cidade..."
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            />
            <Input
              placeholder="Filtrar por bairro..."
              value={filters.neighborhood}
              onChange={(e) => handleFilterChange('neighborhood', e.target.value)}
            />
            <Select value={filters.state} onValueChange={(value) => handleFilterChange('state', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state === 'all' ? 'Todos os Estados' : state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.plan} onValueChange={(value) => handleFilterChange('plan', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map(plan => (
                  <SelectItem key={plan} value={plan}>{planLabels[plan]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.visit_status} onValueChange={(value) => handleFilterChange('visit_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {allVisitStatusOptions.map(status => (
                  <SelectItem key={status} value={status}>{visitStatusLabels[status]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status Visita</TableHead>
                  <TableHead>Anotações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && restaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhum restaurante encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell>{[restaurant.neighborhood, restaurant.city, restaurant.state].filter(Boolean).join(', ') || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{restaurant.claim_code}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(restaurant.claim_code || '')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            restaurant.plan === 'premium' || restaurant.plan === 'premium_gift'
                              ? 'border-amber-500 text-amber-700 bg-amber-50'
                              : 'border-gray-400 text-gray-600 bg-white'
                          }
                        >
                          {planLabels[restaurant.plan]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={restaurant.visit_status || 'Pendente'}
                          onValueChange={(value) => handleStatusChange(restaurant.id, value as VisitStatus)}
                          disabled={isUpdatingStatus}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {visitStatusOptions.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                                {restaurant.visit_notes || 'Nenhuma anotação.'}
                              </p>
                            </TooltipTrigger>
                            {restaurant.visit_notes && (
                              <TooltipContent>
                                <p className="max-w-sm">{restaurant.visit_notes}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenNotes(restaurant)}
                        >
                          <Notebook className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(createPageUrl('adminEditRestaurant', { restaurantId: restaurant.id }))}
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

      {selectedRestaurant && (
        <VisitNotesDialog
          isOpen={isNotesDialogOpen}
          onClose={() => setIsNotesDialogOpen(false)}
          restaurantName={selectedRestaurant.name}
          initialNotes={selectedRestaurant.visit_notes}
          onSave={handleSaveNotes}
          isSaving={isUpdatingNotes}
        />
      )}
    </div>
  );
}