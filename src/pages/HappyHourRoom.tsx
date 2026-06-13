import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  MessageSquare, 
  Vote, 
  Send, 
  Plus, 
  Loader2, 
  MapPin, 
  Utensils,
  Trophy,
  Users,
  Search,
  Check,
  Settings,
  Crown
} from 'lucide-react';
import { 
  getHappyHourDetails, 
  sendChatMessage, 
  addRestaurantToPoll, 
  voteForRestaurant,
  updateHappyHourSettings,
  addParticipantsToHappyHour,
  HappyHourDetails,
  PollRestaurant
} from '@/services/happyHourService';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Profile } from '@/types/supabase';
import { getFriendships } from '@/services/friendsService';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const renderUserAvatar = (p: { id: string; first_name?: string | null; avatar_url?: string | null }, sizeClass = "w-8 h-8 text-xs") => {
  const initial = p.first_name ? p.first_name.charAt(0).toUpperCase() : '?';
  const colors = [
    'bg-purple-500 text-white',
    'bg-blue-500 text-white',
    'bg-emerald-500 text-white',
    'bg-orange-500 text-white',
    'bg-pink-500 text-white',
    'bg-indigo-500 text-white',
    'bg-teal-500 text-white',
    'bg-[#EF2A39] text-white',
  ];
  let colorIndex = 0;
  if (p.id) {
    let hash = 0;
    for (let i = 0; i < p.id.length; i++) {
      hash = p.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    colorIndex = Math.abs(hash) % colors.length;
  }
  const colorClass = colors[colorIndex];

  return (
    <div className={cn("rounded-full border-2 border-white flex items-center justify-center font-bold shadow-none overflow-hidden shrink-0", sizeClass, colorClass)}>
      {p.avatar_url && !p.avatar_url.includes('placeholder') && !p.avatar_url.includes('via.placeholder') ? (
        <img 
          src={p.avatar_url} 
          alt={p.first_name || 'Usuário'} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : null}
      {!p.avatar_url || p.avatar_url.includes('placeholder') || p.avatar_url.includes('via.placeholder') ? (
        <span>{initial}</span>
      ) : null}
    </div>
  );
};

export default function HappyHourRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthData();
  const currentUserId = user?.id || '';

  const [details, setDetails] = useState<HappyHourDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'poll'>('chat');
  
  // Chat States
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Poll Dialog States
  const [isPollDialogOpen, setIsPollDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingRestId, setAddingRestId] = useState<string | null>(null);

  // Room Settings States
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [roomDescription, setRoomDescription] = useState('');
  const [allowInvites, setAllowInvites] = useState(true);
  const [allowSuggestions, setAllowSuggestions] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Invite Dialog States
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [friends, setFriends] = useState<{ friendshipId: string; friendProfile: Profile }[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [inviting, setInviting] = useState(false);

  const loadRoomDetails = async (showSpinner = false) => {
    if (!id || !currentUserId) return;
    if (showSpinner) setLoading(true);
    try {
      const data = await getHappyHourDetails(id, currentUserId);
      if (data) {
        setDetails(data);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar dados da sala.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Carrega inicialmente
  useEffect(() => {
    loadRoomDetails(true);
  }, [id, currentUserId]);

  // Polling automático a cada 3 segundos para dar efeito de "tempo real" (chat e votos)
  useEffect(() => {
    if (!id || !currentUserId) return;
    const interval = setInterval(() => {
      loadRoomDetails(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [id, currentUserId]);

  // Rola o chat para o fim quando novas mensagens chegam
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [details?.messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !currentUserId) return;
    
    setSendingMsg(true);
    try {
      const { error } = await sendChatMessage(id, currentUserId, newMessage.trim());
      if (error) {
        showError(error);
      } else {
        setNewMessage('');
        loadRoomDetails(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSearchRestaurants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);

    if (currentUserId.startsWith('mock-')) {
      // Resultados mockados baseados no termo de pesquisa
      const term = searchQuery.toLowerCase().trim();
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
          visit_status: 'Visitado',
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
          visit_status: 'Visitado',
          visit_notes: null
        }
      ];
      setSearchResults(mockList.filter(r => r.name.toLowerCase().includes(term)));
      setSearching(false);
      return;
    }

    // Busca Supabase real
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
      showError('Erro ao buscar restaurantes.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddRestaurant = async (restaurantId: string) => {
    if (!id || !currentUserId) return;
    setAddingRestId(restaurantId);
    try {
      const { error } = await addRestaurantToPoll(id, restaurantId, currentUserId);
      if (error) {
        showError(error);
      } else {
        showSuccess('Restaurante adicionado à votação!');
        loadRoomDetails(false);
        setIsPollDialogOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingRestId(null);
    }
  };

  const handleVote = async (restaurantId: string) => {
    if (!id || !currentUserId) return;
    try {
      const { error } = await voteForRestaurant(id, restaurantId, currentUserId);
      if (error) {
        showError(error);
      } else {
        loadRoomDetails(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenInviteDialog = async () => {
    setIsInviteDialogOpen(true);
    setLoadingFriends(true);
    setSelectedFriendIds([]);
    try {
      const { friends: friendsList } = await getFriendships(currentUserId);
      setFriends(friendsList);
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar lista de amigos.');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleInviteFriends = async () => {
    if (selectedFriendIds.length === 0 || !id || !currentUserId) return;
    setInviting(true);
    try {
      const { error } = await addParticipantsToHappyHour(id, selectedFriendIds, currentUserId);
      if (error) {
        showError(error);
      } else {
        showSuccess('Amigos convidados com sucesso!');
        setIsInviteDialogOpen(false);
        loadRoomDetails(false);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao enviar convites.');
    } finally {
      setInviting(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentUserId) return;
    setSavingSettings(true);
    try {
      const { error } = await updateHappyHourSettings(
        id,
        currentUserId,
        roomDescription,
        allowInvites,
        allowSuggestions
      );
      if (error) {
        showError(error);
      } else {
        showSuccess('Configurações atualizadas com sucesso!');
        setIsSettingsDialogOpen(false);
        loadRoomDetails(false);
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const getWinnerRestaurant = () => {
    if (!details?.pollRestaurants || details.pollRestaurants.length === 0) return null;
    // Encontra o restaurante com maior número de votos
    let winner = details.pollRestaurants[0];
    let maxVotes = winner.votesCount;
    let hasTie = false;

    for (let i = 1; i < details.pollRestaurants.length; i++) {
      const r = details.pollRestaurants[i];
      if (r.votesCount > maxVotes) {
        winner = r;
        maxVotes = r.votesCount;
        hasTie = false;
      } else if (r.votesCount === maxVotes && maxVotes > 0) {
        hasTie = true;
      }
    }

    if (maxVotes === 0) return null;
    return { winner, hasTie };
  };

  const winnerData = getWinnerRestaurant();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6 text-center bg-background-light min-h-screen">
        <h2 className="text-xl font-bold mb-4">Sala não encontrada</h2>
        <Button onClick={() => navigate('/happy-hours')}>Voltar</Button>
      </div>
    );
  }

  // Parse description JSON if applicable
  let descriptionText = '';
  let allowMemberInvites = true;
  let allowMemberSuggestions = true;
  if (details.happyHour.description) {
    try {
      const parsed = JSON.parse(details.happyHour.description);
      if (parsed && typeof parsed === 'object') {
        descriptionText = parsed.text || '';
        allowMemberInvites = parsed.allow_member_invites !== false;
        allowMemberSuggestions = parsed.allow_member_suggestions !== false;
      } else {
        descriptionText = details.happyHour.description;
      }
    } catch (e) {
      descriptionText = details.happyHour.description;
    }
  }

  const isCreator = currentUserId === details.happyHour.created_by;

  return (
    <div className="bg-background-light h-screen flex flex-col w-full overflow-hidden font-['Poppins']">
      
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 p-3 flex flex-col gap-2 shrink-0 shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/happy-hours')}
              className="text-slate-700 hover:bg-background-light dark:hover:bg-gray-700 h-9 w-9 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-800 leading-tight truncate max-w-[220px]" title={details.happyHour.title}>
                  {details.happyHour.title}
                </h1>
                {isCreator && (
                  <button
                    onClick={() => {
                      setRoomDescription(descriptionText);
                      setAllowInvites(allowMemberInvites);
                      setAllowSuggestions(allowMemberSuggestions);
                      setIsSettingsDialogOpen(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    title="Configurações do Grupo"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">
                {new Date(details.happyHour.date_time).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center -space-x-2">
            {details.participants.slice(0, 3).map((p) => {
              const isParticipantCreator = p.id === details.happyHour.created_by;
              return (
                <div key={p.id} className="relative">
                  {renderUserAvatar(p, "w-8 h-8 text-[11px]")}
                  {isParticipantCreator && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 border border-white z-20" title="Criador do Grupo">
                      <Crown className="w-2.5 h-2.5 fill-white text-white" />
                    </span>
                  )}
                </div>
              );
            })}
            {details.participants.length > 3 && (
              <span className="w-8 h-8 rounded-full bg-background-light border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-none z-10">
                +{details.participants.length - 3}
              </span>
            )}
            {(isCreator || allowMemberInvites) && (
              <button
                onClick={handleOpenInviteDialog}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 shadow-none transition-colors ml-2 z-10"
                title="Convidar amigos"
                style={{ marginLeft: '8px' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Buttons - Segmented Control style */}
        <div className="px-4 mb-2 mt-1">
          <div className="relative flex w-full p-1 bg-slate-100 rounded-full border-none">
            {/* Active slide pill background */}
            <motion.div
              layoutId="active-happyhour-tab-pill"
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm"
              style={{
                left: activeTab === 'chat' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
              initial={false}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />

            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "flex-grow flex items-center justify-center gap-1.5 h-10 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 relative z-10 focus:outline-none rounded-full",
                activeTab === 'chat' ? "text-[#EF2A39]" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Conversa
            </button>

            <button
              onClick={() => setActiveTab('poll')}
              className={cn(
                "flex-grow flex items-center justify-center gap-1.5 h-10 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 relative z-10 focus:outline-none rounded-full",
                activeTab === 'poll' ? "text-[#EF2A39]" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Vote className="w-4 h-4" />
              Votação ({details.pollRestaurants.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Area */}
      <div className="flex-1 overflow-y-auto w-full relative">
        
        {/* CHAT TAB PANEL */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col bg-background-light">
            {/* Scrollable message area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {details.messages.length > 0 ? (
                details.messages.map((m) => {
                  const isSelf = m.user_id === currentUserId;
                  const senderName = m.senderProfile?.first_name || 'Amigo';
                  const avatar = m.senderProfile?.avatar_url || 'https://via.placeholder.com/80?text=Avatar';
                  
                  return (
                    <div 
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 max-w-[75%]",
                        isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {!isSelf && renderUserAvatar({ id: m.user_id, first_name: senderName, avatar_url: m.senderProfile?.avatar_url || null }, "w-7 h-7 text-[10px] border border-slate-100 mt-[16px]")}
                      <div>
                        {!isSelf && (
                          <span className="text-[10px] font-extrabold text-slate-400 pl-1 mb-0.5 block uppercase tracking-wider">
                            {senderName}
                          </span>
                        )}
                        <div 
                          className={cn(
                            "p-3 rounded-2xl text-sm shadow-sm font-medium leading-relaxed min-w-[80px]",
                            isSelf 
                              ? "bg-gradient-to-r from-highlight to-[#FF5A66] text-white rounded-br-none" 
                              : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                          )}
                        >
                          {m.message}
                          <span className={cn(
                            "text-[9px] block text-right mt-1 font-semibold",
                            isSelf ? "text-white/70" : "text-slate-400"
                          )}>
                            {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <MessageSquare className="w-10 h-10 text-slate-200" />
                  Envie uma mensagem para iniciar o papo do Happy Hour!
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat message input form - Floating Card style */}
            <div className="p-3 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent border-none shrink-0 z-35">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 pl-3.5 rounded-[24px] shadow-[0_12px_30px_rgba(0,0,0,0.08)] border border-slate-100/80 max-w-md mx-auto w-full group focus-within:border-[#EF2A39]/30 transition-all duration-300">
                <Input
                  type="text"
                  placeholder="Escreva uma mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-grow border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-sm text-[#3C2F2F] placeholder-slate-400 font-medium h-11"
                />
                <Button
                  type="submit"
                  disabled={sendingMsg || !newMessage.trim()}
                  className="h-11 w-11 rounded-full shrink-0 bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white active:scale-95 transition-all flex items-center justify-center shadow-[0_4px_12px_rgba(239,42,57,0.25)] border-none"
                >
                  {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4.5 h-4.5 text-white" />}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* POLL TAB PANEL */}
        {activeTab === 'poll' && (
          <div className="p-4 space-y-4 pb-20">
            
            {/* Highlight do Vencedor Atual (Trophy Card) */}
            {winnerData && (
              <div className="bg-gradient-to-br from-[#EF2A39] via-[#EF2A39] to-[#FF7E40] p-5 rounded-[24px] text-white shadow-[0_12px_28px_rgba(239,42,57,0.25)] border border-white/10 relative overflow-hidden flex items-center gap-4">
                {/* Background decorative circles */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
                
                <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md relative z-10 shrink-0">
                  <Trophy className="w-7 h-7 text-yellow-300 fill-yellow-300 drop-shadow-[0_2px_5px_rgba(234,179,8,0.4)] animate-pulse" />
                </div>
                <div className="flex-grow min-w-0 relative z-10">
                  <p className="text-[9px] uppercase font-black tracking-widest text-white/80">Lugar Favorito no Momento</p>
                  <h4 className="text-lg font-black truncate leading-snug mt-0.5">
                    {winnerData.winner.name}
                  </h4>
                  <p className="text-[10px] text-white/95 font-bold mt-1">
                    {winnerData.hasTie ? 'Empatado' : `${winnerData.winner.votesCount} ${winnerData.winner.votesCount === 1 ? 'voto' : 'votos'}`}
                  </p>
                </div>
              </div>
            )}

            {/* Header com botão de Adicionar */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800">Opções Indicadas</h3>
              {(isCreator || allowMemberSuggestions) ? (
                <Button
                  onClick={() => setIsPollDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs font-bold border-slate-200 text-slate-700 hover:bg-[#EF2A39]/10 hover:text-[#EF2A39] hover:border-[#EF2A39]/20 gap-1.5 shadow-none transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Sugerir Lugar
                </Button>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold italic">
                  Sugestões fechadas pelo criador
                </span>
              )}
            </div>

            {/* Lista de Restaurantes Indicados */}
            <div className="space-y-3">
              {details.pollRestaurants.length > 0 ? (
                details.pollRestaurants.map((pr) => {
                  const hasUserVoted = details.userVote === pr.restaurant_id;
                  return (
                    <Card 
                      key={pr.restaurant_id} 
                      className={cn(
                        "border bg-white rounded-[24px] overflow-hidden transition-all duration-300",
                        hasUserVoted 
                          ? "border-[#EF2A39] shadow-soft ring-1 ring-[#EF2A39]/10" 
                          : "border-slate-100/80 hover:border-slate-200 hover:shadow-soft"
                      )}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <img
                            src={pr.image_url || 'https://via.placeholder.com/150?text=Restaurante'}
                            alt={pr.name}
                            className="w-[72px] h-[72px] rounded-2xl object-cover border border-slate-100 shrink-0"
                          />
                          <div className="min-w-0 flex-grow">
                            <h4 className="text-sm font-black text-slate-800 truncate leading-tight">
                              {pr.name}
                            </h4>
                            <p className="text-[10px] text-[#EF2A39] font-extrabold flex items-center gap-1 mt-1">
                              <Utensils className="w-3 h-3 text-[#EF2A39]" />
                              {pr.category || 'Alimentação'}
                            </p>
                            {pr.address && (
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5 font-medium">
                                <MapPin className="w-3 h-3 text-slate-350" />
                                {pr.address}
                              </p>
                            )}

                            {/* Votantes */}
                            {pr.voters.length > 0 && (
                              <div className="flex items-center gap-1 mt-2">
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {pr.voters.slice(0, 4).map((v) => (
                                    <div key={v.user_id} className="relative z-10 hover:z-25 transition-all">
                                      {renderUserAvatar({ id: v.user_id, first_name: v.first_name, avatar_url: v.avatar_url || null }, "w-5 h-5 text-[8px] border border-white shadow-xs")}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[9px] text-slate-450 font-bold ml-1">
                                  {pr.voters.length === 1 ? 'votou' : 'votaram'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botão de Voto */}
                        <Button
                          onClick={() => handleVote(pr.restaurant_id)}
                          className={cn(
                            "h-12 rounded-[18px] px-4.5 flex flex-col items-center justify-center shrink-0 min-w-[72px] transition-all duration-200 active:scale-95 border",
                            hasUserVoted 
                              ? "bg-[#EF2A39] border-[#EF2A39] text-white shadow-[0_4px_12px_rgba(239,42,57,0.3)] hover:bg-[#EF2A39]/95" 
                              : "bg-white text-slate-705 border-slate-202 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"
                          )}
                        >
                          <span className="text-base font-black leading-none">{pr.votesCount}</span>
                          <span className="text-[8px] uppercase tracking-widest font-black mt-1.5 flex items-center gap-0.5">
                            {hasUserVoted && <Check className="w-2.5 h-2.5 shrink-0 stroke-[3px]" />}
                            Votos
                          </span>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Vote className="w-10 h-10 text-slate-200" />
                  Nenhum restaurante sugerido para votação ainda.
                  {(isCreator || allowMemberSuggestions) ? (
                    <Button
                      onClick={() => setIsPollDialogOpen(true)}
                      variant="link"
                      className="text-highlight text-xs font-bold p-0 mt-1"
                    >
                      Sugerir o Primeiro Lugar
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold italic mt-1">
                      Apenas o criador pode sugerir lugares.
                    </span>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* SUGGEST RESTAURANT DIALOG MODAL */}
      <Dialog open={isPollDialogOpen} onOpenChange={setIsPollDialogOpen}>
        <DialogContent className="max-w-md w-[95%] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-primary flex items-center gap-2">
              <Utensils className="w-5 h-5 text-highlight" />
              Sugerir Lugar para Votar
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSearchRestaurants} className="space-y-4 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input
                  type="text"
                  placeholder="Nome do restaurante..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 h-11 text-sm rounded-2xl border border-slate-200 bg-white"
                />
              </div>
              <Button 
                type="submit" 
                disabled={searching || !searchQuery.trim()}
                className="bg-primary hover:bg-primary/95 text-white h-11 px-5 rounded-2xl text-xs font-bold shrink-0"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pesquisar'}
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto p-1">
              {searching ? (
                <div className="flex justify-center items-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((r) => {
                  const alreadyAdded = details.pollRestaurants.some(pr => pr.restaurant_id === r.id);
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl p-2 flex items-center justify-between border border-slate-100 shadow-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={r.image_url || 'https://via.placeholder.com/80?text=Restaurante'}
                          alt={r.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-primary truncate max-w-[180px]">{r.name}</h4>
                          <p className="text-[9px] text-slate-400">{r.category || 'Alimentação'}</p>
                        </div>
                      </div>

                      {alreadyAdded ? (
                        <div className="text-[10px] font-bold text-slate-400 bg-background-light border border-slate-100 rounded-lg px-2 py-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Adicionado
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleAddRestaurant(r.id)}
                          disabled={addingRestId === r.id}
                          className="bg-highlight hover:bg-highlight/90 text-white rounded-lg text-[10px] h-8 px-2.5 font-bold"
                        >
                          {addingRestId === r.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Adicionar'
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })
              ) : searchQuery ? (
                <p className="text-center text-xs text-slate-400 py-6">Nenhum restaurante encontrado.</p>
              ) : (
                <p className="text-center text-xs text-slate-400 py-6">Pesquise por nome para sugerir e iniciar a votação.</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPollDialogOpen(false)}
                className="w-full rounded-2xl h-11 text-xs font-bold"
              >
                Voltar à Sala
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONVIDAR AMIGOS */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md w-[95%] p-5 rounded-2xl font-['Poppins']">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-highlight" />
              Convidar Amigos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500">
                Selecione os amigos que deseja convidar ({selectedFriendIds.length} selecionados)
              </label>
              <div className="border border-slate-100 rounded-2xl bg-background-light p-2 max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
                {loadingFriends ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (() => {
                  const existingParticipantIds = details.participants.map(p => p.id);
                  const inviteableFriends = friends.filter(f => !existingParticipantIds.includes(f.friendProfile.id));

                  if (inviteableFriends.length === 0) {
                    return (
                      <p className="text-center text-xs text-slate-400 py-6">
                        Todos os seus amigos já estão participando deste Happy Hour!
                      </p>
                    );
                  }

                  return inviteableFriends.map(({ friendshipId, friendProfile }) => {
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
                  });
                })()}
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsInviteDialogOpen(false)}
                className="flex-1 rounded-2xl h-11 text-xs font-bold"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleInviteFriends}
                disabled={inviting || selectedFriendIds.length === 0}
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convidar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIGURAÇÕES (APENAS CRIADOR) */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-md w-[95%] p-5 rounded-2xl font-['Poppins']">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-primary flex items-center gap-2">
              <Settings className="w-5 h-5 text-highlight" />
              Configurações do Grupo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Descrição do Encontro</label>
              <Textarea
                placeholder="Detalhes ou recados sobre o encontro..."
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                className="rounded-2xl border border-slate-200 min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5 pr-2">
                  <span className="text-xs font-extrabold text-slate-800">Membros convidam amigos</span>
                  <span className="text-[10px] text-slate-400">Outros membros podem adicionar mais pessoas ao grupo.</span>
                </div>
                <Switch
                  checked={allowInvites}
                  onCheckedChange={setAllowInvites}
                  className="data-[state=checked]:bg-highlight"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5 pr-2">
                  <span className="text-xs font-extrabold text-slate-800">Membros sugerem lugares</span>
                  <span className="text-[10px] text-slate-400">Outros membros podem sugerir novos restaurantes para votação.</span>
                </div>
                <Switch
                  checked={allowSuggestions}
                  onCheckedChange={setAllowSuggestions}
                  className="data-[state=checked]:bg-highlight"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSettingsDialogOpen(false)}
                className="flex-1 rounded-2xl h-11 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingSettings}
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
