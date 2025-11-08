import { Toaster } from 'react-hot-toast'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Index from './pages/Index'
import RestaurantPage from './pages/Restaurant'
import MyRestaurantPage from './pages/MyRestaurant'
import UpgradePage from './pages/Upgrade'
import AdminPage from './pages/Admin'
import AppLayout from './components/AppLayout'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/my-restaurant" element={<MyRestaurantPage />} />
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          <Toaster position="bottom-center" />
        </AppLayout>
      </Router>
    </AuthProvider>
  )
}

export default App