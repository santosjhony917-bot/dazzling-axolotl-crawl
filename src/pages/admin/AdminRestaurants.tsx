import React, { useState, useMemo } from 'react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Restaurant, RestaurantPlan, VisitStatus } from '@/types/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Loader2, Edit2 } from 'lucide-react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import VisitNotesDialog from '@/components/admin/VisitNotesDialog';

const AdminRestaurants: React.FC = () => {
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    plan: 'all',
    neighborhood: '',
  });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const debouncedFilters = useMemo(() => filters, [filters]);
  const {
    restaurants,
    isLoading,
    updatePlan,
    isUpdatingPlan,
    updateStatus,
    isUpdatingStatus,
    updateNotes,
    isUpdatingNotes,
    refetch,
  } = useAdminRestaurants(debouncedFilters);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleOpenNotesDialog = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setNotesDialogOpen(true);
  };

  const planOptions: RestaurantPlan[] = ['free', 'basic', 'premium', 'premium_gift'];
  const statusOptions: VisitStatus[] = ['Pendente', 'Contatado', 'Interessado', 'Não Interessado', 'Não Localizado'];

  return (
    <AdminPageLayout title="Gerenciamento de Restaurantes" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Restaurantes' }]}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
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
          <Input
            placeholder="Filtrar por estado (UF)..."
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
          />
          <Select value={filters.plan} onValueChange={(value) => handleFilterChange('plan', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por plano..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Planos</SelectItem>
              {planOptions.map(plan => <SelectItem key={plan} value={plan}>{plan}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/Estado</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status Visita</TableHead>
                <TableHead>Anotações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : (
                restaurants.map(restaurant => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.city}, {restaurant.state}</TableCell>
                    <TableCell>{restaurant.plan}</TableCell>
                    <TableCell>{restaurant.visit_status}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {restaurant.visit_notes || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenNotesDialog(restaurant)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            <span>Editar Anotações</span>
                          </DropdownMenuItem>
                          {planOptions.map(plan => (
                            <DropdownMenuItem
                              key={plan}
                              onClick={() => updatePlan({ restaurantId: restaurant.id, newPlan: plan })}
                              disabled={isUpdatingPlan}
                            >
                              Mudar para {plan}
                            </DropdownMenuItem>
                          ))}
                          {statusOptions.map(status => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => updateStatus({ restaurantId: restaurant.id, newStatus: status })}
                              disabled={isUpdatingStatus}
                            >
                              Mudar status para {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedRestaurant && (
        <VisitNotesDialog
          isOpen={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          restaurant={selectedRestaurant}
          onSave={(newNotes) => {
            updateNotes({ restaurantId: selectedRestaurant.id, newNotes });
          }}
          isSaving={isUpdatingNotes}
        />
      )}
    </AdminPageLayout>
  );
};

export default AdminRestaurants;