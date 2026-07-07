import React from 'react';
import { Bot, MessageCircle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CrmAdminTabs } from './crm/CrmWorkspace';

export default function AdminCrm() {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">FilterFood Comercial</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">CRM & Vendas IA</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
            Central pós-publicação para abordar restaurantes que já foram validados, publicados e possuem contato confiável. O CRM usa
            `commercial_leads`, `commercial_events` e a fila de robôs como fonte operacional.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:w-[360px]">
          <HeaderChip icon={<ShieldCheck className="h-4 w-4" />} label="Validado" />
          <HeaderChip icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" />
          <HeaderChip icon={<Bot className="h-4 w-4" />} label="IA" />
        </div>
      </div>

      <CrmAdminTabs />
    </div>
  );
}

function HeaderChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card className="rounded-xl border-slate-200 bg-slate-50 shadow-none">
      <CardContent className="flex flex-col items-center gap-2 p-3 text-center">
        <div className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm">{icon}</div>
        <span className="text-[11px] font-black uppercase text-slate-600">{label}</span>
      </CardContent>
    </Card>
  );
}
