import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Utensils, Edit, Loader2, Notebook, Copy, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
import ConfirmationDialog from '@/components/ConfirmationDialog';

const visitStatusOptions: VisitStatus[] = [
  true,
  'Agendado',
  'Contatado',
  'Interessado',
  'Não Interessado',
  'Não Localizado',
];

const allVisitStatusOptions: (VisitStatus | 'all')[] = ['all', ...visitStatusOptions];
const visitStatusLabels: Record<VisitStatus | 'all', string> = {
  all: 'Todos os Status',
  Pendente: false,
  Visitado: true,
  Agendado: 'Agendado',
  Contatado: 'Contatado',
  Interessado: 'Interessado',
  'Não Interessado': 'Não Interessado',
  'Não Localizado': 'Não Localizado',
};

const planOptions: (RestaurantPlan | 'all')[] = ['all', 'free', 'premium', 'premium_gift'];
const planLabels: Record<string, string> = {
  all: 'Todos os Planos',
  free: 'Gratuito',
  premium: 'Premium (Assinante)',
  premium_gift: 'Premium (Cortesia)',
};

export default function AdminRestaurants() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ name: '', city: '', neighborhood: '', state: '', plan: 'all', is_published: 'all' });
  const [nameInput, setNameInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [uniqueStates, setUniqueStates] = useState<string[]>(['all']);

  // Debounce text filters to prevent massive load on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        name: nameInput,
        city: cityInput,
        neighborhood: neighborhoodInput
      }));
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [nameInput, cityInput, neighborhoodInput]);

  // Load unique states once
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('state');
        if (error) throw error;
        if (data) {
          const states = new Set<string>(data.map(r => r.state).filter(Boolean) as string[]);
          setUniqueStates(['all', ...Array.from(states).sort()]);
        }
      } catch (err) {
        console.warn("Failed to fetch unique states from Supabase:", err);
        try {
          const fallback = localStorage.getItem('mock-supabase-fallback-restaurants');
          if (fallback) {
            const parsed = JSON.parse(fallback);
            const states = new Set<string>(parsed.map((r: any) => r.state).filter(Boolean) as string[]);
            setUniqueStates(['all', ...Array.from(states).sort()]);
          }
        } catch (e) {
          console.error("Local fallback states error:", e);
        }
      }
    };
    fetchStates();
  }, []);

  const {
    restaurants,
    totalCount,
    isLoading,
    error,
    updatePlan,
    isUpdatingPlan,
    updateStatus,
    isUpdatingStatus,
    updateNotes,
    isUpdatingNotes,
    deleteRestaurant,
    isDeletingRestaurant,
  } = useAdminRestaurants({
    ...filters,
    page: currentPage,
    pageSize: 15
  });

  const itemsPerPage = 15;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;

  const paginatedRestaurants = restaurants;

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value === 'all' ? '' : value }));
    setCurrentPage(1);
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

  const handlePlanChange = (restaurantId: string, newPlan: RestaurantPlan) => {
    updatePlan({ restaurantId, newPlan });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Código copiado para a área de transferência!');
  };

  const handleOpenDeleteConfirm = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setRestaurantToDelete(null);
    setIsConfirmDeleteDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!restaurantToDelete) return;
    deleteRestaurant(restaurantToDelete.id, {
      onSuccess: () => {
        handleCloseDeleteConfirm();
      },
    });
  };

  // uniqueStates is loaded via useEffect once to support server-side pagination

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

      <Card className="shadow-none border-none rounded-2xl bg-white">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Input
              placeholder="Filtrar por nome..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <Input
              placeholder="Filtrar por cidade..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <Input
              placeholder="Filtrar por bairro..."
              value={neighborhoodInput}
              onChange={(e) => setNeighborhoodInput(e.target.value)}
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
            <Select value={filters.is_published} onValueChange={(value) => handleFilterChange('is_published', value)}>
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
                  <TableHead>Seguidores</TableHead>
                  <TableHead>Reivindicado</TableHead>
                  <TableHead>Status Visita</TableHead>
                  <TableHead>Anotações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && restaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                      Nenhum restaurante encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRestaurants.map((restaurant) => (
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
                        <Select
                          value={restaurant.plan || 'free'}
                          onValueChange={(value) => handlePlanChange(restaurant.id, value as RestaurantPlan)}
                          disabled={isUpdatingPlan || restaurant.plan === 'premium'}
                        >
                          <SelectTrigger 
                            className={`w-[170px] font-semibold text-xs h-8 ${
                              restaurant.plan === 'premium'
                                ? 'border-emerald-200 text-emerald-800 bg-emerald-50 opacity-80 cursor-not-allowed'
                                : restaurant.plan === 'premium_gift'
                                ? 'border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100/70'
                                : 'border-gray-300 text-slate-700 bg-white hover:bg-background-light'
                            }`}
                            title={restaurant.plan === 'premium' ? "Assinatura ativa do Premium (Assinante) - não pode ser alterada manualmente" : undefined}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Gratuito</SelectItem>
                            {restaurant.plan === 'premium' && (
                              <SelectItem value="premium">Premium (Assinante)</SelectItem>
                            )}
                            <SelectItem value="premium_gift">Premium (Cortesia)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {(restaurant as any).followers_count ?? restaurant.followers_override ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            restaurant.user_id
                              ? 'border-green-500 text-green-700 bg-green-50'
                              : 'border-gray-400 text-gray-600 bg-white'
                          }
                        >
                          {restaurant.user_id ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={restaurant.is_published || false}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleOpenDeleteConfirm(restaurant)}
                          disabled={isDeletingRestaurant}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <div className="text-sm text-gray-500 font-medium">
                Exibindo <span className="font-semibold text-primary">{startIndex + 1}</span> a{' '}
                <span className="font-semibold text-primary">
                  {Math.min(startIndex + itemsPerPage, totalCount)}
                </span>{' '}
                de <span className="font-semibold text-primary">{totalCount}</span> restaurantes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-bold text-gray-600 px-2">
                  Página {activePage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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

      {restaurantToDelete && (
        <ConfirmationDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={handleCloseDeleteConfirm}
          onConfirm={handleConfirmDelete}
          title={`Remover ${restaurantToDelete.name}?`}
          description="Esta ação é irreversível. Todos os dados do restaurante, incluindo cardápios e galerias, serão permanentemente removidos. Tem certeza que deseja continuar?"
          confirmText="Sim, remover"
          cancelText="Cancelar"
          isLoading={isDeletingRestaurant}
        />
      )}
    </div>
  );
}