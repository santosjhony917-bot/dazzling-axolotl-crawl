import { formatPrice } from './formatters';

export type ComboComponentType = 'fixed_item' | 'choice_group' | 'addon_group' | 'upsell_group';

export interface ComboComponentOption {
  name: string;
  description?: string | null;
  quantity?: number | null;
  price?: number | null;
  price_delta?: number | null;
  price_behavior?: string | null;
  image_url?: string | null;
  is_searchable_variant?: boolean | null;
  search_label?: string | null;
  search_aliases?: string | null;
  order_index?: number | null;
  choice_groups?: ComboComponent[];
}

export interface ComboComponent {
  type: ComboComponentType;
  name: string;
  description?: string | null;
  quantity?: number | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  is_required?: boolean | null;
  price?: number | null;
  price_delta?: number | null;
  price_behavior?: string | null;
  items?: ComboComponentOption[];
  choice_groups?: ComboComponent[];
  parent_component_name?: string | null;
  order_index?: number | null;
}

const parseJsonSafe = (value: unknown): any | null => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeComponentType = (value: unknown, hasItems: boolean): ComboComponentType => {
  const raw = String(value || '').trim();
  if (raw === 'fixed_item' || raw === 'choice_group' || raw === 'addon_group' || raw === 'upsell_group') {
    return raw;
  }
  return hasItems ? 'choice_group' : 'fixed_item';
};

export const getEmbeddedDescriptionPayload = (item: any) => {
  return parseJsonSafe(item?.description) || null;
};

export const getPublicDescriptionText = (item: any): string => {
  const payload = getEmbeddedDescriptionPayload(item);
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return String(payload.description || '').trim();
  }
  return String(item?.description || '').trim();
};

export const getEmbeddedOptionGroups = (item: any): any[] => {
  const payload = getEmbeddedDescriptionPayload(item);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
  return Array.isArray(payload.options) ? payload.options : [];
};

const normalizeOptionPrice = (option: any) => {
  const behavior = String(option?.price_behavior || '').trim();
  const delta = toNumberOrNull(option?.price_delta ?? option?.delta);
  const price = toNumberOrNull(option?.price);
  if (behavior === 'included') return null;
  if (delta !== null) return delta;
  return price;
};

const normalizeText = (value: unknown): string => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getOptionListFromGroup = (group: any): any[] => (
  Array.isArray(group?.items)
    ? group.items
    : Array.isArray(group?.itens)
      ? group.itens
      : Array.isArray(group?.menu_item_options)
        ? group.menu_item_options
        : []
);

export const isHalfPizzaOptionName = (value: unknown): boolean => (
  /^\s*(?:1\s*\/\s*2|meia|meio)\b/i.test(String(value || '').trim())
);

export const isMixedPizzaFlavorGroup = (group: any): boolean => {
  const title = normalizeText(`${group?.title || group?.name || group?.group_name || ''}`);
  if (!/\b(sabor|sabores)\b/.test(title)) return false;

  const items = getOptionListFromGroup(group);
  const max = toNumberOrNull(group?.max_quantity ?? group?.max) || 0;
  if (max > 0 && max < 2) return false;

  const hasHalf = items.some((option: any) => isHalfPizzaOptionName(option?.name || option?.title || option?.label));
  const hasWhole = items.some((option: any) => {
    const name = String(option?.name || option?.title || option?.label || '').trim();
    return name && !isHalfPizzaOptionName(name);
  });

  return hasHalf && hasWhole;
};

export const getMenuOptionSelectionUnits = (option: any, group: any): number => {
  if (!isMixedPizzaFlavorGroup(group)) return 1;
  return isHalfPizzaOptionName(option?.name || option?.title || option?.label) ? 1 : 2;
};

const isOperationalPublicGroup = (group: any): boolean => {
  const items = Array.isArray(group?.items)
    ? group.items
    : Array.isArray(group?.itens)
      ? group.itens
      : [];
  const text = normalizeText(`${group?.name || group?.title || ''} ${items.map((item: any) => item?.name || '').join(' ')}`);
  return /\b(descartavel|descartaveis|talher|talheres|guardanapo|canudo|copo|prato descartavel|embalagem|sacola|ketchup|maionese|mostarda|molho extra)\b/.test(text);
};

const isPublicDrinkUpsellGroup = (group: any, item: any): boolean => {
  const commercialType = String(item?.commercial_type || item?.commercialType || '').trim();
  if (commercialType === 'combo_builder') return false;

  const groupText = normalizeText(group?.name || group?.title || '');
  const min = toNumberOrNull(group?.min_quantity ?? group?.min) || 0;
  const required = Boolean(group?.is_required);
  if (required || min > 0) return false;

  const itemText = normalizeText(`${item?.name || ''} ${item?.display_name || item?.displayName || ''}`);
  if (/\b(bebida|bebidas|refrigerante|refri|suco|agua|coca|guarana|sprite|fanta|schweppes)\b/.test(itemText)) {
    return false;
  }

  return /\b(vai uma bebida|bebida|bebidas|refrigerante|refri)\b/.test(groupText);
};

const isRedundantSingleIncludedGroup = (group: any, item?: any): boolean => {
  const items = Array.isArray(group?.items)
    ? group.items
    : Array.isArray(group?.itens)
      ? group.itens
      : [];
  if (items.length !== 1) return false;
  const min = toNumberOrNull(group?.min_quantity ?? group?.min) || 0;
  const max = toNumberOrNull(group?.max_quantity ?? group?.max) || 0;
  const option = items[0];
  const price = toNumberOrNull(option?.price ?? option?.price_delta ?? option?.delta);
  const behavior = String(option?.price_behavior || group?.price_behavior || '').trim();
  const isIncluded = price === null || price === 0 || behavior === 'included';
  if (!(min === 1 && max === 1 && isIncluded)) return false;

  const optionText = normalizeText(option?.name || option?.title || option?.label || '');
  const itemText = normalizeText(`${item?.name || ''} ${item?.display_name || item?.displayName || ''}`);
  const descriptionText = normalizeText(item?.description || '');
  const groupText = normalizeText(group?.name || group?.title || group?.group_name || '');

  if (!optionText) return false;
  if (itemText && (itemText === optionText || itemText.includes(optionText))) return true;

  const isGenericCompositionGroup = /\b(composicao|composicao do combo|item incluso|itens inclusos|incluso|incluido)\b/.test(groupText);
  return isGenericCompositionGroup && descriptionText.includes(optionText);
};

export const normalizeMenuOptionGroups = (groups: any[] = []) => {
  return (Array.isArray(groups) ? groups : [])
    .map((group: any, groupIndex: number) => {
      const rawItems = Array.isArray(group?.menu_item_options)
        ? group.menu_item_options
        : Array.isArray(group?.items)
          ? group.items
          : Array.isArray(group?.itens)
            ? group.itens
            : Array.isArray(group?.options)
              ? group.options
              : [];
      const title = String(group?.title || group?.name || group?.group_name || 'Opções').trim() || 'Opções';
      const minQuantity = toNumberOrNull(group?.min_quantity ?? group?.min);
      const maxQuantity = toNumberOrNull(group?.max_quantity ?? group?.max);
      const semanticType = String(group?.semantic_type || '').trim() || null;
      const priceBehavior = String(group?.price_behavior || '').trim() || null;
      const items = rawItems
        .map((option: any, optionIndex: number) => ({
          id: option?.id,
          name: String(option?.name || option?.title || option?.label || '').trim(),
          description: String(option?.description || '').trim() || null,
          image_url: String(option?.image_url || option?.imageUrl || '').trim() || null,
          price: normalizeOptionPrice({ ...option, price_behavior: option?.price_behavior || priceBehavior }),
          price_delta: toNumberOrNull(option?.price_delta ?? option?.delta),
          price_behavior: String(option?.price_behavior || priceBehavior || '').trim() || null,
          semantic_type: String(option?.semantic_type || semanticType || '').trim() || null,
          min_quantity: toNumberOrNull(option?.min_quantity ?? option?.min) ?? minQuantity,
          max_quantity: toNumberOrNull(option?.max_quantity ?? option?.max) ?? maxQuantity,
          is_required: Boolean(option?.is_required ?? group?.is_required),
          search_label: String(option?.search_label || '').trim() || null,
          search_aliases: String(option?.search_aliases || '').trim() || null,
          order_index: toNumberOrNull(option?.order_index) ?? optionIndex,
        }))
        .filter((option: any) => option.name.length >= 2)
        .sort((a: any, b: any) => Number(a.order_index || 0) - Number(b.order_index || 0));

      return {
        id: group?.id,
        name: title,
        title,
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
        is_required: Boolean(group?.is_required),
        semantic_type: semanticType,
        price_behavior: priceBehavior,
        order_index: toNumberOrNull(group?.order_index) ?? groupIndex,
        items,
        itens: items,
      };
    })
    .filter((group: any) => group.items.length > 0)
    .sort((a: any, b: any) => Number(a.order_index || 0) - Number(b.order_index || 0));
};

const firstNonEmptyArray = (...values: any[]): any[] => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
};

export const getMenuOptionGroups = (item: any): any[] => {
  const embedded = getEmbeddedOptionGroups(item);
  const groups = firstNonEmptyArray(
    item?.menu_option_groups,
    item?.menuOptionGroups,
    item?.option_groups,
    item?.optionGroups,
    item?.options,
    embedded,
  );
  return normalizeMenuOptionGroups(groups).filter((group) => (
    !isOperationalPublicGroup(group)
    && !isPublicDrinkUpsellGroup(group, item)
    && !isRedundantSingleIncludedGroup(group, item)
  ));
};

const normalizeComboChoiceGroup = (group: ComboComponent, groupKey: string): any | null => {
  const items = Array.isArray(group?.items) ? group.items : [];
  if (items.length === 0) return null;

  return {
    id: groupKey,
    name: group.name,
    title: group.name,
    min_quantity: group.min_quantity,
    max_quantity: group.max_quantity ?? group.quantity,
    is_required: Boolean(group.is_required) || Number(group.min_quantity || 0) > 0,
    price_behavior: group.price_behavior || 'price_delta',
    order_index: group.order_index,
    items,
    itens: items,
  };
};

export const getComboSimulationGroups = (components: ComboComponent[]): any[] => {
  const groups: any[] = [];
  const pushGroup = (group: ComboComponent, groupKey: string) => {
    const normalized = normalizeComboChoiceGroup(group, groupKey);
    if (normalized && !isOperationalPublicGroup(normalized)) groups.push(normalized);
  };

  components.forEach((component, componentIndex) => {
    const componentKey = `combo-${componentIndex}-${component.name}`;

    if (component.type !== 'fixed_item') {
      pushGroup(component, componentKey);
    }

    (component.choice_groups || []).forEach((group, groupIndex) => {
      pushGroup(group, `${componentKey}-choice-${groupIndex}-${group.name}`);
    });

    (component.items || []).forEach((option: any, optionIndex: number) => {
      (option.choice_groups || []).forEach((group: ComboComponent, groupIndex: number) => {
        pushGroup(group, `${componentKey}-option-${optionIndex}-choice-${groupIndex}-${group.name}`);
      });
    });
  });

  return groups;
};

export const isConfigurableMenuItem = (item: any): boolean => {
  const commercialType = String(item?.commercial_type || item?.commercialType || '').trim();
  const priceType = String(item?.price_type || item?.priceType || '').trim();
  if (commercialType === 'configurable_item' || commercialType === 'simple_with_addons') return true;
  if (item?.is_configurable || item?.isConfigurable) return true;
  if (priceType === 'starting_at' || priceType === 'option_only' || priceType === 'range') return true;
  return getMenuOptionGroups(item).length > 0;
};

export const getMenuOptionGroupInstruction = (group: any): string => {
  const rawMin = toNumberOrNull(group?.min_quantity ?? group?.min) || 0;
  const rawMax = toNumberOrNull(group?.max_quantity ?? group?.max) || 0;
  const items = Array.isArray(group?.items)
    ? group.items
    : Array.isArray(group?.itens)
      ? group.itens
      : [];
  const visibleCount = items.length;
  const min = visibleCount > 0 ? Math.min(rawMin, visibleCount) : rawMin;
  const max = visibleCount > 0 && rawMax > 0 ? Math.min(rawMax, visibleCount) : rawMax;
  const required = Boolean(group?.is_required) || min > 0;
  const requiredSuffix = required ? ' obrigat\u00f3ria' : '';

  if (isMixedPizzaFlavorGroup(group)) {
    return `1 inteira ou 2 metades${requiredSuffix}`;
  }

  if (max && min && max === min) return `Escolha ${max}${requiredSuffix}`;
  if (max && min) return `Escolha de ${min} a ${max}${requiredSuffix}`;
  if (max) return `Escolha at\u00e9 ${max}`;
  if (required) return 'Obrigat\u00f3rio';
  return 'Opcional';
};

export const getMenuOptionPriceLabel = (option: any, group?: any): { label: string; tone: 'included' | 'delta' | 'absolute' } => {
  const behavior = String(option?.price_behavior || group?.price_behavior || '').trim();
  const delta = toNumberOrNull(option?.price_delta ?? option?.delta);
  const price = toNumberOrNull(option?.price);

  if (behavior === 'included') return { label: 'Sem acréscimo', tone: 'included' };
  if (behavior === 'absolute_price' && price !== null) return { label: formatPrice(price), tone: 'absolute' };
  if (delta !== null && delta > 0) return { label: `+${formatPrice(delta)}`, tone: 'delta' };
  if (price !== null && price > 0) {
    return {
      label: behavior === 'price_delta' || behavior === 'addon' ? `+${formatPrice(price)}` : formatPrice(price),
      tone: behavior === 'price_delta' || behavior === 'addon' ? 'delta' : 'absolute',
    };
  }
  return { label: 'Sem acréscimo', tone: 'included' };
};

export const getOptionGroupPreviewLine = (group: any, limit = 3): string => {
  const title = String(group?.title || group?.name || '').trim();
  const items = Array.isArray(group?.items)
    ? group.items
    : Array.isArray(group?.itens)
      ? group.itens
      : [];
  const names = items
    .map((option: any) => String(option?.name || '').trim())
    .filter(Boolean)
    .slice(0, limit);
  if (!title || names.length === 0) return title;
  const suffix = items.length > limit ? '...' : '';
  return `${title}: ${names.join(', ')}${suffix}`;
};

export const normalizeComboComponents = (source: unknown): ComboComponent[] => {
  const normalizeNestedChoiceGroups = (groups: any[] = []): ComboComponent[] => normalizeComboComponents(groups);

  const rawComponents = Array.isArray(source) ? source : [];
  return rawComponents
    .map((component: any, componentIndex: number): ComboComponent | null => {
      const rawItems = Array.isArray(component?.items)
        ? component.items
        : Array.isArray(component?.options)
          ? component.options
          : [];
      const type = normalizeComponentType(component?.type || component?.kind, rawItems.length > 0);
      const name = String(component?.name || component?.title || component?.label || '').trim();
      const items = rawItems
        .map((option: any, optionIndex: number): ComboComponentOption => ({
          name: String(option?.name || option?.title || option?.label || '').trim(),
          description: String(option?.description || '').trim() || null,
          quantity: toNumberOrNull(option?.quantity) ?? 1,
          price: toNumberOrNull(option?.price),
          price_delta: toNumberOrNull(option?.price_delta ?? option?.delta),
          price_behavior: String(option?.price_behavior || component?.price_behavior || '').trim() || null,
          image_url: String(option?.image_url || option?.imageUrl || '').trim() || null,
          is_searchable_variant: option?.is_searchable_variant !== false,
          search_label: String(option?.search_label || '').trim() || null,
          search_aliases: String(option?.search_aliases || '').trim() || null,
          order_index: toNumberOrNull(option?.order_index) ?? optionIndex,
          choice_groups: normalizeNestedChoiceGroups(option?.choice_groups || option?.choiceGroups || []),
        }))
        .filter((option) => option.name.length >= 2);

      const normalizedName = name || (
        type === 'fixed_item'
          ? 'Itens inclusos'
          : type === 'addon_group'
            ? 'Adicionais do combo'
            : type === 'upsell_group'
              ? 'Complete seu pedido'
              : 'Escolhas do combo'
      );

      if (normalizedName.length < 2 && items.length === 0) return null;

      return {
        type,
        name: normalizedName,
        description: String(component?.description || '').trim() || null,
        quantity: toNumberOrNull(component?.quantity) ?? 1,
        min_quantity: toNumberOrNull(component?.min_quantity ?? component?.min) ?? (type === 'choice_group' ? 1 : 0),
        max_quantity: toNumberOrNull(component?.max_quantity ?? component?.max),
        is_required: Boolean(component?.is_required ?? type === 'choice_group'),
        price: toNumberOrNull(component?.price),
        price_delta: toNumberOrNull(component?.price_delta ?? component?.delta),
        price_behavior: String(component?.price_behavior || '').trim() || (type === 'fixed_item' ? 'included' : null),
        items,
        choice_groups: normalizeNestedChoiceGroups(component?.choice_groups || component?.choiceGroups || []),
        parent_component_name: String(component?.parent_component_name || component?.parentComponentName || '').trim() || null,
        order_index: toNumberOrNull(component?.order_index) ?? componentIndex,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a!.order_index || 0) - Number(b!.order_index || 0)) as ComboComponent[];
};

export const getComboComponents = (item: any): ComboComponent[] => {
  const rawData = parseJsonSafe(item?.raw_data) || parseJsonSafe(item?.rawData);
  const descriptionPayload = getEmbeddedDescriptionPayload(item);
  const source =
    item?.combo_components ||
    item?.comboComponents ||
    rawData?.combo_components ||
    rawData?.comboComponents ||
    descriptionPayload?.combo_components ||
    descriptionPayload?.comboComponents ||
    [];
  return normalizeComboComponents(source);
};

export const isComboMenuItem = (item: any): boolean => {
  if ((item?.commercial_type || item?.commercialType) === 'combo_builder') return true;
  if (getComboComponents(item).length > 0) return true;
  const text = `${item?.name || ''} ${item?.description || ''}`.toLowerCase();
  return /\bcombo\b|pague\s*\d+|leve\s*\d+|\+\s*(batata|refri|refrigerante|coca|guaran)/i.test(text);
};

export const getComboRuleSummary = (item: any): string | null => {
  const rawData = parseJsonSafe(item?.raw_data) || parseJsonSafe(item?.rawData);
  const rules = item?.combo_rules || item?.comboRules || rawData?.combo_rules || rawData?.comboRules;
  if (!rules) return null;
  if (typeof rules === 'string') return rules.trim() || null;
  if (rules.summary) return String(rules.summary).trim();
  if (rules.paid_quantity && rules.received_quantity) {
    return `Pague ${rules.paid_quantity}, leve ${rules.received_quantity}`;
  }
  return null;
};

export const getComboSummaryLines = (components: ComboComponent[], limit = 3): string[] => {
  return components
    .map((component) => {
      if (component.type === 'fixed_item') {
        return component.quantity && component.quantity > 1
          ? `${component.quantity}x ${component.name}`
          : component.name;
      }
      if (component.type === 'choice_group') {
        const max = component.max_quantity || component.min_quantity || component.quantity || 1;
        return `Escolha ${max} em ${component.name}`;
      }
      if (component.type === 'addon_group') return `Adicionais: ${component.name}`;
      return component.name;
    })
    .filter(Boolean)
    .slice(0, limit);
};

export const comboComponentsToSearchText = (components: ComboComponent[]): string => {
  return components
    .flatMap((component) => [
      component.name,
      component.description,
      component.type,
      component.parent_component_name,
      ...comboComponentsToSearchText(component.choice_groups || []).split(' '),
      ...(component.items || []).flatMap((item) => [
        item.name,
        item.description,
        item.search_label,
        item.search_aliases,
        ...comboComponentsToSearchText(item.choice_groups || []).split(' '),
      ]),
    ])
    .filter(Boolean)
    .join(' ');
};

