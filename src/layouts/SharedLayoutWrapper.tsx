"use client";

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RestaurantHeader from '@/components/restaurant/RestaurantHeader';
import AdminHeader from '@/components/admin/AdminHeader';
import { Loader2 } from 'lucide-react';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { restaurant, isPremium, isAdmin, isProfileLoading } = useAuthData();

  const isRestaurantRoute = location.pathname.startsWith('/restaurant');
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {isAdminRoute && isAdmin ? (
        <AdminHeader />
      ) : isRestaurantRoute && restaurant ? (
        <RestaurantHeader restaurant={restaurant} isPremium={isPremium} />
      ) : (
        <Header />
      )}
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default SharedLayoutWrapper;