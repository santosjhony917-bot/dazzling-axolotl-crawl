import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminPage from "@/pages/Admin";
import AdminBannersPage from "@/pages/AdminBanners";
import AdminRestaurantsPage from "@/pages/AdminRestaurants";
import AdminScheduledMetricsPage from "@/pages/AdminScheduledMetrics";
import DashboardPage from "@/pages/Dashboard";
import FavoritesPage from "@/pages/Favorites";
import Index from "@/pages/Index";
import LoginPage from "@/pages/Login";
import OnboardingPage from "@/pages/Onboarding";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import PublicMenuPage from "@/pages/PublicMenuPage";
import RestaurantClaimPage from "@/pages/RestaurantClaimPage";
import RestaurantPage from "@/pages/RestaurantPage";
import TermsOfService from "@/pages/TermsOfService";
import AuthProvider from "@/providers/auth-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <AuthProvider>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/restaurant/:id" element={<RestaurantPage />} />
                <Route path="/restaurant/:restaurantId/menu" element={<PublicMenuPage />} />
                <Route path="/claim-restaurant/:claimCode" element={<RestaurantClaimPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/restaurants" element={<AdminRestaurantsPage />} />
                <Route path="/admin/banners" element={<AdminBannersPage />} />
                <Route path="/admin/scheduled-metrics" element={<AdminScheduledMetricsPage />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              </Routes>
            </AppLayout>
          </AuthProvider>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;