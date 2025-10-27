import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import RestaurantDashboard from './pages/restaurant-area/Dashboard';
import MenuManagement from './pages/restaurant-area/Menu';
import ProfilePage from './pages/restaurant-area/Profile'; // Import the new page component
import { SessionContextProvider } from './integrations/supabase/session-context';
import ProtectedRoute from './components/ProtectedRoute';
import RestaurantProfile from './pages/RestaurantProfile';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/r/:restaurantId" element={<RestaurantProfile />} />

          {/* Admin Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>

          {/* Restaurant Owner Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['restaurant_owner']} />}>
            <Route path="/restaurant-area/home" element={<RestaurantDashboard />} />
            {/* Use ProfilePage instead of ProfileManagementLayout directly */}
            <Route path="/restaurant-area/profile-menu" element={<ProfilePage />} /> 
            <Route path="/restaurant-area/menu" element={<MenuManagement />} />
          </Route>
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;