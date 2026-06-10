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
import Header from '@/components/Header';

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
    <div className="bg-[#F8FAFC] min-h-screen flex flex-col w-full pb-20 font-['Poppins']">
      
      <Header 
        title="Happy Hours"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate('/home') }}
        rightAction={{ icon: Plus, onClick: handleOpenCreateModal }}
      />

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

                  {/* Separador tracejado vertical com cutouts de ticket */}
                  <div className="h-16 border-l border-dashed border-slate-200 relative mx-1 shrink-0">
                    <div className="absolute -top-[24px] -left-[7px] w-3.5 h-3.5 bg-[#F8FAFC] border border-slate-100 rounded-full z-10 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.02)]" />
                    <div className="absolute -bottom-[24px] -left-[7px] w-3.5 h-3.5 bg-[#F8FAFC] border border-slate-100 rounded-full z-10 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)]" />
                  </div>

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
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-[#EF2A39]" />
                        <span>às {formatEventTime(hh.date_time)}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#EF2A39] hover:text-[#EF2A39]/80 font-bold transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Entrar na Sala</span>
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
              className="h-10 px-5 text-xs font-bold rounded-2xl bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white shadow-none border-none flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Marcar Happy Hour
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

          <form onSubmit={handleCreateEvent} className="space-y-4 pt-2">
            
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

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Data e Hora</label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                required
                className="h-11 rounded-2xl border border-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Descrição (Opcional)</label>
              <Textarea
                placeholder="Detalhes ou recados sobre o encontro..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-2xl border border-slate-200 min-h-[70px] resize-none"
              />
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

            <DialogFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-2xl h-11 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white rounded-2xl h-11 text-xs font-bold shadow-none"
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
