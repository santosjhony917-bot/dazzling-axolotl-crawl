import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, RefreshCw, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { WeekSchedule } from '@/types/schedule';

interface ScrapedRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  city: string;
  state: string;
  status: 'Pendente' | 'Concluída';
  reward: number;
  imported_at: string;
  googleMapsUrl?: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  galleryImages?: string[];
  openingHours?: WeekSchedule;
  assignedToId?: string;
  assignedToName?: string;
}

const getRestaurantUniqueKey = (name: string, address: string) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};

export default function ExportedRestaurants() {
  const [missions, setMissions] = useState<ScrapedRestaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pendente' | 'Concluída'>('all');

  const loadMissions = () => {
    try {
      const saved = localStorage.getItem('mock-freelancer-missions');
      if (saved) {
        setMissions(JSON.parse(saved));
      } else {
        setMissions([]);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar restaurantes exportados.');
    }
  };

  useEffect(() => {
    loadMissions();
  }, []);

  const handleRemove = (restaurant: ScrapedRestaurant) => {
    try {
      const saved = localStorage.getItem('mock-freelancer-missions');
      if (!saved) return;

      const currentMissions = JSON.parse(saved);
      const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
      const updated = currentMissions.filter((m: any) => getRestaurantUniqueKey(m.name, m.address) !== key);

      localStorage.setItem('mock-freelancer-missions', JSON.stringify(updated));
      setMissions(updated);

      // Trigger a storage event to sync with other components like GoogleMapsCollector
      window.dispatchEvent(new Event('storage'));

      showSuccess(`"${restaurant.name}" removido da fila com sucesso!`);
    } catch (e) {
      console.error(e);
      showError('Erro ao remover da fila.');
    }
  };

  const handleClearAll = () => {
    if (!window.confirm('Tem certeza que deseja limpar toda a fila de missões? Isso removerá todas as missões pendentes e concluídas da fila do freelancer.')) {
      return;
    }

    try {
      localStorage.removeItem('mock-freelancer-missions');
      setMissions([]);
      window.dispatchEvent(new Event('storage'));
      showSuccess('Toda a fila de missões foi esvaziada!');
    } catch (e) {
      console.error(e);
      showError('Erro ao limpar a fila.');
    }
  };

  const filteredMissions = missions.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 p-4">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl text-primary font-bold">Fila de Restaurantes Exportados</CardTitle>
            <CardDescription>
              Visualize, filtre e gerencie todos os restaurantes exportados para a fila de missões dos freelancers.
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={loadMissions} className="gap-1 border-gray-300 font-semibold bg-white w-full sm:w-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
            {missions.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleClearAll} 
                className="gap-1 font-bold w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Esvaziar Fila
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 p-5 bg-white shadow-soft-md rounded-2xl border border-gray-100 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, endereço ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-300 text-sm focus-visible:ring-highlight"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button 
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
            className={`font-semibold ${filterStatus === 'all' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600'}`}
          >
            Todos ({missions.length})
          </Button>
          <Button 
            variant={filterStatus === 'Pendente' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('Pendente')}
            className={`font-semibold ${filterStatus === 'Pendente' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600'}`}
          >
            Pendentes ({missions.filter(m => m.status === 'Pendente').length})
          </Button>
          <Button 
            variant={filterStatus === 'Concluída' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('Concluída')}
            className={`font-semibold ${filterStatus === 'Concluída' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600'}`}
          >
            Concluídos ({missions.filter(m => m.status === 'Concluída').length})
          </Button>
        </div>
      </div>

      {/* Lista de Exportados */}
      <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-0">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-16 text-gray-500 font-medium">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              Nenhum restaurante exportado corresponde aos filtros.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Categoria</TableHead>
                  <TableHead className="font-bold">Freelancer Designado</TableHead>
                  <TableHead className="font-bold text-center">Status</TableHead>
                  <TableHead className="font-bold text-center">Recompensa</TableHead>
                  <TableHead className="font-bold">Exportado Em</TableHead>
                  <TableHead className="font-bold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMissions.map((m) => (
                  <TableRow key={m.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-semibold text-primary">
                      {m.googleMapsUrl ? (
                        <a 
                          href={m.googleMapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline hover:text-highlight flex items-center gap-1"
                        >
                          {m.name} <span className="text-[10px] text-gray-400 font-normal">↗</span>
                        </a>
                      ) : (
                        m.name
                      )}
                    </TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell className="font-medium text-xs">
                      {m.assignedToName ? (
                        <Badge variant="outline" className="border-blue-200 text-blue-800 bg-blue-50/50 font-bold px-2 py-0.5 rounded-full">
                          {m.assignedToName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-indigo-200 text-indigo-800 bg-indigo-50/50 font-bold px-2 py-0.5 rounded-full">
                          Fila Global
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={
                        m.status === 'Concluída' 
                          ? 'bg-emerald-100 text-emerald-800 border-none font-bold' 
                          : 'bg-amber-100 text-amber-800 border-none font-bold'
                      }>
                        {m.status === 'Concluída' ? 'Concluída' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-green-700">R$ {m.reward.toFixed(2)}</TableCell>
                    <TableCell className="text-gray-500 font-medium text-xs">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(m.imported_at || Date.now()).toLocaleDateString('pt-BR')}</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-3 h-3" /> {new Date(m.imported_at || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold gap-1"
                        onClick={() => handleRemove(m)}
                      >
                        <Trash2 className="w-4 h-4" /> Remover da Fila
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
