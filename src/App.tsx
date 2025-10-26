import React from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantArea from './pages/RestaurantArea';
import MenuManagement from './pages/restaurant/MenuManagement';
import CategoryDetails from './pages/restaurant/CategoryDetails'; // Novo componente
import { AuthContextProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient();

export const Routes = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESTAURANT_AREA: '/restaurant-area',
  MENU_MANAGEMENT: '/restaurant-area/menu',
  CATEGORY_DETAILS: '/restaurant-area/menu/:categoryId',
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContextProvider>
        <Router>
          <RouterRoutes>
            <Route path={Routes.HOME} element={<Index />} />
            <Route path={Routes.LOGIN} element={<Login />} />
            <Route path={Routes.REGISTER} element={<Register />} />
            
            <Route path={Routes.RESTAURANT_AREA} element={<RestaurantArea />}>
              {/* Rotas aninhadas para a área do restaurante */}
              <Route path="menu" element={<MenuManagement />} />
              <Route path="menu/:categoryId" element={<CategoryDetails />} />
              {/* Adicione outras rotas aninhadas aqui, como /restaurant-area/profile */}
            </Route>

          </RouterRoutes>
        </Router>
        <Toaster />
      </AuthContextProvider>
    </QueryClientProvider>
  );
}

export default App;