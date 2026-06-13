import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  Vote, 
  Utensils, 
  ChevronDown,
  X,
  Crown
} from 'lucide-react';
import { parseNaturalQuery, buildRestaurantCombos, getItemsForComboSearch, MealCombo } from '@/utils/comboParser';
import { getHappyHours, addRestaurantToPoll, HappyHour } from '@/services/happyHourService';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

interface AiChatBalloonProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiChatBalloon({ isOpen, onClose }: AiChatBalloonProps) {
  const navigate = useNavigate();
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

  // Auto-scroll para o fim do chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  // Carrega Happy Hours do usuário para sugestão rápida
  useEffect(() => {
    if (currentUserId && isOpen) {
      getHappyHours(currentUserId)
        .then(data => setHappyHours(data))
        .catch(err => console.error(err));
    }
  }, [currentUserId, isOpen]);

  const fetchNearbyRestaurantsForCombo = async (lat: number, lng: number, maxDistKm: number) => {
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

      const lat = location.latitude || -7.11532; // Default para PB/João Pessoa se nulo
      const lng = location.longitude || -34.861;

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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="fixed top-4 bottom-[84px] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] bg-white/95 backdrop-blur-md rounded-[28px] border border-slate-200/50 shadow-[0_20px_50px_rgba(239,42,57,0.15)] flex flex-col z-50 overflow-visible"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100/80 bg-slate-50/50 rounded-t-[28px] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#EF2A39] to-[#FF7E40] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(239,42,57,0.2)]">
                <Sparkles className="w-4.5 h-4.5 text-white fill-white" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-[#EF2A39]">Assistente Virtual</span>
                <h2 className="text-sm font-black text-slate-800 -mt-0.5">Assistente Gourmet IA</h2>
              </div>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 active:scale-90 rounded-full border-none bg-transparent cursor-pointer transition-all text-slate-400 hover:text-slate-600 outline-none"
            >
              <ChevronDown className="w-5.5 h-5.5" />
            </button>
          </div>

          {/* Área de Mensagens do Chat */}
          <div className="flex-grow overflow-y-auto px-4 py-4 space-y-4 min-h-0 hide-scrollbar flex flex-col bg-gradient-to-b from-slate-50/40 to-slate-100/20">
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex gap-2.5 max-w-[88%] items-end",
                    m.sender === 'user' ? "self-end flex-row-reverse" : "self-start"
                  )}
                >
                  {/* Avatar */}
                  {m.sender === 'bot' ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#EF2A39] to-[#FF7E40] flex items-center justify-center text-white shrink-0 shadow-[0_2px_6px_rgba(239,42,57,0.2)] border border-white">
                      <Sparkles className="w-4 h-4 text-white fill-white" />
                    </div>
                  ) : (
                    <img 
                      src={user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} 
                      alt="User Avatar" 
                      className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]" 
                    />
                  )}
                  
                  {/* Balão de Mensagem */}
                  <div 
                    className={cn(
                      "p-3.5 text-xs leading-relaxed font-sans font-medium",
                      m.sender === 'user' 
                        ? "bg-gradient-to-r from-[#EF2A39] to-[#FF7E40] text-white rounded-[20px] rounded-br-none shadow-[0_6px_15px_rgba(239,42,57,0.12)]" 
                        : "bg-white border border-slate-100 text-slate-700 rounded-[20px] rounded-bl-none shadow-[0_6px_15px_rgba(0,0,0,0.02)]"
                    )}
                  >
                    {m.id === 'typing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#EF2A39] mb-1 mr-1 inline" />}
                    <p className="whitespace-pre-line inline">{m.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Resultados de Combos Gerados */}
            {combos.length > 0 && (
              <div className="space-y-3 pt-1 w-full max-w-[92%] self-end pl-6">
                <div className="flex items-center gap-1 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#EF2A39]" />
                  <h2 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Combos Sugeridos</h2>
                </div>
                
                <AnimatePresence>
                  {combos.map((combo, index) => {
                    const isPremiumRest = combo.restaurant.plan === 'premium';
                    return (
                      <motion.div
                        key={combo.restaurant.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.08 }}
                      >
                        <Card className={cn(
                          "shadow-soft hover:shadow-float transition-all duration-300 bg-white rounded-[20px] overflow-hidden border",
                          isPremiumRest
                            ? "border-amber-200/60 ring-1 ring-amber-150/20 bg-gradient-to-b from-amber-50/5 to-white"
                            : "border-slate-100/80"
                        )}>
                          <CardContent className="p-3.5 space-y-3">
                            {/* Topo do Restaurante */}
                            <div className="flex items-center gap-2.5">
                              <div className="relative shrink-0">
                                <img 
                                  src={combo.restaurant.image_url || 'https://via.placeholder.com/100?text=Restaurante'} 
                                  alt={combo.restaurant.name} 
                                  className="w-[40px] h-[40px] rounded-xl object-cover border border-slate-100 shadow-sm"
                                />
                                {isPremiumRest && (
                                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Crown className="w-2 h-2 fill-white text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <h3 className="text-xs font-black text-slate-800 truncate flex items-center gap-1">
                                  {combo.restaurant.name}
                                  {isPremiumRest && (
                                    <span className="bg-amber-100 text-amber-800 text-[7px] font-extrabold px-1 py-0.25 rounded-full uppercase tracking-wider">
                                      Premium
                                    </span>
                                  )}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-[#EF2A39]" /> a {combo.restaurant.distance_km?.toFixed(1) || '1.0'} km ({combo.restaurant.category})
                                </p>
                              </div>
                              <div className="bg-emerald-500/10 text-emerald-600 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase shrink-0 border border-emerald-500/20">
                                Poupe R$ {combo.economy.toFixed(2)}
                              </div>
                            </div>

                            {/* Lista de Itens do Combo */}
                            <div className="bg-[#F9FAFB] rounded-[16px] p-3 border border-slate-100 space-y-1.5">
                              {combo.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between items-center text-[10px] text-slate-650 font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-[#EF2A39]/10 text-[#EF2A39] text-[8px] font-black h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0">1x</span>
                                    <span className="truncate max-w-[140px]">{item.name}</span>
                                  </div>
                                  <span className="font-extrabold">R$ {item.price.toFixed(2)}</span>
                                </div>
                              ))}
                              
                              <div className="border-t border-slate-200/60 mt-2 pt-2 flex justify-between items-center">
                                <span className="text-[10px] font-extrabold text-slate-500">Total:</span>
                                <span className="text-xs font-black text-[#EF2A39]">R$ {combo.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Explicação da IA */}
                            <div className="bg-amber-50/30 border border-amber-500/10 rounded-[12px] p-2 flex gap-1.5 items-start">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                                {combo.explanation}
                              </p>
                            </div>

                            {/* Ações Rápidas */}
                            <div className="flex gap-2 pt-0.5">
                              <Button
                                onClick={() => {
                                  onClose();
                                  navigate(`/restaurant/${combo.restaurant.id}`);
                                }}
                                variant="outline"
                                className="flex-grow h-8.5 rounded-lg text-[10px] font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1 shadow-none"
                              >
                                <Utensils className="w-3 h-3" />
                                Cardápio
                              </Button>
                              <Button
                                onClick={() => handleOpenHHModal(combo.restaurant.id)}
                                className="flex-grow h-8.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-[#EF2A39] to-[#FF7E40] hover:opacity-95 text-white active:scale-95 transition-all shadow-none border-none flex items-center justify-center gap-1"
                              >
                                <Vote className="w-3 h-3" />
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

          {/* Área de Entrada & Sugestões Rápidas */}
          <div className="shrink-0 p-4 bg-white border-t border-slate-100 rounded-b-[28px] relative z-20">
            {/* Sugestões Rápidas de Prompt */}
            {messages.length === 1 && combos.length === 0 && (
              <div className="mb-3.5">
                <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  {[
                    { label: '🍔 Lanches p/ 2 até R$ 100', text: 'Quero lanche com minha esposa e gastar até R$ 100' },
                    { label: '🍕 Pizza com amigos R$ 150', text: 'Quero pizza para 4 amigos e gastar até R$ 150' },
                    { label: '🥗 Almoço leve R$ 50', text: 'Quero almoço saudável individual até R$ 50' }
                  ].map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(sug.text);
                        processSearch(sug.text);
                      }}
                      className="shrink-0 bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-750 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-soft active:scale-95 transition-all cursor-pointer border-none"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form de Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-full border border-slate-150/60 w-full group focus-within:border-[#EF2A39]/30 transition-all duration-300">
              <Sparkles className="w-4 h-4 text-slate-400 group-focus-within:text-[#EF2A39] shrink-0 ml-3 transition-colors duration-200" />
              <Input
                type="text"
                placeholder="Ex: Lanche para 2 até R$ 120"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="flex-grow border-none shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 text-xs text-[#3C2F2F] placeholder-slate-400 font-semibold h-8"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !inputText.trim()}
                className="h-8 w-8 rounded-full shrink-0 bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white active:scale-95 transition-all flex items-center justify-center shadow-[0_2px_8px_rgba(239,42,57,0.2)] border-none"
              >
                <Send className="w-3 h-3 text-white" />
              </Button>
            </form>
          </div>

          {/* Modal / Diálogo para selecionar o Happy Hour para sugestão */}
          {isModalOpen && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4 rounded-[28px]">
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-[20px] p-4 w-full shadow-none max-h-[85%] flex flex-col border border-slate-150/50"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <h3 className="text-xs font-extrabold text-[#EF2A39] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#EF2A39]" /> Sugerir no Happy Hour
                  </h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-650 text-[10px] font-bold p-1 border-none bg-transparent cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                  {happyHours.length > 0 ? (
                    happyHours.map(hh => (
                      <Button
                        key={hh.id}
                        variant="outline"
                        disabled={loadingHH}
                        onClick={() => handleSuggestToHH(hh.id)}
                        className="w-full justify-start h-12 rounded-xl border-slate-100 p-2.5 hover:border-[#EF2A39]/40 hover:bg-[#EF2A39]/5 flex items-center gap-2 transition-all shadow-none"
                      >
                        <div className="w-7 h-7 bg-[#EF2A39]/10 rounded-lg flex items-center justify-center text-[#EF2A39] shrink-0">
                          <Vote className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left min-w-0 flex-grow">
                          <p className="text-xs font-bold text-slate-800 truncate">{hh.title}</p>
                          <p className="text-[8px] text-slate-400 font-semibold">Marcado para {new Date(hh.date_time).toLocaleDateString()}</p>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500 space-y-2">
                      <AlertCircle className="w-6 h-6 text-slate-350 mx-auto" />
                      <p className="text-[10px] font-bold text-slate-400">Você não participa de salas de Happy Hour ativas.</p>
                      <Button
                        onClick={() => {
                          setIsModalOpen(false);
                          onClose();
                          navigate('/happy-hours');
                        }}
                        className="h-8 px-4 text-[10px] font-bold rounded-lg bg-[#EF2A39] text-white hover:bg-[#EF2A39]/90 border-none shadow-none"
                      >
                        Criar Nova Sala
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Seta indicadora (tail) do balão apontando para o botão */}
          <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white drop-shadow-[0_4px_4px_rgba(239,42,57,0.04)] z-10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
