import { supabase } from '@/integrations/supabase/client';
import { Profile, Restaurant } from '@/types/supabase';

export interface HappyHour {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  created_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  happy_hour_id: string;
  user_id: string;
  message: string;
  created_at: string;
  senderProfile?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export interface PollRestaurant {
  restaurant_id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  address: string | null;
  votesCount: number;
  voters: { user_id: string; first_name: string; avatar_url: string }[];
}

// Mock profiles list matching the MOCK_PROFILES from friendsService
const MOCK_PROFILES_MAP: Record<string, Profile> = {
  'mock-friend-1': { id: 'mock-friend-1', first_name: 'Lucas', last_name: 'Silva', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120', updated_at: '' },
  'mock-friend-2': { id: 'mock-friend-2', first_name: 'Mariana', last_name: 'Santos', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', updated_at: '' },
  'mock-friend-3': { id: 'mock-friend-3', first_name: 'Pedro', last_name: 'Oliveira', avatar_url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120', updated_at: '' },
  'mock-friend-4': { id: 'mock-friend-4', first_name: 'Juliana', last_name: 'Souza', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120', updated_at: '' },
  'mock-friend-5': { id: 'mock-friend-5', first_name: 'Carlos', last_name: 'Costa', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', updated_at: '' },
};

const MOCK_RESTAURANTS_MAP: Record<string, Partial<Restaurant>> = {
  'mock-premium-restaurant-id': {
    id: 'mock-premium-restaurant-id',
    name: 'Sabor Premium Gourmet',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
    category: 'Italiana',
    address: 'Avenida Paulista, 1000'
  },
  'mock-free-restaurant-id': {
    id: 'mock-free-restaurant-id',
    name: 'Lancheira do Zé (Free)',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',
    category: 'Lanches',
    address: 'Avenida Paulista, 2000'
  }
};

// HELPER MOCK LOCAL STORAGE
interface HappyHourMockStore {
  happyHours: HappyHour[];
  participants: Record<string, string[]>; // happyHourId -> userId[]
  messages: Record<string, ChatMessage[]>; // happyHourId -> ChatMessage[]
  restaurants: Record<string, string[]>; // happyHourId -> restaurantId[]
  votes: Record<string, Record<string, string>>; // happyHourId -> Record<userId, restaurantId>
}

function loadMockStore(currentUserId: string): HappyHourMockStore {
  const key = `mock-happy-hours-${currentUserId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const defaultId = 'mock-hh-1';
  const store: HappyHourMockStore = {
    happyHours: [
      {
        id: defaultId,
        title: 'Happy Hour de Sexta!',
        description: 'Vamos comemorar o fim de semana com muita pizza e conversa.',
        date_time: new Date(Date.now() + 24 * 60 * 60 * 1000 * 2).toISOString(), // +2 dias
        created_by: 'mock-friend-2', // Mariana
        created_at: new Date().toISOString()
      }
    ],
    participants: {
      [defaultId]: [currentUserId, 'mock-friend-1', 'mock-friend-2'] // Lucas e Mariana
    },
    messages: {
      [defaultId]: [
        {
          id: 'msg-1',
          happy_hour_id: defaultId,
          user_id: 'mock-friend-2',
          message: 'E aí pessoal, tudo pronto para sexta?',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'msg-2',
          happy_hour_id: defaultId,
          user_id: 'mock-friend-1',
          message: 'Com certeza! Já votaram no restaurante?',
          created_at: new Date(Date.now() - 1800000).toISOString()
        }
      ]
    },
    restaurants: {
      [defaultId]: ['mock-premium-restaurant-id', 'mock-free-restaurant-id']
    },
    votes: {
      [defaultId]: {
        'mock-friend-2': 'mock-premium-restaurant-id',
        'mock-friend-1': 'mock-free-restaurant-id'
      }
    }
  };
  localStorage.setItem(key, JSON.stringify(store));
  return store;
}

function saveMockStore(currentUserId: string, store: HappyHourMockStore) {
  localStorage.setItem(`mock-happy-hours-${currentUserId}`, JSON.stringify(store));
}

/**
 * Cria um novo Happy Hour e insere participantes e o criador.
 */
export async function createHappyHour(
  title: string,
  description: string,
  dateTime: string,
  participantIds: string[],
  creatorId: string
): Promise<{ data: HappyHour | null; error: string | null }> {
  if (creatorId.startsWith('mock-')) {
    const store = loadMockStore(creatorId);
    const newHh: HappyHour = {
      id: `mock-hh-${Date.now()}`,
      title,
      description: description || null,
      date_time: dateTime,
      created_by: creatorId,
      created_at: new Date().toISOString()
    };

    store.happyHours.push(newHh);
    // Adiciona criador + participantes selecionados
    const uniqueParticipants = Array.from(new Set([creatorId, ...participantIds]));
    store.participants[newHh.id] = uniqueParticipants;
    store.messages[newHh.id] = [];
    store.restaurants[newHh.id] = [];
    store.votes[newHh.id] = {};

    saveMockStore(creatorId, store);
    return { data: newHh, error: null };
  }

  // Supabase real
  try {
    const { data: happyHour, error: hhError } = await supabase
      .from('happy_hours')
      .insert({
        title,
        description: description || null,
        date_time: dateTime,
        created_by: creatorId
      })
      .select()
      .single();

    if (hhError) throw hhError;

    // Adiciona participantes
    const participantsToInsert = Array.from(new Set([creatorId, ...participantIds])).map(uid => ({
      happy_hour_id: happyHour.id,
      user_id: uid
    }));

    const { error: partError } = await supabase
      .from('happy_hour_participants')
      .insert(participantsToInsert);

    if (partError) throw partError;

    return { data: happyHour, error: null };
  } catch (e) {
    console.error('Error creating happy hour:', e);
    return { data: null, error: (e as Error).message };
  }
}

/**
 * Carrega a lista de Happy Hours nos quais o usuário logado participa.
 */
export async function getHappyHours(currentUserId: string): Promise<HappyHour[]> {
  if (currentUserId.startsWith('mock-')) {
    const store = loadMockStore(currentUserId);
    // Filtra happy hours onde o usuário está na lista de participantes
    return store.happyHours.filter(hh => {
      const parts = store.participants[hh.id] || [];
      return parts.includes(currentUserId);
    });
  }

  // Supabase real
  const { data, error } = await supabase
    .from('happy_hour_participants')
    .select(`
      happy_hour:happy_hours (
        id,
        title,
        description,
        date_time,
        created_by,
        created_at
      )
    `)
    .eq('user_id', currentUserId);

  if (error) {
    console.error('Error fetching user happy hours:', error);
    return [];
  }

  return (data || [])
    .map((item: any) => item.happy_hour)
    .filter(Boolean) as HappyHour[];
}

export interface HappyHourDetails {
  happyHour: HappyHour;
  participants: Profile[];
  messages: ChatMessage[];
  pollRestaurants: PollRestaurant[];
  userVote: string | null;
}

/**
 * Carrega todos os detalhes de uma sala de Happy Hour (Chat, Enquete, Participantes).
 */
export async function getHappyHourDetails(
  happyHourId: string,
  currentUserId: string
): Promise<HappyHourDetails | null> {
  if (currentUserId.startsWith('mock-')) {
    const store = loadMockStore(currentUserId);
    const hh = store.happyHours.find(h => h.id === happyHourId);
    if (!hh) return null;

    // Participantes
    const partIds = store.participants[happyHourId] || [];
    const participants: Profile[] = [];
    partIds.forEach(id => {
      if (id === currentUserId) {
        participants.push({
          id,
          first_name: 'Você',
          last_name: '',
          avatar_url: null,
          updated_at: ''
        });
      } else {
        const p = MOCK_PROFILES_MAP[id];
        if (p) participants.push(p);
      }
    });

    // Mensagens de Chat
    const rawMsgs = store.messages[happyHourId] || [];
    const messages = rawMsgs.map(m => {
      const sender = m.user_id === currentUserId
        ? { first_name: 'Você', last_name: '', avatar_url: null }
        : MOCK_PROFILES_MAP[m.user_id] || { first_name: 'Usuário', last_name: '', avatar_url: null };

      return {
        ...m,
        senderProfile: {
          first_name: sender.first_name,
          last_name: sender.last_name,
          avatar_url: sender.avatar_url
        }
      };
    });

    // Enquete / Restaurantes e Votos
    const voteMap = store.votes[happyHourId] || {};
    const pollRestIds = store.restaurants[happyHourId] || [];
    
    const pollRestaurants: PollRestaurant[] = pollRestIds.map(rid => {
      const r = MOCK_RESTAURANTS_MAP[rid] || { name: 'Restaurante Desconhecido', category: 'Geral', image_url: null, address: '' };
      
      // Computa votos para este restaurante
      const votersList: { user_id: string; first_name: string; avatar_url: string }[] = [];
      Object.entries(voteMap).forEach(([uid, votedRestId]) => {
        if (votedRestId === rid) {
          const profile = uid === currentUserId 
            ? { first_name: 'Você', avatar_url: '' } 
            : MOCK_PROFILES_MAP[uid];
          votersList.push({
            user_id: uid,
            first_name: profile?.first_name || 'Amigo',
            avatar_url: profile?.avatar_url || ''
          });
        }
      });

      return {
        restaurant_id: rid,
        name: r.name || 'Restaurante',
        image_url: r.image_url || null,
        category: r.category || null,
        address: r.address || null,
        votesCount: votersList.length,
        voters: votersList
      };
    });

    const userVote = voteMap[currentUserId] || null;

    return {
      happyHour: hh,
      participants,
      messages,
      pollRestaurants,
      userVote
    };
  }

  // Supabase real
  try {
    // 1. Happy hour meta
    const { data: hh, error: hhErr } = await supabase
      .from('happy_hours')
      .select('*')
      .eq('id', happyHourId)
      .single();

    if (hhErr) throw hhErr;

    // 2. Participantes
    const { data: parts, error: partsErr } = await supabase
      .from('happy_hour_participants')
      .select('user_id, profile:profiles(*)')
      .eq('happy_hour_id', happyHourId);

    if (partsErr) throw partsErr;
    const participants = (parts || []).map((p: any) => p.profile).filter(Boolean);

    // 3. Mensagens
    const { data: msgs, error: msgsErr } = await supabase
      .from('happy_hour_messages')
      .select('*, sender:profiles(first_name, last_name, avatar_url)')
      .eq('happy_hour_id', happyHourId)
      .order('created_at', { ascending: true });

    if (msgsErr) throw msgsErr;

    const messages: ChatMessage[] = (msgs || []).map((m: any) => ({
      id: m.id,
      happy_hour_id: m.happy_hour_id,
      user_id: m.user_id,
      message: m.message,
      created_at: m.created_at,
      senderProfile: m.sender
    }));

    // 4. Restaurantes da Enquete
    const { data: pollRests, error: restsErr } = await supabase
      .from('happy_hour_restaurants')
      .select('restaurant_id, restaurant:restaurants(*)')
      .eq('happy_hour_id', happyHourId);

    if (restsErr) throw restsErr;

    // 5. Votos da enquete
    const { data: votes, error: votesErr } = await supabase
      .from('happy_hour_votes')
      .select('restaurant_id, user_id, profile:profiles(first_name, avatar_url)')
      .eq('happy_hour_id', happyHourId);

    if (votesErr) throw votesErr;

    const userVoteItem = (votes || []).find((v: any) => v.user_id === currentUserId);
    const userVote = userVoteItem ? userVoteItem.restaurant_id : null;

    const pollRestaurants: PollRestaurant[] = (pollRests || []).map((pr: any) => {
      const rest = pr.restaurant;
      const filteredVotes = (votes || []).filter((v: any) => v.restaurant_id === rest.id);
      
      const voters = filteredVotes.map((v: any) => ({
        user_id: v.user_id,
        first_name: v.user_id === currentUserId ? 'Você' : (v.profile?.first_name || 'Amigo'),
        avatar_url: v.profile?.avatar_url || ''
      }));

      return {
        restaurant_id: rest.id,
        name: rest.name,
        image_url: rest.image_url,
        category: rest.category,
        address: rest.address,
        votesCount: voters.length,
        voters
      };
    });

    return {
      happyHour: hh,
      participants,
      messages,
      pollRestaurants,
      userVote
    };

  } catch (e) {
    console.error('Error loading happy hour details:', e);
    return null;
  }
}

/**
 * Envia uma mensagem no chat da sala.
 */
export async function sendChatMessage(
  happyHourId: string,
  userId: string,
  message: string
): Promise<{ error: string | null }> {
  if (userId.startsWith('mock-')) {
    const store = loadMockStore(userId);
    const msgs = store.messages[happyHourId] || [];
    
    const newMsg: ChatMessage = {
      id: `mock-msg-${Date.now()}`,
      happy_hour_id: happyHourId,
      user_id: userId,
      message,
      created_at: new Date().toISOString()
    };

    msgs.push(newMsg);
    store.messages[happyHourId] = msgs;
    saveMockStore(userId, store);
    return { error: null };
  }

  // Supabase real
  const { error } = await supabase
    .from('happy_hour_messages')
    .insert({
      happy_hour_id: happyHourId,
      user_id: userId,
      message
    });

  if (error) {
    console.error('Error sending message:', error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Adiciona um restaurante favorito/busca na enquete do happy hour.
 */
export async function addRestaurantToPoll(
  happyHourId: string,
  restaurantId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (userId.startsWith('mock-')) {
    const store = loadMockStore(userId);
    const rests = store.restaurants[happyHourId] || [];
    
    if (rests.includes(restaurantId)) {
      return { error: 'Este restaurante já está na votação.' };
    }

    rests.push(restaurantId);
    store.restaurants[happyHourId] = rests;
    saveMockStore(userId, store);
    return { error: null };
  }

  // Supabase real
  const { error } = await supabase
    .from('happy_hour_restaurants')
    .insert({
      happy_hour_id: happyHourId,
      restaurant_id: restaurantId,
      added_by: userId
    });

  if (error) {
    console.error('Error adding restaurant to poll:', error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Computa um voto para um restaurante específico (toggles).
 * Exclui qualquer outro voto do mesmo usuário nesta sala antes de salvar.
 */
export async function voteForRestaurant(
  happyHourId: string,
  restaurantId: string,
  userId: string
): Promise<{ error: string | null }> {
  if (userId.startsWith('mock-')) {
    const store = loadMockStore(userId);
    const votesMap = store.votes[happyHourId] || {};
    
    const previousVote = votesMap[userId];
    if (previousVote === restaurantId) {
      // Toggle off: remove o voto
      delete votesMap[userId];
    } else {
      // Altera/Registra voto
      votesMap[userId] = restaurantId;
    }

    store.votes[happyHourId] = votesMap;
    saveMockStore(userId, store);
    return { error: null };
  }

  // Supabase real
  try {
    // 1. Remove qualquer voto prévio do mesmo usuário nesta mesma sala
    const { error: delError } = await supabase
      .from('happy_hour_votes')
      .delete()
      .eq('happy_hour_id', happyHourId)
      .eq('user_id', userId);

    if (delError) throw delError;

    // Se o voto clicado for o mesmo, o toggle foi feito (apenas deletou)
    // Para registrar novo voto:
    const { data: existingCheck } = await supabase
      .from('happy_hour_votes')
      .select('*')
      .eq('happy_hour_id', happyHourId)
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId);

    const isSameVote = existingCheck && existingCheck.length > 0;

    // Se não for o mesmo voto, insere o novo voto
    const { error: insError } = await supabase
      .from('happy_hour_votes')
      .insert({
        happy_hour_id: happyHourId,
        restaurant_id: restaurantId,
        user_id: userId
      });

    if (insError) throw insError;

    return { error: null };
  } catch (e) {
    console.error('Error voting:', e);
    return { error: (e as Error).message };
  }
}

/**
 * Atualiza as configurações da sala de Happy Hour (salvo de forma segura na descrição como JSON).
 */
export async function updateHappyHourSettings(
  happyHourId: string,
  currentUserId: string,
  text: string | null,
  allowMemberInvites: boolean,
  allowMemberSuggestions: boolean
): Promise<{ error: string | null }> {
  const settingsJson = JSON.stringify({
    text: text || "",
    allow_member_invites: allowMemberInvites,
    allow_member_suggestions: allowMemberSuggestions
  });

  if (currentUserId.startsWith('mock-')) {
    const store = loadMockStore(currentUserId);
    const hh = store.happyHours.find(h => h.id === happyHourId);
    if (hh) {
      hh.description = settingsJson;
      saveMockStore(currentUserId, store);
    }
    return { error: null };
  }

  // Supabase real
  try {
    const { error } = await supabase
      .from('happy_hours')
      .update({ description: settingsJson })
      .eq('id', happyHourId);

    if (error) throw error;
    return { error: null };
  } catch (e) {
    console.error('Error updating happy hour settings:', e);
    return { error: (e as Error).message };
  }
}

/**
 * Adiciona novos participantes a uma sala de Happy Hour.
 */
export async function addParticipantsToHappyHour(
  happyHourId: string,
  participantIds: string[],
  currentUserId: string
): Promise<{ error: string | null }> {
  if (currentUserId.startsWith('mock-')) {
    const store = loadMockStore(currentUserId);
    const parts = store.participants[happyHourId] || [];
    const updatedParts = Array.from(new Set([...parts, ...participantIds]));
    store.participants[happyHourId] = updatedParts;
    saveMockStore(currentUserId, store);
    return { error: null };
  }

  // Supabase real
  try {
    const participantsToInsert = participantIds.map(uid => ({
      happy_hour_id: happyHourId,
      user_id: uid
    }));

    const { error } = await supabase
      .from('happy_hour_participants')
      .insert(participantsToInsert);

    if (error) throw error;
    return { error: null };
  } catch (e) {
    console.error('Error adding participants to happy hour:', e);
    return { error: (e as Error).message };
  }
}
