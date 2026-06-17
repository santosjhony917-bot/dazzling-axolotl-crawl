import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Loader2, 
  MapPin, 
  Clock, 
  MessageSquare,
  Users,
  Check,
  Search,
  Utensils,
  X,
  Copy
} from 'lucide-react';
import { getHappyHours, createHappyHour } from '@/services/happyHourService';
import { getFriendships } from '@/services/friendsService';
import { HappyHour } from '@/services/happyHourService';
import { Profile } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';

export default function HappyHourHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthData();
  const currentUserId = user?.id || '';

  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog de Criação
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [isDateVoting, setIsDateVoting] = useState(false);
  const [dateSuggestions, setDateSuggestions] = useState<string[]>(['', '']);
  const [allowMemberInvites, setAllowMemberInvites] = useState(true);
  const [allowSuggestRestaurants, setAllowSuggestRestaurants] = useState(true);
  const [allowSuggestDates, setAllowSuggestDates] = useState(true);
  
  // Estados para Seleção de Restaurantes Iniciais
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Restaurant[]>([]);
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
  const [restaurantSearchResults, setRestaurantSearchResults] = useState<Restaurant[]>([]);
  const [searchingRestaurants, setSearchingRestaurants] = useState(false);

  // Estados para Compartilhamento Pós-Criação
  const [createdEventData, setCreatedEventData] = useState<HappyHour | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [friends, setFriends] = useState<{ friendshipId: string; friendProfile: Profile }[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyInviteText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadData = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const list = await getHappyHours(currentUserId);
      // Ordena por data (mais próximos primeiro)
      list.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());
      setHappyHours(list);
      
      // Carrega os amigos para o convite
      const { friends: friendsList } = await getFriendships(currentUserId);
      setFriends(friendsList);
    } catch (e) {
      console.error(e);
      showError('Falha ao carregar eventos de Happy Hour.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      handleOpenCreateModal();
    }
  }, [searchParams]);

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setDateTime('');
    setIsDateVoting(false);
    setDateSuggestions(['', '']);
    setAllowMemberInvites(true);
    setAllowSuggestRestaurants(true);
    setAllowSuggestDates(true);
    setSelectedRestaurantIds([]);
    setSelectedRestaurants([]);
    setRestaurantSearchQuery('');
    setRestaurantSearchResults([]);
    setSelectedFriendIds([]);
    setStep(1);
    setIsOpen(true);
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleSearchRestaurants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantSearchQuery.trim()) return;
    setSearchingRestaurants(true);

    if (currentUserId.startsWith('mock-')) {
      const term = restaurantSearchQuery.toLowerCase().trim();
      const mockList: Restaurant[] = [
        {
          id: 'mock-premium-restaurant-id',
          name: 'Sabor Premium Gourmet',
          description: 'Experiência gastronômica única com ingredientes selecionados e ambiente sofisticado.',
          image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
          category: 'Italiana',
          address: 'Avenida Paulista, 1000',
          plan: 'premium',
          created_at: '',
          user_id: null,
          cover_image_url: null,
          phone: null,
          email: null,
          cnpj: null,
          whatsapp_url: null,
          ifood_url: null,
          other_url: null,
          number: null,
          neighborhood: null,
          city: null,
          state: null,
          cep: null,
          latitude: null,
          longitude: null,
          opening_hours: null,
          external_url: null,
          followers_override: null,
          payment_methods: null,
          social_networks: null,
          other_url_label: null,
          claim_code: null,
          is_published: true,
          visit_notes: null
        },
        {
          id: 'mock-free-restaurant-id',
          name: 'Lancheira do Zé (Free)',
          description: 'Lanches rápidos e saborosos com aquele tempero caseiro que você adora.',
          image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
          category: 'Lanches',
          address: 'Avenida Paulista, 2000',
          plan: 'free',
          created_at: '',
          user_id: null,
          cover_image_url: null,
          phone: null,
          email: null,
          cnpj: null,
          whatsapp_url: null,
          ifood_url: null,
          other_url: null,
          number: null,
          neighborhood: null,
          city: null,
          state: null,
          cep: null,
          latitude: null,
          longitude: null,
          opening_hours: null,
          external_url: null,
          followers_override: null,
          payment_methods: null,
          social_networks: null,
          other_url_label: null,
          claim_code: null,
          is_published: true,
          visit_notes: null
        }
      ];
      setRestaurantSearchResults(mockList.filter(r => r.name.toLowerCase().includes(term)));
      setSearchingRestaurants(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name', `%${restaurantSearchQuery}%`)
        .limit(5);

      if (error) throw error;
      setRestaurantSearchResults(data || []);
    } catch (e) {
      console.error(e);
      showError('Erro ao buscar restaurantes.');
    } finally {
      setSearchingRestaurants(false);
    }
  };

  const handleToggleSelectRestaurant = (restaurant: Restaurant) => {
    if (selectedRestaurantIds.includes(restaurant.id)) {
      setSelectedRestaurantIds(prev => prev.filter(id => id !== restaurant.id));
      setSelectedRestaurants(prev => prev.filter(r => r.id !== restaurant.id));
    } else {
      setSelectedRestaurantIds(prev => [...prev, restaurant.id]);
      setSelectedRestaurants(prev => [...prev, restaurant]);
    }
  };

  const handleGoToStep2 = () => {
    if (!title.trim()) {
      showError('Por favor, preencha o título.');
      return;
    }
    if (isDateVoting) {
      const validDates = dateSuggestions.filter(d => d.trim() !== '');
      if (validDates.length < 2) {
        showError('Por favor, adicione pelo menos 2 opções de datas válidas.');
        return;
      }
    } else {
      if (!dateTime) {
        showError('Por favor, selecione a data e a hora.');
        return;
      }
    }
    setStep(2);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUserId) {
      showError('Por favor, preencha o título.');
      return;
    }

    if (isDateVoting) {
      const validDates = dateSuggestions.filter(d => d.trim() !== '');
      if (validDates.length < 2) {
        showError('Por favor, defina pelo menos 2 opções de datas para votação.');
        return;
      }
    } else {
      if (!dateTime) {
        showError('Por favor, defina a data do encontro.');
        return;
      }
    }

    setCreating(true);
    try {
      const finalDateTime = isDateVoting 
        ? dateSuggestions.filter(Boolean)[0] 
        : dateTime;

      const { data, error } = await createHappyHour(
        title,
        description,
        finalDateTime,
        selectedFriendIds,
        currentUserId,
        {
          isDateVoting,
          suggestedDates: isDateVoting ? dateSuggestions.filter(Boolean) : [],
          allowMemberInvites,
          allowMemberSuggestRestaurants: allowSuggestRestaurants,
          allowMemberSuggestDates: allowSuggestDates,
          initialRestaurantIds: selectedRestaurantIds
        }
      );

      if (error) {
        showError(error);
      } else if (data) {
        showSuccess('Happy Hour marcado com sucesso!');
        setIsOpen(false);
        loadData();
        setCreatedEventData(data);
        setIsShareModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao criar happy hour.');
    } finally {
      setCreating(false);
    }
  };

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const formatEventTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-background-light min-h-screen flex flex-col w-full pb-20 font-['Poppins']">
      
      <Header 
        title="Happy Hours"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate('/home') }}
        rightAction={{ icon: Plus, onClick: handleOpenCreateModal }}
      />

      {/* Prominent CTA to Create Event */}
      {!loading && happyHours.length > 0 && (
        <div className="px-4 pt-4">
          <Button
            onClick={handleOpenCreateModal}
            className="w-full h-12 bg-gradient-to-r from-[#EF2A39] to-[#C41230] hover:from-[#EF2A39]/90 hover:to-[#C41230]/90 text-white font-extrabold rounded-2xl shadow-[0_6px_20px_rgba(239,42,57,0.25)] flex items-center justify-center gap-2 border-none active:scale-[0.99] transition-all text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Criar Novo Happy Hour
          </Button>
        </div>
      )}

      {/* List of Events */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : happyHours.length > 0 ? (
          happyHours.map((hh) => {
            const isUpcoming = new Date(hh.date_time).getTime() > Date.now();
            const eventDate = new Date(hh.date_time);
            const day = eventDate.getDate().toString().padStart(2, '0');
            const month = eventDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
            const weekday = eventDate.toLocaleDateString('pt-BR', { weekday: 'short' }).split(',')[0];

            return (
              <motion.div
                key={hh.id}
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate(`/happy-hour/${hh.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3.5 p-4 rounded-[24px] bg-white border border-slate-100/80 shadow-soft hover:shadow-float transition-all duration-300 relative overflow-hidden group">
                  {/* Top and Bottom Ticket Cutouts */}
                  <div className="absolute -top-2 left-[82px] w-4 h-4 bg-background-light border border-slate-100 rounded-full z-10" />
                  <div className="absolute -bottom-2 left-[82px] w-4 h-4 bg-background-light border border-slate-100 rounded-full z-10" />

                  {/* Ticket de Data */}
                  <div className="w-[60px] h-[72px] rounded-2xl bg-slate-50 border border-slate-100/80 flex flex-col overflow-hidden shrink-0 shadow-sm relative z-10">
                    <div className="bg-[#EF2A39] text-white text-[9px] font-extrabold py-1 text-center uppercase tracking-wider">
                      {month}
                    </div>
                    <div className="flex-grow flex flex-col items-center justify-center bg-white px-1 leading-none">
                      <span className="text-xl font-extrabold text-slate-800">{day}</span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5 capitalize">{weekday}</span>
                    </div>
                  </div>

                  {/* Separador tracejado vertical */}
                  <div className="h-16 border-l border-dashed border-slate-200 relative mx-1 shrink-0" />

                  {/* Conteúdo */}
                  <div className="flex-grow min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-slate-800 leading-tight truncate">
                        {hh.title}
                      </h3>
                      <span className={cn(
                        "text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0",
                        isUpcoming ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-slate-100 text-slate-400"
                      )}>
                        {isUpcoming ? 'Agendado' : 'Encerrado'}
                      </span>
                    </div>

                    {hh.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1 font-medium">
                        {(() => {
                          try {
                            const parsed = JSON.parse(hh.description);
                            if (parsed && typeof parsed === 'object' && 'text' in parsed) {
                              return parsed.text || "";
                            }
                          } catch (e) {}
                          return hh.description;
                        })()}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-[#EF2A39]" />
                          <span>às {formatEventTime(hh.date_time)}</span>
                        </div>

                        {hh.participants && hh.participants.length > 0 && (
                          <span className="text-slate-200 text-xs">|</span>
                        )}

                        {hh.participants && hh.participants.length > 0 && (
                          <div className="flex items-center -space-x-1.5">
                            {hh.participants.slice(0, 3).map((p, idx) => (
                              <div key={idx} className="relative z-10 border-2 border-white rounded-full overflow-hidden w-6 h-6 shrink-0 shadow-sm bg-slate-50">
                                <img
                                  src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.first_name || 'User'}&backgroundColor=fef2f2`}
                                  alt={p.first_name || 'Participante'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {hh.participants.length > 3 && (
                              <span className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[7px] font-black text-slate-500 z-10">
                                +{hh.participants.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#EF2A39] hover:text-[#EF2A39]/80 font-bold transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Entrar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
            <Calendar className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="text-sm font-extrabold text-slate-800 mb-2">Nenhum Happy Hour</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[250px] mb-4">
              Que tal agendar um encontro com seus amigos e decidir o local por votação?
            </p>
            <Button 
              onClick={handleOpenCreateModal}
              className="h-12 px-6 bg-gradient-to-r from-[#EF2A39] to-[#C41230] hover:from-[#EF2A39]/90 hover:to-[#C41230]/90 text-white font-extrabold rounded-2xl shadow-[0_6px_20px_rgba(239,42,57,0.25)] flex items-center gap-2 border-none active:scale-[0.99] transition-all duration-200 text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Criar Novo Happy Hour
            </Button>
          </div>
        )}
      </div>

      {/* CREATE EVENT MODAL DIALOG */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-[95%] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-highlight" />
              Marcar Novo Happy Hour
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-4 pt-1 font-['Poppins']">
            
            {/* Step progress indicator */}
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <span>Passo {step} de 3</span>
                <span className="text-highlight">
                  {step === 1 && "Detalhes do Encontro"}
                  {step === 2 && "Lugares & Convidados"}
                  {step === 3 && "Configurações"}
                </span>
              </div>
              <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full bg-highlight rounded-full transition-all duration-300", 
                    step === 1 ? "w-1/3" : step === 2 ? "w-2/3" : "w-full"
                  )} 
                />
              </div>
            </div>

            {/* STEP 1: INFO E DATA */}
            {step === 1 && (
              <div className="space-y-4 py-1 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Título do Encontro</label>
                  <Input
                    type="text"
                    placeholder="Ex: Pizza de Sexta, Aniversário..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-11 rounded-2xl border border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Definição da Data</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsDateVoting(false)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none",
                        !isDateVoting ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-700 bg-transparent"
                      )}
                    >
                      Data Fixa
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDateVoting(true)}
                      className={cn(
                        "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border-none",
                        isDateVoting ? "bg-white text-primary shadow-xs" : "text-slate-500 hover:text-slate-700 bg-transparent"
                      )}
                    >
                      Votação de Datas
                    </button>
                  </div>
                </div>

                {!isDateVoting ? (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Data e Hora</label>
                    <Input
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      required={!isDateVoting}
                      className="h-11 rounded-2xl border border-slate-200"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500">Opções de Datas</label>
                      {dateSuggestions.length < 5 && (
                        <button
                          type="button"
                          onClick={() => setDateSuggestions(prev => [...prev, ''])}
                          className="text-highlight hover:underline font-bold text-[10px] bg-transparent border-none cursor-pointer p-0"
                        >
                          + Adicionar Opção
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {dateSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            type="datetime-local"
                            value={suggestion}
                            onChange={(e) => {
                              const updated = [...dateSuggestions];
                              updated[idx] = e.target.value;
                              setDateSuggestions(updated);
                            }}
                            required={isDateVoting}
                            className="h-11 rounded-2xl border border-slate-200 flex-grow"
                          />
                          {dateSuggestions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setDateSuggestions(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold px-1 bg-transparent border-none cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Descrição (Opcional)</label>
                  <Textarea
                    placeholder="Detalhes ou recados sobre o encontro..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-2xl border border-slate-200 min-h-[70px] resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: LUGARES E AMIGOS */}
            {step === 2 && (
              <div className="space-y-4 py-1 animate-fade-in">
                {/* Sugerir Restaurantes para Votação Inicial */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-slate-400" />
                    Sugerir Restaurantes para Votação ({selectedRestaurantIds.length} selecionados)
                  </label>

                  {/* Lista de Restaurantes Selecionados */}
                  {selectedRestaurants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 bg-slate-50 rounded-2xl max-h-[85px] overflow-y-auto">
                      {selectedRestaurants.map((r) => (
                        <div 
                          key={r.id} 
                          className="bg-white border border-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs"
                        >
                          <span className="truncate max-w-[120px]">{r.name}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRestaurant(r)}
                            className="text-slate-400 hover:text-red-500 bg-transparent border-none cursor-pointer p-0 flex items-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Campo de Busca de Restaurantes */}
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <Input
                        type="text"
                        placeholder="Buscar restaurante por nome..."
                        value={restaurantSearchQuery}
                        onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchRestaurants(e);
                          }
                        }}
                        className="w-full pl-9 pr-3 h-10 text-xs rounded-2xl border border-slate-200 bg-white"
                      />
                    </div>
                    <Button 
                      type="button"
                      onClick={handleSearchRestaurants}
                      disabled={searchingRestaurants || !restaurantSearchQuery.trim()}
                      className="bg-primary hover:bg-primary/95 text-white h-10 px-4 rounded-2xl text-[10px] font-bold shrink-0 shadow-none border-none"
                    >
                      {searchingRestaurants ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                    </Button>
                  </div>

                  {/* Resultados da Busca de Restaurantes */}
                  {restaurantSearchResults.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl bg-white p-2 max-h-[120px] overflow-y-auto space-y-1 scrollbar-thin">
                      {restaurantSearchResults.map((r) => {
                        const isSelected = selectedRestaurantIds.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() => handleToggleSelectRestaurant(r)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
                              isSelected ? "bg-[#EF2A39]/5 border border-[#EF2A39]/10" : "bg-white border border-transparent hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={r.image_url || 'https://via.placeholder.com/80?text=Restaurante'}
                                alt={r.name}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-primary truncate max-w-[180px]">{r.name}</h4>
                                <p className="text-[9px] text-slate-400">{r.category || 'Alimentação'}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                              isSelected ? "bg-[#EF2A39] border-[#EF2A39] text-white" : "border-slate-350 bg-white"
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Convidar Amigos Checkbox list */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Users className="w-4 h-4 text-slate-400" />
                    Convidar Amigos ({selectedFriendIds.length} selecionados)
                  </label>
                  <div className="border border-slate-100 rounded-2xl bg-background-light p-2 max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin">
                    {friends.length > 0 ? (
                      friends.map(({ friendshipId, friendProfile }) => {
                        const isSelected = selectedFriendIds.includes(friendProfile.id);
                        const name = `${friendProfile.first_name || ''} ${friendProfile.last_name || ''}`.trim() || 'Amigo';
                        return (
                          <div
                            key={friendshipId}
                            onClick={() => handleToggleFriend(friendProfile.id)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all",
                              isSelected ? "bg-highlight/5 border border-highlight/20" : "bg-white border border-transparent hover:bg-slate-100"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={friendProfile.avatar_url || 'https://via.placeholder.com/80?text=Avatar'}
                                alt={name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-100"
                              />
                              <span className="text-xs font-bold text-primary truncate max-w-[200px]">
                                {name}
                              </span>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                              isSelected ? "bg-highlight border-highlight text-white" : "border-slate-300 bg-white"
                            )}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs text-slate-400 py-4">Você ainda não tem amigos para convidar.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PERMISSÕES E CONFIRMAÇÃO */}
            {step === 3 && (
              <div className="space-y-4 py-1 animate-fade-in">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-3">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide block">Resumo do Encontro</span>
                  <div className="space-y-1 text-xs font-medium text-slate-650">
                    <p>📌 <strong className="text-slate-800">Título:</strong> {title}</p>
                    <p>📅 <strong className="text-slate-800">Data:</strong> {isDateVoting ? "Em Votação" : new Date(dateTime).toLocaleString('pt-BR')}</p>
                    <p>🍔 <strong className="text-slate-800">Restaurantes indicados:</strong> {selectedRestaurantIds.length} selecionados</p>
                    <p>👥 <strong className="text-slate-800">Convites enviados:</strong> {selectedFriendIds.length} amigos</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Permissões dos Membros</span>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-slate-800">Convidar amigos</span>
                      <span className="text-[10px] text-slate-400">Participantes podem convidar mais pessoas.</span>
                    </div>
                    <Switch
                      checked={allowMemberInvites}
                      onCheckedChange={setAllowMemberInvites}
                      className="data-[state=checked]:bg-highlight"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-slate-800">Sugerir lugares</span>
                      <span className="text-[10px] text-slate-400">Participantes podem sugerir restaurantes.</span>
                    </div>
                    <Switch
                      checked={allowSuggestRestaurants}
                      onCheckedChange={setAllowSuggestRestaurants}
                      className="data-[state=checked]:bg-highlight"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-extrabold text-slate-800">Sugerir datas</span>
                      <span className="text-[10px] text-slate-400">Participantes podem sugerir novas datas.</span>
                    </div>
                    <Switch
                      checked={allowSuggestDates}
                      onCheckedChange={setAllowSuggestDates}
                      className="data-[state=checked]:bg-highlight"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BUTTONS PANEL */}
            <DialogFooter className="flex gap-2 pt-2">
              {step === 1 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-2xl h-11 text-xs font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGoToStep2}
                    className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none"
                  >
                    Avançar
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-2xl h-11 text-xs font-bold"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none"
                  >
                    Avançar
                  </Button>
                </>
              )}

              {step === 3 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-2xl h-11 text-xs font-bold"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none border-none"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Encontro'}
                  </Button>
                </>
              )}
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* SUCCESS SHARE MODAL DIALOG */}
      <Dialog open={isShareModalOpen} onOpenChange={(open) => {
        if (!open && createdEventData) {
          setIsShareModalOpen(false);
          navigate(`/happy-hour/${createdEventData.id}`);
        }
      }}>
        <DialogContent className="max-w-md w-[95%] p-6 rounded-3xl border border-white/20 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col items-center text-center font-['Poppins']">
          <DialogHeader className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-3xl">🎉</span>
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">
              Happy Hour Marcado!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed font-medium">
              Agora, compartilhe o convite no WhatsApp para que a galera possa entrar na sala, sugerir e votar na data e nos restaurantes!
            </DialogDescription>
          </DialogHeader>

          {createdEventData && (
            <div className="w-full mt-4 space-y-4">
              {/* Box de texto a ser compartilhado */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 pr-12 text-[11px] text-left text-slate-600 font-medium leading-relaxed relative">
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Texto do Convite:</span>
                <p className="italic">
                  "Galera, criei o grupo do nosso Happy Hour "{createdEventData.title}" no FilterFood! Entrem na sala para votar na data e no local: filterfood.com.br/download?room={createdEventData.id}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const message = `Galera, criei o grupo do nosso Happy Hour "${createdEventData.title}" no FilterFood! Entrem na sala para votar na data e no local: filterfood.com.br/download?room=${createdEventData.id}`;
                    handleCopyInviteText(message);
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-highlight transition-colors bg-transparent border-none cursor-pointer p-1"
                  title="Copiar texto do convite"
                >
                  {copied ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-600">
                      <Check className="w-3.5 h-3.5" />
                      Copiado!
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <Button
                type="button"
                onClick={() => {
                  const message = `Galera, criei o grupo do nosso Happy Hour "${createdEventData.title}" no FilterFood! Entrem na sala para votar na data e no local: filterfood.com.br/download?room=${createdEventData.id}`;
                  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                  
                  // Após abrir o WhatsApp, navega para a sala
                  setIsShareModalOpen(false);
                  navigate(`/happy-hour/${createdEventData.id}`);
                }}
                className="w-full h-12 bg-[#25D366] hover:bg-[#20ba56] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all border-none"
              >
                Compartilhar no WhatsApp
              </Button>

              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  navigate(`/happy-hour/${createdEventData.id}`);
                }}
                className="w-full py-1 text-xs font-bold text-slate-400 hover:text-slate-650 transition-colors bg-transparent border-none cursor-pointer"
              >
                Ir para a Sala Sem Compartilhar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
