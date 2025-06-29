import { RepairItem, GroupedRepairItem } from '../types';

// Функция для создания ключа группировки
export const createGroupingKey = (item: RepairItem): string => {
  // Убираем ID из названия позиции для группировки
  const basePositionName = item.positionName.replace(/_ID_[a-f0-9-]+$/i, '').trim();
  // ВАЖНО: Включаем тип доходы/расходы в ключ группировки, чтобы они НЕ объединялись
  return `${basePositionName}_${item.analytics8}_${item.workType}_${item.incomeExpenseType}`.toLowerCase();
};

// Функция для создания ключа группировки по базовому названию (без типа доходы/расходы)
export const createBaseGroupingKey = (item: RepairItem): string => {
  // Убираем ID из названия позиции для группировки
  const basePositionName = item.positionName.replace(/_ID_[a-f0-9-]+$/i, '').trim();
  // НЕ включаем тип доходы/расходы для объединения в одну группу
  return `${basePositionName}_${item.analytics8}_${item.workType}`.toLowerCase();
};

// Функция для получения базового названия позиции (без ID)
export const getBasePositionName = (positionName: string): string => {
  return positionName.replace(/_ID_[a-f0-9-]+$/i, '').trim();
};

// Функция для группировки одинаковых позиций
export const groupSimilarItems = (items: RepairItem[]): GroupedRepairItem[] => {
  const groupMap = new Map<string, RepairItem[]>();

  // Группируем по ключу (включая тип доходы/расходы)
  items.forEach(item => {
    const key = createGroupingKey(item);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(item);
  });

  // Создаем сгруппированные элементы
  const groupedItems: GroupedRepairItem[] = [];
  
  groupMap.forEach((groupItems) => {
    if (groupItems.length === 1) {
      // Если только один элемент, просто добавляем его как GroupedRepairItem
      const item = groupItems[0];
      groupedItems.push({
        ...item,
        groupedIds: [item.id],
        totalQuantity: item.quantity,
        totalRevenue: item.revenue,
        totalSumWithoutVAT: item.sumWithoutVAT,
        totalVatAmount: item.vatAmount
      });
    } else {
      // Если несколько элементов, объединяем их
      const baseItem = groupItems[0];
      const groupedIds = groupItems.map(item => item.id);
      const totalQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalRevenue = groupItems.reduce((sum, item) => sum + item.revenue, 0);
      const totalSumWithoutVAT = groupItems.reduce((sum, item) => sum + item.sumWithoutVAT, 0);
      const totalVatAmount = groupItems.reduce((sum, item) => sum + item.vatAmount, 0);

      // Используем базовое название без ID для отображения
      const basePositionName = getBasePositionName(baseItem.positionName);

      groupedItems.push({
        ...baseItem,
        id: `grouped_${groupedIds.join('_')}`, // Новый ID для группы
        positionName: basePositionName, // Используем базовое название без ID
        groupedIds,
        quantity: totalQuantity,
        revenue: totalRevenue,
        sumWithoutVAT: totalSumWithoutVAT,
        vatAmount: totalVatAmount,
        totalQuantity,
        totalRevenue,
        totalSumWithoutVAT,
        totalVatAmount
      });
    }
  });

  return groupedItems;
};

// Новая функция для группировки по базовому названию позиции (объединяет доходы и расходы)
export const groupByBasePositionName = (items: RepairItem[]): GroupedRepairItem[] => {
  const baseGroupMap = new Map<string, RepairItem[]>();

  // Группируем по базовому ключу (без типа доходы/расходы)
  items.forEach(item => {
    const key = createBaseGroupingKey(item);
    if (!baseGroupMap.has(key)) {
      baseGroupMap.set(key, []);
    }
    baseGroupMap.get(key)!.push(item);
  });

  // Создаем сгруппированные элементы
  const groupedItems: GroupedRepairItem[] = [];
  
  baseGroupMap.forEach((groupItems) => {
    // Берем первый элемент как базовый
    const baseItem = groupItems[0];
    const groupedIds = groupItems.map(item => item.id);
    
    // Подсчитываем общие суммы
    const totalQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = groupItems.reduce((sum, item) => sum + item.revenue, 0);
    const totalSumWithoutVAT = groupItems.reduce((sum, item) => sum + item.sumWithoutVAT, 0);
    const totalVatAmount = groupItems.reduce((sum, item) => sum + item.vatAmount, 0);

    // Используем базовое название без ID для отображения
    const basePositionName = getBasePositionName(baseItem.positionName);

    // Определяем тип группы (если есть и доходы, и расходы, то "Смешанная")
    const incomeItems = groupItems.filter(item => item.incomeExpenseType === 'Доходы');
    const expenseItems = groupItems.filter(item => item.incomeExpenseType === 'Расходы');
    
    let groupType: 'Доходы' | 'Расходы' = 'Доходы';
    if (incomeItems.length > 0 && expenseItems.length > 0) {
      // Если есть и доходы, и расходы, используем тип первого элемента
      groupType = baseItem.incomeExpenseType;
    } else if (expenseItems.length > 0) {
      groupType = 'Расходы';
    }

    groupedItems.push({
      ...baseItem,
      id: `base_grouped_${groupedIds.join('_')}`, // Новый ID для базовой группы
      positionName: basePositionName, // Используем базовое название без ID
      incomeExpenseType: groupType, // Тип группы
      groupedIds,
      quantity: totalQuantity,
      revenue: totalRevenue,
      sumWithoutVAT: totalSumWithoutVAT,
      vatAmount: totalVatAmount,
      totalQuantity,
      totalRevenue,
      totalSumWithoutVAT,
      totalVatAmount
    });
  });

  return groupedItems;
};

// Функция для разгруппировки элементов обратно в исходные
export const ungroupItems = (groupedItem: GroupedRepairItem, originalItems: RepairItem[]): RepairItem[] => {
  if (groupedItem.groupedIds.length === 1) {
    // Если это не группа, возвращаем исходный элемент
    return originalItems.filter(item => item.id === groupedItem.groupedIds[0]);
  }
  
  // Если это группа, возвращаем все исходные элементы
  return originalItems.filter(item => groupedItem.groupedIds.includes(item.id));
};