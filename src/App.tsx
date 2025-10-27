import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import ProfilePage from './pages/Profile';
import FavoritesPage from './pages/Favorites';
import RestaurantPage from './pages/Restaurant';
import SearchPage from './pages/Search';
import { AuthContextProvider, useAuthContext } from './context/AuthContext'; // Importação corrigida
import SessionContextProvider from './context/SessionContext';
import RestaurantBottomNav from './components/restaurant/RestaurantBottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantArea from './pages/RestaurantArea';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import MenuManagement from './pages/restaurant/MenuManagement';
import GalleryManagement from './pages/pages/restaurant/GalleryManagement'; // Corrigido o caminho
import UpgradePage from './pages/Upgrade';
import CategoryDetails from './pages/restaurant/CategoryDetails';
import { RestaurantContextProvider } from './context/RestaurantContext'; // Importando o novo contexto
import ProfileManagementLayout from './components/restaurant/ProfileManagementLayout';
import { Loader2 } from 'lucide-react';

// Componente Wrapper para rotas de área do restaurante
const RestaurantAreaWrapper: React.FC = () => {
  const { restaurant, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    // Redirecionar para a criação do restaurante ou dashboard principal se não tiver um
    return <p className="p-8 text-red-500">Você precisa cadastrar um restaurante.</p>;
  }

  return (
    <RestaurantContextProvider>
      <ProfileManagementLayout restaurant={restaurant}>
        <Routes>
          <Route path="dashboard" element={<RestaurantDashboard />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="menu/:categoryId" element={<CategoryDetails />} />
          <Route path="gallery" element={<GalleryManagement />} />
          <Route path="upgrade" element={<UpgradePage />} />
          {/* Adicionar outras rotas de gerenciamento aqui */}
        </Routes>
      </ProfileManagementLayout>
    </RestaurantContextProvider>
  );
};


function App() {
  return (
    <Router>
      <AuthContextProvider>
        <SessionContextProvider>
          <div className="relative min-h-screen">
            <main className="pb-16 md:pb-0">
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/" element={<IndexPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/restaurant/:id" element={<RestaurantPage />} />
                <Route path="/search" element={<SearchPage />} />

                {/* Rotas Protegidas (Cliente) */}
                <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
                <Route path="/favorites" element={<ProtectedRoute element={<FavoritesPage />} />} />

                {/* Rotas Protegidas (Área do Restaurante) */}
                <Route path="/restaurant-area/:id/*" element={<ProtectedRoute element={<RestaurantAreaWrapper />} requiredRole="restaurant_owner" />} />
                
                {/* Rotas de Admin (Placeholder) */}
                {/* <Route path="/admin/*" element={<ProtectedRoute element={<AdminLayout />} requiredRole="admin" />} /> */}
              </Routes>
            </main>
            <RestaurantBottomNav />
          </div>
        </SessionContextProvider>
      </AuthContextProvider>
    </Router>
  );
}

export default App;