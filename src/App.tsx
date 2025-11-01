import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import SharedLayoutWrapper from './layouts/SharedLayoutWrapper';
import Home from './pages/Home';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import RestaurantArea from './pages/restaurant-area/Index';
import RestaurantDashboard from './pages/restaurant-area/RestaurantDashboard';
import RestaurantSettings from './pages/restaurant-area/RestaurantSettings';
import RestaurantMenu from './pages/restaurant-area/RestaurantMenu';
import RestaurantGallery from './pages/restaurant-area/RestaurantGallery';
import RestaurantPublicPage from './pages/RestaurantPublicPage';
import BannersPage from './pages/restaurant-area/BannersPage'; // Importar a nova página

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/restaurant/:id" element={<RestaurantPublicPage />} />

        <Route element={<SharedLayoutWrapper />}>
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
          <Route path="/favorites" element={<PrivateRoute><Favorites /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        </Route>

        {/* Restaurant Area Routes */}
        <Route path="/restaurant-area" element={<PrivateRoute><RestaurantArea /></PrivateRoute>}>
          <Route index element={<RestaurantDashboard />} />
          <Route path="dashboard" element={<RestaurantDashboard />} />
          <Route path="menu" element={<RestaurantMenu />} />
          <Route path="gallery" element={<RestaurantGallery />} />
          <Route path="settings" element={<RestaurantSettings />} />
          <Route path="banners" element={<BannersPage />} /> {/* Nova rota para banners */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;