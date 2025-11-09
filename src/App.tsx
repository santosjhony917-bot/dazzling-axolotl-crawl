import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';

import Index from './pages/Index';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import RestaurantPage from './pages/Restaurant/RestaurantPage';
import NewRestaurantPage from './pages/Restaurant/NewRestaurantPage';
import RestaurantSettingsPage from './pages/Restaurant/RestaurantSettingsPage';
import EditBasicInfoPage from './pages/Restaurant/EditBasicInfoPage';
import EditContactInfoPage from './pages/Restaurant/EditContactInfoPage';
import EditAddressPage from './pages/Restaurant/EditAddressPage';
import EditHoursPage from './pages/Restaurant/EditHoursPage';
import EditOrderChannelsPage from './pages/Restaurant/EditOrderChannelsPage';
import EditPaymentMethodsPage from './pages/Restaurant/EditPaymentMethodsPage';
import EditGalleryPage from './pages/Restaurant/EditGalleryPage';
import MenuManagementPage from './pages/Restaurant/MenuManagementPage';
import ProfilePage from './pages/Profile/ProfilePage';
import FavoritesPage from './pages/Favorites/FavoritesPage';
import SearchPage from './pages/Search/SearchPage';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import EditDocumentsPage from './pages/Restaurant/EditDocumentsPage';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <main className="pb-20">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/restaurant/:id" element={<RestaurantPage />} />
              
              {/* Protected Routes */}
              <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/restaurant/new" element={<ProtectedRoute><NewRestaurantPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/basic" element={<ProtectedRoute><EditBasicInfoPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/contact" element={<ProtectedRoute><EditContactInfoPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/documents" element={<ProtectedRoute><EditDocumentsPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/address" element={<ProtectedRoute><EditAddressPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/hours" element={<ProtectedRoute><EditHoursPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/order-channels" element={<ProtectedRoute><EditOrderChannelsPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/payment-methods" element={<ProtectedRoute><EditPaymentMethodsPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/edit/gallery" element={<ProtectedRoute><EditGalleryPage /></ProtectedRoute>} />
              <Route path="/restaurant/:id/menu" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <BottomNav />
          <Toaster richColors />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;