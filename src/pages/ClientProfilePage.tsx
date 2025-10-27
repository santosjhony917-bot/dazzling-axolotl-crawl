import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Utensils, Heart, Settings, User, Loader2, HelpCircle, FileText, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ClientPageWrapper from '@/components/ClientPageWrapper';
import { showError, showSuccess } from '@/utils/toast';
import NavCardItem from '@/components/NavCardItem';
import UserProfileHeader from '@/components/UserProfileHeader';
import ClientBasicInfoSection from '@/components/ClientBasicInfoSection'; // NOVO IMPORT
import EditClientFieldDialog from '@/components/EditClientFieldDialog'; // NOVO IMPORT
import { updateProfile } from '@/integrations/supabase/profile'; // NOVO IMPORT
import { z } from 'zod';
import { Profile } from '@/types/supabase';

// --- Schemas de Validação ---
const nameSchema = z.string().min(3, "Mínimo de 3 caracteres.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Formato: (XX) XXXXX-XXXX");

// Máscara de telefone (reutilizada do ProfileManagementLayout)
const phoneMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// Hook para buscar o restaurante do usuário logado (mantido)
const useUserRestaurant = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userRestaurant', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
  });
};

export default function ClientProfilePage() {
  const { user, profile, signOut, isLoading: isAuthLoading, restaurant: authRestaurant, refetchProfile } = useAuthContext();
  const navigate = useNavigate();
  
  const restaurant = authRestaurant;
  
  // --- Estado para Edição de Campo Único ---
  const [isEditFieldOpen, setIsEditFieldOpen] = useState(false);
  const [editFieldConfig, setEditFieldConfig] = useState<{
    key: keyof Profile | 'email' | 'phone';
    title: string;
    fieldName: string;
    icon: React.ReactNode;
    validationSchema: z.ZodType<string>;
    type?: "text" | "tel" | "email";
    mask?: (value: string) => string;
    placeholder?: string;
  } | null>(null);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  const handleEditField = useCallback((
    key: keyof Profile | 'email' | 'phone',
    title: string,
    fieldName: string,
    icon: React.ReactNode,
    validationSchema: z.ZodType<string>,
    type: "text" | "tel" | "email" = "text",
    mask?: (value: string) => string,
    placeholder?: string,
  ) => {
    setEditFieldConfig({ key, title, fieldName, icon, validationSchema, type, mask, placeholder });
    setIsEditFieldOpen(true);
  }, []);
  
  const handleSaveField = useCallback(async (value: string) => {
    if (!editFieldConfig || !user?.id) return;

    const key = editFieldConfig.key;
    let finalValue = value;
    
    // Aplica a máscara reversa se for telefone
    if (key === 'phone') {
        finalValue = value.replace(/\D/g, '');
    }
    
    try {
      // Apenas 'first_name', 'last_name' e 'phone' são editáveis no perfil
      if (key === 'first_name' || key === 'last_name' || key === 'phone') {
        await updateProfile(user.id, { [key]: finalValue });
        showSuccess("Perfil atualizado com sucesso!");
        refetchProfile(); // Força a atualização do contexto
      } else {
        // E-mail não é editável diretamente
        showError("A alteração deste campo não é suportada nesta tela.");
      }
    } catch (e) {
      showError((e as Error).message || "Falha ao salvar o perfil.");
      throw e;
    }
  }, [editFieldConfig, user?.id, refetchProfile]);

  const userDisplayName = profile?.first_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || 'Não logado';
  
  // Valor atual do campo de edição
  const currentEditValue = useMemo(() => {
    if (!editFieldConfig) return '';
    
    if (editFieldConfig.key === 'first_name') return profile?.first_name || '';
    if (editFieldConfig.key === 'last_name') return profile?.last_name || '';
    // O campo 'phone' não existe na tabela profiles, mas vamos simular que existe para o InfoCardItem
    // Se o campo 'phone' for adicionado ao Profile, esta lógica deve ser ajustada.
    // Por enquanto, usamos o campo 'first_name' como placeholder para o diálogo.
    // CORREÇÃO: O campo 'phone' foi adicionado ao Profile no esquema do Supabase, mas não no tipo Profile.
    // Vamos assumir que o campo 'phone' existe no Profile para fins de edição.
    if (editFieldConfig.key === 'phone') return (profile as any)?.phone || '';
    
    return '';
  }, [editFieldConfig, profile]);


  return (
    <ClientPageWrapper selectedTab="profile">
      
      {/* Novo Header no estilo banner */}
      <UserProfileHeader 
        displayName={userDisplayName}
        email={userEmail}
        onBack={() => navigate(createPageUrl('home'))}
      />

      <main className="p-4 space-y-6 -mt-6 relative z-10">
        
        {/* Seção 1: Informações Básicas do Cliente */}
        <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
          <ClientBasicInfoSection
            profile={profile}
            userEmail={userEmail}
            handleEditField={handleEditField}
            nameSchema={nameSchema}
            phoneSchema={phoneSchema}
          />
        </Card>

        {/* Seção de Gerenciamento do Restaurante */}
        {restaurant && (
          <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
            <h2 className="text-lg font-bold text-primary mb-2">Gerenciamento do Restaurante</h2>
            
            <NavCardItem 
              icon={Utensils}
              title={restaurant.name}
              description="Acesse o painel de controle do seu restaurante."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/home'))}
            />
            
            <NavCardItem 
              icon={Settings}
              title="Configurações do Restaurante"
              description="Edite informações, horário de funcionamento e links."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/profile-menu'))}
            />
          </Card>
        )}

        {/* Seção de Navegação Geral */}
        <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
          <h2 className="text-lg font-bold text-primary mb-2">Geral</h2>
          
          <NavCardItem 
            icon={Heart}
            title="Meus Favoritos"
            description="Veja os restaurantes e pratos que você favoritou."
            onClick={() => handleNavigate(createPageUrl('favorites'))}
          />
          
          <NavCardItem 
            icon={HelpCircle}
            title="Central de Ajuda"
            description="Encontre tutoriais e suporte."
            onClick={() => handleNavigate(createPageUrl('helpCenter'))}
          />
          
          <NavCardItem 
            icon={FileText}
            title="Termos e Privacidade"
            description="Leia nossos termos de uso e política de dados."
            onClick={() => handleNavigate(createPageUrl('legal'))}
          />
        </Card>

        {/* Botão de Logout */}
        <div className="pt-4 pb-8">
          <Button 
            onClick={handleSignOut} 
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 h-12 rounded-xl shadow-soft-md"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </Button>
        </div>
      </main>
      
      {/* Diálogo de Edição de Campo Único do Cliente */}
      {editFieldConfig && (
        <EditClientFieldDialog
          isOpen={isEditFieldOpen}
          onClose={() => setIsEditFieldOpen(false)}
          title={editFieldConfig.title}
          fieldName={editFieldConfig.fieldName}
          currentValue={currentEditValue}
          icon={editFieldConfig.icon}
          onSave={handleSaveField}
          placeholder={editFieldConfig.placeholder}
          type={editFieldConfig.type}
          validationSchema={editFieldConfig.validationSchema}
          mask={editFieldConfig.mask}
        />
      )}
    </ClientPageWrapper>
  );
}