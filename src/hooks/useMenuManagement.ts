import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';
import { showError, showSuccess } from '@/utils/toast';
import { useRestaurant } from './useRestaurant';
import { useAuth } from '@/context/AuthContext';

interface MenuManagementResult {
// ... (restante do código)