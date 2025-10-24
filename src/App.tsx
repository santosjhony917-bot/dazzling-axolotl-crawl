import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';
import RestaurantLogin from './pages/RestaurantLogin';
import RestaurantSignup from './pages/RestaurantSignup';
import RestaurantProfileMenu from './pages/RestaurantProfileMenu';
import RestaurantMenu from './pages/RestaurantMenu';
import TermsAndPrivacy from './pages/TermsAndPrivacy'; // Importando o novo componente
import { SessionContextProvider } from './integrations/supabase/session-context';

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Restaurant Area Routes */}
          <Route path="/restaurant-login" element={<RestaurantLogin />} />
          <Route path="/restaurant-signup" element={<RestaurantSignup />} />
          <Route path="/restaurant-area/perfil" element={<RestaurantProfileMenu />} />
          <Route path="/restaurant-area/menu" element={<RestaurantMenu />} />

          {/* Public/Utility Routes */}
          <Route path="/terms-and-privacy" element={<TermsAndPrivacy />} />
          
          {/* Placeholder for dynamic routes */}
          <Route path="/restaurant-profile/:id" element={<Index />} />
          <Route path="/restaurant-area/upgrade" element={<Index />} />
          <Route path="/restaurant-area/help" element={<Index />} />
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;