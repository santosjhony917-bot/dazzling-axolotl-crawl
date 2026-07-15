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
import { fetchNearbyPublicCatalogRestaurants } from '@/integrations/supabase/publicCatalog';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';
import Header from '@/components/Header';
import { DEMO_LABEL, IS_DEMO_MODE } from '@/lib/runtimeMode';


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
  const getBustedUrl = useImageCacheBuster();
  const { user } = useAuthData();
  const currentUserId = user?.id || '';
  const { location, isLoading: isLocationLoading, hasLocation, status: locationStatus } = useUserSearchLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: IS_DEMO_MODE
        ? `${DEMO_LABEL} Modo de demonstração ativo. Os restaurantes e itens desta experiência são fictícios e aparecem identificados.\n\nExperimente: "Lanche para 2 até R$ 120".`
        : 'Olá! Eu consulto cardápios publicados perto de você e monto combinações usando somente os itens e preços encontrados.\n\nExperimente: "Lanche para 2 até R$ 120".'
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
    if (IS_DEMO_MODE) {
      return [
        {
          id: 'demo-premium-restaurant-id',
          name: `${DEMO_LABEL} Restaurante Gourmet`,
          category: 'Demonstração',
          image_url: null,
          distance_km: 1.2,
          latitude: lat,
          longitude: lng,
          plan: 'premium',
          is_demo: true,
        },
        {
          id: 'demo-casual-restaurant-id',
          name: `${DEMO_LABEL} Lanchonete Exemplo`,
          category: 'Demonstração',
          image_url: null,
          distance_km: 2.5,
          latitude: lat + 0.005,
          longitude: lng + 0.005,
          plan: 'free',
          is_demo: true,
        },
      ].filter(restaurant => restaurant.distance_km <= maxDistKm);
    }

    try {
      return await fetchNearbyPublicCatalogRestaurants({
        latitude: lat,
        longitude: lng,
        maxDistanceKm: maxDistKm,
        limit: 50,
      });
    } catch (error) {
      console.error('Failed to fetch restaurants for the menu assistant.', error);
      throw new Error('Não foi possível consultar os restaurantes próximos agora.');
    }
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

      if (isLocationLoading || locationStatus === 'loading') {
        setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: 'Ainda estou carregando sua localização. Aguarde um instante e tente novamente.'
        }));
        return;
      }

      if (!hasLocation || location.latitude === null || location.longitude === null) {
        setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: 'Preciso de uma localização real para consultar cardápios próximos. Defina sua localização e tente novamente.'
        }));
        return;
      }

      const lat = location.latitude;
      const lng = location.longitude;

      const nearbyRests = await fetchNearbyRestaurantsForCombo(lat, lng, parsed.maxDistance);
      
      if (nearbyRests.length === 0) {
        setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Ainda não há cobertura de cardápios publicados em um raio de ${parsed.maxDistance} km para esta localização. Você pode aumentar a distância ou tentar outra região.`
        }));
        setLoading(false);
        return;
      }

      const restaurantIds = nearbyRests.map(r => r.id);
      const itemsGrouped = await getItemsForComboSearch(restaurantIds);
      const restaurantsWithMenuItems = nearbyRests.filter(restaurant => (itemsGrouped[restaurant.id] || []).length > 0);

      if (restaurantsWithMenuItems.length === 0) {
        setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: `Encontrei ${nearbyRests.length} restaurante(s) publicado(s) na região, mas nenhum possui itens de cardápio auditáveis disponíveis para montar esta combinação.`
        }));
        return;
      }

      const allSuggestedCombos: MealCombo[] = [];
      restaurantsWithMenuItems.forEach(r => {
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
        responseText = `Encontrei ${allSuggestedCombos.length} combinação(ões) de **${parsed.category === 'geral' ? 'comida' : parsed.category}** para **${parsed.numPeople} ${parsed.numPeople === 1 ? 'pessoa' : 'pessoas'}** dentro do orçamento de **R$ ${parsed.maxBudget.toFixed(2)}**. Todas usam somente itens e preços presentes nos cardápios consultados.\n\nVeja as opções abaixo.`;
      } else {
        responseText = `Consultei ${restaurantsWithMenuItems.length} cardápio(s) publicado(s), mas não encontrei uma combinação de **${parsed.category}** que caiba no orçamento de **R$ ${parsed.maxBudget.toFixed(2)}** para **${parsed.numPeople} ${parsed.numPeople === 1 ? 'pessoa' : 'pessoas'}**.\n\nTente aumentar o orçamento ou simplificar o pedido.`;
      }

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseText
      }));

    } catch (e) {
      console.error('Menu assistant search failed.', e);
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Não foi possível consultar os cardápios agora. Isso é diferente de uma busca sem resultados; tente novamente em instantes.'
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

  const quickSuggestions = [
    { label: 'Lanches para 2', hint: 'até R$ 100', text: 'Quero lanche com minha esposa e gastar até R$ 100' },
    { label: 'Pizza com amigos', hint: 'R$ 150', text: 'Quero pizza para 4 amigos e gastar até R$ 150' },
    { label: 'Almoço leve', hint: 'R$ 50', text: 'Quero almoço saudável individual até R$ 50' }
  ];

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
        <div className="fixed inset-0 z-[100] flex h-screen min-h-screen justify-center overflow-hidden bg-[#FAFAFA] pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex h-screen min-h-screen w-full max-w-[440px] flex-col overflow-hidden bg-[#FAFAFA] shadow-float pointer-events-auto"
          >
          {/* Cabeçalho */}
          <Header
            title={
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-highlight text-white shadow-sm">
                  <Sparkles className="h-4 w-4 fill-white text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-highlight">Assistente virtual</span>
                  <span className="text-base font-semibold leading-tight text-[#3C2F2F]">Assistente Gourmet</span>
                </div>
              </div>
            }
            rightAction={{ icon: ChevronDown, onClick: onClose }}
          />

          {IS_DEMO_MODE && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-amber-900" role="status">
              {DEMO_LABEL} Dados fictícios de demonstração
            </div>
          )}

          {/* Área de Mensagens do Chat */}
          <div className={cn(
            "flex min-h-0 flex-grow flex-col space-y-4 overflow-y-auto bg-[#FAFAFA] px-4 py-4 hide-scrollbar",
            messages.length === 1 && combos.length === 0 && "pt-4"
          )}>
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    "flex max-w-[82%] items-start gap-2.5",
                    m.sender === 'user' ? "self-end flex-row-reverse" : "self-start"
                  )}
                >
                  {/* Avatar */}
                  {m.sender === 'bot' ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white bg-highlight text-white shadow-sm">
                      <Sparkles className="h-4 w-4 fill-white text-white" />
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
                      "p-3.5 text-[14px] leading-relaxed font-sans font-normal",
                      m.sender === 'user' 
                        ? "rounded-[20px] rounded-tr-none bg-highlight text-white shadow-sm" 
                        : "rounded-[20px] rounded-tl-none border border-slate-100 bg-white text-[#273247] shadow-soft"
                    )}
                  >
                    {m.id === 'typing' && <Loader2 className="mb-1 mr-1 inline h-3.5 w-3.5 animate-spin text-highlight" />}
                    <p className="whitespace-pre-line inline">{m.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {messages.length === 1 && combos.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.08 }}
                className="ml-10 mt-1 w-[calc(100%-2.5rem)] max-w-[300px] space-y-2"
              >
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                  Ideias rápidas
                </p>
                <div className="grid gap-2">
                  {quickSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInputText(sug.text);
                        processSearch(sug.text);
                      }}
                      className="flex items-center justify-between rounded-[18px] border border-slate-100 bg-white px-3.5 py-3 text-left shadow-soft transition-all hover:translate-y-[-1px] active:scale-[0.99]"
                    >
                      <span className="text-[13px] font-semibold text-[#3C2F2F]">{sug.label}</span>
                      <span className="rounded-full bg-highlight/10 px-2 py-0.5 text-[11px] font-semibold text-highlight">{sug.hint}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Resultados de Combos Gerados */}
            {combos.length > 0 && (
              <div className="space-y-3.5 pt-1 w-full self-stretch">
                <div className="flex items-center gap-1.5 px-1">
                  <Sparkles className="w-4 h-4 text-[#df4b1c]" />
                  <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Combos Sugeridos</h2>
                </div>
                
                <AnimatePresence>
                  {combos.map((combo, index) => {
                    const isPremiumRest = combo.restaurant.plan === 'premium';
                    const displayedItems = combo.items.slice(0, 5);
                    const hiddenItemsCount = combo.items.length - displayedItems.length;

                    return (
                      <motion.div
                        key={combo.restaurant.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.08 }}
                      >
                        <Card className={cn(
                          "shadow-[0_14px_34px_rgba(15,23,42,0.09)] hover:shadow-float transition-all duration-300 bg-white rounded-[26px] overflow-hidden border",
                          isPremiumRest
                            ? "border-amber-200/60 ring-1 ring-amber-150/20 bg-gradient-to-b from-amber-50/5 to-white"
                            : "border-slate-100/80"
                        )}>
                          <CardContent className="p-5 space-y-4">
                            {/* Topo do Restaurante */}
                            <div className="flex items-center gap-3.5">
                              <div className="relative shrink-0">
                                <img 
                                  src={getBustedUrl(combo.restaurant.image_url) || 'https://via.placeholder.com/100?text=Restaurante'} 
                                  alt={combo.restaurant.name} 
                                  className="w-14 h-14 rounded-[18px] object-cover border border-slate-100 shadow-sm"
                                />
                                {isPremiumRest && (
                                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-full p-0.5 shadow-sm border border-white">
                                    <Crown className="w-2.5 h-2.5 fill-white text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow min-w-0">
                                <h3 className="text-[15px] font-black text-slate-800 truncate flex items-center gap-1.5">
                                  {combo.restaurant.name}
                                  {isPremiumRest && (
                                    <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                      Premium
                                    </span>
                                  )}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mt-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-[#df4b1c]" /> a {combo.restaurant.distance_km?.toFixed(1) || '1.0'} km ({combo.restaurant.category})
                                </p>
                              </div>
                              <div className="bg-emerald-500/10 text-emerald-600 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase shrink-0 border border-emerald-500/20">
                                Poupe R$ {combo.economy.toFixed(2)}
                              </div>
                            </div>

                            {/* Lista de Itens do Combo */}
                            <div className="bg-[#F9FAFB] rounded-[20px] p-4 border border-slate-100 space-y-3">
                              {displayedItems.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between items-center gap-3 text-xs text-slate-700 font-bold min-h-[24px]">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="bg-[#df4b1c]/10 text-[#df4b1c] text-[9px] font-black h-6 w-6 rounded-lg flex items-center justify-center shrink-0">1x</span>
                                    <span className="truncate">{item.name}</span>
                                  </div>
                                  <span className="text-xs font-extrabold shrink-0">{item.price != null ? `R$ ${item.price.toFixed(2)}` : 'Preço sob consulta'}</span>
                                </div>
                              ))}
                              {hiddenItemsCount > 0 && (
                                <div className="text-xs font-extrabold text-slate-400">
                                  +{hiddenItemsCount} item(ns) no combo
                                </div>
                              )}

                              <div className="border-t border-slate-200/60 mt-3 pt-3 flex justify-between items-center">
                                <span className="text-xs font-extrabold text-slate-500">Total:</span>
                                <span className="text-base font-black text-[#df4b1c]">R$ {combo.totalPrice.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Explicação da IA */}
                            <div className="bg-amber-50/40 border border-amber-500/10 rounded-[18px] p-3.5 flex gap-2.5 items-start">
                              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-600 leading-relaxed font-semibold line-clamp-5">
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
                                className="flex-grow h-11 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-none"
                              >
                                <Utensils className="w-3.5 h-3.5" />
                                Cardápio
                              </Button>
                              <Button
                                onClick={() => handleOpenHHModal(combo.restaurant.id)}
                                className="flex-grow h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-[#df4b1c] to-[#FF7E40] hover:opacity-95 text-white active:scale-95 transition-all shadow-none border-none flex items-center justify-center gap-1.5"
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

          {/* Área de Entrada & Sugestões Rápidas */}
          <div className="relative z-20 shrink-0 rounded-b-[28px] border-t border-slate-100 bg-white p-4">
            {/* Form de Input */}
            <form onSubmit={handleSend} className="group flex w-full items-center gap-2 rounded-full border border-slate-100 bg-[#FAFAFA] p-2 shadow-sm transition-all duration-300 focus-within:border-highlight/30">
              <Sparkles className="ml-3 h-5 w-5 shrink-0 text-slate-400 transition-colors duration-200 group-focus-within:text-highlight" />
              <Input
                type="text"
                placeholder="Ex: Lanche para 2 até R$ 120"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
                className="h-11 flex-grow border-none bg-transparent px-2 text-[15px] font-semibold text-[#3C2F2F] shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !inputText.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-none bg-highlight text-white shadow-sm transition-all hover:bg-highlight/90 active:scale-95"
              >
                <Send className="h-4 w-4 text-white" />
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
                  <h3 className="text-xs font-extrabold text-[#df4b1c] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#df4b1c]" /> Sugerir no Happy Hour
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
                        className="w-full justify-start h-12 rounded-xl border-slate-100 p-2.5 hover:border-[#df4b1c]/40 hover:bg-[#df4b1c]/5 flex items-center gap-2 transition-all shadow-none"
                      >
                        <div className="w-7 h-7 bg-[#df4b1c]/10 rounded-lg flex items-center justify-center text-[#df4b1c] shrink-0">
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
                        className="h-8 px-4 text-[10px] font-bold rounded-lg bg-[#df4b1c] text-white hover:bg-[#df4b1c]/90 border-none shadow-none"
                      >
                        Criar Nova Sala
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
