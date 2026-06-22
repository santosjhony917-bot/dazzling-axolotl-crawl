import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CreditCard, Gift, Ban, TrendingUp, AlertCircle, ArrowUpRight, DollarSign } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const MOCK_SUBSCRIPTIONS = [
  { id: 1, name: 'Burger House', plan: 'Premium (Pago)', value: 'R$ 149', status: 'Ativo', nextBilling: '12/07/2026' },
  { id: 2, name: 'Pizzaria da Nonna', plan: 'Premium (Cortesia)', value: 'R$ 0', status: 'Expira em 3 dias', nextBilling: '24/06/2026' },
  { id: 3, name: 'Sushi Express', plan: 'Free', value: 'R$ 0', status: 'Ativo', nextBilling: '--' },
  { id: 4, name: 'Açaí Tropical', plan: 'Premium (Pago)', value: 'R$ 149', status: 'Inadimplente', nextBilling: '05/06/2026' },
  { id: 5, name: 'Café Paris', plan: 'Premium (Cortesia)', value: 'R$ 0', status: 'Expirada', nextBilling: '15/06/2026' },
];

export default function CitySubscriptions() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Painel Financeiro (Assinaturas)</h2>
          <p className="text-sm text-slate-500">Gestão de MRR, retenção e saúde financeira da cidade.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold shadow-sm">
            Exportar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-xl bg-slate-900 text-white">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">MRR Atual</p>
              <p className="text-2xl font-black text-emerald-400">R$ 9.800</p>
            </div>
            <div className="p-3 bg-slate-800 text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Premium (Pagantes)</p>
              <p className="text-2xl font-black text-slate-900">264</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Premium (Cortesia)</p>
              <p className="text-2xl font-black text-slate-900">700</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Churn Rate (Mês)</p>
              <p className="text-2xl font-black text-rose-600">2.1%</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Assinaturas */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar restaurante..."
                  className="pl-9 h-9 border-slate-200 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer">Pagantes</Badge>
                <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer">Cortesias</Badge>
                <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer">Inadimplentes</Badge>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white border-slate-100">
                  <TableHead className="font-bold text-slate-500">Estabelecimento</TableHead>
                  <TableHead className="font-bold text-slate-500">Plano</TableHead>
                  <TableHead className="font-bold text-slate-500">Valor</TableHead>
                  <TableHead className="font-bold text-slate-500">Status</TableHead>
                  <TableHead className="font-bold text-slate-500">Próxima Cobrança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_SUBSCRIPTIONS.map((sub) => (
                  <TableRow key={sub.id} className="border-slate-100 hover:bg-slate-50">
                    <TableCell className="font-bold text-slate-900">{sub.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold ${sub.plan.includes('Pago') ? 'text-indigo-600' : sub.plan.includes('Cortesia') ? 'text-purple-600' : 'text-slate-500'}`}>
                        {sub.plan}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{sub.value}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-bold ${
                        sub.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        sub.status.includes('Expira') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm font-medium">{sub.nextBilling}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
              <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50">
                Ver todos os 1.230 registros
              </Button>
            </div>
          </Card>
        </div>

        {/* Forecast & Alertas Financeiros */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" /> Forecast (Previsão)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">Previsão 30 dias</span>
                <span className="text-sm font-black text-emerald-600">+ R$ 2.400</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">Previsão 90 dias</span>
                <span className="text-sm font-black text-emerald-600">+ R$ 6.800</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-600">ARR Previsto (1 ano)</span>
                <span className="text-base font-black text-indigo-600">R$ 117.600</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 shadow-sm rounded-xl overflow-hidden bg-amber-50/30">
            <div className="p-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-amber-900 text-sm">Oportunidades de Receita</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800 text-sm">700 Cortesias Ativas</p>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">Você tem R$ 104.300 de MRR em potencial esperando conversão.</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 -mt-1"><ArrowUpRight className="w-4 h-4" /></Button>
              </div>
              <div className="flex justify-between items-start pt-3 border-t border-amber-100/50">
                <div>
                  <p className="font-bold text-slate-800 text-sm">R$ 596 Inadimplentes</p>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">4 restaurantes com fatura atrasada há mais de 5 dias.</p>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6 text-indigo-600 hover:bg-indigo-50 -mt-1"><ArrowUpRight className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
