import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  UserCheck, 
  UserMinus, 
  Search, 
  Loader2, 
  Inbox,
  AlertCircle
} from 'lucide-react';
import { 
  getFriendships, 
  searchUsers, 
  sendFriendRequest, 
  acceptFriendRequest, 
  removeFriendship 
} from '@/services/friendsService';
import { Profile } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';

export default function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user } = useAuthData();
  const currentUserId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'search'>(
    (tabParam === 'search' || tabParam === 'pending' || tabParam === 'friends') ? tabParam : 'friends'
  );
  const [friends, setFriends] = useState<{ friendshipId: string; friendProfile: Profile }[]>([]);
  const [pending, setPending] = useState<{ friendshipId: string; senderProfile: Profile }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Carrega lista de amigos e pendentes
  const loadData = async () => {
    if (!currentUserId) return;
    setLoadingList(true);
    try {
      const { friends: friendsList, pendingRequests } = await getFriendships(currentUserId);
      setFriends(friendsList);
      setPending(pendingRequests);
    } catch (e) {
      console.error(e);
      showError('Falha ao carregar amigos.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  // Pesquisa de usuários
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !currentUserId) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery, currentUserId);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
      showError('Falha ao buscar usuários.');
    } finally {
      setSearching(false);
    }
  };

  // Enviar convite de amizade
  const handleSendRequest = async (targetId: string) => {
    if (!currentUserId) return;
    setActionLoadingId(targetId);
    try {
      const { error } = await sendFriendRequest(currentUserId, targetId);
      if (error) {
        showError(error);
      } else {
        showSuccess('Solicitação de amizade enviada com sucesso!');
        loadData();
      }
    } catch (e) {
      console.error(e);
      showError('Falha ao enviar solicitação.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Aceitar convite
  const handleAcceptRequest = async (friendshipId: string) => {
    if (!currentUserId) return;
    setActionLoadingId(friendshipId);
    try {
      const { error } = await acceptFriendRequest(friendshipId, currentUserId);
      if (error) {
        showError(error);
      } else {
        showSuccess('Amizade aceita com sucesso!');
        loadData();
      }
    } catch (e) {
      console.error(e);
      showError('Falha ao aceitar solicitação.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Remover amizade ou recusar convite
  const handleRemoveFriendship = async (friendshipId: string, successMsg: string) => {
    if (!currentUserId) return;
    setActionLoadingId(friendshipId);
    try {
      const { error } = await removeFriendship(friendshipId, currentUserId);
      if (error) {
        showError(error);
      } else {
        showSuccess(successMsg);
        loadData();
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao realizar ação.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getProfileName = (p: Profile) => {
    return `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Usuário';
  };

  // Verifica status de um perfil na pesquisa para mostrar o botão adequado
  const checkFriendshipStatus = (profileId: string) => {
    const isFriend = friends.some(f => f.friendProfile.id === profileId);
    if (isFriend) return 'friend';
    
    const isPendingSent = pending.some(p => p.senderProfile.id === profileId);
    if (isPendingSent) return 'pending_received';

    // Para simplificar no mock, checa se a solicitação pendente foi enviada
    // Se o profileId está na lista friendships do mock local como pendente com action_user_id === currentUserId
    const key = `mock-friendships-${currentUserId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const mockList = JSON.parse(stored);
        const hasSent = mockList.some((f: any) => 
          f.status === 'pending' && f.action_user_id === currentUserId &&
          ((f.user_id_1 === currentUserId && f.user_id_2 === profileId) ||
           (f.user_id_1 === profileId && f.user_id_2 === currentUserId))
        );
        if (hasSent) return 'pending_sent';
      } catch(e){}
    }
    
    return 'none';
  };

  return (
    <div className="bg-background-light min-h-screen flex flex-col w-full pb-6">
      <Header 
        title="Meus Amigos"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      {/* Tabs Selector */}
      <div className="p-4">
        <div className="relative flex w-full border-b border-slate-200/60 mb-5 bg-transparent px-2">
          {/* Active line indicator sliding */}
          <motion.div
            layoutId="active-friends-tab-line"
            className="absolute bottom-0 h-[2.5px] bg-[#EF2A39] rounded-full"
            style={{
              left: activeTab === 'friends' ? '9.16%' : activeTab === 'pending' ? '42.5%' : '75.83%',
              width: '15%',
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />

          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              "flex-grow flex items-center justify-center h-11 text-xs font-bold uppercase tracking-wider transition-colors duration-200 relative z-10 focus:outline-none",
              activeTab === 'friends'
                ? "text-slate-800 font-black"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            Amigos ({friends.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-grow flex items-center justify-center h-11 text-xs font-bold uppercase tracking-wider transition-colors duration-200 relative z-10 focus:outline-none gap-1.5",
              activeTab === 'pending'
                ? "text-slate-800 font-black"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            Solicitações
            {pending.length > 0 && (
              <span className="bg-[#EF2A39] text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-grow flex items-center justify-center h-11 text-xs font-bold uppercase tracking-wider transition-colors duration-200 relative z-10 focus:outline-none",
              activeTab === 'search'
                ? "text-slate-800 font-black"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            Buscar
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* TAB 1: LIST OF FRIENDS */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {loadingList ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : friends.length > 0 ? (
                <AnimatePresence>
                  {friends.map(({ friendshipId, friendProfile }) => (
                    <motion.div
                      key={friendshipId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100/80 shadow-none hover:shadow-none transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={friendProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                          alt={getProfileName(friendProfile)}
                          className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{getProfileName(friendProfile)}</h4>
                          <p className="text-[10px] text-slate-400">Amigo desde {new Date(friendProfile.updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFriendship(friendshipId, 'Amizade desfeita.')}
                        disabled={actionLoadingId === friendshipId}
                        className="text-slate-400 hover:text-red-500 hover:bg-[#EF2A39]/10 rounded-full w-9 h-9 flex items-center justify-center transition-colors"
                      >
                        {actionLoadingId === friendshipId ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
                  <Users className="w-12 h-12 text-slate-300 mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-800 mb-2">Nenhum amigo adicionado</h4>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[250px] mb-4">
                    Você ainda não possui amigos na sua lista. Encontre-os pesquisando na aba de buscas.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('search')}
                    className="h-10 px-5 text-xs font-bold rounded-2xl bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white shadow-none border-none"
                  >
                    Buscar Pessoas
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INCOMING REQUESTS */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              {loadingList ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : pending.length > 0 ? (
                <AnimatePresence>
                  {pending.map(({ friendshipId, senderProfile }) => (
                    <motion.div
                      key={friendshipId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100/80 shadow-none hover:shadow-none transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={senderProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                          alt={getProfileName(senderProfile)}
                          className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{getProfileName(senderProfile)}</h4>
                          <p className="text-[10px] text-highlight font-semibold">Enviou um convite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => handleAcceptRequest(friendshipId)}
                          disabled={actionLoadingId === friendshipId}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-2xl text-xs h-8 px-3 font-bold shadow-none"
                        >
                          {actionLoadingId === friendshipId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Aceitar'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleRemoveFriendship(friendshipId, 'Convite recusado.')}
                          disabled={actionLoadingId === friendshipId}
                          className="text-slate-400 hover:text-red-500 hover:bg-[#EF2A39]/10 rounded-2xl text-xs h-8 px-3 font-bold transition-colors"
                        >
                          Recusar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
                  <Inbox className="w-12 h-12 text-slate-300 mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-800 mb-2">Nenhuma solicitação pendente</h4>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[250px]">
                    Sua caixa de entrada de convites está vazia por enquanto.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEARCH USERS */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <Input
                    type="text"
                    placeholder="Buscar amigo por nome ou telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 h-11 text-sm rounded-2xl border border-slate-200 bg-white focus:border-highlight text-primary transition-all"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={searching || !searchQuery.trim()}
                  className="bg-primary hover:bg-primary/95 text-white h-11 px-5 rounded-2xl text-xs font-bold shrink-0"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pesquisar'}
                </Button>
              </form>

              <div className="space-y-3">
                {searching ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((profile) => {
                    const status = checkFriendshipStatus(profile.id);
                    return (
                      <div
                        key={profile.id}
                        className="bg-white rounded-2xl p-3 flex items-center justify-between border border-slate-100/80 shadow-none hover:shadow-none transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={profile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                            alt={getProfileName(profile)}
                            className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{getProfileName(profile)}</h4>
                          </div>
                        </div>

                        {status === 'friend' && (
                          <div className="flex items-center gap-1 text-green-500 font-bold text-xs px-3">
                            <UserCheck className="w-4 h-4 mr-1" />
                            Amigo
                          </div>
                        )}

                        {status === 'pending_sent' && (
                          <Button
                            disabled
                            className="bg-background-light text-slate-400 border border-slate-100 rounded-2xl text-xs h-8 px-3 font-semibold shadow-none"
                          >
                            Pendente
                          </Button>
                        )}

                        {status === 'pending_received' && (
                          <Button
                            onClick={() => setActiveTab('pending')}
                            className="bg-primary hover:bg-primary/90 text-white rounded-2xl text-xs h-8 px-3 font-bold shadow-none"
                          >
                            Ver convite
                          </Button>
                        )}

                        {status === 'none' && (
                          <Button
                            onClick={() => handleSendRequest(profile.id)}
                            disabled={actionLoadingId === profile.id}
                            className="bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white rounded-2xl text-xs h-8 px-3 font-bold shadow-none flex items-center gap-1.5"
                          >
                            {actionLoadingId === profile.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                Convidar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
                    <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                    <h4 className="text-sm font-extrabold text-slate-800 mb-2">Ninguém encontrado</h4>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-[250px]">
                      Nenhum usuário encontrado para "{searchQuery}".
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
