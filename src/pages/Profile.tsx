import { useState } from "react";
import { ChevronRight, LogOut, Bell, Shield, CreditCard, HelpCircle, Settings, Globe, Moon, FileText, Edit, UserCircle, Phone, Calendar, MapPinned, ArrowLeft, Search, Home, Crown, Utensils } from "lucide-react";
import CustomerBottomNav from "@/components/CustomerBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import EditFieldDialog from "@/components/EditFieldDialog";
import { createPageUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

// Validation schemas (mantidos)
// ... (restante do código)