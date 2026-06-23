import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Plus, ChevronRight, Map, LineChart, Star, Loader2, RefreshCw, Settings, PlayCircle, ShieldCheck, MessageCircle, FileText, MoreHorizontal, PauseCircle, Archive, Trash2, Copy, MapPinned } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { ExpansionProject } from '@/types/supabase';
import { showSuccess, showError } from '@/utils/toast';
import {
  estimateMapsCollectionQueryCount,
  MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS,
  MAPS_COLLECTION_COMMERCIAL_POLE_TERMS,
  MAPS_RESULTS_PER_SEARCH,
  resolveExpansionNeighborhoods,
} from '@/utils/expansionCollection';

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins'
};

const STATE_CITIES: Record<string, string[]> = {
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasiléia', 'Senador Guiomard'],
  AL: ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo', 'Delmiro Gouveia'],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Porto Grande', 'Mazagão', 'Tartarugalzinho'],
  AM: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tabatinga', 'Tefé'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Itabuna', 'Lauro de Freitas'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca'],
  DF: ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina', 'Guará', 'Gama'],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'Colatina'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás'],
  MA: ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar'],
  MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Sorriso', 'Lucas do Rio Verde'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Sidrolândia', 'Naviraí'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves'],
  PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal', 'Parauapebas', 'Abaetetuba'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cabedelo'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho'],
  PI: ['Teresina', 'Parnaíba', 'Picos', 'Floriano', 'Piripiri', 'Campo Maior', 'Barras'],
  RJ: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes', 'Belford Roxo'],
  RN: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba', 'Caicó', 'Assu'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Viamão'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Cacoal', 'Vilhena', 'Jaru', 'Rolim de Moura'],
  RR: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Pacaraima', 'Mucajaí', 'Cantá', 'Alto Alegre'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Criciúma', 'Itajaí'],
  SP: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'São José dos Campos', 'Ribeirão Preto'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Estância', 'Tobias Barreto', 'Simão Dias'],
  TO: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Araguatins', 'Colinas do Tocantins']
};

export default function ExpansionHub() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ExpansionProject[]>([]);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    activeCities: 0,
    planningCities: 0,
    totalPremium: 0,
    totalFree: 0,
    totalLeads: 0,
  });
  
  const [cityStats, setCityStats] = useState<Record<string, { leads: number, premium: number, revenue: number, healthScore: number }>>({});
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', state: '', manager_name: '', status: 'Planejamento' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [neighborhoodPreview, setNeighborhoodPreview] = useState<string[]>([]);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);
  const [neighborhoodLoadError, setNeighborhoodLoadError] = useState('');

  // Merge Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const fetchAllRestaurantsForExpansionMetrics = async () => {
    const pageSize = 1000;
    let from = 0;
    const allRows: Array<{ plan: string | null; city: string | null; state: string | null }> = [];

    while (true) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('plan, city, state')
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data || [];
      allRows.push(...rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return allRows;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Projects
      let { data: projData, error: projError } = await supabase
        .from('expansion_projects')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (projError) throw projError;

      // 2. Fetch Restaurants for Metrics
      // Supabase/PostgREST costuma limitar a resposta a 1.000 linhas por chamada.
      // A expansão precisa contar todas as cidades, então paginamos explicitamente.
      const restData = await fetchAllRestaurantsForExpansionMetrics();

      // Auto-sync missing projects based on existing restaurants
      if (restData && restData.length > 0) {
        const uniqueCities: Record<string, {name: string, state: string}> = {};
        restData.forEach(r => {
          if (r.city && r.state) {
            const cleanedCity = r.city.trim().replace(/\s*-\s*[A-Z]{2}$/i, '');
            const cleanedState = r.state.trim().toUpperCase();
            
            // Skip dirty/short name data (e.g. state abbreviation as city)
            if (!cleanedCity || cleanedCity.toUpperCase() === cleanedState || cleanedCity.length <= 2) {
              return;
            }

            const key = `${cleanedCity.toLowerCase()}-${cleanedState}`;
            if (!uniqueCities[key]) {
               uniqueCities[key] = { name: cleanedCity, state: cleanedState };
            }
          }
        });

        const existingProjectKeys = new Set((projData || []).map(p => `${p.name.trim().toLowerCase()}-${p.state.trim().toUpperCase()}`));
        const missingProjects = Object.values(uniqueCities).filter(c => !existingProjectKeys.has(`${c.name.toLowerCase()}-${c.state}`));

        if (missingProjects.length > 0) {
          const inserts = missingProjects.map(c => ({
            name: c.name,
            state: c.state,
            slug: `${c.name}-${c.state}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
            status: 'Operação',
            progress: 80,
            health_score: 100
          }));
          
          const { error: insertError } = await supabase.from('expansion_projects').insert(inserts);
          if (!insertError) {
             const { data: updatedProj } = await supabase.from('expansion_projects').select('*').order('created_at', { ascending: false });
             if (updatedProj) projData = updatedProj;
          }
        }
      }

      setProjects(projData || []);

      let totalPremium = 0;
      let totalFree = 0;
      let totalLeads = (restData || []).length;
      let mrr = 0;
      
      const stats: Record<string, { leads: number, premium: number, revenue: number, healthScore: number }> = {};

      (restData || []).forEach(r => {
        if (r.plan === 'premium' || r.plan === 'premium_gift') {
           totalPremium++;
           if (r.plan === 'premium') mrr += 49.90; // Default estimate
        } else {
           totalFree++;
        }
        
        if (r.city && r.state) {
          const cleanedCity = r.city.trim().replace(/\s*-\s*[A-Z]{2}$/i, '');
          const cleanedState = r.state.trim().toUpperCase();
          const key = `${cleanedCity.toLowerCase()}-${cleanedState}`;
          if (!stats[key]) stats[key] = { leads: 0, premium: 0, revenue: 0, healthScore: 100 };
          stats[key].leads++;
          if (r.plan === 'premium') {
             stats[key].premium++;
             stats[key].revenue += 49.90;
          }
        }
      });

      const activeCities = (projData || []).filter(p => p.status === 'Operação').length;
      const planningCities = (projData || []).filter(p => p.status === 'Planejamento' || p.status === 'Campanha').length;

      setMetrics({ mrr, activeCities, planningCities, totalPremium, totalFree, totalLeads });
      setCityStats(stats);
    } catch (err: any) {
      console.error(err);
      showError('Erro ao carregar dados do hub de expansão');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeProjects = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      showError("Selecione os projetos de origem e destino");
      return;
    }

    const sourceProj = projects.find(p => p.id === mergeSourceId);
    const targetProj = projects.find(p => p.id === mergeTargetId);

    if (!sourceProj || !targetProj) {
      showError("Projeto inválido");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja mesclar os dados de "${sourceProj.name} (${sourceProj.state})" para "${targetProj.name} (${targetProj.state})"? Isso alterará os restaurantes no banco de dados e apagará o projeto de origem permanentemente.`)) {
      return;
    }

    setIsMerging(true);
    try {
      // 1. Update restaurants associated with source to target city/state
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          city: targetProj.name,
          state: targetProj.state
        })
        .eq('city', sourceProj.name)
        .eq('state', sourceProj.state);

      if (updateError) throw updateError;

      // 2. Delete source project
      const { error: deleteError } = await supabase
        .from('expansion_projects')
        .delete()
        .eq('id', sourceProj.id);

      if (deleteError) throw deleteError;

      showSuccess("Projetos mesclados com sucesso!");
      setIsMergeModalOpen(false);
      setMergeSourceId('');
      setMergeTargetId('');
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Erro ao mesclar projetos');
    } finally {
      setIsMerging(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!isModalOpen || !newCity.name || !newCity.state) {
      setNeighborhoodPreview([]);
      setNeighborhoodLoadError('');
      setIsLoadingNeighborhoods(false);
      return;
    }

    let cancelled = false;
    setIsLoadingNeighborhoods(true);
    setNeighborhoodLoadError('');

    resolveExpansionNeighborhoods(newCity.name, newCity.state)
      .then((neighborhoods) => {
        if (cancelled) return;
        setNeighborhoodPreview(neighborhoods);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.warn('Erro ao preparar bairros da expansão:', error);
        setNeighborhoodPreview([]);
        setNeighborhoodLoadError(error?.message || 'Não foi possível preparar os bairros agora.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingNeighborhoods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, newCity.name, newCity.state]);

  const handleCreateProject = async () => {
    if (!newCity.name || !newCity.state) {
      showError("Nome e Estado são obrigatórios");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const slug = `${newCity.name}-${newCity.state}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      
      const { error } = await supabase.from('expansion_projects').insert([{
        name: newCity.name.trim(),
        state: newCity.state.trim().toUpperCase(),
        slug,
        status: newCity.status,
        manager_name: newCity.manager_name,
        progress: newCity.status === 'Operação' ? 80 : newCity.status === 'Campanha' ? 40 : 10,
        health_score: 100
      }]);
      
      if (error) throw error;
      
      showSuccess("Projeto de cidade criado com sucesso!");
      setIsModalOpen(false);
      setNewCity({ name: '', state: '', manager_name: '', status: 'Planejamento' });
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Erro ao criar projeto');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group projects by state
  const groupedProjects = useMemo(() => {
    return projects.reduce((acc, proj) => {
      const st = proj.state.toUpperCase();
      if (!acc[st]) acc[st] = [];
      acc[st].push(proj);
      return acc;
    }, {} as Record<string, ExpansionProject[]>);
  }, [projects]);

  const inactiveStates = useMemo(() => {
    const activeStates = new Set(projects.map(p => p.state.toUpperCase()));
    return Object.keys(STATE_NAMES).filter(abbr => !activeStates.has(abbr)).sort();
  }, [projects]);

  const nationalConversion = metrics.totalLeads > 0 ? ((metrics.totalPremium / metrics.totalLeads) * 100).toFixed(1) + '%' : '0%';

  const openNewCityModal = (stateAbbr?: string) => {
    const state = stateAbbr || '';
    const defaultCity = state ? (STATE_CITIES[state]?.[0] || '') : '';
    setNeighborhoodPreview([]);
    setNeighborhoodLoadError('');
    setIsLoadingNeighborhoods(false);
    setNewCity({ name: defaultCity, state, manager_name: '', status: 'Planejamento' });
    setIsModalOpen(true);
  };

  const navigateToCityTab = (city: ExpansionProject, tab = 'operations') => {
    navigate(`/admin/expansion/${city.slug}${tab ? `?tab=${tab}` : ''}`);
  };

  const getNextAction = (city: ExpansionProject, stat: { leads: number, premium: number, revenue: number, healthScore: number }) => {
    if (!stat.leads || stat.leads === 0) return { label: 'Iniciar Fase 1', tab: 'collection', icon: PlayCircle };
    if ((city.progress || 0) < 80) return { label: 'Continuar Validar IA', tab: 'validation', icon: ShieldCheck };
    if (stat.premium > 0) return { label: 'Ver assinaturas', tab: 'subscriptions', icon: Star };
    return { label: 'Abrir CRM', tab: 'crm', icon: MessageCircle };
  };

  const handlePauseOrResumeProject = async (city: ExpansionProject) => {
    try {
      const nextStatus = city.status === 'Pausado' ? 'Planejamento' : 'Pausado';
      const { error } = await supabase
        .from('expansion_projects')
        .update({ status: nextStatus } as any)
        .eq('id', city.id);
      if (error) throw error;
      showSuccess(nextStatus === 'Pausado' ? 'Projeto pausado.' : 'Projeto retomado.');
      await fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Erro ao atualizar projeto');
    }
  };

  const handleArchiveProject = async (city: ExpansionProject) => {
    if (!window.confirm(`Arquivar ${city.name}/${city.state}? Os leads não serão apagados.`)) return;
    try {
      const { error } = await supabase
        .from('expansion_projects')
        .update({ status: 'Arquivado' } as any)
        .eq('id', city.id);
      if (error) throw error;
      showSuccess('Projeto arquivado.');
      await fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Erro ao arquivar projeto');
    }
  };

  const handleDuplicateProject = async (city: ExpansionProject) => {
    try {
      const name = `${city.name} - Cópia`;
      const slug = `${name}-${city.state}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const { error } = await supabase.from('expansion_projects').insert([{
        name,
        state: city.state,
        slug,
        status: 'Planejamento',
        manager_name: city.manager_name,
        progress: 10,
        health_score: city.health_score || 100
      }]);
      if (error) throw error;
      showSuccess('Configuração duplicada como novo projeto.');
      await fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Erro ao duplicar projeto');
    }
  };

  const deleteCityLeads = async (city: ExpansionProject) => {
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('city', city.name)
      .eq('state', city.state);
    if (error) throw error;
  };

  const handleRestartPhase1 = async (city: ExpansionProject) => {
    if (!window.confirm(`Reiniciar a Fase 1 de ${city.name}/${city.state}? Isso apagará todos os leads/restaurantes coletados nessa cidade, mas manterá o projeto.`)) return;

    try {
      await deleteCityLeads(city);
      const { error } = await supabase
        .from('expansion_projects')
        .update({ status: 'Planejamento', progress: 10, health_score: 100 } as any)
        .eq('id', city.id);
      if (error) throw error;

      showSuccess(`Fase 1 de ${city.name}/${city.state} limpa. Pode iniciar novamente.`);
      await fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Erro ao reiniciar Fase 1');
    }
  };

  const handleDeleteProject = async (city: ExpansionProject) => {
    if (!window.confirm(`Excluir definitivamente ${city.name}/${city.state}? Isso apagará o projeto e todos os leads/restaurantes dessa cidade para impedir que o card volte pelo auto-sync.`)) return;
    try {
      await deleteCityLeads(city);
      const { error } = await supabase
        .from('expansion_projects')
        .delete()
        .eq('id', city.id);
      if (error) throw error;
      showSuccess('Projeto e leads da cidade excluídos.');
      await fetchDashboardData();
    } catch (err: any) {
      showError(err.message || 'Erro ao excluir projeto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-sans">
      
      {/* Header and Call to Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Visão Executiva</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Controle nacional de implantações e expansão de mercado.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchDashboardData}
            className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm rounded-lg font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar Dados
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/admin/collector')}
            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700 shadow-sm rounded-lg font-medium"
          >
            <Settings className="w-4 h-4 mr-2" /> Configurar Extensão
          </Button>

          {/* Merge Projects Dialog */}
          <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm rounded-lg font-medium">
                Mesclar Cidades
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Mesclar Projetos / Cidades</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceProject">Projeto Duplicado (Origem)</Label>
                  <select 
                    id="sourceProject"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                    value={mergeSourceId}
                    onChange={e => setMergeSourceId(e.target.value)}
                  >
                    <option value="">Selecione o projeto com dados sujos...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.state})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetProject">Projeto Oficial (Destino)</Label>
                  <select 
                    id="targetProject"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                    value={mergeTargetId}
                    onChange={e => setMergeTargetId(e.target.value)}
                  >
                    <option value="">Selecione o projeto oficial...</option>
                    {projects.filter(p => p.id !== mergeSourceId).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.state})</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Esta ação moverá todos os leads/restaurantes cadastrados na cidade de origem para a cidade de destino, e apagará o projeto de origem permanentemente.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMergeModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleMergeProjects} disabled={isMerging} className="bg-red-600 hover:bg-red-700 text-white">
                  {isMerging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Confirmar Mesclagem
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Project Dialog */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openNewCityModal()} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-lg font-medium">
                <Plus className="w-4 h-4 mr-2" /> Novo Projeto de Cidade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[620px]">
              <DialogHeader>
                <DialogTitle>Novo Projeto de Expansão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF)</Label>
                  <select 
                    id="state" 
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                    value={newCity.state}
                    onChange={e => {
                      const stateAbbr = e.target.value;
                      const defaultCity = STATE_CITIES[stateAbbr]?.[0] || '';
                      setNewCity({ ...newCity, state: stateAbbr, name: defaultCity });
                    }}
                  >
                    <option value="">Selecione o estado...</option>
                    {Object.entries(STATE_NAMES).map(([abbr, name]) => (
                      <option key={abbr} value={abbr}>{name} ({abbr})</option>
                    ))}
                  </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Cidade</Label>
                  <select 
                    id="name" 
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    value={newCity.name}
                    onChange={e => setNewCity({...newCity, name: e.target.value})}
                    disabled={!newCity.state}
                  >
                    <option value="">Selecione a cidade...</option>
                    {newCity.state && STATE_CITIES[newCity.state]?.map(cityName => (
                      <option key={cityName} value={cityName}>{cityName}</option>
                    ))}
                  </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manager">Líder</Label>
                  <Input 
                    id="manager" 
                    value={newCity.manager_name} 
                    onChange={e => setNewCity({...newCity, manager_name: e.target.value})} 
                      className="h-11"
                    placeholder="Nome do responsável" 
                  />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                  <select 
                    id="status" 
                      className="flex h-11 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newCity.status}
                    onChange={e => setNewCity({...newCity, status: e.target.value})}
                  >
                    <option value="Planejamento">Planejamento</option>
                    <option value="Campanha">Campanha</option>
                    <option value="Operação">Operação</option>
                  </select>
                  </div>
                </div>
                {newCity.name && newCity.state && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">Plano da Fase 1</span>
                      {isLoadingNeighborhoods ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                          <Loader2 className="w-3 h-3 animate-spin" /> carregando bairros...
                        </span>
                      ) : (
                        <span className="font-semibold text-blue-700">
                          {estimateMapsCollectionQueryCount(neighborhoodPreview.length)} buscas estimadas
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 leading-relaxed text-blue-800">
                      Ao iniciar a Fase 1, a extensão cobre todos os bairros com {MAPS_COLLECTION_ALL_NEIGHBORHOOD_TERMS.length} termos essenciais e aprofunda os polos comerciais com mais {MAPS_COLLECTION_COMMERCIAL_POLE_TERMS.length} termos. Ex:
                      {' '}
                      <span className="font-semibold">
                        pizzaria {neighborhoodPreview[0] || 'Centro'} {newCity.name} {newCity.state}
                      </span>.
                    </p>
                    <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-2 text-blue-800">
                      Potencial bruto: até {estimateMapsCollectionQueryCount(neighborhoodPreview.length) * MAPS_RESULTS_PER_SEARCH} posições do Maps antes de remover duplicados e inválidos.
                    </p>
                    {neighborhoodPreview.length > 0 && (
                      <p className="mt-2 line-clamp-2 text-blue-700">
                        Bairros: {neighborhoodPreview.slice(0, 12).join(', ')}
                        {neighborhoodPreview.length > 12 ? '...' : ''}
                      </p>
                    )}
                    {neighborhoodLoadError && (
                      <p className="mt-2 text-amber-700 font-semibold">{neighborhoodLoadError}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateProject} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Criar Projeto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Global Executive Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">MRR Nacional</p>
                <p className="text-2xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Cidades Ativas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{metrics.activeCities}</p>
                  <p className="text-sm font-medium text-slate-500">/ {metrics.activeCities + metrics.planningCities} total</p>
                </div>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Map className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span>{metrics.planningCities} cidades em planejamento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Assinaturas Premium</p>
                <p className="text-2xl font-bold text-slate-900">{metrics.totalPremium.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span className="text-slate-900 font-bold">{metrics.totalFree.toLocaleString('pt-BR')}</span> <span className="ml-1">contas Free ativas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-slate-900">{nationalConversion}</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <LineChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span>Média nacional de Lead → Premium</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t border-slate-200 space-y-10">
        
        {Object.keys(groupedProjects).length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 font-medium mb-4">Nenhum projeto de cidade encontrado.</p>
            <Button onClick={() => setIsModalOpen(true)}>Criar primeiro projeto</Button>
          </div>
        )}

        {Object.keys(groupedProjects).sort().map(stateAbbr => (
          <div key={stateAbbr} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md">Estado: {stateAbbr}</h2>
              <div className="h-px bg-slate-200 flex-1"></div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openNewCityModal(stateAbbr)}
                  className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar cidade em {stateAbbr}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextCity = groupedProjects[stateAbbr].find(p => {
                      const key = `${p.name.toLowerCase()}-${p.state.toUpperCase()}`;
                      const stat = cityStats[key] || { leads: 0, premium: 0, revenue: 0, healthScore: p.health_score || 100 };
                      return !stat.leads || stat.leads === 0;
                    }) || groupedProjects[stateAbbr][0];
                    if (nextCity) navigateToCityTab(nextCity, 'collection');
                  }}
                  className="h-8 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold"
                >
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Coletar próxima cidade
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {groupedProjects[stateAbbr].map((city) => {
                const key = `${city.name.toLowerCase()}-${city.state.toUpperCase()}`;
                const stat = cityStats[key] || { leads: 0, premium: 0, revenue: 0, healthScore: city.health_score || 100 };
                const nextAction = getNextAction(city, stat);
                const NextIcon = nextAction.icon;
                
                return (
                  <div 
                    key={city.id} 
                    onClick={() => navigateToCityTab(city)}
                    className="group cursor-pointer bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 rounded-xl transition-all duration-200 overflow-hidden relative"
                  >
                    {/* Highlight bar for active cities */}
                    {city.status === 'Operação' && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                    )}
                    {city.status === 'Campanha' && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                    )}

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {city.name} <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">{city.state}</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">Líder: {city.manager_name || 'Não definido'}</p>
                        </div>
                        <Badge variant="outline" className={
                          city.status === 'Operação' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 
                          city.status === 'Campanha' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' : 
                          'bg-slate-50 text-slate-600 border-slate-200 font-semibold'
                        }>
                          {city.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 -mr-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => navigateToCityTab(city, 'operations')}>
                              <Settings className="w-4 h-4 mr-2" /> Editar / operar cidade
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigateToCityTab(city, 'collection')}>
                              <MapPinned className="w-4 h-4 mr-2" /> Gerenciar bairros / coleta
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRestartPhase1(city)}>
                              <RefreshCw className="w-4 h-4 mr-2" /> Reiniciar Fase 1
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePauseOrResumeProject(city)}>
                              <PauseCircle className="w-4 h-4 mr-2" /> {city.status === 'Pausado' ? 'Retomar projeto' : 'Pausar projeto'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateProject(city)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicar configuração
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleArchiveProject(city)}>
                              <Archive className="w-4 h-4 mr-2" /> Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => handleDeleteProject(city)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Excluir projeto
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Progress / Health */}
                      <div className="mb-5 space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-500">Progresso do Projeto</span>
                          <span className={(city.progress || 0) > 80 ? 'text-emerald-600' : 'text-slate-700'}>{city.progress || 0}%</span>
                        </div>
                        <Progress value={city.progress || 0} className="h-1.5 bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Leads Mapeados</p>
                          <p className="text-sm font-bold text-slate-900">{stat.leads.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Assinantes</p>
                          <p className="text-sm font-bold text-indigo-600">{stat.premium}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Receita Atual</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Saúde (IA)</p>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${stat.healthScore > 80 ? 'bg-emerald-500' : stat.healthScore > 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                            <p className="text-sm font-bold text-slate-900">{stat.healthScore}/100</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold border-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToCityTab(city, 'collection');
                          }}
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1" /> Fase 1
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold border-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToCityTab(city, 'validation');
                          }}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Validar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold border-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToCityTab(city, 'crm');
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> CRM
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px] font-bold border-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToCityTab(city, 'analytics');
                          }}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> Relat.
                        </Button>
                      </div>
                    </div>

                    <div
                      className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-indigo-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCityTab(city, nextAction.tab);
                      }}
                    >
                      <span className="text-xs font-semibold text-slate-500 group-hover:text-indigo-600 flex items-center gap-2">
                        <NextIcon className="w-3.5 h-3.5" /> {nextAction.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Inactive States Expansion Grid */}
        {inactiveStates.length > 0 && (
          <div className="pt-8 border-t border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Estados Disponíveis para Expansão</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {inactiveStates.map(stateAbbr => (
                <Card 
                  key={stateAbbr} 
                  className="border-slate-200 shadow-sm rounded-xl bg-slate-50 hover:bg-white hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer p-4 flex flex-col justify-between items-center text-center group"
                  onClick={() => openNewCityModal(stateAbbr)}
                >
                  <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                    {STATE_NAMES[stateAbbr]}
                  </div>
                  <Badge variant="secondary" className="mt-1.5 text-[10px] font-extrabold bg-slate-200/60 text-slate-600 border-none group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    {stateAbbr}
                  </Badge>
                  <span className="mt-3 text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                    + Iniciar
                  </span>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
