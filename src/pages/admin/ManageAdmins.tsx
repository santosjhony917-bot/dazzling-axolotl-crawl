import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, UserPlus, Shield, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAdmins, addAdmin, removeAdmin } from '@/integrations/supabase/adminFunctions';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AdminUser {
    id: string;
    email: string;
    role: string;
}

export default function ManageAdmins() {
  const queryClient = useQueryClient();
  const [emailToAdd, setEmailToAdd] = useState('');
  const [userToRemove, setUserToRemove] = useState<AdminUser | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Query para listar administradores
  const { data: admins, isLoading, error, refetch } = useQuery<AdminUser[], Error>({
    queryKey: ['adminList'],
    queryFn: listAdmins,
    staleTime: 60000, // 1 minuto
  });

  // Mutação para adicionar administrador
  const addAdminMutation = useMutation({
    mutationFn: addAdmin,
    onSuccess: () => {
      showSuccess(`Usuário ${emailToAdd} promovido a administrador.`);
      setEmailToAdd('');
      // Invalida e força o refetch
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
      refetch(); 
    },
    onError: (e) => {
      console.error("ADD ADMIN MUTATION FAILED:", e);
      const errorMessage = (e as Error).message;
      if (errorMessage.includes('404')) {
        showError(`Falha: Usuário não encontrado. Certifique-se de que o email está cadastrado.`);
      } else {
        showError(`Falha ao adicionar administrador: ${errorMessage}`);
      }
    },
  });

  // Mutação para remover administrador
  const removeAdminMutation = useMutation({
    mutationFn: removeAdmin,
    onSuccess: () => {
      showSuccess(`Papel de administrador removido.`);
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
      refetch();
      setIsAlertOpen(false);
      setUserToRemove(null);
    },
    onError: (e) => {
      showError(`Falha ao remover administrador: ${(e as Error).message}`);
    },
  });

  // Função de submissão adaptada para ser chamada diretamente
  const handleAddAdmin = () => {
    console.log("handleAddAdmin: Executing submission logic.");
    
    const trimmedEmail = emailToAdd.trim();
    
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      showError('Por favor, insira um e-mail válido.');
      return;
    }
    
    try {
        if (admins?.some(admin => admin.email.toLowerCase() === trimmedEmail.toLowerCase())) {
            showError(`O usuário ${trimmedEmail} já é um administrador.`);
            return;
        }
    } catch (validationError) {
        console.warn("Validation check failed:", validationError);
    }
    
    addAdminMutation.mutate(trimmedEmail);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Previne o comportamento padrão do formulário (se houver)
      handleAddAdmin();
    }
  };

  const handleRemoveClick = (user: AdminUser) => {
    setUserToRemove(user);
    setIsAlertOpen(true);
  };

  const confirmRemoveAdmin = () => {
    if (userToRemove) {
      removeAdminMutation.mutate(userToRemove.id);
    }
  };

  const totalAdmins = admins?.length || 0;

  return (
    <div className="space-y-6">
      {/* Seção Adicionar Administrador */}
      <Card className="shadow-none border-none rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <UserPlus className="w-6 h-6" /> Adicionar Administrador
          </CardTitle>
          <CardDescription>Promova um usuário existente para administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Removido o <form> e usando div */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">Email do usuário</label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                onKeyDown={handleKeyDown} // Adicionado onKeyDown
                disabled={addAdminMutation.isPending}
                className="h-12 rounded-2xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-none"
              />
            </div>
            <Button 
              type="button" // Garantindo que não seja submit nativo
              onClick={handleAddAdmin} // Chamada direta
              disabled={addAdminMutation.isPending || !emailToAdd.trim()}
              className="bg-highlight hover:bg-highlight/90 h-12 px-4 flex items-center gap-2 text-base font-bold"
            >
              {addAdminMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção Administradores Ativos */}
      <Card className="shadow-none border-none rounded-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <Shield className="w-6 h-6" /> Administradores Ativos
          </CardTitle>
          <CardDescription>Total: {totalAdmins} administrador(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar</AlertTitle>
              <AlertDescription>Falha ao listar administradores: {error.message}</AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[150px]">{admin.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500 truncate max-w-[100px]">{admin.id}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge className="bg-yellow-500 text-white font-bold flex items-center gap-1">
                          <Shield className="h-3 w-3 fill-white" /> Admin
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveClick(admin)}
                          disabled={removeAdminMutation.isPending}
                          className="bg-red-600 hover:bg-red-700 flex items-center gap-1"
                        >
                          {removeAdminMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Alert Dialog para Confirmação de Remoção */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Confirmar Remoção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja remover o papel de administrador do usuário 
              <span className="font-bold text-gray-900"> {userToRemove?.email}</span>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeAdminMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveAdmin} disabled={removeAdminMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {removeAdminMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}