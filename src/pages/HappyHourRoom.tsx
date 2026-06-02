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
  Check
} from 'lucide-react';
import { 
  getHappyHourDetails, 
  sendChatMessage, 
  addRestaurantToPoll, 
  voteForRestaurant,
  HappyHourDetails,
  PollRestaurant
} from '@/services/happyHourService';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-6 text-center bg-[#f5f7f8] min-h-screen">
        <h2 className="text-xl font-bold mb-4">Sala não encontrada</h2>
        <Button onClick={() => navigate('/happy-hours')}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f7f8] h-screen flex flex-col w-full overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-soft-sm p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/happy-hours')}
              className="text-primary hover:bg-primary/5 shrink-0 h-9 w-9 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Button>
            <div>
              <h1 className="text-base font-extrabold text-[#022D68] leading-tight truncate max-w-[220px]">
                {details.happyHour.title}
              </h1>
              <p className="text-[10px] text-slate-400">
                {new Date(details.happyHour.date_time).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center -space-x-2">
            {details.participants.slice(0, 3).map((p) => (
              <img
                key={p.id}
                src={p.avatar_url || 'https://via.placeholder.com/80?text=Avatar'}
                alt={p.first_name || 'Participante'}
                className="w-8 h-8 rounded-full border-2 border-white object-cover"
                title={p.first_name || 'Participante'}
              />
            ))}
            {details.participants.length > 3 && (
              <span className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                +{details.participants.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex w-full p-0.5 bg-slate-100 rounded-xl shadow-inner mt-1">
          <Button
            onClick={() => setActiveTab('chat')}
            variant="ghost"
            className={cn(
              "flex-1 h-9 text-xs font-bold rounded-lg transition-all gap-1.5",
              activeTab === 'chat' 
                ? "bg-white text-[#022D68] shadow-sm" 
                : "text-slate-500 hover:text-[#022D68]"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Conversa
          </Button>
          <Button
            onClick={() => setActiveTab('poll')}
            variant="ghost"
            className={cn(
              "flex-1 h-9 text-xs font-bold rounded-lg transition-all gap-1.5",
              activeTab === 'poll' 
                ? "bg-white text-[#022D68] shadow-sm" 
                : "text-slate-500 hover:text-[#022D68]"
            )}
          >
            <Vote className="w-4 h-4" />
            Votação ({details.pollRestaurants.length})
          </Button>
        </div>
      </header>

      {/* Main Tab Area */}
      <div className="flex-1 overflow-y-auto w-full relative">
        
        {/* CHAT TAB PANEL */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col bg-slate-50">
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
                        "flex items-end gap-2 max-w-[85%]",
                        isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {!isSelf && (
                        <img 
                          src={avatar} 
                          alt={senderName} 
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" 
                        />
                      )}
                      <div>
                        {!isSelf && (
                          <span className="text-xs font-bold text-slate-400 pl-1 mb-0.5 block">
                            {senderName}
                          </span>
                        )}
                        <div 
                          className={cn(
                            "p-3 rounded-2xl text-base shadow-soft-sm font-medium",
                            isSelf 
                              ? "bg-primary text-white rounded-br-none" 
                              : "bg-white text-primary rounded-bl-none border border-slate-100"
                          )}
                        >
                          {m.message}
                          <span className={cn(
                            "text-[10px] block text-right mt-1 font-normal",
                            isSelf ? "text-white/60" : "text-slate-400"
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

            {/* Chat message input form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
              <Input
                type="text"
                placeholder="Escreva uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow h-11 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-base"
              />
              <Button
                type="submit"
                disabled={sendingMsg || !newMessage.trim()}
                className="bg-highlight hover:bg-highlight/90 text-white rounded-xl h-11 w-11 p-0 shrink-0 shadow-highlight-glow"
              >
                {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        )}

        {/* POLL TAB PANEL */}
        {activeTab === 'poll' && (
          <div className="p-4 space-y-4 pb-20">
            
            {/* Highlight do Vencedor Atual */}
            {winnerData && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-2xl text-white shadow-soft-lg flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
                  <Trophy className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-white/80">Lugar Favorito no Momento</p>
                  <h4 className="text-sm font-extrabold truncate">
                    {winnerData.winner.name}
                  </h4>
                  <p className="text-[10px] text-white/90">
                    {winnerData.hasTie ? 'Empatado' : `${winnerData.winner.votesCount} ${winnerData.winner.votesCount === 1 ? 'voto' : 'votos'}`}
                  </p>
                </div>
              </div>
            )}

            {/* Header com botão de Adicionar */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#022D68]">Opções Indicadas</h3>
              <Button
                onClick={() => setIsPollDialogOpen(true)}
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-xs font-bold border-highlight text-highlight hover:bg-highlight/5 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Sugerir Lugar
              </Button>
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
                        "border-none shadow-soft-sm bg-white rounded-2xl overflow-hidden transition-all",
                        hasUserVoted && "ring-2 ring-highlight"
                      )}
                    >
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={pr.image_url || 'https://via.placeholder.com/150?text=Restaurante'}
                            alt={pr.name}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-extrabold text-primary truncate leading-tight">
                              {pr.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Utensils className="w-3 h-3 text-slate-400" />
                              {pr.category || 'Alimentação'}
                            </p>
                            {pr.address && (
                              <p className="text-[9px] text-slate-400 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-300" />
                                {pr.address}
                              </p>
                            )}

                            {/* Votantes */}
                            {pr.voters.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <div className="flex -space-x-1">
                                  {pr.voters.slice(0, 3).map((v) => (
                                    <span 
                                      key={v.user_id} 
                                      className="w-4 h-4 rounded-full bg-primary/10 border border-white text-[7px] font-bold flex items-center justify-center text-primary uppercase"
                                      title={v.first_name}
                                    >
                                      {v.first_name.slice(0, 1)}
                                    </span>
                                  ))}
                                </div>
                                <span className="text-[8px] text-slate-400 font-semibold">
                                  {pr.voters.length === 1 ? 'Votou' : 'Votaram'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botão de Voto */}
                        <Button
                          onClick={() => handleVote(pr.restaurant_id)}
                          variant={hasUserVoted ? "highlight" : "outline"}
                          className={cn(
                            "h-10 rounded-xl px-4 flex flex-col items-center justify-center shrink-0 min-w-[64px] border-slate-200 transition-all active:scale-95",
                            hasUserVoted 
                              ? "bg-highlight text-white border-none shadow-highlight-glow" 
                              : "bg-white text-primary hover:bg-slate-50"
                          )}
                        >
                          <span className="text-sm font-extrabold leading-none">{pr.votesCount}</span>
                          <span className="text-[8px] uppercase tracking-wider font-extrabold mt-0.5">Votos</span>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Vote className="w-10 h-10 text-slate-200" />
                  Nenhum restaurante sugerido para votação ainda.
                  <Button
                    onClick={() => setIsPollDialogOpen(true)}
                    variant="link"
                    className="text-highlight text-xs font-bold p-0 mt-1"
                  >
                    Sugerir o Primeiro Lugar
                  </Button>
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
                  className="w-full pl-9 pr-3 h-11 text-sm rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <Button 
                type="submit" 
                disabled={searching || !searchQuery.trim()}
                className="bg-[#022D68] hover:bg-[#022D68]/95 text-white h-11 px-5 rounded-xl text-xs font-bold shrink-0"
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
                      className="bg-white rounded-xl p-2 flex items-center justify-between border border-slate-100 shadow-soft-sm"
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
                        <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 flex items-center gap-1">
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
                className="w-full rounded-xl h-11 text-xs font-bold"
              >
                Voltar à Sala
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
