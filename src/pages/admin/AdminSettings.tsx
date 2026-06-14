import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, Save, Loader2, RefreshCw, BadgeInfo, ShieldAlert, Award } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { RestaurantPlan } from '@/types/supabase';

export default function AdminSettings() {
  const [followersPct, setFollowersPct] = useState(() => localStorage.getItem('admin_followers_percentage') || '10');
  const [defaultPlan, setDefaultPlan] = useState(() => localStorage.getItem('admin_default_plan_on_import') || 'premium_gift');
  const [daysToDowngrade, setDaysToDowngrade] = useState(() => localStorage.getItem('admin_days_to_downgrade') || '15');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ updatedCount: number; message: string } | null>(null);

  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem('admin_followers_percentage', followersPct.trim());
      localStorage.setItem('admin_default_plan_on_import', defaultPlan);
      localStorage.setItem('admin_days_to_downgrade', daysToDowngrade.trim());
      
      showSuccess('Configurações salvas com sucesso!');
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) {
      showError('Erro ao salvar as configurações localmente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunDowngradeScan = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const days = parseInt(daysToDowngrade, 10) || 15;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      const isoThreshold = thresholdDate.toISOString();

      // Query candidate restaurants
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, created_at, plan, visit_notes')
        .eq('plan', 'premium_gift')
        .is('user_id', null)
        .lt('created_at', isoThreshold)
        .or('is_deleted.eq.false,is_deleted.is.null');

      if (error) throw error;

      if (!data || data.length === 0) {
        setScanResult({ updatedCount: 0, message: "Nenhum restaurante elegível para rebaixamento encontrado." });
        return;
      }

      // Perform update one by one to properly append to visit_notes
      let updatedCount = 0;
      for (const restaurant of data) {
        const todayStr = new Date().toLocaleDateString('pt-BR');
        const cleanNotes = restaurant.visit_notes || '';
        const newNotes = `${cleanNotes}\n[CRM] Plano cortesia expirado e rebaixado para gratuito após ${days} dias de inatividade em ${todayStr}.`.trim();
        
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ 
            plan: 'free',
            visit_notes: newNotes
          })
          .eq('id', restaurant.id);
          
        if (!updateError) {
          updatedCount++;
        }
      }

      setScanResult({ 
        updatedCount, 
        message: `Sucesso! ${updatedCount} de ${data.length} restaurante(s) Premium Cortesia inativo(s) foram rebaixados para Gratuito.` 
      });
      showSuccess(`Varredura concluída! ${updatedCount} restaurantes atualizados.`);
      
      // Sync across tabs
      window.dispatchEvent(new Event('local-sync-restaurants'));
      localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao executar varredura: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title="Estratégia e Regras"
        description="Configure as regras globais de captação de dados, seguidores iniciais e automações do funil de vendas."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel de Regras Gerais */}
        <Card className="shadow-none border-none rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-primary font-bold flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-500" />
              Parâmetros de Captação e Popularidade
            </CardTitle>
            <CardDescription>
              Configure o comportamento do coletor e as regras aplicadas ao importar novos restaurantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiplicador de Seguidores */}
            <div className="space-y-2">
              <Label htmlFor="followersPct" className="font-semibold text-slate-700">
                Fator de Seguidores Iniciais (% do Instagram)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="followersPct"
                  type="number"
                  min="0"
                  max="100"
                  value={followersPct}
                  onChange={(e) => setFollowersPct(e.target.value)}
                  className="w-32 focus-visible:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-500">% do total de seguidores no Instagram</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Define a porcentagem aplicada aos seguidores reais do Instagram coletados pela extensão para preencher os seguidores iniciais do app (campo <em>followers_override</em>). Ex: 10% de 50.000 seguidores gerará 5.000 seguidores iniciais.
              </p>
            </div>

            {/* Plano Padrão na Importação */}
            <div className="space-y-2">
              <Label htmlFor="defaultPlan" className="font-semibold text-slate-700">
                Plano de Entrada ao Importar
              </Label>
              <Select value={defaultPlan} onValueChange={(value) => setDefaultPlan(value as RestaurantPlan)}>
                <SelectTrigger id="defaultPlan" className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="premium_gift">Premium (Cortesia)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plano de assinatura padrão que o restaurante receberá automaticamente no momento em que for importado do coletor de mapas para o catálogo ativo.
              </p>
            </div>

            <Button 
              onClick={handleSaveSettings} 
              disabled={isSaving} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 rounded-xl"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Regras
            </Button>
          </CardContent>
        </Card>

        {/* Painel do CRM e Estratégia de Vendas */}
        <Card className="shadow-none border-none rounded-2xl bg-white">
          <CardHeader>
            <CardTitle className="text-lg text-primary font-bold flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              CRM e Regras do Funil de Vendas
            </CardTitle>
            <CardDescription>
              Estratégias de conversão de clientes. Rebaixe contas inativas automaticamente após o período de teste.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dias para rebaixamento */}
            <div className="space-y-2">
              <Label htmlFor="daysToDowngrade" className="font-semibold text-slate-700">
                Expiração do Premium Cortesia (Dias)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="daysToDowngrade"
                  type="number"
                  min="1"
                  value={daysToDowngrade}
                  onChange={(e) => setDaysToDowngrade(e.target.value)}
                  className="w-32 focus-visible:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-500">dias úteis/corridos</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tempo de cortesia concedido a estabelecimentos não reivindicados. Após este prazo desde o cadastro ou contato, a conta pode ser convertida automaticamente para o plano Gratuito se o restaurante não interagir.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-xs text-amber-800 leading-relaxed">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900 block mb-1">Como funciona a expiração?</span>
                Ao executar a varredura, o sistema buscará restaurantes cadastrados com o plano **Premium (Cortesia)** que possuem o campo de usuário nulo (ou seja, não reivindicados) e que foram inseridos no banco há mais de {daysToDowngrade || '15'} dias. Eles serão rebaixados para **Gratuito** automaticamente.
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRunDowngradeScan} 
                disabled={isScanning} 
                variant="outline"
                className="border-amber-200 hover:border-amber-300 text-amber-700 hover:bg-amber-50 font-bold gap-2 rounded-xl h-10"
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <RefreshCw className="w-4 h-4 text-amber-600" />}
                Executar Varredura de Expiração
              </Button>

              {scanResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                  <BadgeInfo className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{scanResult.message}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
