import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils/url';
import { useNavigate } from 'react-router-dom';

// ... (restante do arquivo)