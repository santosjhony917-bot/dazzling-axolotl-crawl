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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // <-- Importação adicionada

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
  const { data: admins, isLoading, error } = useQuery<AdminUser[], Error>({
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
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
    },
    onError: (e) => {
      showError(`Falha ao adicionar administrador: ${(e as Error).message}`);
    },
  });

  // Mutação para remover administrador
  const removeAdminMutation = useMutation({
    mutationFn: removeAdmin,
    onSuccess: () => {
      showSuccess(`Papel de administrador removido.`);
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
      setIsAlertOpen(false);
      setUserToRemove(null);
    },
    onError: (e) => {
      showError(`Falha ao remover administrador: ${(e as Error).message}`);
    },
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = emailToAdd.trim();
    
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      showError('Por favor, insira um e-mail válido.');
      return;
    }
    
    // Verifica se o usuário já é administrador (prevenção de erro comum)
    if (admins?.some(admin => admin.email.toLowerCase() === trimmedEmail.toLowerCase())) {
        showError(`O usuário ${trimmedEmail} já é um administrador.`);
        return;
    }
    
    addAdminMutation.mutate(trimmedEmail);
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
      <Card className="shadow-lg border-none rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022D68]">
            <UserPlus className="w-6 h-6" /> Adicionar Administrador
          </CardTitle>
          <CardDescription>Promova um usuário existente para administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">Email do usuário</label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={emailToAdd}
                onChange={(e) => setEmailToAdd(e.target.value)}
                disabled={addAdminMutation.isPending}
                className="h-10 rounded-lg"
              />
            </div>
            <Button 
              type="submit" 
              disabled={addAdminMutation.isPending || !emailToAdd.trim()}
              className="bg-highlight hover:bg-highlight/90 h-10 px-4 flex items-center gap-2"
            >
              {addAdminMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seção Administradores Ativos */}
      <Card className="shadow-lg border-none rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022D68]">
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
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id}>
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