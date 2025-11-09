"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, AlertTriangle, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmationDialog from '@/components/ConfirmationDialog';

interface ScheduledMetric {
  id: string;
  restaurant_id: string;
  target_followers: number;
  initial_followers: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface ScheduledMetricsManagementProps {
  restaurantId: string;
}

const ScheduledMetricsManagement: React.FC<ScheduledMetricsManagementProps> = ({ restaurantId }) => {
  const [metrics, setMetrics] = useState<ScheduledMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMetric, setCurrentMetric] = useState<ScheduledMetric | null>(null);

  const [targetFollowers, setTargetFollowers] = useState<number | ''>('');
  const [initialFollowers, setInitialFollowers] = useState<number | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [restaurantId]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('scheduled_metrics')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled metrics:', error);
      setError('Falha ao carregar métricas agendadas.');
      toast.error('Erro ao carregar métricas agendadas.');
    } else {
      setMetrics(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setTargetFollowers('');
    setInitialFollowers('');
    setStartTime('');
    setEndTime('');
    setCurrentMetric(null);
  };

  const handleOpenDialog = (metric?: ScheduledMetric) => {
    if (metric) {
      setCurrentMetric(metric);
      setTargetFollowers(metric.target_followers);
      setInitialFollowers(metric.initial_followers);
      setStartTime(format(new Date(metric.start_time), "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(new Date(metric.end_time), "yyyy-MM-dd'T'HH:mm"));
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!targetFollowers || !initialFollowers || !startTime || !endTime) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    const metricData = {
      restaurant_id: restaurantId,
      target_followers: targetFollowers,
      initial_followers: initialFollowers,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
    };

    let error;
    if (currentMetric) {
      // Update existing metric
      ({ error } = await supabase
        .from('scheduled_metrics')
        .update(metricData)
        .eq('id', currentMetric.id));
    } else {
      // Add new metric
      ({ error } = await supabase
        .from('scheduled_metrics')
        .insert(metricData));
    }

    if (error) {
      console.error('Error saving metric:', error);
      toast.error('Erro ao salvar métrica.');
    } else {
      toast.success(`Métrica ${currentMetric ? 'atualizada' : 'adicionada'} com sucesso!`);
      fetchMetrics();
      setIsDialogOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const handleDeleteMetric = async (id: string) => {
    const { error } = await supabase
      .from('scheduled_metrics')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting metric:', error);
      toast.error('Erro ao deletar métrica.');
    } else {
      toast.success('Métrica deletada com sucesso!');
      fetchMetrics();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Métrica
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMetric ? 'Editar Métrica Agendada' : 'Adicionar Métrica Agendada'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetFollowers" className="text-right">
                Meta de Seguidores
              </Label>
              <Input
                id="targetFollowers"
                type="number"
                value={targetFollowers}
                onChange={(e) => setTargetFollowers(parseInt(e.target.value) || '')}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initialFollowers" className="text-right">
                Seguidores Iniciais
              </Label>
              <Input
                id="initialFollowers"
                type="number"
                value={initialFollowers}
                onChange={(e) => setInitialFollowers(parseInt(e.target.value) || '')}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startTime" className="text-right">
                Início
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endTime" className="text-right">
                Fim
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {currentMetric ? 'Salvar Alterações' : 'Adicionar Métrica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {metrics.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Nenhuma métrica agendada ainda.
        </p>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meta</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell>{metric.target_followers} seguidores</TableCell>
                  <TableCell>{format(new Date(metric.start_time), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{format(new Date(metric.end_time), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{metric.status}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(metric)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmationDialog
                      title="Deletar Métrica"
                      description="Tem certeza que deseja deletar esta métrica agendada?"
                      onConfirm={() => handleDeleteMetric(metric.id)}
                      confirmButtonText="Deletar"
                      confirmButtonVariant="destructive"
                    >
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmationDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ScheduledMetricsManagement;