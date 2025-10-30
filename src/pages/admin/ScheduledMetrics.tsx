import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Loader2, AlertTriangle, Save, Utensils, Calendar, Users } from 'lucide-react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Restaurant } from '@/types/supabase';
import { Badge } from '@/components/ui/badge'; // CORRIGIDO: Importando Badge

// --- Tipos ---
interface ScheduledMetric {
  id: string;
  restaurant_id: string;
  target_followers: number;
  start_time: string;
  end_time: string;
  initial_followers: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  restaurants: { name: string } | null; // CORRIGIDO: Adicionando a propriedade aninhada
}

// --- Hooks de Dados ---

const fetchScheduledMetrics = async (): Promise<ScheduledMetric[]> => {
  const { data, error } = await supabase
    .from('scheduled_metrics')
    .select(`
      *,
      restaurants (name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as ScheduledMetric[];
};

const useScheduledMetrics = () => {
  return useQuery<ScheduledMetric[], Error>({
    queryKey: ['scheduledMetrics'],
    queryFn: fetchScheduledMetrics,
    staleTime: 5000, // Atualiza a cada 5 segundos para ver o status
  });
};

// --- Componente Principal ---

const ScheduledMetrics: React.FC = () => {
  const { restaurants, isLoading: isRestaurantsLoading } = useAdminRestaurants();
  const { data: schedules, isLoading: isSchedulesLoading, error: schedulesError, refetch: refetchSchedules } = useScheduledMetrics();
  const queryClient = useQueryClient();

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('');
  const [targetFollowers, setTargetFollowers] = useState<number>(0);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!selectedRestaurantId || targetFollowers <= 0 || durationHours <= 0) {
      showError("Preencha todos os campos corretamente.");
      return;
    }

    setIsScheduling(true);

    try {
      const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
      if (!restaurant) throw new Error("Restaurante não encontrado.");

      const initialFollowers = restaurant.followers_override || 0;
      
      if (targetFollowers <= initialFollowers) {
          showError(`O alvo de seguidores (${targetFollowers}) deve ser maior que o valor atual (${initialFollowers}).`);
          setIsScheduling(false);
          return;
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

      const payload = {
        restaurant_id: selectedRestaurantId,
        target_followers: targetFollowers,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        initial_followers: initialFollowers,
        status: 'pending',
      };

      const { error: insertError } = await supabase
        .from('scheduled_metrics')
        .insert([payload]);

      if (insertError) throw insertError;

      showSuccess("Agendamento criado com sucesso! O aumento gradual começará em breve.");
      
      // Limpar formulário e refetch
      setSelectedRestaurantId('');
      setTargetFollowers(0);
      setDurationHours(24);
      refetchSchedules();
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] }); // Para atualizar a lista de restaurantes
      
    } catch (e) {
      showError(`Falha ao agendar: ${(e as Error).message}`);
    } finally {
      setIsScheduling(false);
    }
  };
  
  const getStatusBadge = (status: ScheduledMetric['status']) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 text-white">Ativo</Badge>;
      case 'completed': return <Badge className="bg-blue-500 text-white">Concluído</Badge>;
      case 'cancelled': return <Badge className="bg-red-500 text-white">Cancelado</Badge>;
      case 'pending': return <Badge className="bg-yellow-500 text-white">Pendente</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Seção de Criação de Agendamento */}
      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
            <Clock className="w-6 h-6" /> Agendar Aumento de Seguidores
          </CardTitle>
          <CardDescription>Simule o crescimento orgânico de seguidores ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Seleção de Restaurante */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Restaurante</label>
            <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId} disabled={isRestaurantsLoading || isScheduling}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Selecione o restaurante" />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} (Atual: {r.followers_override || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Seguidores Alvo */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Seguidores Alvo</label>
            <Input
              type="number"
              value={targetFollowers || ''}
              onChange={(e) => setTargetFollowers(parseInt(e.target.value) || 0)}
              min="1"
              placeholder="Ex: 5000"
              className="h-10 rounded-xl"
              disabled={isScheduling}
            />
          </div>
          
          {/* Duração */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Duração (Horas)</label>
            <Input
              type="number"
              value={durationHours || ''}
              onChange={(e) => setDurationHours(parseInt(e.target.value) || 0)}
              min="1"
              placeholder="Ex: 24"
              className="h-10 rounded-xl"
              disabled={isScheduling}
            />
          </div>
          
          <Button 
            onClick={handleSchedule}
            disabled={isScheduling || !selectedRestaurantId || targetFollowers <= 0 || durationHours <= 0}
            className="w-full bg-highlight hover:bg-highlight/90 h-10"
          >
            {isScheduling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Agendar Aumento
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de Agendamentos */}
      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
            <Calendar className="w-6 h-6" /> Agendamentos Ativos
          </CardTitle>
          <CardDescription>Monitoramento dos aumentos de seguidores em andamento.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSchedulesLoading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : schedulesError ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : schedules && schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="p-4 border rounded-xl shadow-soft-sm flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-primary truncate">
                      {schedule.restaurants?.name || 'Restaurante Desconhecido'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Alvo: {schedule.target_followers} seguidores (De {schedule.initial_followers})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Início: {format(new Date(schedule.start_time), 'dd/MM HH:mm', { locale: ptBR })} | Fim: {format(new Date(schedule.end_time), 'dd/MM HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="shrink-0 ml-4">
                    {getStatusBadge(schedule.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum agendamento ativo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduledMetrics;