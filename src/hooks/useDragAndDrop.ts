import { useState, useCallback } from 'react';
import { RepairItem, Position, GroupedRepairItem } from '../types';
import { ungroupItems } from '../utils/groupingUtils';

export const useDragAndDrop = () => {
  const [draggedItem, setDraggedItem] = useState<GroupedRepairItem | null>(null);
  const [draggedFromPositionId, setDraggedFromPositionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((item: GroupedRepairItem, fromPositionId?: string) => {
    setDraggedItem(item);
    setDraggedFromPositionId(fromPositionId || null);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDraggedFromPositionId(null);
    setIsDragging(false);
  }, []);

  // Функция для пересчета сумм позиции
  const recalculatePositionTotals = (items: RepairItem[]) => {
    const totalPrice = items.reduce((sum, item) => sum + item.revenue, 0);
    const totalIncome = items
      .filter(item => item.incomeExpenseType === 'Доходы')
      .reduce((sum, item) => sum + item.revenue, 0);
    const totalExpense = items
      .filter(item => item.incomeExpenseType === 'Расходы')
      .reduce((sum, item) => sum + Math.abs(item.revenue), 0);
    
    return { totalPrice, totalIncome, totalExpense };
  };

  const handleDrop = useCallback((
    targetPositionId: string,
    positions: Position[],
    unallocatedItems: RepairItem[],
    setPositions: (positions: Position[]) => void,
    setUnallocatedItems: (items: RepairItem[]) => void
  ) => {
    if (!draggedItem) return;

    console.log('handleDrop called:', {
      targetPositionId,
      draggedItem: draggedItem.id,
      draggedFromPositionId,
      groupedIds: draggedItem.groupedIds
    });

    // Получаем исходные элементы для перемещения
    let itemsToMove: RepairItem[] = [];
    
    if (draggedFromPositionId) {
      // Перемещение из позиции
      const sourcePosition = positions.find(p => p.id === draggedFromPositionId);
      if (sourcePosition) {
        // Находим все исходные элементы по их ID
        itemsToMove = sourcePosition.items.filter(item => 
          draggedItem.groupedIds.includes(item.id)
        );
        
        console.log('Items to move from position:', itemsToMove.length);
      }
    } else {
      // Перемещение из неразмещенных
      itemsToMove = ungroupItems(draggedItem, unallocatedItems);
      console.log('Items to move from unallocated:', itemsToMove.length);
    }

    if (itemsToMove.length === 0) {
      console.warn('No items to move found');
      handleDragEnd();
      return;
    }

    // ВАЖНО: Создаем новые объекты вместо мутации существующих
    const newPositions = positions.map(position => {
      if (position.id === draggedFromPositionId) {
        // Исходная позиция - удаляем элементы
        const remainingItems = position.items.filter(item => 
          !draggedItem.groupedIds.includes(item.id)
        );
        const sourceTotals = recalculatePositionTotals(remainingItems);
        
        return {
          ...position, // Создаем новый объект
          items: remainingItems,
          ...sourceTotals
        };
      } else if (position.id === targetPositionId) {
        // Целевая позиция - добавляем элементы
        const newItems = [...position.items, ...itemsToMove];
        const targetTotals = recalculatePositionTotals(newItems);
        
        return {
          ...position, // Создаем новый объект
          items: newItems,
          ...targetTotals
        };
      }
      return position; // Остальные позиции остаются без изменений
    });

    // Обновляем неразмещенные элементы только если перемещаем из них
    let newUnallocatedItems = unallocatedItems;
    if (!draggedFromPositionId) {
      newUnallocatedItems = unallocatedItems.filter(item => 
        !draggedItem.groupedIds.includes(item.id)
      );
    }

    console.log('Updating state:', {
      newPositionsCount: newPositions.length,
      newUnallocatedCount: newUnallocatedItems.length,
      targetPosition: newPositions.find(p => p.id === targetPositionId)
    });

    // Обновляем состояние
    setPositions(newPositions);
    setUnallocatedItems(newUnallocatedItems);
    handleDragEnd();
  }, [draggedItem, draggedFromPositionId, handleDragEnd]);

  const handleDropToUnallocated = useCallback((
    positions: Position[],
    unallocatedItems: RepairItem[],
    setPositions: (positions: Position[]) => void,
    setUnallocatedItems: (items: RepairItem[]) => void
  ) => {
    if (!draggedItem || !draggedFromPositionId) return;

    console.log('handleDropToUnallocated called:', {
      draggedItem: draggedItem.id,
      draggedFromPositionId,
      groupedIds: draggedItem.groupedIds
    });

    // Получаем исходные элементы для перемещения
    let itemsToMove: RepairItem[] = [];
    
    const sourcePosition = positions.find(p => p.id === draggedFromPositionId);
    if (sourcePosition) {
      // Находим все исходные элементы по их ID
      itemsToMove = sourcePosition.items.filter(item => 
        draggedItem.groupedIds.includes(item.id)
      );
      
      console.log('Items to move to unallocated:', itemsToMove.length);
    }

    if (itemsToMove.length === 0) {
      console.warn('No items to move found');
      handleDragEnd();
      return;
    }

    // ВАЖНО: Создаем новые объекты вместо мутации существующих
    const newPositions = positions.map(position => {
      if (position.id === draggedFromPositionId) {
        // Исходная позиция - удаляем элементы
        const remainingItems = position.items.filter(item => 
          !draggedItem.groupedIds.includes(item.id)
        );
        const totals = recalculatePositionTotals(remainingItems);
        
        return {
          ...position, // Создаем новый объект
          items: remainingItems,
          ...totals
        };
      }
      return position; // Остальные позиции остаются без изменений
    });

    // Добавляем элементы в неразмещенные
    const newUnallocatedItems = [...unallocatedItems, ...itemsToMove];

    console.log('Updating state for unallocated drop:', {
      newPositionsCount: newPositions.length,
      newUnallocatedCount: newUnallocatedItems.length
    });

    // Обновляем состояние
    setPositions(newPositions);
    setUnallocatedItems(newUnallocatedItems);
    handleDragEnd();
  }, [draggedItem, draggedFromPositionId, handleDragEnd]);

  return {
    draggedItem,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDropToUnallocated
  };
};