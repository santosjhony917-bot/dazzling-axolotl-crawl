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
  AlertCircle,
  User,
  Menu,
  Crown
} from 'lucide-react';
import { parseNaturalQuery, buildRestaurantCombos, getItemsForComboSearch, MealCombo } from '@/utils/comboParser';
import { getHappyHours, addRestaurantToPoll, HappyHour } from '@/services/happyHourService';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';

// Interfaces de mensagens do chat
interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export default function ComboFinderPage() {
  const navigate = useNavigate();
  const getBustedUrl = useImageCacheBuster();
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
    try {
      const { data: deletedRests } = await supabase
        .from('restaurants')
        .select('id')
        .eq('is_deleted', true);
      const deletedIds = new Set(deletedRests?.map(r => r.id) || []);

      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: lat,
        user_lng: lng,
        p_limit: 50,
        p_offset: 0
      });
      if (!error && data) {
        return data.filter((r: any) => r.distance_km <= maxDistKm && !deletedIds.has(r.id));
      }
    } catch(e){}

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

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query
    }]);

    setLoading(true);
    setCombos([]);

    setMessages(prev => [...prev, {
      id: 'typing',
      sender: 'bot',
      text: 'Analisando seu pedido e buscando nos cardápios...'
    }]);

    try {
      const parsed = parseNaturalQuery(query);
      setParsedInfo(parsed);

      const lat = location.latitude || -23.55052;
      const lng = location.longitude || -46.633308;

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

      const restaurantIds = nearbyRests.map(r => r.id);
      const itemsGrouped = await getItemsForComboSearch(restaurantIds);

      const allSuggestedCombos: MealCombo[] = [];
      nearbyRests.forEach(r => {
        const items = itemsGrouped[r.id] || [];
        if (items.length > 0) {
          const restaurantCombos = buildRestaurantCombos(r as any, items, parsed);
          if (restaurantCombos.length > 0) {
            allSuggestedCombos.push(restaurantCombos[0]);
          }
        }
      });

      allSuggestedCombos.sort((a, b) => b.totalPrice - a.totalPrice);
      setCombos(allSuggestedCombos);

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

  useEffect(() => {
    if (queryParam && !isLocationLoading && !hasProcessedInitialQuery.current) {
      hasProcessedInitialQuery.current = true;
      processSearch(queryParam);
    }
  }, [queryParam, isLocationLoading]);

  const handleOpenHHModal = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsModalOpen(true);
  };

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
    <div className="bg-white h-screen flex flex-col w-full overflow-hidden max-w-md mx-auto border-x border-slate-200/60 relative">
      <Header 
        title="Assistente Gourmet IA"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
        rightAction={{ icon: Menu, onClick: () => showSuccess("Menu de suporte ativo!") }}
      />

      {/* Área de Conversa de Chat - Ocupa todo o espaço vertical disponível */}
      <div className="flex-grow overflow-y-auto px-4 pt-6 pb-32 space-y-6 min-h-0 hide-scrollbar flex flex-col bg-gradient-to-b from-slate-50/60 to-slate-100/40">
        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div 
              key={m.id} 
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-3 max-w-[85%] items-end",
                m.sender === 'user' ? "self-end flex-row-reverse" : "self-start"
              )}
            >
              {/* Avatar */}
              {m.sender === 'bot' ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#EF2A39] to-[#FF7E40] flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(239,42,57,0.25)] border-2 border-white ring-2 ring-red-50/50">
                  <Sparkles className="w-5 h-5 text-white fill-white" />
                </div>
              ) : (
                <img 
                  src={user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} 
                  alt="User Avatar" 
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-[0_2px_5px_rgba(0,0,0,0.04)]" 
                />
              )}
              
              {/* Balão de Mensagem */}
              <div 
                className={cn(
                  "p-4 text-sm leading-relaxed font-sans font-medium",
                  m.sender === 'user' 
                    ? "bg-gradient-to-r from-[#EF2A39] to-[#FF7E40] text-white rounded-[22px] rounded-br-none shadow-[0_8px_20px_rgba(239,42,57,0.15)]" 
                    : "bg-white border border-slate-100 text-slate-700 rounded-[22px] rounded-bl-none shadow-[0_8px_20px_rgba(0,0,0,0.03)]"
                )}
              >
                {m.id === 'typing' && <Loader2 className="w-4 h-4 animate-spin text-[#EF2A39] mb-1.5" />}
                <p className="whitespace-pre-line">{m.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* Resultados de Combos Gerados - Renderizados dentro do fluxo do chat */}
        {combos.length > 0 && (
          <div className="space-y-4 pt-2 w-full max-w-[90%] self-end pl-10">
            <div className="flex items-center gap-1.5 px-1">
              <Sparkles className="w-4 h-4 text-[#EF2A39]" />
              <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Combos Sugeridos</h2>
            </div>
            
            <AnimatePresence>
              {combos.map((combo, index) => {
                const isPremiumRest = combo.restaurant.plan === 'premium';
                return (
                  <motion.div
                    key={combo.restaurant.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className={cn(
                      "shadow-soft hover:shadow-float transition-all duration-300 bg-white rounded-[24px] overflow-hidden relative border",
                      isPremiumRest
                        ? "border-amber-200/60 ring-1 ring-amber-150/20 bg-gradient-to-b from-amber-50/5 to-white"
                        : "border-slate-100/80"
                    )}>
                      <CardContent className="p-4 space-y-4">
                        {/* Topo do Restaurante */}
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={getBustedUrl(combo.restaurant.image_url) || 'https://via.placeholder.com/100?text=Restaurante'} 
                              alt={combo.restaurant.name} 
                              className="w-[48px] h-[48px] rounded-2xl object-cover border border-slate-100 shadow-sm"
                            />
                            {isPremiumRest && (
                              <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                <Crown className="w-2.5 h-2.5 fill-white text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-800 truncate flex items-center gap-1.5">
                              {combo.restaurant.name}
                              {isPremiumRest && (
                                <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90 origin-left">
                                  Premium
                                </span>
                              )}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#EF2A39]" /> a {combo.restaurant.distance_km?.toFixed(1) || '1.0'} km ({combo.restaurant.category})
                            </p>
                          </div>
                          <div className="bg-emerald-500/10 text-emerald-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase shrink-0 border border-emerald-500/20">
                            Economia: R$ {combo.economy.toFixed(2)}
                          </div>
                        </div>

                        {/* Lista de Itens do Combo */}
                        <div className="bg-[#F9FAFB] rounded-[20px] p-4 border border-slate-150 space-y-2">
                          <p className="text-[9px] uppercase font-extrabold text-slate-450 tracking-wider">Itens do Combo</p>
                          {combo.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between items-center text-xs text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#EF2A39]/10 text-[#EF2A39] text-[9px] font-black h-5 w-5 rounded-md flex items-center justify-center shrink-0">1x</span>
                                <span className="font-bold truncate max-w-[150px]">{item.name}</span>
                              </div>
                              <span className="font-extrabold text-slate-700">{item.price != null ? `R$ ${item.price.toFixed(2)}` : 'Preço sob consulta'}</span>
                            </div>
                          ))}
                          
                          <div className="border-t border-slate-200 mt-2.5 pt-2.5 flex justify-between items-center">
                            <span className="text-xs font-extrabold text-slate-500">Total do Combo:</span>
                            <span className="text-sm font-black text-[#EF2A39]">R$ {combo.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Explicação da IA */}
                        <div className="bg-amber-550/5 border border-amber-500/10 rounded-[16px] p-3 flex gap-2 items-start bg-amber-50/20">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                            {combo.explanation}
                          </p>
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/restaurant/${combo.restaurant.id}`)}
                            variant="outline"
                            className="flex-grow h-10 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-none"
                          >
                            <Utensils className="w-3.5 h-3.5" />
                            Cardápio
                          </Button>
                          <Button
                            onClick={() => handleOpenHHModal(combo.restaurant.id)}
                            className="flex-grow h-10 rounded-xl text-xs font-bold bg-gradient-to-r from-[#EF2A39] to-[#FF7E40] hover:opacity-95 text-white active:scale-95 transition-all shadow-none border-none flex items-center justify-center gap-1.5"
                          >
                            <Vote className="w-3.5 h-3.5" />
                            Sugerir HH
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas de Prompt */}
      {messages.length === 1 && combos.length === 0 && (
        <div className="absolute bottom-[92px] left-0 right-0 px-4 z-20 max-w-md mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1.5 hide-scrollbar">
            {[
              { label: '🍔 Lanches para 2 até R$ 100', text: 'Quero lanche com minha esposa e gastar até R$ 100' },
              { label: '🍕 Pizza com amigos R$ 150', text: 'Quero pizza para 4 amigos e gastar até R$ 150' },
              { label: '🥗 Almoço individual R$ 50', text: 'Quero almoço saudável individual até R$ 50' }
            ].map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputText(sug.text);
                  processSearch(sug.text);
                }}
                className="shrink-0 bg-white hover:bg-slate-50 border border-slate-150 text-slate-750 text-xs font-extrabold px-4.5 py-3 rounded-full shadow-soft hover:shadow-float active:scale-95 transition-all duration-200 cursor-pointer"
              >
                {sug.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campo de Entrada de Texto do Chat - Card Suspenso Flutuante na base */}
      <div className="p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent border-none absolute bottom-0 left-0 right-0 w-full z-30 pt-10">
        <form onSubmit={handleSend} className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-[24px] shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-slate-100 max-w-md mx-auto w-full group focus-within:border-[#EF2A39]/30 focus-within:shadow-[0_12px_32px_rgba(239,42,57,0.08)] transition-all duration-300">
          <Sparkles className="w-5 h-5 text-slate-400 group-focus-within:text-[#EF2A39] shrink-0 ml-3 transition-colors duration-200" />
          <Input
            type="text"
            placeholder="Ex: Lanche para 2 até R$ 120"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-grow border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 text-sm text-[#3C2F2F] placeholder-slate-400 font-medium h-11"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !inputText.trim()}
            className="h-11 w-11 rounded-full shrink-0 bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white active:scale-95 transition-all flex items-center justify-center shadow-[0_4px_12px_rgba(239,42,57,0.25)] border-none"
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </form>
      </div>

      {/* Modal / Diálogo para selecionar o Happy Hour para sugestão */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[20px] p-5 w-full max-w-md shadow-none max-h-[80vh] flex flex-col border border-slate-100"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-primary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-highlight" /> Sugerir no Happy Hour
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 text-sm font-bold p-1"
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
                    <div className="w-9 h-9 bg-highlight/10 rounded-2xl flex items-center justify-center text-highlight shrink-0">
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
                    className="h-10 px-5 text-xs font-bold rounded-2xl"
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
