import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MenuCategory, MenuItem } from "@/types/supabase";
import MenuCategoryList from "@/components/menu/MenuCategoryList";
import { Loader2, AlertTriangle } from "lucide-react";

// ... (restante do arquivo)