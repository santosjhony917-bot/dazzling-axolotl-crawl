import React from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useLocation, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function RestaurantArea() {
  const { user, isLoading, restaurant } = useAuthContext();
  const location = useLocation();
  const { id: urlId } = useParams<{ id: string }>();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Should be handled by ProtectedRoute, but as a fallback
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!restaurant) {
    // Se o usuário estiver autenticado, mas não tiver um restaurante, redireciona para a criação
    return <p className="p-8 text-red-500">Você precisa cadastrar um restaurante para acessar esta área.</p>;
  }
  
  // Ensure the URL ID matches the user's restaurant ID
  if (urlId !== restaurant.id) {
      // Redirect to the correct restaurant area if the URL ID is wrong
      return <Navigate to={`/restaurant-area/${restaurant.id}/dashboard`} replace />;
  }

  // This component is now mostly a wrapper/guard, the actual routing happens in App.tsx (RestaurantAreaWrapper)
  // Since App.tsx handles the routing inside RestaurantAreaWrapper, this component might be redundant 
  // or needs to be adapted based on how the routing structure is intended.
  
  // Given the new structure in App.tsx, this file might not be needed anymore, 
  // but if it's used as a route element, it should redirect to the dashboard.
  return <Navigate to={`/restaurant-area/${restaurant.id}/dashboard`} replace />;
}