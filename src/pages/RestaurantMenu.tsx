import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Utensils, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { MenuCategory, MenuItem } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// ... (restante do código)