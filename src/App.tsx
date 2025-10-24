import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import RestaurantArea from './pages/RestaurantArea';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import RestaurantProfilePublic from './pages/RestaurantProfilePublic';
import MenuManagement from './pages/MenuManagement'; // Importando a nova página
import { SessionContextProvider } from './hooks/useAuth';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/restaurant/:id" element={<RestaurantProfilePublic />} />
          
          {/* Área Administrativa do Restaurante */}
          <Route path="/restaurant" element={<RestaurantArea />}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<MenuManagement />} /> {/* Nova Rota */}
            <Route path="settings" element={<Settings />} />
            <Route path="subscription" element={<Subscription />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<Index />} />
        </Routes>
      </Router>
      <Toaster />
    </SessionContextProvider>
  );
}

export default App;