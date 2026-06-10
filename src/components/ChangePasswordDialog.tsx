import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const passwordSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const onSubmit = async (data: PasswordFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });

      if (error) {
        // Supabase often requires re-authentication for password changes
        if (error.message.includes('Auth session missing')) {
             showError("Sua sessão expirou. Por favor, faça login novamente para alterar a senha.");
        } else {
             showError(`Falha ao alterar senha: ${error.message}`);
        }
        return;
      }

      showSuccess("Senha alterada com sucesso!");
      form.reset();
      onClose();
    } catch (e) {
      showError("Erro inesperado ao alterar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-none">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Alterar Senha</DialogTitle>
          </div>
          <DialogDescription>
            Insira e confirme sua nova senha. Você precisará fazer login novamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Nova Senha */}
          <div className="relative">
            <Input
              {...form.register('password')}
              type={passwordVisible ? "text" : "password"}
              placeholder="Nova Senha"
              className="h-12 rounded-2xl text-base pr-12 focus:border-highlight focus:ring-highlight shadow-none"
              disabled={loading}
            />
            <button
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
              type="button"
            >
              {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}

          {/* Confirmar Senha */}
          <div className="relative">
            <Input
              {...form.register('confirmPassword')}
              type={passwordVisible ? "text" : "password"}
              placeholder="Confirmar Nova Senha"
              className="h-12 rounded-2xl text-base pr-12 focus:border-highlight focus:ring-highlight shadow-none"
              disabled={loading}
            />
            <button
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
              type="button"
            >
              {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.formState.errors.confirmPassword && <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="rounded-2xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} variant="highlight" className="rounded-2xl">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Senha"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;