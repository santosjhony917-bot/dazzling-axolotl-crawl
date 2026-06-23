import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, MessageCircle, Phone, Calendar, Clock, ArrowRight, UserCheck, Flame, Users, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RestaurantCard {
  id: string;
  columnId: string;
  title: string;
  category: string;
  contact: string;
  lastAction: string;
  menuStatus: string;
}

const BLOCKED_STATUSES = ['manual_required', 'blocked', 'failed', 'invalid_source'];

const DB_TO_COLUMN: Record<string, string> = {
  Pendente: 'lead',
  lead: 'lead',
  Contatado: 'contacted',
  contacted: 'contacted',
  Interessado: 'negotiation',
  negotiation: 'negotiation',
  Visitado: 'won',
  won: 'won',
  'Não Interessado': 'lost',
  'NÃ£o Interessado': 'lost',
  lost: 'lost',
};

const COLUMN_TO_DB: Record<string, string> = {
  lead: 'Pendente',
  contacted: 'Contatado',
  negotiation: 'Interessado',
  won: 'Visitado',
  lost: 'Não Interessado',
};

const KANBAN_COLUMNS = [
  { id: 'lead', title: 'Prontos para contato', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'contacted', title: 'Contato iniciado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'negotiation', title: 'Interessados', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'won', title: 'Convertidos', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'lost', title: 'Perdidos', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const handleWhatsAppClick = (contact: string, restaurantName: string) => {
  const cleanPhone = contact.replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    toast.error('Telefone inválido para WhatsApp');
    return;
  }

  const savedTemplate = localStorage.getItem('crm_message_template')
    || 'Olá, falo do FilterFood. Validamos o perfil do {restaurante} e gostaríamos de apresentar uma parceria.';

  const customMessage = savedTemplate.replace(/{restaurante}/g, restaurantName);
  window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(customMessage)}`, '_blank');
};

const handleCalendarClick = (restaurantName: string) => {
  toast.success(`Follow-up agendável para ${restaurantName}.`);
};

export default function CityCrm() {
  const { cityId } = useParams<{ cityId: string }>();
  const [cards, setCards] = useState<RestaurantCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      if (!cityId) return;

      const { data: cityData, error: cityError } = await supabase
        .from('expansion_projects')
        .select('name, state')
        .eq('slug', cityId)
        .single();

      if (cityError) throw cityError;

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, category, phone, created_at, visit_status, ai_validated, is_deleted, menu_status')
        .eq('city', cityData.name)
        .eq('state', cityData.state)
        .eq('ai_validated', true);

      if (error) throw error;

      const rows = data || [];
      const eligible = rows.filter(r => (
        r.is_deleted !== true
        && !BLOCKED_STATUSES.includes(r.menu_status || '')
        && !!r.phone
      ));
      setBlockedCount(rows.length - eligible.length);

      const mappedCards: RestaurantCard[] = eligible.map((r) => ({
        id: r.id,
        columnId: DB_TO_COLUMN[r.visit_status || ''] || 'lead',
        title: r.name,
        category: r.category || 'Restaurante validado',
        contact: r.phone || 'Sem telefone',
        lastAction: r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : 'Desconhecido',
        menuStatus: r.menu_status || 'unknown',
      }));

      setCards(mappedCards);
    } catch (err: any) {
      toast.error(`Erro ao carregar o CRM: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const updateCardStatus = async (cardId: string, newColumnId: string) => {
    const newStatus = COLUMN_TO_DB[newColumnId];
    if (!newStatus) return;

    try {
      const updates: any = { visit_status: newStatus };
      if (newColumnId === 'won') updates.plan = 'premium';

      const { error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', cardId)
        .eq('ai_validated', true);

      if (error) throw error;
      toast.success(newColumnId === 'won' ? 'Convertido: assinatura Premium registrada.' : `Status atualizado para ${newStatus}`);
    } catch (err: any) {
      toast.error(`Erro ao atualizar status: ${err?.message || 'erro desconhecido'}`);
      fetchRestaurants();
    }
  };

  const moveCard = (cardId: string, currentColumnId: string) => {
    const colIndex = KANBAN_COLUMNS.findIndex(c => c.id === currentColumnId);
    if (colIndex < KANBAN_COLUMNS.length - 1) {
      const nextColId = KANBAN_COLUMNS[colIndex + 1].id;
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, columnId: nextColId } : c));
      updateCardStatus(cardId, nextColId);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const nextColId = destination.droppableId;
    setCards(prev => prev.map(c => c.id === draggableId ? { ...c, columnId: nextColId } : c));

    if (source.droppableId !== destination.droppableId) {
      updateCardStatus(draggableId, nextColId);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm ring-1 ring-slate-900/5">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CRM elegível</p>
              <p className="text-2xl font-black text-slate-900">{cards.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shadow-sm ring-1 ring-slate-900/5">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Em conversa</p>
              <p className="text-2xl font-black text-slate-900">{cards.filter(c => c.columnId === 'contacted').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm ring-1 ring-slate-900/5">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Convertidos</p>
              <p className="text-2xl font-black text-slate-900">{cards.filter(c => c.columnId === 'won').length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shadow-sm ring-1 ring-slate-900/5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fora do CRM</p>
              <p className="text-2xl font-black text-slate-900">{blockedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">CRM de Restaurantes Validados</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Só entram aqui restaurantes aprovados pelo Validar IA e com telefone. Premium só ao mover para Convertidos.</p>
        </div>
        <Button variant="outline" className="border-slate-200 text-slate-700 font-bold shadow-sm" onClick={fetchRestaurants} disabled={loading}>
          Atualizar Board
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-5 overflow-x-auto pb-6 items-start custom-scrollbar snap-x snap-mandatory px-1">
          {KANBAN_COLUMNS.map(col => {
            const colCards = cards.filter(c => c.columnId === col.id);
            return (
              <div key={col.id} className="min-w-[340px] w-[340px] flex flex-col snap-start shrink-0">
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border shadow-sm uppercase tracking-wider ${col.color}`}>
                      {col.title}
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {colCards.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex flex-col gap-3.5 flex-1 min-h-[200px] rounded-2xl transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100 p-2 border-2 border-indigo-200 border-dashed' : ''}`}
                    >
                      {colCards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 shadow-sm border-slate-200 bg-white rounded-xl group cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 ring-opacity-60 rotate-2' : 'hover:shadow-md hover:-translate-y-0.5 transition-all'}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors pr-4">{card.title}</h4>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md -mr-1 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 font-semibold border-slate-200">
                                  {card.category}
                                </Badge>
                                {card.menuStatus === 'not_found' && (
                                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 font-semibold border-amber-200">
                                    Sem cardápio
                                  </Badge>
                                )}
                              </div>

                              <div className="space-y-2 mb-4">
                                <div className="flex items-center text-xs text-slate-600 font-medium">
                                  <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" /> {card.contact}
                                </div>
                                <div className="flex items-center text-[11px] text-slate-500">
                                  <Clock className="w-3.5 h-3.5 mr-2 text-slate-300" /> Entrada em {card.lastAction}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleWhatsAppClick(card.contact, card.title)}
                                    className="h-7 w-7 rounded-md flex items-center justify-center bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                                    title="Chamar no WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleCalendarClick(card.title)}
                                    className="h-7 w-7 rounded-md flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                    title="Agendar follow-up"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {col.id !== 'lost' && col.id !== 'won' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                                    onClick={() => moveCard(card.id, col.id)}
                                  >
                                    Avançar <ArrowRight className="w-3 h-3 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {colCards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-24 bg-transparent text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl font-medium">
                          Solte cartões aqui
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
