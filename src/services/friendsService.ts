import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

// Perfis mockados para testes locais em modo offline/desenvolvimento
const MOCK_PROFILES: Profile[] = [
  { id: 'mock-friend-1', first_name: 'Lucas', last_name: 'Silva', phone: '11999999991', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120', updated_at: new Date().toISOString() },
  { id: 'mock-friend-2', first_name: 'Mariana', last_name: 'Santos', phone: '11999999992', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', updated_at: new Date().toISOString() },
  { id: 'mock-friend-3', first_name: 'Pedro', last_name: 'Oliveira', phone: '11999999993', avatar_url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=120', updated_at: new Date().toISOString() },
  { id: 'mock-friend-4', first_name: 'Juliana', last_name: 'Souza', phone: '11999999994', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120', updated_at: new Date().toISOString() },
  { id: 'mock-friend-5', first_name: 'Carlos', last_name: 'Costa', phone: '11999999995', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', updated_at: new Date().toISOString() },
];

export interface FriendshipMock {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted' | 'blocked';
  action_user_id: string;
  created_at: string;
}

// Inicializar mock de amizades no localStorage se não existir
function initMockFriendships(currentUserId: string): FriendshipMock[] {
  const key = `mock-friendships-${currentUserId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  // Amizades iniciais padrão para o mock ( Mariana e Lucas são amigos, Pedro enviou convite )
  const initial: FriendshipMock[] = [
    {
      id: 'mock-fs-1',
      user_id_1: currentUserId,
      user_id_2: 'mock-friend-1', // Lucas
      status: 'accepted',
      action_user_id: currentUserId,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-fs-2',
      user_id_1: currentUserId,
      user_id_2: 'mock-friend-2', // Mariana
      status: 'accepted',
      action_user_id: 'mock-friend-2',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-fs-3',
      user_id_1: 'mock-friend-3', // Pedro
      user_id_2: currentUserId,
      status: 'pending',
      action_user_id: 'mock-friend-3',
      created_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
}

function saveMockFriendships(currentUserId: string, list: FriendshipMock[]) {
  localStorage.setItem(`mock-friendships-${currentUserId}`, JSON.stringify(list));
}

/**
 * Busca usuários cadastrados na plataforma (exceto o próprio usuário logado).
 */
export async function searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
  if (currentUserId.startsWith('mock-')) {
    const term = query.toLowerCase().trim();
    if (!term) return [];
    
    return MOCK_PROFILES.filter(p => {
      const nameMatch = (p.first_name?.toLowerCase().includes(term) || p.last_name?.toLowerCase().includes(term));
      const phoneDigits = p.phone?.replace(/\D/g, '') || '';
      const queryDigits = term.replace(/\D/g, '');
      const phoneMatch = queryDigits.length > 0 && phoneDigits.includes(queryDigits);
      
      return nameMatch || phoneMatch;
    });
  }

  // Busca Supabase real
  const cleanPhoneQuery = query.replace(/\D/g, '');
  let orCondition = `first_name.ilike.%${query}%,last_name.ilike.%${query}%`;
  if (cleanPhoneQuery.length > 0) {
    orCondition += `,phone.ilike.%${cleanPhoneQuery}%`;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId)
    .or(orCondition)
    .limit(10);

  if (error) {
    console.error('Error searching profiles:', error);
    return [];
  }
  return data || [];
}

/**
 * Envia uma solicitação de amizade.
 */
export async function sendFriendRequest(senderId: string, receiverId: string): Promise<{ error: string | null }> {
  if (senderId.startsWith('mock-')) {
    const list = initMockFriendships(senderId);
    
    // Verifica se já existe relacionamento
    const exists = list.some(f => 
      (f.user_id_1 === senderId && f.user_id_2 === receiverId) || 
      (f.user_id_1 === receiverId && f.user_id_2 === senderId)
    );

    if (exists) {
      return { error: 'Uma solicitação de amizade ou amizade existente já existe.' };
    }

    const newRequest: FriendshipMock = {
      id: `mock-fs-${Date.now()}`,
      user_id_1: senderId < receiverId ? senderId : receiverId,
      user_id_2: senderId < receiverId ? receiverId : senderId,
      status: 'pending',
      action_user_id: senderId,
      created_at: new Date().toISOString(),
    };

    list.push(newRequest);
    saveMockFriendships(senderId, list);
    return { error: null };
  }

  // Inserção real Supabase
  // Ordena os IDs para garantir consistência no unique pair
  const user_id_1 = senderId < receiverId ? senderId : receiverId;
  const user_id_2 = senderId < receiverId ? receiverId : senderId;

  const { error } = await supabase
    .from('friendships')
    .insert({
      user_id_1,
      user_id_2,
      status: 'pending',
      action_user_id: senderId,
    });

  if (error) {
    console.error('Error sending friend request:', error);
    return { error: error.message };
  }

  return { error: null };
}

export interface FriendListResult {
  friends: { friendshipId: string; friendProfile: Profile }[];
  pendingRequests: { friendshipId: string; senderProfile: Profile }[];
}

/**
 * Carrega a lista de amigos aceitos e solicitações pendentes recebidas.
 */
export async function getFriendships(currentUserId: string): Promise<FriendListResult> {
  if (currentUserId.startsWith('mock-')) {
    const list = initMockFriendships(currentUserId);
    const friends: { friendshipId: string; friendProfile: Profile }[] = [];
    const pendingRequests: { friendshipId: string; senderProfile: Profile }[] = [];

    list.forEach(f => {
      if (f.status === 'accepted') {
        const friendId = f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1;
        const friendProfile = MOCK_PROFILES.find(p => p.id === friendId);
        if (friendProfile) {
          friends.push({ friendshipId: f.id, friendProfile });
        }
      } else if (f.status === 'pending' && f.action_user_id !== currentUserId) {
        // Solicitação pendente recebida
        const senderProfile = MOCK_PROFILES.find(p => p.id === f.action_user_id);
        if (senderProfile) {
          pendingRequests.push({ friendshipId: f.id, senderProfile });
        }
      }
    });

    return { friends, pendingRequests };
  }

  // Supabase
  // Carrega todas as amizades onde o usuário participa
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id_1,
      user_id_2,
      status,
      action_user_id
    `)
    .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

  if (error) {
    console.error('Error loading friendships:', error);
    return { friends: [], pendingRequests: [] };
  }

  const friends: { friendshipId: string; friendProfile: Profile }[] = [];
  const pendingRequests: { friendshipId: string; senderProfile: Profile }[] = [];

  // Mapeia os perfis de forma assíncrona
  const profilesMap: Record<string, Profile> = {};
  
  // Extrai IDs únicos que precisamos carregar
  const userIdsToLoadSet = new Set<string>();
  data?.forEach(f => {
    if (f.user_id_1 !== currentUserId) userIdsToLoadSet.add(f.user_id_1);
    if (f.user_id_2 !== currentUserId) userIdsToLoadSet.add(f.user_id_2);
    if (f.action_user_id !== currentUserId) userIdsToLoadSet.add(f.action_user_id);
  });
  
  const userIdsToLoad = Array.from(userIdsToLoadSet);

  if (userIdsToLoad.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIdsToLoad);
      
    if (!profilesError && profiles) {
      profiles.forEach(p => {
        profilesMap[p.id] = p;
      });
    }
  }

  data?.forEach(f => {
    if (f.status === 'accepted') {
      const friendId = f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1;
      const profile = profilesMap[friendId];
      if (profile) {
        friends.push({ friendshipId: f.id, friendProfile: profile });
      }
    } else if (f.status === 'pending' && f.action_user_id !== currentUserId) {
      const profile = profilesMap[f.action_user_id];
      if (profile) {
        pendingRequests.push({ friendshipId: f.id, senderProfile: profile });
      }
    }
  });

  return { friends, pendingRequests };
}

/**
 * Aceita uma solicitação de amizade.
 */
export async function acceptFriendRequest(friendshipId: string, currentUserId: string): Promise<{ error: string | null }> {
  if (currentUserId.startsWith('mock-')) {
    const list = initMockFriendships(currentUserId);
    const item = list.find(f => f.id === friendshipId);
    if (item) {
      item.status = 'accepted';
      saveMockFriendships(currentUserId, list);
    }
    return { error: null };
  }

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);

  if (error) {
    console.error('Error accepting friend request:', error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * Recusa ou remove uma amizade/solicitação.
 */
export async function removeFriendship(friendshipId: string, currentUserId: string): Promise<{ error: string | null }> {
  if (currentUserId.startsWith('mock-')) {
    const list = initMockFriendships(currentUserId);
    const filtered = list.filter(f => f.id !== friendshipId);
    saveMockFriendships(currentUserId, filtered);
    return { error: null };
  }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Error removing friendship:', error);
    return { error: error.message };
  }
  return { error: null };
}
