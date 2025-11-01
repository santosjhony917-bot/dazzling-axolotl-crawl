import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, ScheduledMetric } from '@/types/supabase'; // Importar Restaurant e ScheduledMetric
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';

const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await supabase.from('restaurants').select('*');
  if (error) throw error;
  return data;
};

const fetchScheduledMetrics = async (): Promise<ScheduledMetric[]> => {
  const { data, error } = await supabase.from('scheduled_metrics').select('*').order('start_time', { ascending: false });
  if (error) throw error;
  return data;
};

const createScheduledMetric = async (metric: Omit<ScheduledMetric, 'id' | 'created_at' | 'status'>) => {
  const { error } = await supabase.from('scheduled_metrics').insert(metric);
  if (error) throw error;
};

const deleteScheduledMetric = async (id: string) => {
  const { error } = await supabase.from('scheduled_metrics').delete().eq('id', id);
  if (error) throw error;
};

const ScheduledMetricsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery<Restaurant[], Error>({
    queryKey: ['adminRestaurants'],
    queryFn: fetchRestaurants,
  });
  const { data: scheduledMetrics, isLoading: isLoadingMetrics } = useQuery<ScheduledMetric[], Error>({
    queryKey: ['scheduledMetrics'],
    queryFn: fetchScheduledMetrics,
  });

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>(undefined);
  const [targetFollowers, setTargetFollowers] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: createScheduledMetric,
    onSuccess: () => {
      showSuccess('Métrica agendada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['scheduledMetrics'] });
      setSelectedRestaurantId(undefined);
      setTargetFollowers(0);
      setStartDate(undefined);
      setEndDate(undefined);
    },
    onError: (err) => {
      showError(`Erro ao agendar métrica: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScheduledMetric,
    onSuccess: () => {
      showSuccess('Métrica removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['scheduledMetrics'] });
    },
    onError: (err) => {
      showError(`Erro ao remover métrica: ${err.message}`);
    },
  });

  const handleCreateMetric = () => {
    if (!selectedRestaurantId || !targetFollowers || !startDate || !endDate) {
      showError('Preencha todos os campos para agendar uma métrica.');
      return;
    }

    const restaurant = restaurants?.find(r => r.id === selectedRestaurantId);
    if (!restaurant) {
      showError('Restaurante selecionado inválido.');
      return;
    }

    const initialFollowers = restaurant.followers_override || 0;

    createMutation.mutate({
      restaurant_id: selectedRestaurantId,
      target_followers: targetFollowers,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      initial_followers: initialFollowers,
    });
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Gerenciar Métricas Agendadas</h1>

      <Card className="shadow-soft-md border-none rounded-xl">
        <CardHeader>
          <CardTitle>Agendar Nova Métrica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="restaurant">Restaurante</Label>
            <Select onValueChange={setSelectedRestaurantId} value={selectedRestaurantId}>
              <SelectTrigger id="restaurant">
                <SelectValue placeholder="Selecione um restaurante" />
              </SelectTrigger>
              <SelectContent>
                {restaurants?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} (Atual: {r.followers_override || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="targetFollowers">Meta de Seguidores</Label>
            <Input
              id="targetFollowers"
              type="number"
              value={targetFollowers}
              onChange={(e) => setTargetFollowers(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={`w-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={handleCreateMetric} disabled={createMutation.isPending} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" /> Agendar Métrica
          </Button>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold text-primary mt-8">Métricas Ativas</h2>
      {isLoadingMetrics ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : scheduledMetrics && scheduledMetrics.length > 0 ? (
        <div className="space-y-4">
          {scheduledMetrics.map((metric) => (
            <Card key={metric.id} className="shadow-soft-md border-none rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{restaurants?.find(r => r.id === metric.restaurant_id)?.name}</p>
                <p className="text-sm text-gray-600">Meta: {metric.target_followers} seguidores</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(metric.start_time), 'dd/MM/yyyy')} - {format(new Date(metric.end_time), 'dd/MM/yyyy')}
                </p>
              </div>
              <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(metric.id)} disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">Nenhuma métrica agendada.</p>
      )}
    </div>
  );
};

export default ScheduledMetricsPage;