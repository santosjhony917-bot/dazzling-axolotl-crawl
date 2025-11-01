"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RestaurantManage from "./pages/RestaurantManage";
import RestaurantMenu from "./pages/RestaurantMenu";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Splash from "./pages/Splash";
import Legal from "./pages/Legal";
import HelpCenter from "./pages/HelpCenter";
import ForgotPassword from "./pages/ForgotPassword";
import RestaurantAreaHub from "./pages/RestaurantAreaHub";
import RestaurantLogin from "./pages/RestaurantLogin";
import RestaurantSignup from "./pages/RestaurantSignup";
import ClaimRestaurant from "./pages/ClaimRestaurant";
import Upgrade from "./pages/Upgrade";
import RestaurantHomePage from "./pages/restaurant/RestaurantHomePage";
import ProfileSettingsPage from "./pages/restaurant/ProfileSettingsPage";
import MenuManagement from "./pages/restaurant/MenuManagement";
import CategoryDetails from "./pages/restaurant/CategoryDetails";
import GalleryManagement from "./pages/restaurant/GalleryManagement";
import MetricsPage from "./pages/restaurant/MetricsPage";
import ClientProfilePage from "./pages/ClientProfilePage";
import Favorites from "./pages/Favorites";
import SearchUnifiedPage from "./pages/SearchUnifiedPage";
import RestaurantResultsPage from "./pages/RestaurantResults";
import RestaurantProfilePublic from "./pages/RestaurantProfilePublic";
import FullMenuPage from "./pages/FullMenuPage";
import MenuItemDetails from "./pages/MenuItemDetails";

// Admin Pages
import AdminRestaurants from "./pages/admin/AdminRestaurants";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminUploadInfo from "./pages/admin/AdminUploadInfo";
import EditRestaurant from "./pages/admin/EditRestaurant";
import Files from "./pages/admin/Files";
import ImportMenu from "./pages/admin/ImportMenu";
import ManageAdmins from "./pages/admin/ManageAdmins";
import PopularCategories from "./pages/admin/PopularCategories";
import InstantMetrics from "./pages/admin/InstantMetrics";
import ManagePlans from "./pages/admin/ManagePlans";
import ScheduledMetrics from "./pages/admin/ScheduledMetrics";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "./integrations/supabase/session-provider";
import ProtectedRoute from "./components/ProtectedRoute";
import PopularDishes from "./pages/PopularDishes";
import SharedLayoutWrapper from "./layouts/SharedLayoutWrapper";
import AdminLayout from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/popular-dishes" element={<PopularDishes />} />
            <Route path="/restaurant/:restaurantId" element={<RestaurantProfilePublic />} />
            <Route path="/restaurant/:restaurantId/menu-full" element={<FullMenuPage />} />
            <Route path="/menu-item/:itemId" element={<MenuItemDetails />} />
            <Route path="/restaurant-results" element={<RestaurantResultsPage />} />
            <Route path="/search-unified" element={<SearchUnifiedPage />} />

            {/* Restaurant Area Hub (Public entry point for restaurant owners) */}
            <Route path="/restaurant-area-hub" element={<RestaurantAreaHub />} />
            <Route path="/restaurant-area/login" element={<RestaurantLogin />} />
            <Route path="/restaurant-area/signup" element={<RestaurantSignup />} />
            <Route path="/restaurant-area/claim" element={<ClaimRestaurant />} />

            {/* Authenticated Client Routes */}
            <Route element={<ProtectedRoute requiredRole="authenticated" layout={SharedLayoutWrapper} />}>
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<ClientProfilePage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>

            {/* Authenticated Restaurant Owner Routes */}
            <Route element={<ProtectedRoute requiredRole="restaurant_owner" layout={SharedLayoutWrapper} />}>
              <Route path="/restaurant-area/home" element={<RestaurantHomePage />} />
              <Route path="/restaurant-area/profile-menu" element={<ProfileSettingsPage />} />
              <Route path="/restaurant-area/menu" element={<MenuManagement />} />
              <Route path="/restaurant-area/menu/:categoryId" element={<CategoryDetails />} />
              <Route path="/restaurant-area/gallery" element={<GalleryManagement />} />
              <Route path="/restaurant-area/metrics" element={<MetricsPage />} />
              <Route path="/restaurant-area/upgrade" element={<Upgrade />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute requiredRole="admin" layout={AdminLayout} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/restaurants" element={<AdminRestaurants />} />
              <Route path="/admin/restaurants/:restaurantId/edit" element={<EditRestaurant />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/banners" element={<AdminBanners />} />
              <Route path="/admin/upload-info" element={<AdminUploadInfo />} />
              <Route path="/admin/files" element={<Files />} />
              <Route path="/admin/import" element={<ImportMenu />} />
              <Route path="/admin/manage-admins" element={<ManageAdmins />} />
              <Route path="/admin/popular-categories" element={<PopularCategories />} />
              <Route path="/admin/instant-metrics" element={<InstantMetrics />} />
              <Route path="/admin/manage-plans" element={<ManagePlans />} />
              <Route path="/admin/scheduled-metrics" element={<ScheduledMetrics />} />
            </Route>

            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

export default App;