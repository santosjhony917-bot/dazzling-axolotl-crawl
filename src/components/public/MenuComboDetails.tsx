import React from 'react';
import { ComboComponent, getComboRuleSummary } from '@/utils/menuCombos';

export const MenuComboBadge: React.FC<{ item: any; components: ComboComponent[] }> = ({ item, components }) => {
  const rule = getComboRuleSummary(item);
  const title = String(item?.display_name || item?.name || '').trim().toLowerCase();
  const cleanRule = rule && rule.trim().toLowerCase() !== title ? rule : null;
  const label = cleanRule || (components.some((component) => component.type === 'choice_group') ? 'Combo com escolhas' : 'Combo');

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
};
