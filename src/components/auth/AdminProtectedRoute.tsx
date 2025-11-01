"use client";

import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const AdminProtectedRoute: React.FC = () => {
  const { session, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session) {
        const { data, error } = await supabase.rpc('is_admin');
        if (error) {
          console.error('Error checking admin status:', error);
        } else {
          setIsAdmin(data === true);
        }
      }
      setCheckingAdmin(false);
    };

    if (!isLoading && session) {
      checkAdminStatus();
    } else if (!isLoading && !session) {
      setCheckingAdmin(false);
    }
  }, [session, isLoading]);

  if (isLoading || checkingAdmin) {
    return <div className="p-4 text-center">Verificando permissões...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;