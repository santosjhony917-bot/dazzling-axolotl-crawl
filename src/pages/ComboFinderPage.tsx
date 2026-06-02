import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Sparkles, 
  Send, 
  Loader2, 
  MapPin, 
  DollarSign, 
  Users, 
  Utensils, 
  Vote,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { parseNaturalQuery, buildRestaurantCombos, getItemsForComboSearch, MealCombo } from '@/utils/comboParser';
import { getHappyHours, addRestaurantToPoll, HappyHour } from '@/services/happyHourService';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Interfaces de mensagens do chat
interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export default function ComboFinderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q');
  const { user } = useAuthData();
  const currentUserId = user?.id || '';
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Olá! Sou o seu Assistente Gourmet IA. ✨\n\nMe diga o que você está com vontade de comer, com quem vai e qual o seu orçamento máximo. Eu vou varrer o cardápio dos restaurantes próximos de você e montar a combinação de pratos ideal que cabe no seu bolso!\n\nExemplo: "Quero lanche com minha esposa e gastar até R$ 130".'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [combos, setCombos] = useState<MealCombo[]>([]);
  const [parsedInfo, setParsedInfo] = useState<any>(null);
  
  // Happy Hour integration states
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loadingHH, setLoadingHH] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasProcessedInitialQuery = useRef(false);

  // Auto-scroll para o fim do chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carrega Happy Hours do usuário para sugestão rápida
  useEffect(() => {
    if (currentUserId) {
      getHappyHours(currentUserId)
        .then(data => setHappyHours(data))
        .catch(err => console.error(err));
    }
  }, [currentUserId]);

  const fetchNearbyRestaurantsForCombo = async (lat: number, lng: number, maxDistKm: number) => {
    // 1. Tenta chamar a RPC find_nearby_restaurants no Supabase
    try {
      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: lat,
        user_lng: lng,
        p_limit: 50,
        p_offset: 0
      });
      if (!error && data) {
        return data.filter((r: any) => r.distance_km <= maxDistKm);
      }
    } catch(e){}

    // 2. Se falhar ou estiver em mock, retorna mock
    return [
      {
        id: 'mock-premium-restaurant-id',
        name: 'Sabor Premium Gourmet',
        category: 'Italiana',
        image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
        distance_km: 1.2,
        latitude: lat,
        longitude: lng,
        plan: 'premium'
      },
      {
        id: 'mock-free-restaurant-id',
        name: 'Lancheira do Zé (Free)',
        category: 'Lanches',
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
        distance_km: 2.5,
        latitude: lat + 0.005,
        longitude: lng + 0.005,
        plan: 'free'
      }
    ].filter(r => r.distance_km <= maxDistKm);
  };

  const processSearch = async (query: string) => {
    if (!query.trim()) return;

    // Adiciona bolha do usuário
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query
    }]);

    setLoading(true);
    setCombos([]);

    // Simula tempo de digitação da IA
    setMessages(prev => [...prev, {
      id: 'typing',
      sender: 'bot',
      text: 'Analisando seu pedido e buscando nos cardápios...'
    }]);

    try {
      // 1. Parse natural da query
      const parsed = parseNaturalQuery(query);
      setParsedInfo(parsed);

      const lat = location.latitude || -23.55052; // Fallback SP
      const lng = location.longitude || -46.633308;

      // 2. Busca restaurantes próximos
      const nearbyRests = await fetchNearbyRestaurantsForCombo(lat, lng, parsed.maxDistance);
      
      if (nearbyRests.length === 0) {
        setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Não encontrei nenhum restaurante cadastrado em um raio de ${parsed.maxDistance} km. Tente aumentar a distância na sua busca!`
        }));
        setLoading(false);
        return;
      }

      // 3. Busca itens de menu desses restaurantes
      const restaurantIds = nearbyRests.map(r => r.id);
      const itemsGrouped = await getItemsForComboSearch(restaurantIds);

      // 4. Constrói os combos para cada restaurante
      const allSuggestedCombos: MealCombo[] = [];
      nearbyRests.forEach(r => {
        const items = itemsGrouped[r.id] || [];
        if (items.length > 0) {
          const restaurantCombos = buildRestaurantCombos(r as any, items, parsed);
          if (restaurantCombos.length > 0) {
            // Adiciona o melhor combo de cada restaurante
            allSuggestedCombos.push(restaurantCombos[0]);
          }
        }
      });

      // Ordena por menor economia/melhor aproveitamento
      allSuggestedCombos.sort((a, b) => b.totalPrice - a.totalPrice);

      setCombos(allSuggestedCombos);

      // 5. Atualiza resposta da IA
      let responseText = '';
      if (allSuggestedCombos.length > 0) {
        responseText = `Encontrei ${allSuggestedCombos.length} sugestão(ões) de combos perfeitos de **${parsed.category === 'geral' ? 'comida' : parsed.category}** para **${parsed.numPeople} ${parsed.numPeople === 1 ? 'pessoa' : 'pessoas'}** dentro do seu orçamento de **R$ ${parsed.maxBudget.toFixed(2)}**!\n\nVeja as sugestões abaixo do chat e escolha o seu preferido.👇`;
      } else {
        responseText = `Infelizmente, varri o cardápio dos restaurantes num raio de ${parsed.maxDistance} km mas nenhum deles possui itens de **${parsed.category}** que caibam no orçamento de **R$ ${parsed.maxBudget.toFixed(2)}** para **${parsed.numPeople} ${parsed.numPeople === 1 ? 'pessoa' : 'pessoas'}**.\n\nTente aumentar o orçamento ou simplificar o pedido!`;
      }

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseText
      }));

    } catch (e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Desculpe, ocorreu um erro ao processar sua busca. Tente novamente em instantes.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText;
    setInputText('');
    await processSearch(userQuery);
  };

  // Processa query inicial vinda de parâmetros de URL
  useEffect(() => {
    if (queryParam && !isLocationLoading && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;
      processSearch(queryParam);
    }
  }, [queryParam, isLocationLoading]);

  // Abre modal para enviar sugestão para Happy Hour
  const handleOpenHHModal = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsModalOpen(true);
  };

  // Envia restaurante para a sala de Happy Hour
  const handleSuggestToHH = async (happyHourId: string) => {
    if (!selectedRestaurantId || !currentUserId) return;
    setLoadingHH(true);
    try {
      const { error } = await addRestaurantToPoll(happyHourId, selectedRestaurantId, currentUserId);
      if (error) {
        showError(error);
      } else {
        showSuccess('Restaurante sugerido na enquete do Happy Hour com sucesso!');
        setIsModalOpen(false);
      }
    } catch(e) {
      showError('Falha ao sugerir restaurante.');
    } finally {
      setLoadingHH(false);
    }
  };

  return (
    <div className="bg-[#f5f7f8] min-h-screen flex flex-col w-full pb-8">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-soft-md p-4 flex items-center justify-between h-16 w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary hover:bg-primary/5 shrink-0 h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-highlight animate-pulse" />
            <h1 className="text-xl font-extrabold text-[#022D68]">Assistente Gourmet IA</h1>
          </div>
        </div>
      </header>

      {/* Área de Conversa de Chat */}
      <div className="flex-grow max-w-md mx-auto w-full p-4 flex flex-col justify-end">
        <Card className="border-none shadow-soft-xl rounded-2xl bg-white/70 backdrop-blur-md flex-grow flex flex-col h-[320px] overflow-hidden mb-4">
          <CardContent className="p-4 flex-grow overflow-y-auto space-y-4 flex flex-col hide-scrollbar">
            {messages.map(m => (
              <div 
                key={m.id} 
                className={cn(
                  "flex flex-col max-w-[85%] rounded-2xl p-3 text-base leading-relaxed",
                  m.sender === 'user' 
                    ? "bg-[#022D68] text-white self-end rounded-tr-none shadow-soft-sm font-medium" 
                    : "bg-slate-100 text-slate-700 self-start rounded-tl-none border border-slate-200/50"
                )}
              >
                {m.id === 'typing' && <Loader2 className="w-4 h-4 animate-spin text-highlight mb-1.5" />}
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          
          {/* Campo de Entrada de Texto do Chat */}
          <div className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex: Lanche para 2 até R$ 120"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-grow h-11 px-4 text-base rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-highlight text-primary transition-all focus-visible:ring-1 focus-visible:ring-highlight"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !inputText.trim()}
                className="h-11 w-11 rounded-xl shrink-0 bg-highlight hover:bg-highlight/95 text-white shadow-highlight-glow active:scale-95 transition-transform"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Resultados de Combos Gerados */}
      <div className="max-w-md mx-auto w-full px-4 space-y-4">
        {combos.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-extrabold text-primary px-1">Combos Sugeridos</h2>
            
            <AnimatePresence>
              {combos.map((combo, index) => (
                <motion.div
                  key={combo.restaurant.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="border-none shadow-soft-lg rounded-2xl overflow-hidden bg-white">
                    <CardContent className="p-4 space-y-4">
                      {/* Topo do Restaurante */}
                      <div className="flex items-center gap-3">
                        <img 
                          src={combo.restaurant.image_url || 'https://via.placeholder.com/100?text=Restaurante'} 
                          alt={combo.restaurant.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm"
                        />
                        <div className="flex-grow">
                          <h3 className="text-base font-bold text-primary">{combo.restaurant.name}</h3>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-highlight" /> a {combo.restaurant.distance_km?.toFixed(1) || '1.0'} km ({combo.restaurant.category})
                          </p>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase shrink-0 border border-emerald-500/20 shadow-sm">
                          Economia: R$ {combo.economy.toFixed(2)}
                        </div>
                      </div>

                      {/* Lista de Itens do Combo */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50 space-y-2">
                        <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-1">Itens do Combo</p>
                        {combo.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-center text-xs text-slate-700">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#022D68]/10 text-[#022D68] text-[9px] font-extrabold h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0">1x</span>
                              <span className="font-bold truncate max-w-[200px]">{item.name}</span>
                            </div>
                            <span className="font-bold text-primary">R$ {item.price.toFixed(2)}</span>
                          </div>
                        ))}
                        
                        <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between items-center">
                          <span className="text-xs font-extrabold text-slate-600">Total do Combo:</span>
                          <span className="text-sm font-extrabold text-highlight font-sans">R$ {combo.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Explicação da IA */}
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-2.5 items-start">
                        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          {combo.explanation}
                        </p>
                      </div>

                      {/* Ações Rápidas */}
                      <div className="flex gap-2 pt-1.5">
                        <Button
                          onClick={() => navigate(`/restaurant/${combo.restaurant.id}`)}
                          variant="outline"
                          className="flex-grow h-10 rounded-xl text-xs font-bold border-gray-200 text-primary hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-soft-sm"
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          Cardápio
                        </Button>
                        <Button
                          onClick={() => handleOpenHHModal(combo.restaurant.id)}
                          variant="highlight"
                          className="flex-grow h-10 rounded-xl text-xs font-bold text-white shadow-highlight-glow flex items-center justify-center gap-1.5"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          Sugerir Happy Hour
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal / Diálogo para selecionar o Happy Hour para sugestão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-3xl p-5 w-full max-w-md shadow-soft-xl max-h-[80vh] flex flex-col border border-slate-100"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-highlight" /> Sugerir no Happy Hour
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                Fechar
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-1 hide-scrollbar">
              {happyHours.length > 0 ? (
                happyHours.map(hh => (
                  <Button
                    key={hh.id}
                    variant="outline"
                    disabled={loadingHH}
                    onClick={() => handleSuggestToHH(hh.id)}
                    className="w-full justify-start h-14 rounded-2xl border-slate-100 p-3 hover:border-highlight/50 hover:bg-highlight/5 flex items-center gap-3 transition-all"
                  >
                    <div className="w-9 h-9 bg-highlight/10 rounded-xl flex items-center justify-center text-highlight shrink-0">
                      <Vote className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left min-w-0 flex-grow">
                      <p className="text-sm font-bold text-primary truncate">{hh.title}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Encontro marcado para {new Date(hh.date_time).toLocaleDateString()}</p>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 space-y-3">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">Você não participa de nenhuma sala de Happy Hour ativa.</p>
                  <Button
                    onClick={() => {
                      setIsModalOpen(false);
                      navigate('/happy-hours');
                    }}
                    variant="highlight"
                    className="h-10 px-5 text-xs font-bold rounded-xl"
                  >
                    Criar Nova Sala
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
