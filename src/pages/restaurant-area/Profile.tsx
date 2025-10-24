import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement';
import { Restaurant } from '@/types/restaurant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom'; // Importa useNavigate
import { createPageUrl } from '@/utils/url'; // Importa createPageUrl

export default function RestaurantProfilePage() {
// ... (restante do código)