import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function FriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuthData();
  const currentUserId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'search'>('friends');
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
    <div className="bg-[#f5f7f8] min-h-screen flex flex-col w-full pb-6">
      
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
            <Users className="w-5 h-5 text-highlight" />
            <h1 className="text-xl font-extrabold text-[#022D68]">Meus Amigos</h1>
          </div>
        </div>
      </header>

      {/* Tabs Selector */}
      <div className="p-4">
        <div className="flex w-full p-1 bg-white border border-gray-100 rounded-2xl shadow-soft-sm mb-4">
          <Button
            onClick={() => setActiveTab('friends')}
            variant="ghost"
            className={cn(
              "flex-1 h-10 text-xs font-bold rounded-xl transition-all",
              activeTab === 'friends' 
                ? "bg-highlight text-white shadow-highlight-glow" 
                : "text-slate-500 hover:text-primary hover:bg-slate-50"
            )}
          >
            Amigos ({friends.length})
          </Button>
          <Button
            onClick={() => setActiveTab('pending')}
            variant="ghost"
            className={cn(
              "flex-1 h-10 text-xs font-bold rounded-xl transition-all relative",
              activeTab === 'pending' 
                ? "bg-highlight text-white shadow-highlight-glow" 
                : "text-slate-500 hover:text-primary hover:bg-slate-50"
            )}
          >
            Solicitações
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border border-white">
                {pending.length}
              </span>
            )}
          </Button>
          <Button
            onClick={() => setActiveTab('search')}
            variant="ghost"
            className={cn(
              "flex-1 h-10 text-xs font-bold rounded-xl transition-all",
              activeTab === 'search' 
                ? "bg-highlight text-white shadow-highlight-glow" 
                : "text-slate-500 hover:text-primary hover:bg-slate-50"
            )}
          >
            Buscar Pessoas
          </Button>
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
                      className="bg-white rounded-2xl p-3 flex items-center justify-between border border-gray-100 shadow-soft-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={friendProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                          alt={getProfileName(friendProfile)}
                          className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-[#022D68]">{getProfileName(friendProfile)}</h4>
                          <p className="text-[10px] text-slate-400">Amigo desde {new Date(friendProfile.updated_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveFriendship(friendshipId, 'Amizade desfeita.')}
                        disabled={actionLoadingId === friendshipId}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl w-10 h-10"
                      >
                        {actionLoadingId === friendshipId ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-5 h-5" />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <Card className="border-none shadow-soft-md rounded-2xl p-8 text-center bg-white">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Você ainda não possui amigos adicionados.</p>
                  <Button 
                    onClick={() => setActiveTab('search')}
                    variant="highlight" 
                    className="mt-4 h-10 px-5 text-xs font-bold rounded-xl"
                  >
                    Adicionar Amigos
                  </Button>
                </Card>
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
                      className="bg-white rounded-2xl p-3 flex items-center justify-between border border-gray-100 shadow-soft-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={senderProfile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                          alt={getProfileName(senderProfile)}
                          className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-[#022D68]">{getProfileName(senderProfile)}</h4>
                          <p className="text-[10px] text-highlight font-medium">Enviou um convite</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleAcceptRequest(friendshipId)}
                          disabled={actionLoadingId === friendshipId}
                          className="bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs h-9 px-3 font-bold shadow-soft-sm"
                        >
                          {actionLoadingId === friendshipId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Aceitar'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleRemoveFriendship(friendshipId, 'Convite recusado.')}
                          disabled={actionLoadingId === friendshipId}
                          className="text-red-500 hover:bg-red-50 rounded-xl text-xs h-9 px-3 font-bold"
                        >
                          Recusar
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <Card className="border-none shadow-soft-md rounded-2xl p-8 text-center bg-white">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Nenhuma solicitação pendente.</p>
                </Card>
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
                    className="w-full pl-9 pr-3 h-11 text-sm rounded-xl border border-slate-200 bg-white focus:border-highlight text-primary transition-all"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#022D68] hover:bg-[#022D68]/95 text-white h-11 px-5 rounded-xl text-xs font-bold shrink-0"
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
                        className="bg-white rounded-2xl p-3 flex items-center justify-between border border-gray-100 shadow-soft-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={profile.avatar_url || 'https://via.placeholder.com/100?text=Avatar'}
                            alt={getProfileName(profile)}
                            className="w-12 h-12 rounded-full object-cover border border-slate-100"
                          />
                          <div>
                            <h4 className="text-sm font-bold text-[#022D68]">{getProfileName(profile)}</h4>
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
                            className="bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs h-9 px-3 font-semibold shadow-none"
                          >
                            Pendente
                          </Button>
                        )}

                        {status === 'pending_received' && (
                          <Button
                            onClick={() => setActiveTab('pending')}
                            className="bg-highlight hover:bg-highlight/90 text-white rounded-xl text-xs h-9 px-3 font-bold"
                          >
                            Ver convite
                          </Button>
                        )}

                        {status === 'none' && (
                          <Button
                            onClick={() => handleSendRequest(profile.id)}
                            disabled={actionLoadingId === profile.id}
                            className="bg-highlight hover:bg-highlight/90 text-white rounded-xl text-xs h-9 px-3 font-bold shadow-soft-sm flex items-center gap-1.5"
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
                  <Card className="border-none shadow-soft-md rounded-2xl p-6 text-center bg-white">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Nenhum usuário encontrado para "{searchQuery}".</p>
                  </Card>
                ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
