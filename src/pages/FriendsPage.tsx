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
    <div className="bg-background-light min-h-screen flex flex-col w-full pb-6 font-['Poppins']">
      <Header 
        title="Meus Amigos"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      {/* Tabs Selector - Segmented Control style */}
      <div className="px-4 mb-6">
        <div className="relative flex w-full p-1 bg-slate-100 rounded-full border-none">
          {/* Active slide pill background */}
          <motion.div
            layoutId="active-friends-tab-pill"
            className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm"
            style={{
              left: activeTab === 'friends' ? '4px' : activeTab === 'pending' ? '33.33%' : '66.66%',
              width: 'calc(33.33% - 4px)',
            }}
            initial={false}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />

          <button
            onClick={() => setActiveTab('friends')}
            className={cn(
              "flex-1 flex items-center justify-center h-10 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 relative z-10 focus:outline-none rounded-full",
              activeTab === 'friends' ? "text-[#df4b1c]" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Amigos ({friends.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex-1 flex items-center justify-center h-10 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 relative z-10 focus:outline-none rounded-full gap-1",
              activeTab === 'pending' ? "text-[#df4b1c]" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Solicitações
            {pending.length > 0 && (
              <span className="bg-[#df4b1c] text-white text-[9px] font-black h-4.5 w-4.5 rounded-full flex items-center justify-center border border-white">
                {pending.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              "flex-1 flex items-center justify-center h-10 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 relative z-10 focus:outline-none rounded-full",
              activeTab === 'search' ? "text-[#df4b1c]" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="px-4">
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
                      whileHover={{ y: -1 }}
                      className="bg-white rounded-[20px] p-4 flex items-center justify-between border border-slate-100/80 shadow-soft hover:shadow-float transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={friendProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                            alt={getProfileName(friendProfile)}
                            className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none bg-slate-50"
                          />
                          {/* Active glowing green status dot */}
                          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-sm" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{getProfileName(friendProfile)}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Amigo desde {new Date(friendProfile.updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFriendship(friendshipId, 'Amizade desfeita.')}
                        disabled={actionLoadingId === friendshipId}
                        className="text-slate-450 hover:text-[#df4b1c] hover:bg-[#df4b1c]/10 rounded-full w-9 h-9 flex items-center justify-center transition-colors shrink-0"
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
                  <Users className="w-12 h-12 text-slate-350 mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-800 mb-2">Nenhum amigo adicionado</h4>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-[250px] mb-5">
                    Você ainda não possui amigos na sua lista. Encontre-os pesquisando na aba de buscas.
                  </p>
                  <Button 
                    onClick={() => setActiveTab('search')}
                    className="h-11 px-6 text-xs font-bold rounded-2xl bg-[#df4b1c] hover:bg-[#df4b1c]/90 text-white shadow-soft hover:shadow-float active:scale-[0.98] border-none"
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
                      whileHover={{ y: -1 }}
                      className="bg-white rounded-[20px] p-4 flex items-center justify-between border border-slate-100/80 shadow-soft hover:shadow-float transition-all duration-200"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={senderProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                          alt={getProfileName(senderProfile)}
                          className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none bg-slate-50"
                        />
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{getProfileName(senderProfile)}</h4>
                          <p className="text-[10px] text-[#df4b1c] font-bold mt-0.5 uppercase tracking-wide">Enviou um convite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => handleAcceptRequest(friendshipId)}
                          disabled={actionLoadingId === friendshipId}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-soft"
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
                          className="text-slate-450 hover:text-[#df4b1c] hover:bg-[#df4b1c]/10 rounded-xl text-xs h-9 px-3.5 font-bold transition-colors"
                        >
                          Recusar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center mt-12 bg-transparent">
                  <Inbox className="w-12 h-12 text-slate-350 mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-800 mb-2">Nenhuma solicitação pendente</h4>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-[250px]">
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
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar amigo por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3.5 h-12 text-sm rounded-[16px] border border-slate-200 bg-white focus:border-[#df4b1c]/30 focus:ring-0 focus-visible:ring-0 text-slate-800 font-medium transition-all"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#df4b1c] hover:bg-[#df4b1c]/90 text-white h-12 px-6 rounded-[16px] text-xs font-bold shrink-0 shadow-soft"
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
                        className="bg-white rounded-[20px] p-4 flex items-center justify-between border border-slate-100/80 shadow-soft hover:shadow-float transition-all duration-200"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={profile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                            alt={getProfileName(profile)}
                            className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-none bg-slate-50"
                          />
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-800">{getProfileName(profile)}</h4>
                          </div>
                        </div>

                        {status === 'friend' && (
                          <div className="flex items-center gap-1 text-green-500 font-bold text-xs px-3">
                            <UserCheck className="w-4 h-4 mr-1 text-green-500" />
                            Amigo
                          </div>
                        )}

                        {status === 'pending_sent' && (
                          <Button
                            disabled
                            className="bg-slate-50 text-slate-400 border border-slate-100 rounded-xl text-xs h-9 px-4 font-bold shadow-none"
                          >
                            Pendente
                          </Button>
                        )}

                        {status === 'pending_received' && (
                          <Button
                            onClick={() => setActiveTab('pending')}
                            className="bg-[#df4b1c] hover:bg-[#df4b1c]/90 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-soft"
                          >
                            Ver convite
                          </Button>
                        )}

                        {status === 'none' && (
                          <Button
                            onClick={() => handleSendRequest(profile.id)}
                            disabled={actionLoadingId === profile.id}
                            className="bg-gradient-to-r from-[#df4b1c] to-[#FF7E40] hover:opacity-95 text-white rounded-xl text-xs h-9 px-4 font-bold shadow-soft flex items-center gap-1.5 active:scale-95 transition-all border-none"
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
                    <AlertCircle className="w-10 h-10 text-slate-350 mb-3" />
                    <h4 className="text-sm font-extrabold text-slate-800 mb-2">Ninguém encontrado</h4>
                    <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-[250px]">
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
