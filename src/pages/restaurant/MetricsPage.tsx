"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, Utensils, Loader2, CalendarDays, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Corrigido: importação do componente
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';

interface RestaurantMetrics {
  total_followers: number;
  total_views: number;
  menu_views: number;
  gallery_views: number;
}

interface ScheduledMetric {
  id: string;
  target_followers: number;
  start_time: string;
  end_time: string;
  initial_followers: number;
  status: string;
}

const MetricsPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [metrics, setMetrics] = useState<RestaurantMetrics | null>(null);
  const [scheduledMetrics, setScheduledMetrics] = useState<ScheduledMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [targetFollowers, setTargetFollowers] = useState<number | ''>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchScheduledMetrics();
  }, [restaurantId]);

  const fetchMetrics = async () => {
    if (!restaurantId) return;
    setLoading(true);
    // This is a placeholder. In a real app, you'd fetch actual metrics.
    // For now, we'll use a mock or simple count.
    const { data: followersData, error: followersError } = await supabase
      .rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('followers_override')
      .eq('id', restaurantId)
      .single();

    if (followersError || restaurantError) {
      console.error('Error fetching metrics:', followersError?.message || restaurantError?.message);
      toast.error('Erro ao carregar métricas.');
      setLoading(false);
      return;
    }

    const totalFollowers = (followersData || 0) + (restaurantData?.followers_override || 0);

    setMetrics({
      total_followers: totalFollowers,
      total_views: 12345, // Mock data
      menu_views: 8765,   // Mock data
      gallery_views: 3580, // Mock data
    });
    setLoading(false);
  };

  const fetchScheduledMetrics = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from('scheduled_metrics')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled metrics:', error.message);
      toast.error('Erro ao carregar metas agendadas.');
    } else {
      setScheduledMetrics(data || []);
    }
  };

  const handleScheduleTarget = async () => {
    if (!restaurantId || !targetFollowers || !dateRange?.from || !dateRange?.to) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setIsSaving(true);
    const { data: initialFollowersData, error: initialFollowersError } = await supabase
      .rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('followers_override')
      .eq('id', restaurantId)
      .single();

    if (initialFollowersError || restaurantError) {
      console.error('Error getting initial followers:', initialFollowersError?.message || restaurantError?.message);
      toast.error('Erro ao obter seguidores iniciais.');
      setIsSaving(false);
      return;
    }

    const initialFollowers = (initialFollowersData || 0) + (restaurantData?.followers_override || 0);

    const { error } = await supabase
      .from('scheduled_metrics')
      .insert({
        restaurant_id: restaurantId,
        target_followers: targetFollowers,
        start_time: dateRange.from.toISOString(),
        end_time: dateRange.to.toISOString(),
        initial_followers: initialFollowers,
        status: 'pending',
      });

    if (error) {
      console.error('Error scheduling target:', error.message);
      toast.error('Erro ao agendar meta.');
    } else {
      toast.success('Meta agendada com sucesso!');
      setIsScheduleDialogOpen(false);
      setTargetFollowers('');
      setDateRange({ from: new Date(), to: addDays(new Date(), 7) });
      fetchScheduledMetrics();
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Métricas" icon={Loader2}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout
      title="Métricas e Desempenho"
      icon={BarChart3}
    >
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Seguidores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total_followers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +20.1% do mês passado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizações Totais</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total_views.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                +180.1% do mês passado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizações do Cardápio</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.menu_views.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                +19% do mês passado
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Metas de Seguidores Agendadas</CardTitle>
            <Button onClick={() => setIsScheduleDialogOpen(true)}>
              <Target className="mr-2 h-4 w-4" /> Agendar Nova Meta
            </Button>
          </CardHeader>
          <CardContent>
            {scheduledMetrics.length === 0 ? (
              <p className="text-center text-gray-500">Nenhuma meta agendada ainda.</p>
            ) : (
              <div className="space-y-4">
                {scheduledMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium">Meta: {metric.target_followers} seguidores</p>
                      <p className="text-sm text-gray-600">Inicial: {metric.initial_followers} seguidores</p>
                      <p className="text-sm text-gray-600">
                        Período: {format(new Date(metric.start_time), 'dd/MM/yyyy')} - {format(new Date(metric.end_time), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      metric.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      metric.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {metric.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Schedule Target Dialog */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Nova Meta de Seguidores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="targetFollowers">Meta de Seguidores</Label>
              <Input
                id="targetFollowers"
                type="number"
                value={targetFollowers}
                onChange={(e) => setTargetFollowers(parseInt(e.target.value) || '')}
                placeholder="Ex: 1000"
              />
            </div>
            <div>
              <Label htmlFor="dateRange">Período</Label>
              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleScheduleTarget} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Agendar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
};

export default MetricsPage;