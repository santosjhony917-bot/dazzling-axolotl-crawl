import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { AuthProvider, useAuthData } from './context/AuthContext';
import { RestaurantProvider, useRestaurantData } from './context/RestaurantContext';
import PrivateRoute from './components/PrivateRoute';
import ProfileSettingsPage from './pages/restaurant/ProfileSettingsPage';
import CategoryDetailsPage from './pages/restaurant/CategoryDetails';
import UpgradePage from './pages/Upgrade';
import RestaurantDashboardPage from './pages/restaurant/RestaurantDashboardPage';
import MetricsPage from './pages/restaurant/MetricsPage';
import GalleryManagementPage from './pages/restaurant/GalleryManagementPage';
import MenuManagementPage from './pages/restaurant/MenuManagementPage';
import AdminRestaurantMenu from './pages/admin/AdminRestaurantMenu';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRoute from './components/AdminRoute';
import { Loader2 } from 'lucide-react';

// Wrapper components to provide restaurantId from context
const MenuManagementWrapper = () => {
  const { restaurant, isLoading } = useRestaurantData();
  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!restaurant) return <p className="text-center mt-10">Nenhum restaurante encontrado.</p>;
  return <MenuManagementPage />;
};

const GalleryManagementWrapper = () => {
  const { restaurant, isLoading } = useRestaurantData();
  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!restaurant) return <p className="text-center mt-10">Nenhum restaurante encontrado.</p>;
  return <GalleryManagementPage />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <RestaurantProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Restaurant Area Routes */}
            <Route path="/restaurant-area" element={<PrivateRoute />}>
              <Route index element={<RestaurantDashboardPage />} />
              <Route path="dashboard" element={<RestaurantDashboardPage />} />
              <Route path="settings" element={<ProfileSettingsPage />} />
              <Route path="menu" element={<MenuManagementWrapper />} />
              <Route path="menu/:categoryId" element={<CategoryDetailsPage />} />
              <Route path="gallery" element={<GalleryManagementWrapper />} />
              <Route path="metrics" element={<MetricsPage />} />
              <Route path="upgrade" element={<UpgradePage />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="restaurants/:restaurantId/menu/:categoryId" element={<AdminRestaurantMenu />} />
            </Route>
          </Routes>
        </RestaurantProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;