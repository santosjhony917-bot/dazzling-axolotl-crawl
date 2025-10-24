import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff, ArrowRight, MapPin } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils/url';
import { useAuth } from '@/context/AuthContext'; // Importa o hook useAuth

const GoogleIcon = ({ className }: { className?: string }) => (
// ... (restante do código)