import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Search, 
  RefreshCw, 
  RotateCcw,
  AlertTriangle,
  Building,
  MapPin
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

export default function RemovedRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadRemovedRestaurants = async () => {
    setIsLoading(true);
    try {
      const PAGE_SIZE = 999;
      const allRemoved: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_deleted', true)
          .order('name')
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allRemoved.push(...data);
          page++;
        } else {
          hasMore = false;
        }

        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      setRestaurants(allRemoved);
    } catch (e: any) {
      console.error(e);
      showError('Erro ao carregar restaurantes removidos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRemovedRestaurants();

    const handleSync = () => {
      loadRemovedRestaurants();
    };

    window.addEventListener('local-sync-restaurants', handleSync);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
    };
  }, []);

  const handleRestore = async (restaurant: any) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_deleted: false })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess(`"${restaurant.name}" restaurado com sucesso!`);
      loadRemovedRestaurants();
      
      // Notifica as outras abas para recarregar
      window.dispatchEvent(new Event('local-sync-restaurants'));
      localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
    } catch (e: any) {
      console.error(e);
      showError(`Erro ao restaurar restaurante: ${e.message}`);
    }
  };

  const handlePermanentDelete = async (restaurant: any) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja apagar DEFINITIVAMENTE "${restaurant.name}"? Esta ação excluirá todos os dados e cardápios associados de forma irreversível.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess(`"${restaurant.name}" excluído definitivamente!`);
      loadRemovedRestaurants();
      
      // Notifica as outras abas
      window.dispatchEvent(new Event('local-sync-restaurants'));
      localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
    } catch (e: any) {
      console.error(e);
      showError(`Erro ao excluir permanentemente: ${e.message}`);
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.city && r.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            <CardTitle className="text-xl font-bold text-slate-800">Lixeira de Estabelecimentos</CardTitle>
          </div>
          <CardDescription>
            Visualize, restaure ou exclua permanentemente restaurantes que foram removidos do painel.
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadRemovedRestaurants}
          disabled={isLoading}
          className="gap-1.5 font-bold h-9"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Barra de Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar nos removidos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 border-slate-200 focus-visible:ring-red-500 rounded-lg"
          />
        </div>

        {/* Tabela de Resultados */}
        {filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="bg-slate-100 text-slate-400 p-3 rounded-full mb-3">
              <Building className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-700">Nenhum restaurante removido</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Os estabelecimentos que você excluir nas outras abas aparecerão aqui para restauração rápida.
            </p>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Nome</TableHead>
                  <TableHead className="font-bold text-slate-700">Categoria</TableHead>
                  <TableHead className="font-bold text-slate-700">Cidade</TableHead>
                  <TableHead className="font-bold text-slate-700">Status Original</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/40">
                    <TableCell className="font-semibold text-slate-900">{r.name}</TableCell>
                    <TableCell>{r.category || 'Outros'}</TableCell>
                    <TableCell className="text-slate-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {r.city} - {r.state}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        r.visit_status === 'Visitado' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-50'
                          : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-50'
                      }>
                        {r.visit_status === 'Visitado' ? 'Importado/Visitado' : 'Coletado/Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold gap-1.5 h-8 px-2"
                          onClick={() => handleRestore(r)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold gap-1.5 h-8 px-2"
                          onClick={() => handlePermanentDelete(r)}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir Definitivo
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </div>
  );
}
