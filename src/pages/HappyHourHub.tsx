import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  Loader2, 
  MapPin, 
  Clock, 
  MessageSquare,
  Users,
  Check
} from 'lucide-react';
import { getHappyHours, createHappyHour } from '@/services/happyHourService';
import { getFriendships } from '@/services/friendsService';
import { HappyHour } from '@/services/happyHourService';
import { Profile } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function HappyHourHub() {
  const navigate = useNavigate();
  const { user } = useAuthData();
  const currentUserId = user?.id || '';

  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog de Criação
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [friends, setFriends] = useState<{ friendshipId: string; friendProfile: Profile }[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

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

  const handleOpenCreateModal = () => {
    setTitle('');
    setDescription('');
    setDateTime('');
    setSelectedFriendIds([]);
    setIsOpen(true);
  };

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime || !currentUserId) {
      showError('Por favor, preencha o título e a data do happy hour.');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await createHappyHour(
        title,
        description,
        dateTime,
        selectedFriendIds,
        currentUserId
      );

      if (error) {
        showError(error);
      } else if (data) {
        showSuccess('Happy Hour marcado com sucesso!');
        setIsOpen(false);
        loadData();
        // Navega diretamente para a sala recém-criada
        navigate(`/happy-hour/${data.id}`);
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
    <div className="bg-[#f5f7f8] min-h-screen flex flex-col w-full pb-20">
      
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
            <Calendar className="w-5 h-5 text-highlight" />
            <h1 className="text-xl font-extrabold text-[#022D68]">Happy Hours</h1>
          </div>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          size="sm"
          className="bg-highlight hover:bg-highlight/90 text-white rounded-xl font-bold h-9 gap-1 shadow-highlight-glow"
        >
          <Plus className="w-4 h-4" />
          Marcar
        </Button>
      </header>

      {/* List of Events */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : happyHours.length > 0 ? (
          happyHours.map((hh) => {
            const isUpcoming = new Date(hh.date_time).getTime() > Date.now();
            return (
              <motion.div
                key={hh.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/happy-hour/${hh.id}`)}
                className="cursor-pointer"
              >
                <Card className="border-none shadow-soft-md hover:shadow-soft-lg transition-all bg-white rounded-2xl overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-extrabold text-[#022D68] leading-tight">
                        {hh.title}
                      </h3>
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        isUpcoming ? "bg-green-50 text-green-600 border border-green-200" : "bg-slate-100 text-slate-400"
                      )}>
                        {isUpcoming ? 'Agendado' : 'Encerrado'}
                      </span>
                    </div>

                    {hh.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {hh.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100/50 text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-highlight" />
                        <span className="font-semibold text-slate-600">
                          {formatEventDate(hh.date_time)} às {formatEventTime(hh.date_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span className="text-[11px] text-slate-400">Entrar na Sala</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        ) : (
          <Card className="border-none shadow-soft-md rounded-2xl p-8 text-center bg-white mt-10">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-primary mb-1">Nenhum Happy Hour marcado</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Que tal agendar um encontro com seus amigos e decidir o local por votação?
            </p>
            <Button 
              onClick={handleOpenCreateModal}
              variant="highlight" 
              className="mt-6 h-11 px-6 font-bold rounded-xl shadow-highlight-glow gap-1"
            >
              <Plus className="w-4 h-4" />
              Marcar Happy Hour
            </Button>
          </Card>
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

          <form onSubmit={handleCreateEvent} className="space-y-4 pt-2">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Título do Encontro</label>
              <Input
                type="text"
                placeholder="Ex: Pizza de Sexta, Aniversário..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-11 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Data e Hora</label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                className="h-11 rounded-xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Descrição (Opcional)</label>
              <Textarea
                placeholder="Detalhes ou recados sobre o encontro..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border border-slate-200 min-h-[70px] resize-none"
              />
            </div>

            {/* Convidar Amigos Checkbox list */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Users className="w-4 h-4 text-slate-400" />
                Convidar Amigos ({selectedFriendIds.length} selecionados)
              </label>
              <div className="border border-slate-100 rounded-2xl bg-slate-50 p-2 max-h-[140px] overflow-y-auto space-y-1 scrollbar-thin">
                {friends.length > 0 ? (
                  friends.map(({ friendshipId, friendProfile }) => {
                    const isSelected = selectedFriendIds.includes(friendProfile.id);
                    const name = `${friendProfile.first_name || ''} ${friendProfile.last_name || ''}`.trim() || 'Amigo';
                    return (
                      <div
                        key={friendshipId}
                        onClick={() => handleToggleFriend(friendProfile.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
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

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-xl h-11 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-xl h-11 text-xs font-bold shadow-highlight-glow"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Encontro'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
