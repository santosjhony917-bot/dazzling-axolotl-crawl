import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantWithDistance } from '@/types/supabase';
import { fetchNearbyRestaurants } from '@/integrations/supabase/restaurants';
import { Card } from '@/components/ui/card';
import { Loader2, Search, MapPin, AlertTriangle } from 'lucide-react';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

// ... (restante do arquivo)