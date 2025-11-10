"use client";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Private from "./pages/Private";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { Toaster } from "@/components/ui/sonner";
import RestaurantPage from "./pages/RestaurantPage";
import RestaurantFullMenuPage from "./pages/RestaurantFullMenuPage"; // Importando a nova página

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Index />} />
          <Route path="login" element={<Login />} />
          <Route path="private" element={<Private />} />
          <Route path="/restaurant/:id" element={<RestaurantPage />} />
          <Route path="/restaurant/:id/menu-full" element={<RestaurantFullMenuPage />} /> {/* Nova rota */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;