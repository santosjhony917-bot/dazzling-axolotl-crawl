import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { DollarSign, Award, Users, RefreshCw, CheckCircle, Search, UserCheck, ShieldAlert, Phone, Check, X, FileText, ExternalLink, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface Freelancer {
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
}

interface CompletedMissionLog {
  id: string;
  restaurantId?: string;
  restaurantName: string;
  freelancerId?: string;
  freelancerName: string;
  freelancerEmail?: string;
  completedAt: string;
  reward: number;
  menuSourceUrl?: string;
  menuSourceImage?: string;
}


export default function FreelancerMonitor() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalCompleted: 0,
    totalBalance: 0,
    totalPaid: 0,
    totalPending: 0,
    totalActive: 0,
  });

  const [activityLog, setActivityLog] = useState<CompletedMissionLog[]>([]);
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [auditViewMode, setAuditViewMode] = useState<'detailed' | 'daily'>('detailed');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const getDailyProduction = () => {
    const groups: Record<string, {
      dateStr: string;
      totalRestaurants: number;
      freelancerProduction: Record<string, number>;
      missions: CompletedMissionLog[];
    }> = {};

    const filtered = activityLog.filter((log) => {
      const term = logSearchTerm.toLowerCase();
      return (
        log.restaurantName.toLowerCase().includes(term) ||
        log.freelancerName.toLowerCase().includes(term) ||
        (log.freelancerEmail && log.freelancerEmail.toLowerCase().includes(term))
      );
    });

    filtered.forEach((log) => {
      const dateObj = new Date(log.completedAt);
      if (isNaN(dateObj.getTime())) return;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      const dateKey = `${year}-${month}-${day}`; // sortable key
      const displayDate = `${day}/${month}/${year}`;

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateStr: displayDate,
          totalRestaurants: 0,
          freelancerProduction: {},
          missions: [],
        };
      }

      groups[dateKey].totalRestaurants += 1;
      groups[dateKey].missions.push(log);

      const fName = log.freelancerName || 'Desconhecido';
      groups[dateKey].freelancerProduction[fName] = (groups[dateKey].freelancerProduction[fName] || 0) + 1;
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        key,
        ...groups[key]
      }));
  };

  const toggleDayExpansion = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const loadActivityLog = () => {
    try {
      const savedLog = localStorage.getItem('mock-completed-missions-log');
      if (savedLog) {
        setActivityLog(JSON.parse(savedLog));
      } else {
        setActivityLog([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFreelancers = () => {
    try {
      // 1. Carrega dados de freelancers do localStorage
      let savedFreelancers = localStorage.getItem('mock-freelancers');
      let list: Freelancer[] = [];
      
      if (savedFreelancers) {
        list = JSON.parse(savedFreelancers);
      } else {
        list = [];
        localStorage.setItem('mock-freelancers', JSON.stringify(list));
      }

      setFreelancers(list);

      // Calcular estatísticas globais
      const completed = list.reduce((sum, f) => sum + f.completedMissions, 0);
      const balance = list.reduce((sum, f) => sum + f.balance, 0);
      const pending = list.filter(f => f.status === 'Pendente').length;
      const active = list.filter(f => f.status === 'Ativo' || !f.status).length;
      
      const savedTotalPaid = localStorage.getItem('mock-freelancer-total-paid');
      const paid = savedTotalPaid ? parseFloat(savedTotalPaid) : 0;

      setGlobalStats({
        totalCompleted: completed,
        totalBalance: balance,
        totalPaid: paid,
        totalPending: pending,
        totalActive: active
      });

    } catch (e) {
      console.error(e);
    }
  };

  const handleShowFreelancerDetails = (freelancer: Freelancer) => {
    setSelectedFreelancer(freelancer);
    setIsDetailsOpen(true);
  };

  useEffect(() => {
    // Reset total paid history to 0 as requested by user
    localStorage.setItem('mock-freelancer-total-paid', '0');

    loadFreelancers();
    loadActivityLog();

    const handleSync = () => {
      loadFreelancers();
      loadActivityLog();
    };

    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handlePay = (freelancerId: string) => {
    try {
      const target = freelancers.find(f => f.id === freelancerId);
      if (!target) return;

      if (target.balance === 0) {
        showError('Este freelancer não possui saldo acumulado para receber.');
        return;
      }

      const payout = target.balance;

      // Zera o saldo local do freelancer
      const updatedList = freelancers.map(f => {
        if (f.id === freelancerId) {
          return { ...f, balance: 0 };
        }
        return f;
      });

      setFreelancers(updatedList);
      localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));

      // Se for João Silva ou o simulado ativo, atualiza também a chave de balance legado para manter a UI
      localStorage.setItem('mock-freelancer-balance', '0');

      // Acumula no valor pago histórico
      const newPaid = globalStats.totalPaid + payout;
      localStorage.setItem('mock-freelancer-total-paid', newPaid.toString());

      setGlobalStats(prev => ({
        ...prev,
        totalBalance: prev.totalBalance - payout,
        totalPaid: newPaid,
      }));

      // Dispara evento de sincronia
      window.dispatchEvent(new Event('storage'));

      showSuccess(`Pagamento de R$ ${payout.toFixed(2)} registrado para ${target.name}! O saldo foi zerado.`);
    } catch (e) {
      console.error(e);
      showError('Erro ao registrar pagamento.');
    }
  };

  const handleApprove = (freelancerId: string) => {
    try {
      const updatedList = freelancers.map(f => {
        if (f.id === freelancerId) {
          return { ...f, status: 'Ativo' as const };
        }
        return f;
      });

      setFreelancers(updatedList);
      localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));

      // Dispara evento de sincronia
      window.dispatchEvent(new Event('storage'));
      loadFreelancers(); // Recalcula stats
      showSuccess('Freelancer aprovado com sucesso!');
    } catch (e) {
      console.error(e);
      showError('Erro ao aprovar cadastro.');
    }
  };

  const handleReject = (freelancerId: string) => {
    try {
      const updatedList = freelancers.map(f => {
        if (f.id === freelancerId) {
          return { ...f, status: 'Recusado' as const };
        }
        return f;
      });

      setFreelancers(updatedList);
      localStorage.setItem('mock-freelancers', JSON.stringify(updatedList));

      // Dispara evento de sincronia
      window.dispatchEvent(new Event('storage'));
      loadFreelancers(); // Recalcula stats
      showSuccess('Cadastro do freelancer recusado.');
    } catch (e) {
      console.error(e);
      showError('Erro ao recusar cadastro.');
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl text-primary font-bold">Monitor de Freelancers</CardTitle>
            <CardDescription>Gerencie as missões cumpridas e os valores a pagar para cada freelancer.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('/freelancer-portal', '_blank')} 
              className="gap-1.5 border-[#022D68] text-[#022D68] hover:bg-slate-50 font-bold"
            >
              Ir para Portal do Freelancer ↗
            </Button>
            <Button variant="outline" size="sm" onClick={() => { loadFreelancers(); loadActivityLog(); }} className="gap-1 border-gray-300 font-semibold">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar Dados
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Missões Concluídas</span>
            <span className="text-xl font-extrabold text-primary">{globalStats.totalCompleted}</span>
          </div>
        </Card>

        <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Saldo Pendente</span>
            <span className="text-xl font-extrabold text-green-700">R$ {globalStats.totalBalance.toFixed(2)}</span>
          </div>
        </Card>

        <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Total Histórico Pago</span>
            <span className="text-xl font-extrabold text-blue-800">R$ {globalStats.totalPaid.toFixed(2)}</span>
          </div>
        </Card>

        <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Freelancers Ativos</span>
            <span className="text-xl font-extrabold text-indigo-700">{globalStats.totalActive}</span>
          </div>
        </Card>

        <Card className="shadow-soft-md border border-gray-100 rounded-2xl bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Cadastros Pendentes</span>
            <span className="text-xl font-extrabold text-rose-700">{globalStats.totalPending}</span>
          </div>
        </Card>
      </div>

      {/* Abas de Gerenciamento de Freelancers */}
      <Tabs defaultValue="ativos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white shadow-soft-lg rounded-xl mb-4">
          <TabsTrigger value="ativos" className="py-2.5 text-xs font-bold data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            Ativos & Finanças ({globalStats.totalActive})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="py-2.5 text-xs font-bold data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            Solicitações Pendentes ({globalStats.totalPending})
          </TabsTrigger>
          <TabsTrigger value="recusados" className="py-2.5 text-xs font-bold data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            Recusados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 p-4 flex flex-row items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg text-primary font-bold">Resumo Financeiro por Freelancer Ativo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold">Freelancer</TableHead>
                    <TableHead className="font-bold">E-mail</TableHead>
                    <TableHead className="font-bold text-center">Missões Feitas</TableHead>
                    <TableHead className="font-bold text-center">Recompensa / Missão</TableHead>
                    <TableHead className="font-bold text-center">Saldo Acumulado</TableHead>
                    <TableHead className="font-bold">Última Atividade</TableHead>
                    <TableHead className="font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freelancers.filter(f => f.status === 'Ativo' || !f.status).map((f) => (
                    <TableRow key={f.id} className="hover:bg-gray-50/50">
                      <TableCell 
                        className="font-semibold text-primary hover:underline hover:text-highlight cursor-pointer"
                        onClick={() => handleShowFreelancerDetails(f)}
                      >
                        {f.name}
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium">{f.email}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{f.completedMissions}</TableCell>
                      <TableCell className="text-center text-gray-600 font-semibold">R$ 1,00</TableCell>
                      <TableCell className="text-center">
                        <Badge className={f.balance > 0 ? "bg-green-100 text-green-800 font-bold border-none" : "bg-gray-100 text-gray-500 border-none"}>
                          R$ {f.balance.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium">{f.lastActivity}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant={f.balance > 0 ? "default" : "outline"} 
                          disabled={f.balance === 0}
                          onClick={() => handlePay(f.id)}
                          className="font-bold h-8"
                        >
                          Pagar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {freelancers.filter(f => f.status === 'Ativo' || !f.status).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500 font-semibold">
                        Nenhum freelancer ativo cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes">
          <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 p-4 flex flex-row items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg text-primary font-bold">Solicitações de Cadastro de Freelancers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">Contato & Doc</TableHead>
                    <TableHead className="font-bold">E-mail</TableHead>
                    <TableHead className="font-bold">Dados PIX</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freelancers.filter(f => f.status === 'Pendente').map((f) => (
                    <TableRow key={f.id} className="hover:bg-gray-50/50">
                      <TableCell 
                        className="font-semibold text-primary hover:underline hover:text-highlight cursor-pointer"
                        onClick={() => handleShowFreelancerDetails(f)}
                      >
                        <div>
                          <span className="block font-bold">{f.name}</span>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">ID: {f.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 font-medium">
                        <div className="space-y-0.5 text-xs">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /> {f.phone || 'Não informado'}</span>
                          <span className="block font-semibold">CPF: {f.cpf || 'Não informado'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium">{f.email}</TableCell>
                      <TableCell className="text-gray-600 font-medium">
                        <div className="text-xs">
                          <span className="block font-bold text-slate-500 uppercase text-[10px]">PIX ({f.pixKeyType}):</span>
                          <span className="font-semibold select-all text-xs">{f.pixKey}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-100 text-amber-800 border-none font-bold">
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(f.id)}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 gap-0.5"
                          >
                            <Check className="w-4 h-4" /> Aprovar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReject(f.id)}
                            className="font-bold h-8 gap-0.5"
                          >
                            <X className="w-4 h-4" /> Recusar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {freelancers.filter(f => f.status === 'Pendente').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-500 font-semibold">
                        Nenhuma solicitação de cadastro pendente no momento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recusados">
          <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-100 p-4 flex flex-row items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <CardTitle className="text-lg text-red-500 font-bold">Cadastros Recusados / Inativos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold">Freelancer</TableHead>
                    <TableHead className="font-bold">Contato</TableHead>
                    <TableHead className="font-bold">E-mail</TableHead>
                    <TableHead className="font-bold">CPF</TableHead>
                    <TableHead className="font-bold text-center">Status</TableHead>
                    <TableHead className="font-bold text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freelancers.filter(f => f.status === 'Recusado').map((f) => (
                    <TableRow key={f.id} className="hover:bg-gray-50/50 bg-red-50/10">
                      <TableCell 
                        className="font-semibold text-primary hover:underline hover:text-highlight cursor-pointer"
                        onClick={() => handleShowFreelancerDetails(f)}
                      >
                        {f.name}
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium">{f.phone}</TableCell>
                      <TableCell className="text-slate-500 font-medium">{f.email}</TableCell>
                      <TableCell className="text-slate-500 font-semibold">{f.cpf}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-100 text-red-800 border-none font-bold">
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApprove(f.id)}
                          className="font-bold h-8 border-green-200 text-green-700 hover:bg-green-50"
                        >
                          Re-aprovar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {freelancers.filter(f => f.status === 'Recusado').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500 font-semibold">
                        Nenhum cadastro recusado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log de Atividades Recentes / Auditoria */}
      <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/80 border-b border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <CardTitle className="text-lg text-primary font-bold">Log de Atividades Recentes (Auditoria)</CardTitle>
              <CardDescription className="text-xs">Registro histórico de todas as missões validadas e concluídas.</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Seletor de Modo de Visualização */}
            <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-50/50 w-full sm:w-auto justify-center">
              <button
                onClick={() => setAuditViewMode('detailed')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  auditViewMode === 'detailed'
                    ? 'bg-white text-primary shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Histórico Detalhado
              </button>
              <button
                onClick={() => setAuditViewMode('daily')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  auditViewMode === 'daily'
                    ? 'bg-white text-primary shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Produção por Dia
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por restaurante ou freelancer..."
                value={logSearchTerm}
                onChange={(e) => setLogSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white border-gray-300 text-xs focus-visible:ring-highlight w-full"
              />
            </div>
            
            {activityLog.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold w-full sm:w-auto"
                onClick={() => {
                  if (window.confirm('Deseja limpar todo o histórico de auditoria?')) {
                    localStorage.removeItem('mock-completed-missions-log');
                    setActivityLog([]);
                    window.dispatchEvent(new Event('storage'));
                    showSuccess('Histórico de auditoria limpo com sucesso.');
                  }
                }}
              >
                Limpar Log
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activityLog.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-medium">
              Nenhuma atividade registrada no log de auditoria até o momento.
            </div>
          ) : auditViewMode === 'detailed' ? (() => {
            const filteredLog = activityLog.filter((log) => {
              const term = logSearchTerm.toLowerCase();
              return (
                log.restaurantName.toLowerCase().includes(term) ||
                log.freelancerName.toLowerCase().includes(term) ||
                (log.freelancerEmail && log.freelancerEmail.toLowerCase().includes(term))
              );
            });

            if (filteredLog.length === 0) {
              return (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Nenhuma atividade corresponde aos filtros de busca.
                </div>
              );
            }

            return (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="font-bold">Restaurante</TableHead>
                    <TableHead className="font-bold">Freelancer</TableHead>
                    <TableHead className="font-bold">E-mail</TableHead>
                    <TableHead className="font-bold text-center">Data de Conclusão</TableHead>
                    <TableHead className="font-bold text-right">Recompensa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredLog].reverse().map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-semibold text-primary">{log.restaurantName}</TableCell>
                      <TableCell className="font-semibold text-slate-700">{log.freelancerName}</TableCell>
                      <TableCell className="text-gray-500 font-medium text-xs">{log.freelancerEmail}</TableCell>
                      <TableCell className="text-center text-gray-500 text-xs">
                        {new Date(log.completedAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        R$ {log.reward.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })() : (() => {
            const dailyData = getDailyProduction();

            if (dailyData.length === 0) {
              return (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Nenhuma atividade corresponde aos filtros de busca.
                </div>
              );
            }

            return (
              <div className="p-4 space-y-4">
                {dailyData.map((dayGroup) => {
                  const isExpanded = !!expandedDays[dayGroup.key];
                  return (
                    <div key={dayGroup.key} className="border border-gray-100 rounded-xl bg-white shadow-soft-sm overflow-hidden transition-all duration-200 hover:shadow-soft-md">
                      {/* Header do Dia */}
                      <div 
                        onClick={() => toggleDayExpansion(dayGroup.key)}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors gap-3 select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-[#022D68] text-sm md:text-base">{dayGroup.dateStr}</span>
                            <span className="text-xs text-gray-500 block md:inline md:ml-2">
                              • {dayGroup.totalRestaurants} {dayGroup.totalRestaurants === 1 ? 'restaurante cadastrado' : 'restaurantes cadastrados'}
                            </span>
                          </div>
                        </div>

                        {/* Produção dos Freelancers */}
                        <div className="flex flex-wrap items-center gap-1.5 md:ml-auto pr-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Produção:</span>
                          {Object.entries(dayGroup.freelancerProduction).map(([name, count]) => (
                            <Badge key={name} className="bg-white hover:bg-slate-50 text-primary border border-gray-200 font-semibold text-xs py-0.5 px-2">
                              {name}: <span className="font-extrabold text-indigo-600 ml-0.5">{count}</span>
                            </Badge>
                          ))}
                        </div>

                        {/* Toggle Arrow */}
                        <div className="text-gray-400 flex items-center justify-end">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Restaurantes do Dia */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-white">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50/20">
                                <TableHead className="font-bold pl-6 text-xs text-slate-500">Restaurante</TableHead>
                                <TableHead className="font-bold text-xs text-slate-500">Freelancer</TableHead>
                                <TableHead className="font-bold text-xs text-slate-500">E-mail</TableHead>
                                <TableHead className="font-bold text-center text-xs text-slate-500">Horário</TableHead>
                                <TableHead className="font-bold text-right pr-6 text-xs text-slate-500">Recompensa</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayGroup.missions.map((log) => (
                                <TableRow key={log.id} className="hover:bg-gray-50/30">
                                  <TableCell className="font-semibold text-primary pl-6 py-3">{log.restaurantName}</TableCell>
                                  <TableCell className="font-semibold text-slate-700 py-3">{log.freelancerName}</TableCell>
                                  <TableCell className="text-gray-500 font-medium text-xs py-3">{log.freelancerEmail}</TableCell>
                                  <TableCell className="text-center text-gray-500 text-xs py-3">
                                    {new Date(log.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell className="text-right font-extrabold text-green-700 pr-6 py-3">
                                    R$ {log.reward.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Dialog com Detalhes do Freelancer e Atividades */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-3xl border-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <Users className="w-6 h-6 text-orange-400" />
              Perfil Detalhado do Freelancer
            </DialogTitle>
            <DialogDescription>
              Visualize os dados cadastrais e o histórico de missões concluídas por este freelancer.
            </DialogDescription>
          </DialogHeader>

          {selectedFreelancer && (
            <div className="space-y-6 py-4">
              {/* Header com Informações Básicas */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                <div className="w-14 h-14 bg-orange-400 text-[#022D68] rounded-full flex items-center justify-center font-black text-xl bg-[#022d68] text-white">
                  {selectedFreelancer.name
                    ? selectedFreelancer.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2)
                    : 'FL'}
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 truncate">{selectedFreelancer.name}</h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{selectedFreelancer.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={
                      selectedFreelancer.status === 'Ativo' ? 'bg-green-500 text-white border-none' :
                      selectedFreelancer.status === 'Pendente' ? 'bg-amber-500 text-white border-none' :
                      'bg-red-500 text-white border-none'
                    }>
                      {selectedFreelancer.status || 'Ativo'}
                    </Badge>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">ID: {selectedFreelancer.id}</span>
                  </div>
                </div>
              </div>

              {/* Informações Cadastrais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contato & Documento</span>
                  <span className="text-xs font-semibold text-slate-700 block">CPF: {selectedFreelancer.cpf || 'Não informado'}</span>
                  <span className="text-xs font-semibold text-slate-700 block">Tel: {selectedFreelancer.phone || 'Não informado'}</span>
                </div>
                <div className="border border-slate-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dados Financeiros (PIX)</span>
                  <span className="text-xs font-semibold text-slate-700 block">Tipo: {selectedFreelancer.pixKeyType ? selectedFreelancer.pixKeyType.toUpperCase() : 'Não informado'}</span>
                  <span className="text-xs font-semibold text-slate-700 block truncate">Chave: {selectedFreelancer.pixKey || 'Não informado'}</span>
                </div>
                <div className="border border-slate-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Pendente</span>
                  <span className="text-lg font-black text-green-600">R$ {selectedFreelancer.balance.toFixed(2)}</span>
                </div>
                <div className="border border-slate-100 p-3.5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Missões Feitas</span>
                  <span className="text-lg font-black text-[#022D68]">{selectedFreelancer.completedMissions}</span>
                </div>
              </div>

              {/* Histórico de Atividades / Missões Concluídas */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 text-sm border-b pb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-400" />
                  Histórico de Atividades Auditoria
                </h4>
                
                {activityLog.filter(log => log.freelancerId === selectedFreelancer.id).length === 0 ? (
                  <p className="text-center py-6 text-xs text-gray-500 font-semibold italic">Nenhuma atividade registrada no log para este freelancer.</p>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                    {activityLog
                      .filter(log => log.freelancerId === selectedFreelancer.id)
                      .reverse()
                      .map((log) => (
                        <div key={log.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-2 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-slate-800 block text-sm">{log.restaurantName}</span>
                              <span className="text-[10px] text-gray-400 font-semibold">{new Date(log.completedAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold">
                              + R$ {log.reward.toFixed(2)}
                            </Badge>
                          </div>
                          
                          {/* Dados de auditoria do cardápio cadastrado */}
                          {(log.menuSourceUrl || log.menuSourceImage) && (
                            <div className="bg-white border border-slate-150 rounded-lg p-2.5 space-y-2 mt-1">
                              <span className="text-[9px] font-extrabold text-[#022D68] uppercase block tracking-wider">Dados Enviados para Auditoria</span>
                              {log.menuSourceUrl && (
                                <a 
                                  href={log.menuSourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[11px] text-highlight hover:underline font-bold inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Ver Link da Fonte ↗
                                </a>
                              )}
                              {log.menuSourceImage && (
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 font-semibold block">Imagem do Cardápio:</span>
                                  <div className="relative w-28 h-20 rounded border overflow-hidden hover:opacity-95 transition-opacity">
                                    <a href={log.menuSourceImage} target="_blank" rel="noopener noreferrer">
                                      <img src={log.menuSourceImage} alt="Cardápio" className="h-full w-full object-cover" />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              className="w-full bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold h-10 rounded-xl"
              onClick={() => setIsDetailsOpen(false)}
            >
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
