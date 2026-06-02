import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  PlusCircle, 
  CheckCircle, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Briefcase, 
  Coins, 
  Eye, 
  Search, 
  AlertTriangle,
  LogOut,
  LogIn,
  ExternalLink,
  MapPin,
  Phone,
  FileText,
  Instagram,
  Facebook,
  Image as ImageIcon,
  Clock,
  Camera,
  Sparkles,
  Clipboard
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { WeekSchedule } from '@/types/schedule';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile, deleteFileFromUrl, RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
interface ScrapedRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  city: string;
  state: string;
  status: 'Pendente' | 'Concluída';
  reward: number;
  imported_at: string;
  instagram?: string;
  facebook?: string;
  logo?: string;
  coverImage?: string;
  galleryImages?: string[];
  openingHours?: WeekSchedule;
  website?: string;
  googleMapsUrl?: string;
  assignedToId?: string;
  assignedToName?: string;
  menuSourceUrl?: string;
  menuSourceImage?: string;
}

interface MenuItemInput {
  id: string;
  name: string;
  description: string;
  price: string;
  image_url?: string;
}

interface MenuCategoryInput {
  id: string;
  name: string;
  items: MenuItemInput[];
}

const getDeterministicUUID = (str: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0') + 
              Math.abs(hash * 31).toString(16).padStart(8, '0') +
              Math.abs(hash * 17).toString(16).padStart(8, '0') +
              Math.abs(hash * 13).toString(16).padStart(8, '0');
  
  const parts = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(12, 15),
    ((parseInt(hex.substring(15, 17), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.substring(17, 19),
    hex.substring(19, 31)
  ];
  return parts.join('-');
};

export default function FreelancerPortal() {
  const navigate = useNavigate();
  
  // States para Dados do Freelancer
  const [balance, setBalance] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [missions, setMissions] = useState<ScrapedRestaurant[]>([]);
  const [activeTab, setActiveTab] = useState<'disponiveis' | 'concluidas'>('disponiveis');

  const [activeFreelancerId, setActiveFreelancerId] = useState<string>(() => {
    return localStorage.getItem('mock-active-freelancer-id') || 'f1';
  });
  const [freelancersList, setFreelancersList] = useState<{ 
    id: string; 
    name: string; 
    email: string; 
    completedMissions: number; 
    balance: number; 
    lastActivity: string;
    status?: 'Ativo' | 'Pendente' | 'Recusado';
    phone?: string;
    cpf?: string;
    pixKeyType?: string;
    pixKey?: string;
  }[]>([]);

  // States para Cadastro de Freelancer
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regPixType, setRegPixType] = useState('cpf');
  const [regPixKey, setRegPixKey] = useState('');

  // States para Login e Recuperação de Senha
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isForgotDialogOpen, setIsForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCpf, setForgotCpf] = useState('');
  const [forgotPixKey, setForgotPixKey] = useState('');
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [verifiedFreelancerId, setVerifiedFreelancerId] = useState('');
  
  // States para Validação da Gerente
  const [selectedReviewMission, setSelectedReviewMission] = useState<ScrapedRestaurant | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [managerFeedback, setManagerFeedback] = useState('');
  const [managerTab, setManagerTab] = useState<'pendentes' | 'retornadas' | 'historico'>('pendentes');

  const getInitials = (name: string) => {
    if (!name) return 'FL';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getCompletionsByDay = () => {
    const groups: Record<string, ScrapedRestaurant[]> = {};
    const myConcluidas = missions.filter(m => 
      m.status === 'Concluída' && m.assignedToId === activeFreelancerId
    );

    myConcluidas.forEach(m => {
      if (!m.completedAt) return;
      const dateObj = new Date(m.completedAt);
      if (isNaN(dateObj.getTime())) return;
      
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const dateKey = `${year}-${month}-${day}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(m);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(key => {
        const [year, month, day] = key.split('-');
        return {
          dateStr: `${day}/${month}/${year}`,
          missions: groups[key]
        };
      });
  };

  const handleSwitchFreelancer = (id: string) => {
    try {
      localStorage.setItem('mock-active-freelancer-id', id);
      setActiveFreelancerId(id);
      
      const fl = freelancersList.find(f => f.id === id);
      if (fl) {
        setBalance(fl.balance);
        setCompletedCount(fl.completedMissions);
        localStorage.setItem('mock-freelancer-balance', fl.balance.toString());
        localStorage.setItem('mock-freelancer-completed', fl.completedMissions.toString());
      }
      
      window.dispatchEvent(new Event('storage'));
      showSuccess(`Logado como ${fl?.name || id}`);
    } catch (e) {
      console.error(e);
    }
  };
  
  // Mission Workspace State
  const [activeMission, setActiveMission] = useState<ScrapedRestaurant | null>(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [logoImage, setLogoImage] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [openingHours, setOpeningHours] = useState<WeekSchedule>({
    monday: { isOpen: false, slots: [] },
    tuesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
    wednesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
    thursday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
    friday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
    saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
    sunday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] }
  });
  const [menuCategories, setMenuCategories] = useState<MenuCategoryInput[]>([
    { id: 'cat-1', name: 'Mais Pedidos', items: [{ id: 'item-1', name: '', description: '', price: '' }] }
  ]);
  
  // Auditing / Menu Source States
  const [menuSourceUrl, setMenuSourceUrl] = useState('');
  const [menuSourceImage, setMenuSourceImage] = useState('');
  
  // AI Menu Parser States
  const [aiMenuText, setAiMenuText] = useState('');
  const [isParsingMenu, setIsParsingMenu] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  
  // Resgate Dialog State
  const [isRedeemDialogOpen, setIsRedeemDialogOpen] = useState(false);
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixKey, setPixKey] = useState('');

  // Carrega e inicializa dados do LocalStorage
  // Carrega e inicializa dados do LocalStorage
  const loadLocalStorageData = () => {
    try {
      // 1. Carrega a lista de freelancers cadastrados do localStorage
      let flList = [];
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      if (savedFreelancers) {
        flList = JSON.parse(savedFreelancers);
        // Migração: Apaga os usuários simulados antigos ('f1', 'f2', 'f3') para garantir cadastro real
        if (flList.some((f: any) => f.id === 'f1' || f.id === 'f2' || f.id === 'f3')) {
          flList = flList.filter((f: any) => f.id !== 'f1' && f.id !== 'f2' && f.id !== 'f3');
        }
      } else {
        flList = [];
      }

      // Garante que o perfil de gerente padrão existe na lista de freelancers cadastrados
      if (!flList.some((f: any) => f.role === 'gerente' || f.email === 'gerente@filterfood.com')) {
        flList.push({
          id: 'manager-1',
          name: 'Gerente Geral',
          email: 'gerente@filterfood.com',
          password: 'gerente123',
          role: 'gerente',
          completedMissions: 0,
          balance: 0,
          lastActivity: 'Nenhuma',
          status: 'Ativo'
        });
      }
      localStorage.setItem('mock-freelancers', JSON.stringify(flList));
      setFreelancersList(flList);

      // 2. Determina o ID do freelancer ativo
      const activeId = localStorage.getItem('mock-active-freelancer-id') || '';
      setActiveFreelancerId(activeId);

      // 3. Atualiza os estados de balance e completedCount baseados no freelancer ativo
      const activeFreelancer = flList.find((f: any) => f.id === activeId);
      setBalance(activeFreelancer?.balance || 0);
      setCompletedCount(activeFreelancer?.completedMissions || 0);

      // Carrega missões
      const savedMissions = localStorage.getItem('mock-freelancer-missions');
      if (savedMissions) {
        setMissions(JSON.parse(savedMissions));
      } else {
        setMissions([]);
      }
    } catch (e) {
      console.error('Erro ao ler do localStorage no portal freelancer:', e);
    }
  };

  useEffect(() => {
    loadLocalStorageData();

    const handleSync = () => {
      loadLocalStorageData();
    };

    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Iniciar uma Missão
  const handleStartMission = (mission: ScrapedRestaurant) => {
    setActiveMission(mission);
    setDescription(mission.description || '');
    setCategory(mission.category || '');
    setPhone(mission.phone || '');
    
    if (mission.status && mission.status !== 'Pendente') {
      // Modo Edição: carregar diretamente do objeto da missão
      setAddress(mission.address || '');
      setNeighborhood(mission.neighborhood || '');
      setCity(mission.city || '');
      setState(mission.state || '');
      setNumber(mission.number || 'S/N');
      setCep(mission.cep || '');
    } else {
      // Decompõe o endereço do maps com maior precisão e extração de CEP
      let mainAddress = '';
      let nhood = '';
      let num = 'S/N';
      let extractedCep = '';

      if (mission.address) {
        // Extrai CEP (formato 00000-000)
        const cepMatch = mission.address.match(/\d{5}-\d{3}/);
        if (cepMatch) {
          extractedCep = cepMatch[0];
        }

        const addressParts = mission.address.split('-');
        
        // Parte 0: Nome da rua e número (ex: "Av. Ruy Carneiro, 302 ")
        const rawStreetAndNum = addressParts[0]?.trim() || '';
        if (rawStreetAndNum) {
          const streetParts = rawStreetAndNum.split(',');
          mainAddress = streetParts[0]?.trim() || '';
          const possibleNum = streetParts[1]?.trim() || '';
          // Evita carregar cidades/estados como número
          if (possibleNum && !possibleNum.includes(',') && possibleNum.length < 10) {
            num = possibleNum;
          }
        }

        // Parte 1: Bairro e cidade (ex: " Tambaú, João Pessoa ")
        const rawNhoodAndCity = addressParts[1]?.trim() || '';
        if (rawNhoodAndCity) {
          const nhoodParts = rawNhoodAndCity.split(',');
          nhood = nhoodParts[0]?.trim() || '';
        }
      }

      setAddress(mainAddress || mission.address || '');
      setNeighborhood(nhood);
      setCity(mission.city || '');
      setState(mission.state || '');
      setNumber(num);
      setCep(extractedCep);
    }
    
    setInstagram(mission.instagram || '');
    setFacebook(mission.facebook || '');
    setLogoImage(mission.logo || '');
    setCoverImage(mission.coverImage || '');
    setGalleryImages(mission.galleryImages || []);
    setMenuSourceUrl(mission.menuSourceUrl || '');
    setMenuSourceImage(mission.menuSourceImage || '');
    
    if (mission.openingHours) {
      setOpeningHours(JSON.parse(JSON.stringify(mission.openingHours)));
    } else {
      setOpeningHours({
        monday: { isOpen: false, slots: [] },
        tuesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
        wednesday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
        thursday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
        friday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
        saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
        sunday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] }
      });
    }

    if (mission.menuCategories && mission.menuCategories.length > 0) {
      setMenuCategories(JSON.parse(JSON.stringify(mission.menuCategories)));
    } else {
      setMenuCategories([
        { 
          id: `cat-${Date.now()}`, 
          name: 'Pratos Principais', 
          items: [{ id: `item-${Date.now()}`, name: '', description: '', price: '' }] 
        }
      ]);
    }

    // Rolagem para o topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Menu Categories Builders
  const handleAddCategory = () => {
    setMenuCategories([
      ...menuCategories,
      { 
        id: `cat-${Date.now()}-${Math.random()}`, 
        name: '', 
        items: [{ id: `item-${Date.now()}-${Math.random()}`, name: '', description: '', price: '' }] 
      }
    ]);
  };

  const handleRemoveCategory = (catId: string) => {
    setMenuCategories(menuCategories.filter(c => c.id !== catId));
  };

  const handleCategoryNameChange = (catId: string, name: string) => {
    setMenuCategories(menuCategories.map(c => {
      if (c.id === catId) {
        return { ...c, name };
      }
      return c;
    }));
  };

  const handleAddItem = (catId: string) => {
    setMenuCategories(menuCategories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: [
            ...c.items,
            { id: `item-${Date.now()}-${Math.random()}`, name: '', description: '', price: '', image_url: '' }
          ]
        };
      }
      return c;
    }));
  };

  const handleRemoveItem = (catId: string, itemId: string) => {
    setMenuCategories(menuCategories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: c.items.filter(item => item.id !== itemId)
        };
      }
      return c;
    }));
  };

  const handleItemChange = (catId: string, itemId: string, field: keyof MenuItemInput, value: string) => {
    setMenuCategories(menuCategories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          items: c.items.map(item => {
            if (item.id === itemId) {
              return { ...item, [field]: value };
            }
            return item;
          })
        };
      }
      return c;
    }));
  };

  const handleItemImageUpload = (e: React.ChangeEvent<HTMLInputElement>, catId: string, itemId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleItemChange(catId, itemId, 'image_url', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasteItemImage = (e: React.ClipboardEvent, catId: string, itemId: string) => {
    // 1. Verificar se é uma URL de imagem colada como texto (ex: "Copiar endereço da imagem")
    const text = e.clipboardData.getData('text');
    if (text && text.trim().startsWith('http')) {
      handleItemChange(catId, itemId, 'image_url', text.trim());
      e.preventDefault();
      return;
    }

    // 2. Verificar se é um arquivo binário de imagem colado (ex: "Copiar imagem" ou Printscreen)
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              handleItemChange(catId, itemId, 'image_url', event.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  const handleClipboardPaste = async (catId: string, itemId: string) => {
    try {
      // 1. Tentar ler texto primeiro (endereço de imagem)
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith('http')) {
        handleItemChange(catId, itemId, 'image_url', text.trim());
        showSuccess('Imagem colada com sucesso a partir do link!');
        return;
      }

      // 2. Tentar ler itens do clipboard (arquivos de imagem)
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                handleItemChange(catId, itemId, 'image_url', event.target.result as string);
                showSuccess('Imagem colada com sucesso!');
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      showError('Nenhuma imagem ou link de imagem válido encontrado na área de transferência.');
    } catch (err: any) {
      console.warn("Falha ao colar via botão:", err);
      showError('Clique na caixa da foto e use o atalho de teclado Ctrl+V para colar.');
    }
  };

  // Handlers para upload de imagens do PC do Freelancer (Base64 local)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoImage(event.target.result as string);
          showSuccess('Logo carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCoverImage(event.target.result as string);
          showSuccess('Imagem de capa carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryAddUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages = [...galleryImages];
      let loadedCount = 0;
      
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
            loadedCount++;
            if (loadedCount === files.length) {
              setGalleryImages(newImages);
              showSuccess(`${files.length} foto(s) adicionada(s) à galeria!`);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleGalleryReplaceUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImgs = [...galleryImages];
          newImgs[idx] = event.target.result as string;
          setGalleryImages(newImgs);
          showSuccess('Foto substituída com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleParseMenuWithAI = async () => {
    if (!aiMenuText.trim()) {
      showError('Por favor, cole o texto do cardápio antes de processar.');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
    if (!apiKey) {
      showError('Chave da API de IA não configurada no servidor. Entre em contato com o administrador.');
      return;
    }

    setIsParsingMenu(true);
    try {
      const prompt = `Você é um assistente de IA especialista em cardápios de restaurantes.
Analise o seguinte texto bruto extraído de um cardápio (por exemplo, via transcrição ou OCR, ou o código fonte HTML/texto contendo links de imagens dos pratos) e organize-o em categorias, itens, descrições, preços e imagens dos pratos.

Regras importantes:
1. Identifique as categorias de forma lógica (ex: "Entradas", "Pratos Principais", "Hambúrgueres", "Bebidas", "Sobremesas").
2. Para cada item, extraia o nome, a descrição (ingredientes, detalhes de tamanho, acompanhamentos) e o preço.
3. Se houver links de imagem associados aos pratos no texto/código fonte colado (ex: URLs de imagem terminando em .png, .jpg, .jpeg, etc. ou atributos src de tags img), extraia-os exatamente no campo "image_url". Se não houver, deixe como string vazia.
4. Formate o preço estritamente como uma string numérica com ponto decimal (ex: se for R$ 35,90 ou 35.90, retorne "35.90". Se for 12, retorne "12.00"). Não inclua o símbolo "R$".
5. Remova qualquer texto irrelevante ou de rodapé.
6. Retorne a resposta estritamente no formato JSON, seguindo este esquema:
[
  {
    "name": "Nome da Categoria",
    "items": [
      {
        "name": "Nome do Prato",
        "description": "Descrição detalhada ou ingredientes",
        "price": "35.90",
        "image_url": "URL da imagem encontrada para o prato ou string vazia"
      }
    ]
  }
]

Texto bruto do cardápio:
${aiMenuText}
`;

      let text = '';
      if (apiKey.startsWith('sk-')) {
        // Chamada para a API da OpenAI (GPT-4o-mini)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Erro HTTP OpenAI: ${response.status}`);
        }

        const result = await response.json();
        text = result.choices?.[0]?.message?.content || '';
      } else {
        // Chamada para a API do Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Erro HTTP Gemini: ${response.status}`);
        }

        const result = await response.json();
        text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      
      // Fallback para extração de JSON caso a resposta contenha blocos de markdown
      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
      }

      let parsed = JSON.parse(text);
      
      // Se a resposta for um objeto com uma propriedade de array (ex: { "categories": [...] }), extrai o array
      if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
        if (parsed.categories && Array.isArray(parsed.categories)) {
          parsed = parsed.categories;
        } else if (parsed.items && Array.isArray(parsed.items)) {
          parsed = parsed.items;
        } else if (parsed.menu && Array.isArray(parsed.menu)) {
          parsed = parsed.menu;
        } else {
          const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
          if (arrayKey) {
            parsed = parsed[arrayKey];
          } else {
            throw new Error('A resposta da IA não retornou um formato de lista esperado.');
          }
        }
      }

      if (!Array.isArray(parsed)) {
        throw new Error('A resposta da IA não retornou um formato de lista esperado.');
      }

      const formattedCategories = parsed.map((cat: any, cIdx: number) => ({
        id: `cat-${Date.now()}-${cIdx}-${Math.random()}`,
        name: cat.name || 'Outros',
        items: (cat.items || []).map((item: any, iIdx: number) => ({
          id: `item-${Date.now()}-${cIdx}-${iIdx}-${Math.random()}`,
          name: item.name || '',
          description: item.description || '',
          price: item.price ? String(item.price) : '',
          image_url: item.image_url || ''
        }))
      }));

      if (formattedCategories.length === 0) {
        throw new Error('Nenhuma categoria ou item pôde ser identificado.');
      }

      setMenuCategories(formattedCategories);
      showSuccess('Cardápio estruturado com sucesso pela IA!');
      setAiMenuText('');
      setShowAiInput(false);
    } catch (e: any) {
      console.error(e);
      showError(`Falha ao estruturar cardápio com IA: ${e.message || 'Verifique sua chave de API e tente novamente.'}`);
    } finally {
      setIsParsingMenu(false);
    }
  };

  const uploadOrSyncImage = async (urlOrBase64: string, folder: string, filenamePrefix: string): Promise<string> => {
    if (!urlOrBase64) return '';
    if (urlOrBase64.includes('supabase.co/storage/v1/object/public/restaurant-images')) {
      return urlOrBase64;
    }

    try {
      let fileBlob: Blob;
      let mimeType = 'image/jpeg';

      if (urlOrBase64.startsWith('data:')) {
        const parts = urlOrBase64.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        const binary = atob(parts[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i));
        }
        fileBlob = new Blob([new Uint8Array(array)], { type: mimeType });
      } else if (urlOrBase64.startsWith('http')) {
        // Baixar imagem externa para fazer o upload no Supabase
        const res = await fetch(urlOrBase64);
        if (!res.ok) throw new Error(`HTTP error fetching external image: ${res.status}`);
        fileBlob = await res.blob();
        mimeType = fileBlob.type || 'image/jpeg';
      } else {
        return urlOrBase64;
      }

      const extension = mimeType.split('/')[1] || 'jpg';
      const fileName = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;
      const filePath = `${folder}/${fileName}`;
      const fileObject = new File([fileBlob], fileName, { type: mimeType });

      const publicUrl = await uploadFile(RESTAURANT_IMAGES_BUCKET, filePath, fileObject);
      return publicUrl;
    } catch (err) {
      console.warn(`Erro ao baixar/enviar imagem (${filenamePrefix}):`, err);
      return urlOrBase64; // Fallback
    }
  };

  // Concluir Missão
  const handleCompleteMission = async () => {
    if (!activeMission) return;

    // Verificação de concorrência: checar se outra pessoa já concluiu
    try {
      const savedMissions = localStorage.getItem('mock-freelancer-missions');
      if (savedMissions) {
        const parsed = JSON.parse(savedMissions);
        const latestMissionState = parsed.find((m: any) => m.id === activeMission.id);
        if (latestMissionState && latestMissionState.status === 'Concluída') {
          showError(`Esta missão já foi concluída por outro freelancer (${latestMissionState.assignedToName || 'outro usuário'})!`);
          setActiveMission(null);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Validações básicas
    if (!description.trim() || description.trim().length < 10) {
      showError('Por favor, preencha o campo "Sobre" (descrição detalhada) com no mínimo 10 caracteres.');
      return;
    }

    if (!coverImage || coverImage.trim() === '') {
      showError('Por favor, faça o upload da imagem de capa (capa).');
      return;
    }

    if (galleryImages.length < 3) {
      showError(`Por favor, envie no mínimo 3 fotos para a galeria de imagens do restaurante (enviadas: ${galleryImages.length}).`);
      return;
    }

    if (!category.trim()) {
      showError('Por favor, digite a categoria principal (ex: Hamburgueria, Pizzaria, etc.).');
      return;
    }

    if (!address.trim() || !city.trim() || !state.trim()) {
      showError('Por favor, preencha o endereço completo.');
      return;
    }

    // Validação do Cardápio
    let hasInvalidItems = false;
    let totalItemsCount = 0;

    for (const cat of menuCategories) {
      if (!cat.name.trim()) {
        showError('Todas as categorias do menu precisam ter um nome preenchido.');
        return;
      }
      if (cat.items.length === 0) {
        showError(`A categoria "${cat.name}" precisa ter pelo menos um prato/bebida.`);
        return;
      }
      for (const item of cat.items) {
        totalItemsCount++;
        if (!item.name.trim() || !item.price.trim() || parseFloat(item.price) <= 0) {
          hasInvalidItems = true;
        }
      }
    }

    if (totalItemsCount === 0) {
      showError('Por favor, cadastre ao menos uma categoria e um prato no cardápio.');
      return;
    }

    if (hasInvalidItems) {
      showError('Por favor, garanta que todos os itens do cardápio tenham nome e preço positivo preenchidos.');
      return;
    }

    const toastId = showLoading('Processando e enviando imagens do cardápio para o servidor...');

    try {
      const uuidId = getDeterministicUUID(activeMission.id);

      // 1. Processar Logo
      const finalLogo = logoImage ? await uploadOrSyncImage(logoImage, uuidId, 'logo') : '';

      // 2. Processar Capa
      const finalCover = coverImage ? await uploadOrSyncImage(coverImage, uuidId, 'cover') : '';

      // Novo: Processar Imagem da Fonte do Cardápio
      const finalMenuSourceImage = menuSourceImage ? await uploadOrSyncImage(menuSourceImage, uuidId, 'menu-source') : '';

      // 3. Processar Galeria
      const finalGallery: string[] = [];
      for (let i = 0; i < galleryImages.length; i++) {
        const url = await uploadOrSyncImage(galleryImages[i], uuidId, `gallery-${i}`);
        if (url) finalGallery.push(url);
      }

      // 4. Processar Itens do Cardápio
      const finalMenuCategories = [];
      for (let catIdx = 0; catIdx < menuCategories.length; catIdx++) {
        const cat = menuCategories[catIdx];
        const finalItems = [];
        for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
          const item = cat.items[itemIdx];
          let itemImg = item.image_url || '';
          if (item.image_url) {
            itemImg = await uploadOrSyncImage(item.image_url, uuidId, `item-${catIdx}-${itemIdx}`);
          }
          finalItems.push({
            id: item.id,
            category_id: cat.id,
            name: item.name,
            description: item.description,
            price: parseFloat(item.price) || 0,
            image_url: itemImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
            order_index: itemIdx,
            is_active: true
          });
        }
        finalMenuCategories.push({
          id: cat.id,
          restaurant_id: activeMission.id,
          name: cat.name,
          order_index: catIdx,
          is_active: true,
          menu_items: finalItems
        });
      }

      // 5. Atualizar fila de missões no localStorage com status de revisão
      const updatedMissionsVal = missions.map(m => {
        if (m.id === activeMission.id) {
          return { 
            ...m, 
            status: 'Aguardando Validação' as const,
            completedAt: new Date().toISOString(),
            address: address,
            number: number,
            neighborhood: neighborhood,
            city: city,
            state: state,
            cep: cep,
            phone: phone,
            category: category,
            instagram: instagram,
            facebook: facebook,
            logo: finalLogo,
            coverImage: finalCover,
            galleryImages: finalGallery,
            openingHours,
            assignedToId: activeFreelancerId,
            assignedToName: activeFreelancer?.name || 'Freelancer',
            freelancerEmail: activeFreelancer?.email || '',
            menuSourceUrl,
            menuSourceImage: finalMenuSourceImage,
            description,
            menuCategories: finalMenuCategories
          };
        }
        return m;
      });

      localStorage.setItem('mock-freelancer-missions', JSON.stringify(updatedMissionsVal));
      setMissions(updatedMissionsVal);

      // Disparar evento de sincronização global
      window.dispatchEvent(new Event('storage'));

      dismissToast(toastId);
      showSuccess(`Missão enviada para validação com sucesso!`);
      setActiveMission(null);
      setActiveTab('concluidas');
    } catch (e) {
      console.error(e);
      dismissToast(toastId);
      showError('Erro ao finalizar missão.');
    }
  };

  // Aprovar missão (Gerente)
  const handleManagerApprove = async (mission: ScrapedRestaurant) => {
    const toastId = showLoading('Aprovando e publicando restaurante no banco de dados...');
    try {
      // 1. Marcar missão como Concluída
      const updatedMissions = missions.map(m => {
        if (m.id === mission.id) {
          return {
            ...m,
            status: 'Concluída' as const,
            completedAt: new Date().toISOString()
          };
        }
        return m;
      });
      localStorage.setItem('mock-freelancer-missions', JSON.stringify(updatedMissions));
      setMissions(updatedMissions);

      // 2. Incrementar saldo e concluídas do freelancer
      const flList = freelancersList;
      const targetFreelancer = flList.find(f => f.id === mission.assignedToId);
      if (targetFreelancer) {
        const newBalance = (targetFreelancer.balance || 0) + (mission.reward || 1.00);
        const newCompleted = (targetFreelancer.completedMissions || 0) + 1;
        
        const updatedList = flList.map(f => {
          if (f.id === mission.assignedToId) {
            return {
              ...f,
              balance: newBalance,
              completedMissions: newCompleted,
              lastActivity: new Date().toLocaleDateString()
            };
          }
          return f;
        });
        localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));
        setFreelancersList(updatedList);
        
        // Se for o freelancer atual logado
        if (activeFreelancerId === mission.assignedToId) {
          setBalance(newBalance);
          setCompletedCount(newCompleted);
          localStorage.setItem('mock-freelancer-balance', newBalance.toString());
          localStorage.setItem('mock-freelancer-completed', newCompleted.toString());
        }
      }

      // 3. Salvar restaurante no mock-completed-restaurants (local fallback)
      const completedSaved = localStorage.getItem('mock-completed-restaurants');
      const completedMap = completedSaved ? JSON.parse(completedSaved) : {};
      
      const fullAddress = mission.address + (mission.number ? `, ${mission.number}` : '') + (mission.neighborhood ? ` - ${mission.neighborhood}` : '');

      completedMap[mission.id] = {
        id: mission.id,
        name: mission.name,
        plan: 'free',
        phone: mission.phone || '',
        cep: mission.cep || '',
        address: mission.address || '',
        number: mission.number || '',
        neighborhood: mission.neighborhood || '',
        city: mission.city || '',
        state: mission.state || '',
        followers_count: 0,
        description: mission.description || '',
        category: mission.category || '',
        image_url: mission.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
        cover_image_url: mission.coverImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        menu_categories: mission.menuCategories || [],
        gallery_images: mission.galleryImages && mission.galleryImages.length > 0 
          ? mission.galleryImages.map((url, idx) => ({ id: `mg-${idx}`, image_url: url, caption: 'Foto do Local', order_index: idx }))
          : [{ id: 'mg-1', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', caption: 'Fachada', order_index: 0 }],
        social_networks: [
          { platform: 'instagram', url: mission.instagram },
          { platform: 'facebook', url: mission.facebook }
        ].filter(s => s.url),
        opening_hours: mission.openingHours,
        visit_status: 'Pendente',
        menuSourceUrl: mission.menuSourceUrl,
        menuSourceImage: mission.menuSourceImage
      };
      localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));

      // 4. Salvar no fallback do admin
      const savedFallback = localStorage.getItem('mock-supabase-fallback-restaurants');
      let fallbackList = savedFallback ? JSON.parse(savedFallback) : [];
      const existingIdx = fallbackList.findIndex((r: any) => r.id === mission.id);
      
      const updatedRestaurant = {
        id: mission.id,
        name: mission.name,
        plan: 'free' as const,
        phone: mission.phone || '',
        category: mission.category || '',
        address: fullAddress,
        neighborhood: mission.neighborhood || '',
        city: mission.city || '',
        state: mission.state || '',
        claim_code: 'CLAIM-' + mission.id.substring(0, 5).toUpperCase(),
        visit_status: 'Pendente' as const,
        visit_notes: `Fonte Cardápio: ${mission.menuSourceUrl || 'Não informado'} | Imagem Fonte: ${mission.menuSourceImage || 'Não informado'}`,
        menuSourceUrl: mission.menuSourceUrl,
        menuSourceImage: mission.menuSourceImage
      };
      if (existingIdx >= 0) {
        fallbackList[existingIdx] = updatedRestaurant;
      } else {
        fallbackList.unshift(updatedRestaurant);
      }
      localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(fallbackList));

      // 5. Enviar para o Supabase se houver conexão
      const uuidId = getDeterministicUUID(mission.id);
      const restaurantData = {
        id: uuidId,
        name: mission.name,
        plan: 'free',
        phone: mission.phone || '',
        cep: mission.cep || '',
        address: mission.address || '',
        number: mission.number || '',
        neighborhood: mission.neighborhood || '',
        city: mission.city || '',
        state: mission.state || '',
        description: mission.description || '',
        category: mission.category || '',
        image_url: mission.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
        cover_image_url: mission.coverImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        visit_status: 'Pendente',
        visit_notes: `Fonte Cardápio: ${mission.menuSourceUrl || 'Não informado'} | Imagem Fonte: ${mission.menuSourceImage || 'Não informado'}`,
        claim_code: 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
        opening_hours: mission.openingHours || null,
        social_networks: [
          { platform: 'instagram', url: mission.instagram },
          { platform: 'facebook', url: mission.facebook }
        ].filter(s => s.url)
      };

      const { error: upsertError } = await supabase
        .from('restaurants')
        .upsert(restaurantData);

      if (!upsertError && mission.menuCategories) {
        for (const cat of mission.menuCategories) {
          const catUuid = getDeterministicUUID(cat.id);
          const { error: catError } = await supabase
            .from('menu_categories')
            .upsert({
              id: catUuid,
              restaurant_id: uuidId,
              name: cat.name,
              order_index: cat.order_index,
              is_active: cat.is_active
            });
            
          if (!catError && cat.menu_items) {
            for (const item of cat.menu_items) {
              const itemUuid = getDeterministicUUID(item.id);
              await supabase
                .from('menu_items')
                .upsert({
                  id: itemUuid,
                  category_id: catUuid,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  image_url: item.image_url,
                  order_index: item.order_index,
                  is_active: item.is_active
                });
            }
          }
        }
      }

      // 6. Registrar entrada no log de auditoria do admin
      const savedLog = localStorage.getItem('mock-completed-missions-log');
      const logList = savedLog ? JSON.parse(savedLog) : [];
      const logEntry = {
        id: 'log-' + Date.now() + '-' + Math.random(),
        restaurantId: mission.id,
        restaurantName: mission.name,
        freelancerId: mission.assignedToId,
        freelancerName: mission.assignedToName,
        freelancerEmail: mission.freelancerEmail || '',
        completedAt: new Date().toISOString(),
        reward: mission.reward || 1.00,
        menuSourceUrl: mission.menuSourceUrl,
        menuSourceImage: mission.menuSourceImage
      };
      logList.push(logEntry);
      localStorage.setItem('mock-completed-missions-log', JSON.stringify(logList));

      // Trigger global sync
      window.dispatchEvent(new Event('storage'));

      dismissToast(toastId);
      showSuccess(`Trabalho de "${mission.name}" aprovado com sucesso!`);
      setIsReviewDialogOpen(false);
      setSelectedReviewMission(null);
    } catch (e) {
      console.error(e);
      dismissToast(toastId);
      showError('Erro ao aprovar a missão.');
    }
  };

  // Rejeitar/Retornar missão para refação (Gerente)
  const handleManagerReject = (mission: ScrapedRestaurant, feedback: string) => {
    if (!feedback.trim()) {
      showError('Por favor, digite o motivo ou observações para refação.');
      return;
    }

    try {
      const updatedMissions = missions.map(m => {
        if (m.id === mission.id) {
          return {
            ...m,
            status: 'Para Refazer' as const,
            feedbackNotes: feedback,
            completedAt: new Date().toISOString()
          };
        }
        return m;
      });
      localStorage.setItem('mock-freelancer-missions', JSON.stringify(updatedMissions));
      setMissions(updatedMissions);

      // Trigger global sync
      window.dispatchEvent(new Event('storage'));

      showSuccess(`Missão de "${mission.name}" retornada para refação.`);
      setIsReviewDialogOpen(false);
      setSelectedReviewMission(null);
      setManagerFeedback('');
    } catch (e) {
      console.error(e);
      showError('Erro ao retornar missão.');
    }
  };

  // Solicitar Resgate de Saldo
  const handleRequestRedeem = () => {
    if (balance <= 0) {
      showError('Você precisa ter saldo acumulado para resgatar.');
      return;
    }
    setIsRedeemDialogOpen(true);
  };

  const handleConfirmRedeem = () => {
    if (!pixKey.trim()) {
      showError('Por favor, preencha a sua chave PIX.');
      return;
    }

    try {
      // Zera o saldo e soma ao valor histórico pago
      const savedTotalPaid = localStorage.getItem('mock-freelancer-total-paid');
      const paidHistory = savedTotalPaid ? parseFloat(savedTotalPaid) : 0;
      const newPaidHistory = paidHistory + balance;

      localStorage.setItem('mock-freelancer-total-paid', newPaidHistory.toString());
      localStorage.setItem('mock-freelancer-balance', '0');
      
      // Zera o saldo do freelancer ativo no mock-freelancers também
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      if (savedFreelancers) {
        const list = JSON.parse(savedFreelancers);
        const updatedList = list.map((f: any) => {
          if (f.id === activeFreelancerId) {
            return {
              ...f,
              balance: 0,
            };
          }
          return f;
        });
        localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));
        setFreelancersList(updatedList);
      }

      // Sincroniza abas
      window.dispatchEvent(new Event('storage'));

      setBalance(0);
      setIsRedeemDialogOpen(false);
      setPixKey('');

      showSuccess(`Resgate PIX de R$ ${balance.toFixed(2)} solicitado com sucesso! O pagamento será feito em breve.`);
    } catch (e) {
      console.error(e);
      showError('Erro ao solicitar resgate.');
    }
  };

  const handleConfirmRegister = () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regPhone.trim() || !regCpf.trim() || !regPixKey.trim()) {
      showError('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    if (regPassword.length < 6) {
      showError('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const emailLower = regEmail.trim().toLowerCase();
      
      // Verificar se e-mail já está cadastrado
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      const list = savedFreelancers ? JSON.parse(savedFreelancers) : [];
      if (list.some((f: any) => f.email.toLowerCase() === emailLower)) {
        showError('Este e-mail já está em uso.');
        return;
      }

      const newId = `f-${Date.now()}`;
      const newFreelancer = {
        id: newId,
        name: regName.trim(),
        email: emailLower,
        password: regPassword.trim(),
        phone: regPhone.trim(),
        cpf: regCpf.trim(),
        pixKeyType: regPixType,
        pixKey: regPixKey.trim(),
        status: 'Pendente' as const,
        completedMissions: 0,
        balance: 0,
        lastActivity: 'Nenhuma'
      };

      list.push(newFreelancer);
      localStorage.setItem('mock-freelancers', JSON.stringify(list));
      setFreelancersList(list);

      // Auto login as new freelancer
      localStorage.setItem('mock-active-freelancer-id', newId);
      setActiveFreelancerId(newId);
      setBalance(0);
      setCompletedCount(0);
      localStorage.setItem('mock-freelancer-balance', '0');
      localStorage.setItem('mock-freelancer-completed', '0');

      // Sync state and notify other tabs
      window.dispatchEvent(new Event('storage'));

      // Reset form
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setRegCpf('');
      setRegPixType('cpf');
      setRegPixKey('');
      setIsRegisterDialogOpen(false);

      showSuccess('Cadastro enviado para análise com sucesso! Aguarde a aprovação do administrador.');
    } catch (e) {
      console.error(e);
      showError('Erro ao realizar o cadastro.');
    }
  };

  const handleConfirmLogin = () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showError('Preencha seu e-mail e sua senha de acesso.');
      return;
    }

    try {
      const emailLower = loginEmail.trim().toLowerCase();
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      const list = savedFreelancers ? JSON.parse(savedFreelancers) : [];
      
      const matched = list.find((f: any) => f.email.toLowerCase() === emailLower && f.password === loginPassword.trim());
      
      if (!matched) {
        showError('E-mail ou senha incorretos.');
        return;
      }

      // Logar
      localStorage.setItem('mock-active-freelancer-id', matched.id);
      setActiveFreelancerId(matched.id);
      setBalance(matched.balance || 0);
      setCompletedCount(matched.completedMissions || 0);
      localStorage.setItem('mock-freelancer-balance', (matched.balance || 0).toString());
      localStorage.setItem('mock-freelancer-completed', (matched.completedMissions || 0).toString());

      // Sync state and notify other tabs
      window.dispatchEvent(new Event('storage'));
      
      setLoginEmail('');
      setLoginPassword('');
      setIsLoginDialogOpen(false);
      showSuccess(`Bem-vindo de volta, ${matched.name}!`);
    } catch (e) {
      console.error(e);
      showError('Erro ao realizar login.');
    }
  };

  const handleVerifyForgot = () => {
    if (!forgotEmail.trim() || !forgotCpf.trim() || !forgotPixKey.trim()) {
      showError('Preencha todos os campos para verificação.');
      return;
    }

    try {
      const emailLower = forgotEmail.trim().toLowerCase();
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      const list = savedFreelancers ? JSON.parse(savedFreelancers) : [];
      
      const matched = list.find((f: any) => 
        f.email.toLowerCase() === emailLower && 
        f.cpf.replace(/\D/g, '') === forgotCpf.replace(/\D/g, '') && 
        f.pixKey.trim() === forgotPixKey.trim()
      );

      if (!matched) {
        showError('Os dados fornecidos não coincidem com nenhum cadastro.');
        return;
      }

      setVerifiedFreelancerId(matched.id);
      setIsForgotDialogOpen(false);
      setIsResetPasswordDialogOpen(true);
      
      setForgotEmail('');
      setForgotCpf('');
      setForgotPixKey('');
    } catch (e) {
      console.error(e);
      showError('Erro ao verificar dados.');
    }
  };

  const handleResetPassword = () => {
    if (!resetNewPassword.trim()) {
      showError('Preencha a nova senha.');
      return;
    }

    if (resetNewPassword.length < 6) {
      showError('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      const savedFreelancers = localStorage.getItem('mock-freelancers');
      const list = savedFreelancers ? JSON.parse(savedFreelancers) : [];
      
      const updatedList = list.map((f: any) => {
        if (f.id === verifiedFreelancerId) {
          return { ...f, password: resetNewPassword.trim() };
        }
        return f;
      });

      localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));
      setFreelancersList(updatedList);
      
      // Se for o freelancer ativo atual, sincroniza
      if (activeFreelancerId === verifiedFreelancerId) {
        window.dispatchEvent(new Event('storage'));
      }

      setIsResetPasswordDialogOpen(false);
      setResetNewPassword('');
      setVerifiedFreelancerId('');
      showSuccess('Senha redefinida com sucesso! Você já pode fazer login.');
      setIsLoginDialogOpen(true); // Abre o login após redefinir
    } catch (e) {
      console.error(e);
      showError('Erro ao redefinir a senha.');
    }
  };

  const activeFreelancer = freelancersList.find(f => f.id === activeFreelancerId) || null;

  const pendingMissions = activeFreelancerId 
    ? missions.filter(m => m.status === 'Pendente').slice(0, 30)
    : [];
  const completedMissions = activeFreelancerId 
    ? missions.filter(m => m.status === 'Concluída' && m.assignedToId === activeFreelancerId)
    : [];

  // Se o usuário logado for uma gerente, renderiza o Painel da Gerente
  const renderManagerDashboard = () => {
    const awVal = missions.filter(m => m.status === 'Aguardando Validação');
    const refazer = missions.filter(m => m.status === 'Para Refazer');
    const concluidas = missions.filter(m => m.status === 'Concluída');

    const handleOpenReview = (mission: ScrapedRestaurant) => {
      setSelectedReviewMission(mission);
      setManagerFeedback(mission.feedbackNotes || '');
      setIsReviewDialogOpen(true);
    };

    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-soft-sm">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#022D68] text-xl">FilterFood</span>
              <Badge className="bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full text-xs">Painel da Gerente 👑</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="font-extrabold text-sm text-slate-800 block">Olá, {activeFreelancer?.name}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Perfil: Gerência</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold border border-red-100 rounded-xl"
                onClick={() => {
                  localStorage.removeItem('mock-active-freelancer-id');
                  setActiveFreelancerId('');
                  showSuccess('Gerente desconectada com sucesso!');
                }}
              >
                <LogOut className="w-4 h-4 mr-1" /> Sair
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-5 flex items-center gap-4 cursor-pointer hover:border-blue-200 transition-all" onClick={() => setManagerTab('pendentes')}>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Aguardando Validação</span>
                <span className="text-2xl font-black text-amber-600">{awVal.length}</span>
              </div>
            </Card>

            <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-5 flex items-center gap-4 cursor-pointer hover:border-red-200 transition-all" onClick={() => setManagerTab('retornadas')}>
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Para Refazer</span>
                <span className="text-2xl font-black text-red-600">{refazer.length}</span>
              </div>
            </Card>

            <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-5 flex items-center gap-4 cursor-pointer hover:border-green-200 transition-all" onClick={() => setManagerTab('historico')}>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Histórico Validados</span>
                <span className="text-2xl font-black text-green-600">{concluidas.length}</span>
              </div>
            </Card>
          </div>

          {/* Sub-tabs Selection */}
          <div className="flex border-b border-gray-200 pb-px">
            <button
              onClick={() => setManagerTab('pendentes')}
              className={`pb-3 text-sm font-bold border-b-2 mr-6 transition-all ${
                managerTab === 'pendentes' ? 'border-[#022D68] text-[#022D68]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Aguardando Revisão ({awVal.length})
            </button>
            <button
              onClick={() => setManagerTab('retornadas')}
              className={`pb-3 text-sm font-bold border-b-2 mr-6 transition-all ${
                managerTab === 'retornadas' ? 'border-[#022D68] text-[#022D68]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Retornados para Refação ({refazer.length})
            </button>
            <button
              onClick={() => setManagerTab('historico')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                managerTab === 'historico' ? 'border-[#022D68] text-[#022D68]' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Histórico Geral ({concluidas.length})
            </button>
          </div>

          {/* Tab Contents */}
          <Card className="shadow-soft-lg border border-gray-100 rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 p-4">
              <CardTitle className="text-lg font-bold text-[#022D68] flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                {managerTab === 'pendentes' && 'Missões Enviadas pelos Freelancers (Aguardando Validação)'}
                {managerTab === 'retornadas' && 'Missões Enviadas para Refação'}
                {managerTab === 'historico' && 'Histórico de Missões Aprovadas/Concluídas'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table rendering based on tab */}
              {(() => {
                const list = managerTab === 'pendentes' ? awVal : managerTab === 'retornadas' ? refazer : concluidas;
                
                if (list.length === 0) {
                  return (
                    <div className="text-center py-16 text-gray-500 font-medium">
                      <Search className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      Nenhuma missão encontrada nesta seção no momento.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="p-4 font-bold text-xs text-slate-500 uppercase">Estabelecimento</th>
                          <th className="p-4 font-bold text-xs text-slate-500 uppercase">Freelancer</th>
                          <th className="p-4 font-bold text-xs text-slate-500 uppercase">Data Envio</th>
                          <th className="p-4 font-bold text-xs text-slate-500 uppercase text-center">Status</th>
                          <th className="p-4 font-bold text-xs text-slate-500 uppercase text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((m) => (
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-slate-50/30 transition-colors">
                            <td className="p-4">
                              <span className="font-extrabold text-slate-800 block">{m.name}</span>
                              <span className="text-xs text-slate-400 font-semibold">{m.category}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-700 block">{m.assignedToName}</span>
                              <span className="text-[11px] text-slate-400 font-semibold">{m.freelancerEmail}</span>
                            </td>
                            <td className="p-4 text-xs text-slate-500 font-medium">
                              {m.completedAt ? new Date(m.completedAt).toLocaleString('pt-BR') : 'Sem data'}
                            </td>
                            <td className="p-4 text-center">
                              <Badge className={
                                m.status === 'Concluída' ? 'bg-green-100 text-green-800 border-none font-bold' :
                                m.status === 'Para Refazer' ? 'bg-red-100 text-red-800 border-none font-bold' :
                                'bg-amber-100 text-amber-800 border-none font-bold'
                              }>
                                {m.status === 'Concluída' ? 'Aprovada' : m.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                size="sm"
                                variant={managerTab === 'pendentes' ? 'default' : 'outline'}
                                className="font-bold h-8"
                                onClick={() => handleOpenReview(m)}
                              >
                                {managerTab === 'pendentes' ? 'Revisar Trabalho' : 'Ver Detalhes'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Modal de Revisão */}
          {selectedReviewMission && (
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl border-none">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                    <Clipboard className="w-5 h-5 text-indigo-500 animate-pulse" />
                    Revisar Trabalho: {selectedReviewMission.name}
                  </DialogTitle>
                  <DialogDescription>
                    Revise os dados inseridos pelo freelancer para aprovar o pagamento ou retornar para correção.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Status do Item de Revisão */}
                  {selectedReviewMission.status === 'Para Refazer' && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-xs">
                      <span className="font-bold block text-sm">Feedback Atual (Aguardando Correção):</span>
                      <p className="mt-1 font-medium">{selectedReviewMission.feedbackNotes}</p>
                    </div>
                  )}

                  {/* Informações Básicas */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Dados Básicos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Nome do Restaurante:</span>
                        <span className="font-bold text-slate-700">{selectedReviewMission.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Categoria:</span>
                        <span className="font-bold text-slate-700">{selectedReviewMission.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Telefone:</span>
                        <span className="font-bold text-slate-700">{selectedReviewMission.phone || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Endereço Completo:</span>
                        <span className="font-bold text-slate-700">{selectedReviewMission.address}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block">Sobre (Descrição):</span>
                        <p className="font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">{selectedReviewMission.description || 'Nenhuma descrição fornecida'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Redes Sociais e Auditoria */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Auditoria & Links</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block mb-1">Link do Cardápio / Fonte:</span>
                        {selectedReviewMission.menuSourceUrl ? (
                          <a href={selectedReviewMission.menuSourceUrl} target="_blank" rel="noopener noreferrer" className="text-highlight font-bold hover:underline inline-flex items-center gap-1">
                            Ver link da fonte ↗
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Não informado</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-1">Redes Sociais:</span>
                        <div className="space-y-1">
                          <span className="block font-semibold">Instagram: {selectedReviewMission.instagram || 'Não informado'}</span>
                          <span className="block font-semibold">Facebook: {selectedReviewMission.facebook || 'Não informado'}</span>
                        </div>
                      </div>
                      {selectedReviewMission.menuSourceImage && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400 block mb-2">Imagem de Fonte do Cardápio:</span>
                          <a href={selectedReviewMission.menuSourceImage} target="_blank" rel="noopener noreferrer" className="block w-36 h-24 rounded border overflow-hidden">
                            <img src={selectedReviewMission.menuSourceImage} className="w-full h-full object-cover" alt="Cardápio Fonte" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Imagens Enviadas */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Logo & Capa</h4>
                    <div className="flex gap-4">
                      {selectedReviewMission.logo && (
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Logo</span>
                          <a href={selectedReviewMission.logo} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-full border overflow-hidden">
                            <img src={selectedReviewMission.logo} className="w-full h-full object-cover" alt="Logo" />
                          </a>
                        </div>
                      )}
                      {selectedReviewMission.coverImage && (
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Capa</span>
                          <a href={selectedReviewMission.coverImage} target="_blank" rel="noopener noreferrer" className="block w-40 h-16 rounded border overflow-hidden">
                            <img src={selectedReviewMission.coverImage} className="w-full h-full object-cover" alt="Capa" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedReviewMission.galleryImages && selectedReviewMission.galleryImages.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Fotos da Galeria ({selectedReviewMission.galleryImages.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedReviewMission.galleryImages.map((img, idx) => (
                          <a href={img} target="_blank" rel="noopener noreferrer" key={idx} className="block w-20 h-16 rounded border overflow-hidden">
                            <img src={img} className="w-full h-full object-cover" alt="Galeria" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cardápio Cadastrado */}
                  {selectedReviewMission.menuCategories && selectedReviewMission.menuCategories.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-800 text-sm border-b pb-1">Cardápio Cadastrado</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {selectedReviewMission.menuCategories.map((cat: any) => (
                          <div key={cat.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-1 text-xs">
                            <span className="font-extrabold text-[#022D68] block">{cat.name}</span>
                            <div className="space-y-1 pl-2">
                              {cat.menu_items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between text-[11px] font-medium text-slate-700">
                                  <span>{item.name} <span className="text-slate-400 font-normal">({item.description})</span></span>
                                  <span className="font-bold text-green-700">R$ {item.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form de Feedback para Recusa */}
                  {selectedReviewMission.status === 'Aguardando Validação' && (
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="feedback-notes" className="font-bold text-xs text-slate-500 uppercase">Observações de Feedback para Ajuste / Refação</Label>
                      <Textarea
                        id="feedback-notes"
                        placeholder="Caso precise mandar retornar para ser refeito, descreva o que deve ser corrigido pelo freelancer..."
                        value={managerFeedback}
                        onChange={(e) => setManagerFeedback(e.target.value)}
                        className="text-xs border-gray-300"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 border-t pt-4">
                  <Button
                    variant="outline"
                    className="font-bold h-10 border-gray-300 text-slate-600 sm:w-auto w-full"
                    onClick={() => setIsReviewDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                  
                  {selectedReviewMission.status === 'Aguardando Validação' && (
                    <>
                      <Button
                        variant="destructive"
                        disabled={!managerFeedback.trim()}
                        onClick={() => handleManagerReject(selectedReviewMission, managerFeedback)}
                        className="font-bold h-10 sm:w-auto w-full gap-1"
                      >
                        <Undo className="w-4 h-4" /> Mandar Retornar
                      </Button>
                      <Button
                        onClick={() => handleManagerApprove(selectedReviewMission)}
                        className="font-bold h-10 bg-green-600 hover:bg-green-700 text-white sm:w-auto w-full gap-1"
                      >
                        <CheckCircle className="w-4 h-4" /> Aprovar & Validar
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  };

  // Se o usuário logado for uma gerente, renderiza o Painel da Gerente
  if (activeFreelancer && activeFreelancer.role === 'gerente') {
    return renderManagerDashboard();
  }

  // Se não estiver logado (nenhum freelancer cadastrado ou ativo)
  if (!activeFreelancer) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 flex flex-col justify-between">
        <div className="max-w-4xl mx-auto w-full space-y-8 my-auto py-12">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#022D68] text-2xl tracking-tight">FilterFood</span>
              <Badge className="bg-[#022D68] text-white">Freelancer Portal</Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsLoginDialogOpen(true)} 
              className="border-[#022D68] text-[#022D68] hover:bg-[#022D68]/5 font-bold gap-1.5 rounded-xl px-4 py-2"
            >
              <LogIn className="w-4 h-4" /> Login
            </Button>
          </div>

          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-2xl mx-auto py-6">
            <div className="inline-flex p-3 bg-orange-100 rounded-3xl text-highlight mb-2">
              <Briefcase className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-[#022D68] tracking-tight">
              Ganhe Dinheiro Coletando Estabelecimentos
            </h1>
            <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed">
              Junte-se à nossa equipe de freelancers parceiros. Colete fotos, horários e estruture cardápios de restaurantes locais para ganhar <span className="text-highlight font-extrabold">R$ 1,00 por restaurante cadastrado</span>!
            </p>
          </div>

          {/* Grid de Passos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-soft-lg rounded-3xl p-6 bg-white space-y-4">
              <div className="p-3 bg-blue-50 rounded-2xl w-fit text-[#022D68]">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#022D68]">1. Faça seu Cadastro</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Preencha seus dados pessoais, CPF e chave PIX de forma rápida e segura.
              </p>
            </Card>

            <Card className="border-none shadow-soft-lg rounded-3xl p-6 bg-white space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl w-fit text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#022D68]">2. Aguarde Validação</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Nossa equipe administrativa avaliará seu perfil para liberar a sua conta em instantes.
              </p>
            </Card>

            <Card className="border-none shadow-soft-lg rounded-3xl p-6 bg-white space-y-4">
              <div className="p-3 bg-green-50 rounded-2xl w-fit text-green-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#022D68]">3. Complete Missões</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Escolha restaurantes na lista, envie informações corretas e fature o seu saldo diretamente no PIX.
              </p>
            </Card>
          </div>

          {/* Ação Principal */}
          <div className="text-center pt-4 space-y-4 flex flex-col items-center">
            <Button 
              size="lg"
              onClick={() => setIsRegisterDialogOpen(true)}
              className="bg-highlight hover:bg-highlight/90 text-white font-extrabold text-lg px-8 py-6 rounded-2xl shadow-lg shadow-orange-500/20 transform hover:-translate-y-0.5 transition-all w-fit"
            >
              Quero me Cadastrar
            </Button>
            
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Já possui um cadastro?</span>
              <Button 
                variant="link" 
                onClick={() => setIsLoginDialogOpen(true)}
                className="text-highlight font-bold hover:underline p-0 h-auto text-sm"
              >
                Entrar com E-mail e Senha
              </Button>
            </div>
          </div>
        </div>

        {/* Dialogs de Cadastro permanecem no escopo para que possam abrir */}
        <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-orange-400" />
                Cadastro de Freelancer
              </DialogTitle>
              <DialogDescription>
                Insira seus dados pessoais para enviar seu cadastro para análise do administrador.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="reg-name" className="font-bold text-slate-700">Nome Completo *</Label>
                <Input 
                  id="reg-name" 
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email" className="font-bold text-slate-700">E-mail *</Label>
                <Input 
                  id="reg-email" 
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Ex: joao.santos@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="font-bold text-slate-700">Senha de Acesso *</Label>
                <Input 
                  id="reg-password" 
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Crie uma senha (mínimo 6 caracteres)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="font-bold text-slate-700">Telefone *</Label>
                  <Input 
                    id="reg-phone" 
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="Ex: (83) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-cpf" className="font-bold text-slate-700">CPF *</Label>
                  <Input 
                    id="reg-cpf" 
                    value={regCpf}
                    onChange={(e) => setRegCpf(e.target.value)}
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Tipo de Chave PIX *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {['CPF', 'Celular', 'E-mail', 'Aleatória'].map(type => {
                    const val = type.toLowerCase().replace('-', '');
                    const currentVal = regPixType === val;
                    return (
                      <Button 
                        key={type}
                        type="button"
                        variant={currentVal ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRegPixType(val)}
                        className={`text-xs font-bold ${currentVal ? 'bg-primary text-white' : 'border-gray-200 text-slate-600'}`}
                      >
                        {type}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-pix-key" className="font-bold text-slate-700">Chave PIX *</Label>
                <Input 
                  id="reg-pix-key" 
                  value={regPixKey}
                  onChange={(e) => setRegPixKey(e.target.value)}
                  placeholder={
                    regPixType === 'cpf' ? '000.000.000-00' :
                    regPixType === 'celular' ? '(11) 99999-9999' :
                    regPixType === 'email' ? 'exemplo@pix.com' : 'Sua chave aleatória...'
                  }
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white font-bold h-10"
                onClick={handleConfirmRegister}
              >
                Enviar Cadastro
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
                onClick={() => setIsRegisterDialogOpen(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Login do Freelancer */}
        <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <LogIn className="w-6 h-6 text-orange-400" />
                Login de Freelancer
              </DialogTitle>
              <DialogDescription>
                Acesse sua área de trabalho utilizando seu e-mail e senha de acesso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-bold text-slate-700">E-mail</Label>
                <Input 
                  id="login-email" 
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Ex: joao.santos@email.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="login-password" className="font-bold text-slate-700">Senha de Acesso</Label>
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setIsLoginDialogOpen(false);
                      setIsForgotDialogOpen(true);
                    }}
                    className="text-highlight font-bold text-xs p-0 h-auto hover:underline"
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <Input 
                  id="login-password" 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                className="flex-1 bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold h-10"
                onClick={handleConfirmLogin}
              >
                Acessar Portal
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
                onClick={() => setIsLoginDialogOpen(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Esqueci a Senha (Validação Local) */}
        <Dialog open={isForgotDialogOpen} onOpenChange={setIsForgotDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                Recuperação de Senha
              </DialogTitle>
              <DialogDescription>
                Informe seus dados cadastrados para validar a sua identidade e definir uma nova senha.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="font-bold text-slate-700">E-mail Cadastrado *</Label>
                <Input 
                  id="forgot-email" 
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Ex: joao.santos@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-cpf" className="font-bold text-slate-700">CPF do Cadastro *</Label>
                <Input 
                  id="forgot-cpf" 
                  value={forgotCpf}
                  onChange={(e) => setForgotCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-pix" className="font-bold text-slate-700">Chave PIX Cadastrada *</Label>
                <Input 
                  id="forgot-pix" 
                  value={forgotPixKey}
                  onChange={(e) => setForgotPixKey(e.target.value)}
                  placeholder="Informe a chave PIX exata do seu cadastro"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                className="flex-1 bg-highlight hover:bg-highlight/90 text-white font-bold h-10"
                onClick={handleVerifyForgot}
              >
                Validar Dados
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
                onClick={() => {
                  setIsForgotDialogOpen(false);
                  setIsLoginDialogOpen(true);
                }}
              >
                Voltar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para Cadastrar Nova Senha após Validação */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-3xl border-none">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                Definir Nova Senha
              </DialogTitle>
              <DialogDescription>
                Identidade validada com sucesso! Cadastre sua nova senha de acesso.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="reset-new-password" className="font-bold text-slate-700">Nova Senha *</Label>
                <Input 
                  id="reset-new-password" 
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button 
                className="flex-1 bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold h-10"
                onClick={handleResetPassword}
              >
                Salvar Nova Senha
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
                onClick={() => setIsResetPasswordDialogOpen(false)}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Se o Workspace da Missão estiver aberto
  if (activeMission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/20 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="gap-2 text-[#022D68] font-bold hover:bg-slate-100/50" 
              onClick={() => setActiveMission(null)}
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Portal
            </Button>
            <Badge className="bg-orange-100 text-highlight hover:bg-orange-100 font-extrabold border-none py-1.5 px-3">
              Missão Ativa • Vale R$ 1,00
            </Badge>
          </div>

          <Card className="border-none shadow-soft-lg rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-[#022D68] text-white p-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-orange-400" />
                Cadastrar: {activeMission.name}
              </CardTitle>
              <CardDescription className="text-slate-300 font-medium">
                Complete as informações básicas e cadastre o cardápio oficial para receber sua recompensa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Informações da Busca Google Maps */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origem: Busca Google Maps</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500 font-medium block">Nome do Local:</span>
                    <span className="font-semibold text-primary">{activeMission.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">Categoria Google:</span>
                    <span className="font-semibold text-primary">{activeMission.category}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium block">Endereço Google:</span>
                    <span className="font-medium text-slate-600">{activeMission.address}</span>
                  </div>
                  
                  {/* Links de Referência Google Maps e Website Oficial */}
                  <div className="col-span-2 flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 mt-1">
                    {activeMission.googleMapsUrl && (
                      <a
                        href={activeMission.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100 hover:bg-orange-100/50 text-highlight text-xs font-bold transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Abrir no Google Maps ↗
                      </a>
                    )}
                    {activeMission.website && (
                      <a
                        href={activeMission.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100/50 text-blue-700 text-xs font-bold transition-all"
                      >
                        🌐 Website Oficial ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulário de Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#022D68] border-b pb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-highlight" /> Dados do Estabelecimento
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-bold text-slate-700">Descrição Comercial *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Restaurante contemporâneo com rodízio de carne tradicional e sobremesas da casa..."
                    rows={3}
                  />
                  <p className="text-[11px] text-slate-400">Descreva o restaurante de forma atrativa (mínimo de 10 caracteres).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="font-bold text-slate-700">Categoria Principal *</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ex: Nordestina, Hamburgueria, Pizzaria..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="font-bold text-slate-700">Telefone para Contato</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (83) 99999-9999"
                    />
                  </div>
                </div>

                {/* Bloco de Endereço Editável */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-slate-600">Endereço Físico</h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor="address" className="text-xs text-slate-500 font-bold">Rua / Logradouro *</Label>
                      <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="number" className="text-xs text-slate-500 font-bold">Número</Label>
                      <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="S/N" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="neighborhood" className="text-xs text-slate-500 font-bold">Bairro</Label>
                      <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cep" className="text-xs text-slate-500 font-bold">CEP</Label>
                      <Input id="cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="city" className="text-xs text-slate-500 font-bold">Cidade *</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="state" className="text-xs text-slate-500 font-bold">Estado (UF) *</Label>
                      <Input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
                    </div>
                  </div>
                </div>

                 {/* Logo, Capa e Redes Sociais */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-lg font-bold text-[#022D68] border-b pb-2 flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-highlight" /> Logo, Capa e Redes Sociais
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Logo do Estabelecimento */}
                    <div className="space-y-2 flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <Label className="font-bold text-slate-700 text-center mb-2">Logo do Estabelecimento</Label>
                      <input
                        type="file"
                        id="logo-upload"
                        onChange={handleLogoUpload}
                        className="hidden"
                        accept="image/*"
                      />
                      <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-orange-200 shadow-soft-sm flex items-center justify-center bg-white group-hover:border-orange-400 transition-colors">
                          {logoImage ? (
                            <img src={logoImage} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Camera className="w-6 h-6 text-slate-400" />
                              <span className="text-[10px] mt-1 font-semibold text-slate-400">Sem Logo</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-highlight text-white p-1.5 rounded-full shadow-md">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 text-center mt-2">Clique para selecionar do PC</span>
                    </div>

                    {/* Imagem de Capa */}
                    <div className="md:col-span-2 space-y-2 flex flex-col justify-between p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <div className="flex justify-between items-center w-full">
                        <Label className="font-bold text-slate-700">Imagem de Capa</Label>
                        <input
                          type="file"
                          id="cover-upload"
                          onChange={handleCoverUpload}
                          className="hidden"
                          accept="image/*"
                        />
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline" 
                          onClick={() => document.getElementById('cover-upload')?.click()}
                          className="font-bold border-orange-200 text-highlight hover:bg-orange-50 h-8 text-xs gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Upload da Capa
                        </Button>
                      </div>
                      
                      <div 
                        className="relative rounded-xl overflow-hidden h-28 w-full border border-slate-100 shadow-soft-sm bg-white cursor-pointer flex items-center justify-center group"
                        onClick={() => document.getElementById('cover-upload')?.click()}
                      >
                        {coverImage ? (
                          <img src={coverImage} alt="Cover Preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                            <span className="text-xs font-semibold">Clique para selecionar imagem de capa</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="font-bold text-slate-700">Link do Instagram</Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="instagram"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          placeholder="https://instagram.com/nome_do_local"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebook" className="font-bold text-slate-700">Link do Facebook</Label>
                      <div className="relative">
                        <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="facebook"
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          placeholder="https://facebook.com/nome_do_local"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Imagens da Galeria */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-[#022D68] flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-highlight" /> Galeria de Fotos
                    </h3>
                    <input
                      type="file"
                      id="gallery-add-upload"
                      onChange={handleGalleryAddUpload}
                      className="hidden"
                      accept="image/*"
                      multiple
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => document.getElementById('gallery-add-upload')?.click()}
                      className="font-bold border-orange-200 text-highlight hover:bg-orange-50 gap-1 h-8"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Foto
                    </Button>
                  </div>
                  
                  {galleryImages.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 cursor-pointer hover:bg-slate-100/55 transition-colors" onClick={() => document.getElementById('gallery-add-upload')?.click()}>
                      Nenhuma imagem adicionada à galeria. Clique para fazer upload de fotos do seu PC.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {galleryImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-200 shadow-soft-sm bg-white">
                          <img src={imgUrl} alt={`Galeria ${idx + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {/* Input de arquivo oculto para substituir esta imagem específica */}
                            <input
                              type="file"
                              id={`gallery-replace-upload-${idx}`}
                              onChange={(e) => handleGalleryReplaceUpload(e, idx)}
                              className="hidden"
                              accept="image/*"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 rounded-full bg-white text-slate-700 hover:bg-slate-100"
                              onClick={() => document.getElementById(`gallery-replace-upload-${idx}`)?.click()}
                              title="Substituir Imagem"
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => {
                                setGalleryImages(galleryImages.filter((_, i) => i !== idx));
                              }}
                              title="Remover Imagem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                            Foto {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Horários de Funcionamento */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-[#022D68] flex items-center gap-2">
                      <Clock className="w-5 h-5 text-highlight" /> Horários de Funcionamento
                    </h3>
                    {activeMission.openingHours && (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 font-bold text-[10px] py-0.5 px-2 rounded-full">
                        ✨ Pré-preenchido do Google
                      </Badge>
                    )}
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeekSchedule)[]).map((day) => {
                      const dayLabels: Record<keyof WeekSchedule, string> = {
                        monday: 'Segunda-feira',
                        tuesday: 'Terça-feira',
                        wednesday: 'Quarta-feira',
                        thursday: 'Quinta-feira',
                        friday: 'Sexta-feira',
                        saturday: 'Sábado',
                        sunday: 'Domingo'
                      };

                      const currentDayData = openingHours[day] || { isOpen: false, slots: [] };
                      const slot = currentDayData.slots?.[0] || { start: '11:00', end: '23:00' };

                      const handleDayToggle = (checked: boolean) => {
                        const newHours = { ...openingHours };
                        newHours[day] = {
                          isOpen: checked,
                          slots: checked ? [slot] : []
                        };
                        setOpeningHours(newHours);
                      };

                      const handleSlotChange = (field: 'start' | 'end', val: string) => {
                        const newHours = { ...openingHours };
                        const updatedSlot = { ...slot, [field]: val };
                        newHours[day] = {
                          isOpen: currentDayData.isOpen,
                          slots: [updatedSlot]
                        };
                        setOpeningHours(newHours);
                      };

                      return (
                        <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id={`hours-toggle-${day}`}
                              checked={currentDayData.isOpen}
                              onChange={(e) => handleDayToggle(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-highlight focus:ring-highlight"
                            />
                            <Label htmlFor={`hours-toggle-${day}`} className="font-bold text-sm text-slate-700 min-w-[110px]">
                              {dayLabels[day]}
                            </Label>
                          </div>
                          
                          {currentDayData.isOpen ? (
                            <div className="flex items-center gap-2 pl-7 sm:pl-0">
                              <Input
                                type="text"
                                value={slot.start}
                                onChange={(e) => handleSlotChange('start', e.target.value)}
                                placeholder="11:00"
                                className="h-8 w-20 text-xs text-center font-semibold bg-white"
                              />
                              <span className="text-xs text-slate-400 font-bold">às</span>
                              <Input
                                type="text"
                                value={slot.end}
                                onChange={(e) => handleSlotChange('end', e.target.value)}
                                placeholder="23:00"
                                className="h-8 w-20 text-xs text-center font-semibold bg-white"
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-red-500 pl-7 sm:pl-0 uppercase">
                              Fechado
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fonte/Origem do Cardápio para Auditoria */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-soft-sm">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FileText className="w-5 h-5 text-highlight" />
                  <h4 className="font-bold text-[#022D68] text-base">Fonte do Cardápio (Auditoria Adm)</h4>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Forneça o link ou carregue uma foto/imagem do cardápio utilizado para que o administrador possa auditar e validar as informações fornecidas.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="menu-source-url" className="text-xs font-bold text-slate-600">Link da Fonte (Instagram, Site, etc.)</Label>
                    <Input
                      id="menu-source-url"
                      value={menuSourceUrl}
                      onChange={(e) => setMenuSourceUrl(e.target.value)}
                      placeholder="https://instagram.com/restaurante/cardapio"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600">Foto/Imagem do Cardápio (Física ou Printscreen)</Label>
                    <div className="flex items-center gap-2">
                      {menuSourceImage ? (
                        <div className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={menuSourceImage} alt="Origem" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setMenuSourceImage('')}
                            className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                            title="Remover imagem"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('menu-source-image-upload')?.click()}
                          className="h-9 text-xs border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Selecionar Imagem
                        </Button>
                      )}
                      <input
                        type="file"
                        id="menu-source-image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setMenuSourceImage(event.target.result as string);
                                showSuccess('Imagem da fonte do cardápio carregada!');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {menuSourceImage && (
                        <span className="text-[10px] text-green-500 font-bold">Imagem selecionada</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Construtor de Cardápio */}
              <div className="space-y-6 pt-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-lg font-bold text-[#022D68] flex items-center gap-2">
                    <Coins className="w-5 h-5 text-orange-400" /> Cardápio do Estabelecimento
                  </h3>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="outline" 
                    onClick={handleAddCategory}
                    className="font-bold border-orange-200 text-highlight hover:bg-orange-50 gap-1 h-8"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Categoria
                  </Button>
                </div>

                {/* Assistente de Cardápio com IA */}
                <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/30 border border-amber-100 rounded-2xl p-5 space-y-4 shadow-soft-sm">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowAiInput(!showAiInput)}>
                    <div className="flex items-center gap-2.5">
                      <div className="bg-amber-100 p-2 rounded-xl text-highlight">
                        <Sparkles className="w-5 h-5 text-highlight animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          Assistente de Cardápio com IA
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium">Preencha o cardápio automaticamente a partir de texto copiado</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-highlight hover:text-orange-600 hover:bg-orange-50 font-bold text-xs"
                    >
                      {showAiInput ? "Fechar" : "Abrir Assistente"}
                    </Button>
                  </div>

                  {showAiInput && (
                    <div className="space-y-4 pt-2 border-t border-amber-100/50">
                      <div className="space-y-1">
                        <Label htmlFor="ai-menu-text" className="text-xs font-bold text-slate-600">
                          Texto Transcrito do Cardápio *
                        </Label>
                        <textarea
                          id="ai-menu-text"
                          rows={5}
                          placeholder="Cole aqui o texto do cardápio transcrito pelo Gemini ou outro local... Ex:
PIZZAS
Muzzarela - R$ 35,00 (Molho, muzzarela e orégano)
Calabresa - R$ 40,00 (Molho, calabresa, cebola e orégano)

BEBIDAS
Coca-Cola 350ml - R$ 6,00
Suco de Laranja - R$ 8,00"
                          value={aiMenuText}
                          onChange={(e) => setAiMenuText(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-highlight focus:border-transparent placeholder-slate-400 font-medium resize-y min-h-[120px]"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleParseMenuWithAI}
                        disabled={isParsingMenu}
                        className="w-full h-10 font-bold bg-[#E47948] hover:bg-[#c96233] text-white flex items-center justify-center gap-2 rounded-xl shadow-soft"
                      >
                        {isParsingMenu ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processando com IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Organizar Cardápio com IA</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {menuCategories.map((cat, catIdx) => (
                  <div key={cat.id} className="p-5 border border-slate-150 rounded-xl space-y-4 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <Label className="text-xs font-bold text-slate-500 mb-1 block">Nome da Categoria (Ex: Hambúrgueres)</Label>
                        <Input
                          value={cat.name}
                          onChange={(e) => handleCategoryNameChange(cat.id, e.target.value)}
                          placeholder="Ex: Entradas, Hambúrgueres, Bebidas, Sobremesas..."
                          className="font-bold text-primary bg-white h-9"
                        />
                      </div>
                      {menuCategories.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5 h-9 w-9"
                          onClick={() => handleRemoveCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-500">Pratos / Itens desta Categoria</Label>
                      
                      {cat.items.map((item, itemIdx) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-white border border-slate-100 rounded-lg relative items-center">
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Foto</span>
                            <div className="flex items-center gap-1.5">
                              <div 
                                onClick={() => document.getElementById(`item-image-upload-${item.id}`)?.click()}
                                onPaste={(e) => handlePasteItemImage(e, cat.id, item.id)}
                                tabIndex={0}
                                className="relative h-11 w-11 border border-dashed border-slate-200 hover:border-orange-400 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all group shrink-0"
                                title="Clique para fazer upload ou foque e pressione Ctrl+V para colar a imagem do prato"
                              >
                                {item.image_url ? (
                                  <img src={item.image_url} alt="Prato" className="h-full w-full object-cover" />
                                ) : (
                                  <Camera className="w-4 h-4 text-slate-400 group-hover:text-orange-400 transition-colors" />
                                )}
                                <input
                                  type="file"
                                  id={`item-image-upload-${item.id}`}
                                  onChange={(e) => handleItemImageUpload(e, cat.id, item.id)}
                                  className="hidden"
                                  accept="image/*"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClipboardPaste(cat.id, item.id);
                                  }}
                                  className="h-5 w-5 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-500 hover:border-orange-200 p-0"
                                  title="Colar imagem ou link de imagem da área de transferência"
                                >
                                  <Clipboard className="w-3 h-3" />
                                </Button>
                                {item.image_url && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleItemChange(cat.id, item.id, 'image_url', '');
                                    }}
                                    className="h-5 w-5 border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 p-0"
                                    title="Excluir imagem colada"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-3 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Nome do Prato *</span>
                            <Input
                              value={item.name}
                              onChange={(e) => handleItemChange(cat.id, item.id, 'name', e.target.value)}
                              placeholder="Ex: X-Burguer Supremo"
                              className="h-8 text-xs bg-slate-50/30"
                            />
                          </div>
                          
                          <div className="md:col-span-4 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Descrição</span>
                            <Input
                              value={item.description}
                              onChange={(e) => handleItemChange(cat.id, item.id, 'description', e.target.value)}
                              placeholder="Ex: Pão brioche, blend 150g, cheddar, picles..."
                              className="h-8 text-xs bg-slate-50/30"
                            />
                          </div>
                          
                          <div className="md:col-span-2 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Preço (R$) *</span>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleItemChange(cat.id, item.id, 'price', e.target.value)}
                              placeholder="25.00"
                              min="0"
                              step="0.01"
                              className="h-8 text-xs bg-slate-50/30"
                            />
                          </div>

                          <div className="md:col-span-1 flex items-end justify-end">
                            {cat.items.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                onClick={() => handleRemoveItem(cat.id, item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddItem(cat.id)}
                        className="text-highlight font-bold text-xs gap-1 hover:bg-orange-50 h-7"
                      >
                        <Plus className="w-3 h-3" /> Adicionar Prato
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botões de Ação */}
              <div className="pt-6 border-t flex flex-col md:flex-row gap-3">
                <Button 
                  className="flex-1 bg-highlight hover:bg-highlight/90 font-bold py-5 gap-2 text-white h-11"
                  onClick={handleCompleteMission}
                >
                  <CheckCircle className="w-5 h-5" /> Concluir Missão & Receber R$ 1,00
                </Button>
                <Button 
                  variant="outline" 
                  className="border-gray-300 font-bold py-5 text-gray-600 h-11"
                  onClick={() => setActiveMission(null)}
                >
                  Cancelar
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabeçalho de Navegação e Logout */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-[#022D68] text-xl">FilterFood</span>
            <Badge className="bg-[#022D68] text-white">Freelancer Workspace</Badge>
          </div>
        </div>

        {/* Banners de Status de Validação */}
        {activeFreelancer.status === 'Pendente' && (
          <div className="bg-amber-500 text-white font-semibold px-4 py-3 rounded-2xl flex items-center gap-3 shadow-soft-md">
            <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
            <div className="text-xs">
              <span className="font-extrabold block text-sm">Cadastro Pendente de Validação</span>
              Seu perfil foi enviado para análise do administrador. Você poderá visualizar as missões, mas só poderá iniciá-las após a aprovação de sua conta.
            </div>
          </div>
        )}
        {activeFreelancer.status === 'Recusado' && (
          <div className="bg-red-500 text-white font-semibold px-4 py-3 rounded-2xl flex items-center gap-3 shadow-soft-md">
            <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
            <div className="text-xs">
              <span className="font-extrabold block text-sm">Cadastro Recusado</span>
              Infelizmente seu cadastro foi recusado pelo administrador. Entre em contato com o suporte para mais informações.
            </div>
          </div>
        )}

        {/* Dashboard de Estatísticas do Freelancer */}
        <Card className="border-none shadow-soft-lg rounded-3xl bg-[#022D68] text-white overflow-hidden relative">
          {/* Background decorativo */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
            <Coins className="w-64 h-64" />
          </div>

          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center font-bold text-[#022D68]">
                  {getInitials(activeFreelancer.name)}
                </div>
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Olá, {activeFreelancer.name}
                    {activeFreelancer.status && (
                      <Badge className={
                        activeFreelancer.status === 'Ativo' ? 'bg-green-500 text-white border-none' :
                        activeFreelancer.status === 'Pendente' ? 'bg-amber-500 text-white border-none' :
                        'bg-red-500 text-white border-none'
                      }>
                        {activeFreelancer.status}
                      </Badge>
                    )}
                  </h2>
                  <span className="text-xs text-slate-300 block font-medium">{activeFreelancer.email}</span>
                </div>
              </div>
              
              {/* Opções de Perfil (Sem Simulação) */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/40 px-3 py-1.5 rounded-xl border border-white/10 w-fit">
                <Button
                  variant="ghost"
                  type="button"
                  size="sm"
                  className="text-red-400 hover:text-white hover:bg-red-600/20 font-bold h-6 px-2 text-[10px] rounded-lg border border-red-400/20"
                  onClick={() => {
                    localStorage.removeItem('mock-active-freelancer-id');
                    setActiveFreelancerId('');
                    showSuccess('Desconectado do perfil com sucesso!');
                  }}
                >
                  Sair do Perfil
                </Button>

              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 bg-slate-900/30 p-5 rounded-2xl border border-white/5 w-full md:w-auto">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Saldo Pendente</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-green-400">R$ {balance.toFixed(2)}</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-medium">A ser pago via PIX</span>
              </div>
              
              <div className="w-px bg-white/10 hidden sm:block"></div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Missões Concluídas</span>
                <span className="text-2xl font-black text-white block">{completedCount}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Total de missões feitas</span>
              </div>

              <div className="w-px bg-white/10 hidden sm:block"></div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Informações da Conta</span>
                <span className="text-xs text-slate-200 block font-semibold">Identificação: {activeFreelancer.id}</span>
                <span className="text-[10px] text-slate-300 block font-medium">
                  Status: {' '}
                  <span className={`font-bold ${
                    activeFreelancer.status === 'Ativo' ? 'text-green-400' :
                    activeFreelancer.status === 'Pendente' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {activeFreelancer.status || 'Ativo'}
                  </span>
                </span>
              </div>
            </div>

            <Button 
              className="w-full md:w-auto bg-orange-400 hover:bg-orange-500 text-[#022D68] font-black h-12 px-6 rounded-xl shadow-lg shadow-orange-500/10"
              onClick={handleRequestRedeem}
              disabled={balance <= 0 || activeFreelancer.status === 'Pendente' || activeFreelancer.status === 'Recusado'}
            >
              Solicitar Resgate
            </Button>
          </CardContent>
        </Card>

        {/* Abas e Filtros das Missões */}
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-gray-200 gap-6">
            <button 
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'disponiveis' 
                  ? 'border-highlight text-[#022D68]' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => setActiveTab('disponiveis')}
            >
              Missões Disponíveis ({pendingMissions.length})
            </button>
            <button 
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === 'concluidas' 
                  ? 'border-highlight text-[#022D68]' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => setActiveTab('concluidas')}
            >
              Minhas Conclusões ({missions.filter(m => m.assignedToId === activeFreelancerId).length})
            </button>
          </div>

          {/* Renderização das Abas */}
          {activeTab === 'disponiveis' && (
            <div className="space-y-4">
              {pendingMissions.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed rounded-3xl p-6">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-[#022D68]">Nenhuma missão disponível no momento</h4>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    Aguarde a gerência disponibilizar novas missões para cadastro.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingMissions.map(m => (
                    <Card key={m.id} className="shadow-soft-md border border-gray-100 hover:shadow-soft-lg hover:border-orange-100 transition-all rounded-2xl bg-white overflow-hidden flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-lg text-primary font-bold">{m.name}</CardTitle>
                          <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-none font-bold text-xs py-1">
                            R$ 1,00
                          </Badge>
                        </div>
                        <span className="text-xs text-orange-400 font-bold bg-orange-50 px-2 py-0.5 rounded-full inline-block mt-1">
                          {m.category}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="text-xs text-slate-500 font-medium space-y-1.5">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{m.address}</span>
                          </div>
                          {m.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{m.phone}</span>
                            </div>
                          )}
                          {m.googleMapsUrl && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 rounded px-1 flex items-center gap-0.5">
                                📍 Google Maps
                              </span>
                              <a 
                                href={m.googleMapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-highlight font-semibold hover:underline"
                              >
                                Ver estabelecimento ↗
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-1 font-bold text-amber-600">
                            <span>⭐ {m.rating.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">({m.reviewsCount} avaliações no Google)</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold h-9 mt-2 text-xs"
                          disabled={activeFreelancer.status === 'Pendente' || activeFreelancer.status === 'Recusado'}
                          onClick={() => handleStartMission(m)}
                        >
                          {activeFreelancer.status === 'Pendente' 
                            ? 'Aguardando Aprovação' 
                            : activeFreelancer.status === 'Recusado'
                              ? 'Cadastro Recusado'
                              : 'Iniciar Missão'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'concluidas' && (
            <div className="space-y-6">
              {/* 1. SEÇÃO DE REFAÇÕES (Para Refazer) */}
              {(() => {
                const list = missions.filter(m => m.status === 'Para Refazer' && m.assignedToId === activeFreelancerId);
                if (list.length === 0) return null;
                return (
                  <div className="space-y-3 bg-red-50/30 p-4 rounded-2xl border border-red-100">
                    <h4 className="font-extrabold text-red-700 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      Refações Necessárias ({list.length})
                    </h4>
                    <p className="text-xs text-red-600 font-medium">As missões abaixo foram revisadas e precisam de ajustes. Clique em "Corrigir" para ajustar os dados e reenviar.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {list.map(m => (
                        <Card key={m.id} className="shadow-soft-md border border-red-200 bg-white overflow-hidden rounded-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-red-800 font-bold">{m.name}</CardTitle>
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none font-bold text-[10px] w-fit">
                              {m.category}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs">
                            <div className="bg-red-50 p-2.5 rounded-lg border border-red-100 text-[11px] text-red-800 font-medium">
                              <span className="font-bold block mb-0.5">Notas da Gerente:</span>
                              {m.feedbackNotes || 'Verifique as regras de cadastro.'}
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => handleStartMission(m)} 
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-8 text-xs animate-pulse"
                            >
                              Corrigir & Re-enviar
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 2. SEÇÃO DE ANÁLISE (Aguardando Validação) */}
              {(() => {
                const list = missions.filter(m => m.status === 'Aguardando Validação' && m.assignedToId === activeFreelancerId);
                if (list.length === 0) return null;
                return (
                  <div className="space-y-3 bg-amber-50/20 p-4 rounded-2xl border border-amber-100">
                    <h4 className="font-extrabold text-amber-700 text-sm flex items-center gap-1.5 uppercase tracking-wider">
                      <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                      Aguardando Validação ({list.length})
                    </h4>
                    <p className="text-xs text-amber-600 font-medium">Você concluiu e enviou estas missões. Elas estão sendo analisadas pela gerência. Se necessário, você ainda pode editá-las.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {list.map(m => (
                        <Card key={m.id} className="shadow-soft-md border border-amber-200 bg-white overflow-hidden rounded-2xl">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-amber-800 font-bold">{m.name}</CardTitle>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold text-[10px] w-fit">
                              {m.category}
                            </Badge>
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                              Em análise pela gerência
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStartMission(m)} 
                              className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 font-bold h-8 text-xs"
                            >
                              Editar Cadastro
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 3. SEÇÃO DE VALIDADOS E CONCLUÍDOS (Agrupado Diariamente) */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-[#022D68] text-sm uppercase tracking-wider border-b pb-1.5">
                  Histórico de Conclusões Diárias
                </h4>
                
                {(() => {
                  const dailyGroups = getCompletionsByDay();
                  if (dailyGroups.length === 0 && 
                      missions.filter(m => (m.status === 'Para Refazer' || m.status === 'Aguardando Validação') && m.assignedToId === activeFreelancerId).length === 0) {
                    return (
                      <div className="text-center py-12 bg-white border border-dashed rounded-3xl p-6">
                        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-[#022D68]">Nenhum trabalho registrado</h4>
                        <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                          Selecione uma missão disponível na aba anterior e inicie o cadastro!
                        </p>
                      </div>
                    );
                  }

                  if (dailyGroups.length === 0) {
                    return (
                      <div className="text-center py-8 text-xs text-slate-500 font-medium italic">
                        Nenhuma missão concluída/aprovada até o momento. Verifique as pendências em análise ou refação acima.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {dailyGroups.map((dayGroup) => (
                        <div key={dayGroup.dateStr} className="space-y-3">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 inline-block">
                            📅 Dia {dayGroup.dateStr} • {dayGroup.missions.length} {dayGroup.missions.length === 1 ? 'concluído' : 'concluídos'}
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {dayGroup.missions.map(m => (
                              <Card key={m.id} className="shadow-soft-md border border-gray-150 rounded-2xl bg-white overflow-hidden flex flex-col hover:border-emerald-250 hover:shadow-soft-lg transition-all">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-base text-primary font-bold">{m.name}</CardTitle>
                                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-bold text-[10px] py-0.5 px-2">
                                      Aprovada • R$ 1,00
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full inline-block w-fit">
                                    {m.category}
                                  </span>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs flex-1 flex flex-col justify-between">
                                  <div className="text-slate-500 font-medium space-y-1">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{m.address}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold mt-1 text-[11px]">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      Validado por Gerente Geral
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="font-bold border-gray-300 text-slate-600 text-xs h-8 gap-1"
                                      onClick={() => window.open(`/restaurant/${m.id}`, '_blank')}
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Ver Perfil
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="font-bold border-gray-300 text-slate-600 text-xs h-8 gap-1"
                                      onClick={() => window.open(`/restaurant/${m.id}/menu-full`, '_blank')}
                                    >
                                      <FileText className="w-3.5 h-3.5" /> Ver Cardápio
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Dialog para resgate do saldo via PIX */}
      <Dialog open={isRedeemDialogOpen} onOpenChange={setIsRedeemDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Coins className="w-6 h-6 text-orange-400" />
              Solicitar Resgate de Saldo
            </DialogTitle>
            <DialogDescription>
              Transfira seus lucros acumulados das missões concluídas. O valor será enviado para sua chave PIX.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">Valor do Saque:</span>
              <span className="text-2xl font-black text-green-700">R$ {balance.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Tipo de Chave PIX</Label>
              <div className="grid grid-cols-4 gap-2">
                {['CPF', 'Celular', 'E-mail', 'Aleatória'].map(type => {
                  const val = type.toLowerCase().replace('-', '');
                  const currentVal = pixKeyType === val;
                  return (
                    <Button 
                      key={type}
                      type="button"
                      variant={currentVal ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPixKeyType(val)}
                      className={`text-xs font-bold ${currentVal ? 'bg-primary text-white' : 'border-gray-200 text-slate-600'}`}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix-key" className="font-bold text-slate-700">Chave PIX *</Label>
              <Input 
                id="pix-key" 
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder={
                  pixKeyType === 'cpf' ? '000.000.000-00' :
                  pixKeyType === 'celular' ? '(11) 99999-9999' :
                  pixKeyType === 'email' ? 'exemplo@pix.com' : 'Sua chave aleatória...'
                }
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              className="flex-1 bg-highlight hover:bg-highlight/90 text-white font-bold h-10"
              onClick={handleConfirmRedeem}
            >
              Confirmar Resgate
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
              onClick={() => setIsRedeemDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para cadastramento de novo freelancer */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-orange-400" />
              Cadastro de Freelancer
            </DialogTitle>
            <DialogDescription>
              Insira seus dados pessoais para enviar seu cadastro para análise do administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="reg-name" className="font-bold text-slate-700">Nome Completo *</Label>
              <Input 
                id="reg-name" 
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Ex: João da Silva Santos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-bold text-slate-700">E-mail *</Label>
              <Input 
                id="reg-email" 
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Ex: joao.santos@email.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="reg-phone" className="font-bold text-slate-700">Telefone *</Label>
                <Input 
                  id="reg-phone" 
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Ex: (83) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-cpf" className="font-bold text-slate-700">CPF *</Label>
                <Input 
                  id="reg-cpf" 
                  value={regCpf}
                  onChange={(e) => setRegCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Tipo de Chave PIX *</Label>
              <div className="grid grid-cols-4 gap-2">
                {['CPF', 'Celular', 'E-mail', 'Aleatória'].map(type => {
                  const val = type.toLowerCase().replace('-', '');
                  const currentVal = regPixType === val;
                  return (
                    <Button 
                      key={type}
                      type="button"
                      variant={currentVal ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRegPixType(val)}
                      className={`text-xs font-bold ${currentVal ? 'bg-primary text-white' : 'border-gray-200 text-slate-600'}`}
                    >
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-pix-key" className="font-bold text-slate-700">Chave PIX *</Label>
              <Input 
                id="reg-pix-key" 
                value={regPixKey}
                onChange={(e) => setRegPixKey(e.target.value)}
                placeholder={
                  regPixType === 'cpf' ? '000.000.000-00' :
                  regPixType === 'celular' ? '(11) 99999-9999' :
                  regPixType === 'email' ? 'exemplo@pix.com' : 'Sua chave aleatória...'
                }
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              className="flex-1 bg-highlight hover:bg-highlight/90 text-white font-bold h-10"
              onClick={handleConfirmRegister}
            >
              Enviar Cadastro
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-gray-300 font-bold h-10 text-gray-600"
              onClick={() => setIsRegisterDialogOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
