import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Splash from "./pages/Splash";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import FindRestaurants from "./pages/FindRestaurants";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import RestaurantSignup from "./pages/RestaurantSignup";
import RestaurantLogin from "./pages/RestaurantLogin";
import AuthPage from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return null; // Ou um componente de loading
  }

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/home" element={<Index />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/find-restaurants"
        element={session ? <FindRestaurants /> : <AuthPage />}
      />
      <Route path="/restaurant-dashboard" element={<RestaurantDashboard />} />
      <Route path="/restaurant-signup" element={<RestaurantSignup />} />
      <Route path="/restaurant-login" element={<RestaurantLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;