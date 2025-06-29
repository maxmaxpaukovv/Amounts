import { useMemo } from 'react';
import { RepairItem, Position } from '../types';

export const useSearch = (
  unallocatedItems: RepairItem[],
  positions: Position[],
  searchQuery: string
) => {
  const filteredUnallocatedItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return unallocatedItems;
    }

    const query = searchQuery.toLowerCase().trim();

    // Фильтрация только неразмещенных позиций
    return unallocatedItems.filter(item =>
      item.positionName.toLowerCase().includes(query) ||
      item.analytics8.toLowerCase().includes(query) ||
      item.analytics3.toLowerCase().includes(query) ||
      item.analytics1.toLowerCase().includes(query) ||
      item.analytics2.toLowerCase().includes(query) ||
      item.analytics4.toLowerCase().includes(query) ||
      item.analytics5.toLowerCase().includes(query) ||
      item.analytics6.toLowerCase().includes(query) ||
      item.analytics7.toLowerCase().includes(query) ||
      item.uniqueKey.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      item.workType.toLowerCase().includes(query) ||
      item.incomeExpenseType.toLowerCase().includes(query) ||
      item.salaryGoods.toLowerCase().includes(query) // Добавляем поиск по новому полю
    );
  }, [unallocatedItems, searchQuery]);

  return {
    filteredUnallocatedItems,
    filteredPositions: positions // Возвращаем все позиции без фильтрации
  };
};