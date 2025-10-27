import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { WeekSchedule } from '@/types/schedule';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Utensils, Image, Link, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

// ... (restante do arquivo)