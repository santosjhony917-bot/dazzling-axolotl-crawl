import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import RestaurantProfileMenu from './pages/restaurant/RestaurantProfileMenu';
import RestaurantProfileBasic from './pages/restaurant/RestaurantProfileBasic';
import RestaurantProfileAddress from './pages/restaurant/RestaurantProfileAddress';
import RestaurantProfileContact from './pages/restaurant/RestaurantProfileContact';
import UpgradePage from './pages/Upgrade';
import { AuthProvider } from './integrations/supabase/auth';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantSignup from './pages/restaurant/RestaurantSignup';
import WelcomePage from './pages/Welcome';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/restaurant/signup" element={<ProtectedRoute element={<RestaurantSignup />} />} />
          <Route path="/restaurant/profile" element={<ProtectedRoute element={<RestaurantProfileMenu />} />} />
          <Route path="/restaurant/profile/basic" element={<ProtectedRoute element={<RestaurantProfileBasic />} />} />
          <Route path="/restaurant/profile/address" element={<ProtectedRoute element={<RestaurantProfileAddress />} />} />
          <Route path="/restaurant/profile/contact" element={<ProtectedRoute element={<RestaurantProfileContact />} />} />
          <Route path="/upgrade" element={<ProtectedRoute element={<UpgradePage />} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;