import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona o dashboard legado para a nova arquitetura de expansão
    navigate('/admin/expansion', { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-slate-500 font-medium">Redirecionando para o Hub de Expansão...</p>
    </div>
  );
}