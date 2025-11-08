import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import RestaurantArea from "./pages/restaurant/RestaurantArea";
import RestaurantRegistrationPage from "./pages/restaurant/RestaurantRegistrationPage";
import RestaurantMenuPage from "./pages/restaurant/RestaurantMenuPage";
import RestaurantProfilePage from "./pages/restaurant/RestaurantProfilePage";
import ProfileSettingsPage from "./pages/restaurant/ProfileSettingsPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./integrations/supabase/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/restaurant-area" element={<RestaurantArea />} />
          <Route path="/restaurant-area/register" element={<RestaurantRegistrationPage />} />
          <Route path="/restaurant-area/menu" element={<RestaurantMenuPage />} />
          <Route path="/restaurant-area/profile-menu" element={<RestaurantProfilePage />} />
          <Route path="/restaurant-area/profile" element={<ProfileSettingsPage />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;