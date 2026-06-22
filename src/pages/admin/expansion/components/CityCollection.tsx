import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Search, Map, Globe, Server, CheckCircle2, Loader2, StopCircle, Terminal, Activity, Store, MapPin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

export default function CityCollection() {
  const { cityId } = useParams();
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [city, setCity] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCityAndRestaurants() {
      if (!cityId) return;
      try {
        // 1. Fetch city info to filter restaurants
        const { data: cityData, error: cityError } = await supabase
          .from('expansion_projects')
          .select('*')
          .eq('slug', cityId)
          .single();

        if (cityError) throw cityError;
        setCity(cityData);

        // 2. Fetch restaurants in this city
        const { data: restData, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('city', cityData.name)
          .eq('state', cityData.state)
          .order('created_at', { ascending: false })
          .limit(100);

        if (restError) throw restError;
        setRestaurants(restData || []);
      } catch (err) {
        console.error("Erro ao carregar dados da coleta da cidade:", err);
      }
    }
    loadCityAndRestaurants();
  }, [cityId]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/local-collector/status');
          const data = await res.json();
          setLogs(data.logs || '');
          if (!data.running && isRunning) {
            setIsRunning(false);
            showSuccess('Coleta finalizada!');
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartScraping = async () => {
    if (isRunning || !city) return;
    try {
      setIsRunning(true);
      setLogs('🚀 Inicializando robô de coleta para a cidade...\n');
      const res = await fetch(`/api/local-collector/run-maps?cityId=${cityId}&city=${encodeURIComponent(city.name)}&state=${encodeURIComponent(city.state)}&fresh=true`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        showError(data.error);
        setIsRunning(false);
      } else {
        showSuccess('Coleta iniciada com sucesso no backend!');
      }
    } catch (e) {
      showError('Falha ao iniciar a coleta.');
      setIsRunning(false);
    }
  };

  const handleStopScraping = async () => {
    try {
      await fetch('/api/local-collector/stop', { method: 'POST' });
      setIsRunning(false);
      showSuccess('Comando de parada enviado.');
    } catch (e) {
      showError('Erro ao parar coleta.');
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Motor de Coleta de Dados</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Integração nativa com Google Places e Varredura Social profunda.</p>
        </div>
        <div className="flex gap-3">
          {isRunning ? (
            <Button 
              variant="destructive" 
              onClick={handleStopScraping} 
              className="shadow-sm font-bold shadow-rose-500/20 hover:shadow-rose-500/40 transition-all duration-300"
            >
              <StopCircle className="w-4 h-4 mr-2" /> Abortar Operação
            </Button>
          ) : (
            <Button 
              onClick={handleStartScraping} 
              className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold px-6"
            >
              <Search className="w-4 h-4 mr-2" /> Iniciar Varredura Profunda
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl overflow-hidden group cursor-pointer bg-white">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex items-center gap-4 group-hover:from-blue-50 group-hover:to-indigo-50 transition-colors">
              <div className="p-2.5 bg-white shadow-sm ring-1 ring-slate-900/5 text-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Google Places Scraper</h3>
                <p className="text-[13px] text-slate-500 font-medium">Mapeamento multicêntrico por coordenadas.</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 uppercase tracking-wider">Progresso da varredura</span>
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-indigo-500" />
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {restaurants.length > 0 ? `${restaurants.length} estabelecimentos mapeados localmente.` : '0 estabelecimentos mapeados.'}
              </div>
            </CardContent>
          </Card>

          {/* Modern MacOS-style Terminal */}
          <Card className="border-slate-800 shadow-xl shadow-slate-900/20 rounded-2xl overflow-hidden bg-slate-950 text-slate-300 flex flex-col h-[400px]">
            <div className="p-3 border-b border-slate-800/60 bg-[#0A0D14] flex justify-between items-center px-4 shrink-0">
              <div className="flex items-center gap-3">
                {/* Mac OS window buttons */}
                <div className="flex gap-1.5 mr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <Terminal className="w-4 h-4 text-slate-500" />
                <h3 className="font-mono text-xs font-bold text-slate-400 tracking-wide">bash / output</h3>
              </div>
              {isRunning ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono bg-emerald-400/10 px-2 py-1 rounded-md">
                  <Activity className="w-3 h-3 animate-pulse" /> Em Execução...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-slate-600" /> Standby
                </div>
              )}
            </div>
            <CardContent className="p-5 font-mono text-[12px] flex-1 overflow-y-auto custom-scrollbar bg-[#0f111a] relative">
              {logs ? (
                <pre className="whitespace-pre-wrap text-emerald-400/90 font-mono text-[11px] leading-relaxed">
                  {logs}
                  <div ref={logEndRef} />
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40 select-none text-slate-400">
                  <Terminal className="w-12 h-12 mb-3 opacity-20" />
                  <p>Nenhum processo de coleta ativo.</p>
                  <p className="text-[10px] mt-1">Aguardando comando de inicialização.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl overflow-hidden group cursor-pointer bg-white">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-pink-50/50 to-purple-50/50 flex items-center gap-4 group-hover:from-pink-50 group-hover:to-purple-50 transition-colors">
              <div className="p-2.5 bg-white shadow-sm ring-1 ring-slate-900/5 text-pink-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Enriquecimento IA (Fase 5)</h3>
                <p className="text-[13px] text-slate-500 font-medium">Captura de logos e contatos via Social Graph.</p>
              </div>
            </div>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-600 uppercase tracking-wider">Status do pipeline</span>
                  <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">Pendente</span>
                </div>
                <Progress value={0} className="h-2 bg-slate-100 [&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-purple-500" />
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-400" /> Servidor Chrome remoto conectado.
              </div>
            </CardContent>
          </Card>

          {/* Lista de Restaurantes Mapeados */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white flex flex-col h-[400px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-500" /> Restaurantes Encontrados
              </h3>
              <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                {restaurants.length} {restaurants.length === 100 ? '+' : ''}
              </span>
            </div>
            <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
              {restaurants.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <Store className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-600">Nenhum restaurante encontrado ainda.</p>
                  <p className="text-xs text-slate-400 mt-1">Inicie a varredura para popular a lista.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {restaurants.map((r, i) => (
                    <div key={r.id || i} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-sm text-slate-900 line-clamp-1">{r.name}</span>
                        {r.rating && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            ★ {r.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{r.address || 'Endereço não disponível'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
