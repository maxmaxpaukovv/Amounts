import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Position, RepairItem, GroupedRepairItem } from '../types';
import { GroupedRepairItemCard } from './GroupedRepairItemCard';
import { groupSimilarItems, getBasePositionName } from '../utils/groupingUtils';
import { Settings, Trash2, RussianRuble as Ruble, Edit3, Check, X, ChevronDown, ChevronUp, Minimize2, Maximize2, TrendingUp, TrendingDown } from 'lucide-react';

interface PositionCardProps {
  position: Position;
  onDragStart: (item: RepairItem, fromPositionId: string) => void;
  onDrop: (targetPositionId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onUpdateService: (positionId: string, newService: string) => void;
  onDeletePosition: (positionId: string) => void;
  draggedItem: GroupedRepairItem | null;
  onQuantityChange: (positionId: string, groupedItem: GroupedRepairItem, newQuantity: number) => void;
  unallocatedItems: RepairItem[];
  onPriceChange?: (positionId: string, itemId: string, newRevenue: number) => void;
}

interface WorkTypeGroup {
  workType: string;
  positions: PositionGroup[];
  isCollapsed: boolean;
}

interface PositionGroup {
  positionName: string;
  items: GroupedRepairItem[];
  isCollapsed: boolean;
}

const PositionCard: React.FC<PositionCardProps> = ({
  position,
  onDragStart,
  onDrop,
  onDragOver,
  onUpdateService,
  onDeletePosition,
  draggedItem,
  onQuantityChange,
  unallocatedItems,
  onPriceChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(position.service);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // ИСПРАВЛЕНИЕ: Статьи работ и позиции развернуты по умолчанию
  const [collapsedWorkTypes, setCollapsedWorkTypes] = useState<Set<string>>(new Set());
  const [collapsedPositions, setCollapsedPositions] = useState<Set<string>>(new Set());
  
  // ИСПРАВЛЕНИЕ: Только доходы/расходы свернуты по умолчанию
  const [collapsedIncomeExpense, setCollapsedIncomeExpense] = useState<Set<string>>(() => {
    // Автоматически сворачиваем все доходы/расходы при создании
    const initialCollapsed = new Set<string>();
    
    // Проходим по всем элементам и создаем ключи для сворачивания доходов/расходов
    position.items.forEach(item => {
      const workType = item.workType.trim();
      const basePositionName = getBasePositionName(item.positionName);
      
      if (workType) {
        // Сворачиваем доходы и расходы по умолчанию
        initialCollapsed.add(`${workType}_${basePositionName}_Доходы`);
        initialCollapsed.add(`${workType}_${basePositionName}_Расходы`);
      }
    });
    
    return initialCollapsed;
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editValue when position.service changes
  useEffect(() => {
    setEditValue(position.service);
  }, [position.service]);

  // Focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // ИСПРАВЛЕНИЕ: Эффект для автоматического сворачивания ТОЛЬКО доходов/расходов при добавлении новых элементов
  useEffect(() => {
    // Когда в позицию добавляются новые элементы, автоматически сворачиваем только новые доходы/расходы
    const currentIncomeExpense = new Set<string>();

    // Собираем все текущие ключи доходов/расходов
    position.items.forEach(item => {
      const workType = item.workType.trim();
      const basePositionName = getBasePositionName(item.positionName);
      
      if (workType) {
        currentIncomeExpense.add(`${workType}_${basePositionName}_${item.incomeExpenseType}`);
      }
    });

    // Автоматически сворачиваем ТОЛЬКО новые доходы/расходы
    setCollapsedIncomeExpense(prev => {
      const newSet = new Set(prev);
      currentIncomeExpense.forEach(incomeExpenseKey => {
        if (!prev.has(incomeExpenseKey)) {
          newSet.add(incomeExpenseKey); // Новые доходы/расходы сворачиваем
        }
      });
      return newSet;
    });

    // НЕ сворачиваем статьи работ и позиции - они остаются развернутыми
  }, [position.items.length]); // Срабатывает при изменении количества элементов

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(position.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleSaveEdit = () => {
    if (editValue.trim()) {
      onUpdateService(position.id, editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(position.service);
    setIsEditing(false);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleQuantityChange = (groupedItem: GroupedRepairItem, newQuantity: number) => {
    onQuantityChange(position.id, groupedItem, newQuantity);
  };

  // ИСПРАВЛЕННАЯ функция для изменения цены конкретного элемента
  const handlePriceChange = (itemId: string, newRevenue: number) => {
    if (onPriceChange) {
      onPriceChange(position.id, itemId, newRevenue);
    }
  };

  const handleDragStartGrouped = (groupedItem: GroupedRepairItem) => {
    // Для drag and drop нужно передать все ID элементов группы
    // Но существующая система ожидает один RepairItem, поэтому создаем временный объект
    const tempItem: RepairItem = {
      ...groupedItem,
      id: groupedItem.groupedIds[0] // Используем первый ID для совместимости
    };
    
    onDragStart(tempItem, position.id);
  };

  const toggleWorkTypeCollapse = (workType: string) => {
    const newCollapsedWorkTypes = new Set(collapsedWorkTypes);
    if (newCollapsedWorkTypes.has(workType)) {
      newCollapsedWorkTypes.delete(workType);
    } else {
      newCollapsedWorkTypes.add(workType);
    }
    setCollapsedWorkTypes(newCollapsedWorkTypes);
  };

  const togglePositionCollapse = (workType: string, positionName: string) => {
    const key = `${workType}_${positionName}`;
    const newCollapsedPositions = new Set(collapsedPositions);
    if (newCollapsedPositions.has(key)) {
      newCollapsedPositions.delete(key);
    } else {
      newCollapsedPositions.add(key);
    }
    setCollapsedPositions(newCollapsedPositions);
  };

  // Функция для сворачивания/разворачивания доходов/расходов
  const toggleIncomeExpenseCollapse = (workType: string, positionName: string, incomeExpenseType: 'Доходы' | 'Расходы') => {
    const key = `${workType}_${positionName}_${incomeExpenseType}`;
    const newCollapsedIncomeExpense = new Set(collapsedIncomeExpense);
    if (newCollapsedIncomeExpense.has(key)) {
      newCollapsedIncomeExpense.delete(key);
    } else {
      newCollapsedIncomeExpense.add(key);
    }
    setCollapsedIncomeExpense(newCollapsedIncomeExpense);
  };

  // Функция для сворачивания/разворачивания всех групп
  const toggleAllGroups = () => {
    const allWorkTypes = groupedItemsByWorkType.workTypes.map(group => group.workType);
    
    if (collapsedWorkTypes.size === allWorkTypes.length) {
      // Если все статьи работ свернуты, разворачиваем все
      setCollapsedWorkTypes(new Set());
    } else {
      // Иначе сворачиваем все
      setCollapsedWorkTypes(new Set(allWorkTypes));
    }
  };

  // ПРАВИЛЬНАЯ ИЕРАРХИЯ: Сначала по статье работ, потом по названию позиции
  const groupedItemsByWorkType = useMemo(() => {
    // Сначала группируем одинаковые позиции (доходы и расходы отдельно)
    const similarGrouped = groupSimilarItems(position.items);
    
    const workTypes: WorkTypeGroup[] = [];
    const itemsWithoutWorkType: GroupedRepairItem[] = [];

    // Группируем по статье работ
    const workTypeMap = new Map<string, GroupedRepairItem[]>();
    
    similarGrouped.forEach(item => {
      const workType = item.workType.trim();
      if (workType) {
        if (!workTypeMap.has(workType)) {
          workTypeMap.set(workType, []);
        }
        workTypeMap.get(workType)!.push(item);
      } else {
        itemsWithoutWorkType.push(item);
      }
    });

    // Создаем группы статей работ
    workTypeMap.forEach((workTypeItems, workType) => {
      // Внутри каждой статьи работ группируем по базовому названию позиции
      const positionMap = new Map<string, GroupedRepairItem[]>();

      workTypeItems.forEach(item => {
        const basePositionName = getBasePositionName(item.positionName);
        if (!positionMap.has(basePositionName)) {
          positionMap.set(basePositionName, []);
        }
        positionMap.get(basePositionName)!.push(item);
      });

      // Создаем группы позиций
      const positions: PositionGroup[] = [];
      
      positionMap.forEach((positionItems, positionName) => {
        positions.push({
          positionName,
          items: positionItems,
          isCollapsed: collapsedPositions.has(`${workType}_${positionName}`)
        });
      });

      // Сортируем позиции по названию
      positions.sort((a, b) => a.positionName.localeCompare(b.positionName, 'ru'));

      workTypes.push({
        workType,
        positions,
        isCollapsed: collapsedWorkTypes.has(workType)
      });
    });

    // Сортируем статьи работ по названию
    workTypes.sort((a, b) => a.workType.localeCompare(b.workType, 'ru'));

    return { workTypes, itemsWithoutWorkType };
  }, [position.items, collapsedWorkTypes, collapsedPositions]);

  // Функция для подсчета доступных элементов в неразмещенных
  const getMaxAvailableQuantity = (groupedItem: GroupedRepairItem): number => {
    const basePositionName = getBasePositionName(groupedItem.positionName);
    return unallocatedItems.filter(item => 
      getBasePositionName(item.positionName) === basePositionName &&
      item.incomeExpenseType === groupedItem.incomeExpenseType
    ).length;
  };

  // Разделяем элементы на доходы и расходы для отображения
  const separateIncomeExpense = (items: GroupedRepairItem[]) => {
    const incomeItems = items.filter(item => item.incomeExpenseType === 'Доходы');
    const expenseItems = items.filter(item => item.incomeExpenseType === 'Расходы');
    return { incomeItems, expenseItems };
  };

  // Функция для расчета данных для свернутых секций
  const getCollapsedSectionData = (items: GroupedRepairItem[]) => {
    const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Для расчета средней цены за единицу
    const averagePrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
    
    return {
      totalRevenue,
      totalQuantity,
      averagePrice
    };
  };

  const canReceiveDrop = draggedItem !== null;
  const hasGroups = groupedItemsByWorkType.workTypes.length > 0;
  const allGroupsCollapsed = collapsedWorkTypes.size === groupedItemsByWorkType.workTypes.length;

  return (
    <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-6 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {position.positionNumber}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  onBlur={handleSaveEdit}
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h3 
                className="text-lg font-semibold text-gray-900 line-clamp-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                onDoubleClick={handleDoubleClick}
                title="Дважды кликните для редактирования"
              >
                {position.service}
              </h3>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {position.totalIncome > 0 && (
              <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-700 text-sm">
                  {position.totalIncome.toLocaleString('ru-RU')}
                </span>
              </div>
            )}
            
            {position.totalExpense > 0 && (
              <div className="flex items-center space-x-1 bg-red-100 px-3 py-1 rounded-full">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="font-bold text-red-700 text-sm">
                  {position.totalExpense.toLocaleString('ru-RU')}
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-1 bg-blue-100 px-3 py-1 rounded-full">
              <Ruble className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-700">
                {position.totalPrice.toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
          
          {/* Кнопка сворачивания всех групп */}
          {hasGroups && (
            <button
              onClick={toggleAllGroups}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={allGroupsCollapsed ? 'Развернуть все группы' : 'Свернуть все группы'}
            >
              {allGroupsCollapsed ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
          )}
          
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Редактировать услугу"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeletePosition(position.id)}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Удалить позицию"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          min-h-32 border-2 border-dashed rounded-lg p-4 transition-all duration-200
          ${isDragOver && canReceiveDrop
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 bg-white'
          }
          ${canReceiveDrop ? 'hover:border-blue-300' : ''}
        `}
      >
        {position.items.length === 0 && !isDragOver ? (
          <div className="text-center py-8">
            <Settings className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Перетащите элементы сюда для группировки
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ПРАВИЛЬНАЯ ИЕРАРХИЯ: Группы по статье работ */}
            {groupedItemsByWorkType.workTypes.map((workTypeGroup) => {
              // Подсчитываем общее количество доходов и расходов в статье работ
              const allWorkTypeItems = workTypeGroup.positions.flatMap(pos => pos.items);
              const { incomeItems: allIncomeItems, expenseItems: allExpenseItems } = separateIncomeExpense(allWorkTypeItems);
              
              // Расчеты для статьи работ
              const workTypeIncomeTotal = allIncomeItems.reduce((sum, item) => sum + item.revenue, 0);
              const workTypeExpenseTotal = allExpenseItems.reduce((sum, item) => sum + Math.abs(item.revenue), 0);
              const workTypeTotal = workTypeIncomeTotal - workTypeExpenseTotal;
              
              return (
                <div key={workTypeGroup.workType} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Заголовок статьи работ с расчетами - ЦВЕТОВАЯ ЗАЛИВКА ТОЛЬКО ЗДЕСЬ */}
                  <div className="w-full px-3 py-2 bg-purple-100 hover:bg-purple-200 flex items-center justify-between transition-colors">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-purple-900 text-sm">
                        {workTypeGroup.workType}
                      </span>
                      <div className="flex items-center space-x-1">
                        {allIncomeItems.length > 0 && (
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{allIncomeItems.length}</span>
                          </span>
                        )}
                        {allExpenseItems.length > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
                            <TrendingDown className="w-3 h-3" />
                            <span>{allExpenseItems.length}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Расчеты в заголовке статьи работ */}
                      <div className="flex items-center space-x-4 text-sm">
                        {workTypeIncomeTotal > 0 && (
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <span className="text-green-700 font-medium">
                              {workTypeIncomeTotal.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        )}
                        {workTypeExpenseTotal > 0 && (
                          <div className="flex items-center space-x-1">
                            <TrendingDown className="w-3 h-3 text-red-600" />
                            <span className="text-red-700 font-medium">
                              {workTypeExpenseTotal.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Ruble className="w-3 h-3 text-purple-600" />
                          <span className="text-purple-700 font-bold">
                            {workTypeTotal.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                      
                      {/* КНОПКА СВОРАЧИВАНИЯ ГРУППЫ */}
                      <button
                        onClick={() => toggleWorkTypeCollapse(workTypeGroup.workType)}
                        className="p-1 text-purple-600 hover:bg-purple-300 rounded transition-colors"
                        title={workTypeGroup.isCollapsed ? 'Развернуть группу' : 'Свернуть группу'}
                      >
                        {workTypeGroup.isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Позиции внутри статьи работ */}
                  {!workTypeGroup.isCollapsed && (
                    <div className="bg-white">
                      {workTypeGroup.positions.map((positionGroup) => {
                        const { incomeItems, expenseItems } = separateIncomeExpense(positionGroup.items);
                        const positionKey = `${workTypeGroup.workType}_${positionGroup.positionName}`;
                        
                        // Расчеты для позиции
                        const positionIncomeTotal = incomeItems.reduce((sum, item) => sum + item.revenue, 0);
                        const positionExpenseTotal = expenseItems.reduce((sum, item) => sum + Math.abs(item.revenue), 0);
                        const positionTotal = positionIncomeTotal - positionExpenseTotal;
                        
                        return (
                          <div key={positionKey} className="border-b border-gray-200 last:border-b-0">
                            {/* Заголовок позиции с расчетами - ОТСТУП ДЛЯ ИЕРАРХИИ */}
                            <div className="w-full pl-6 pr-3 py-2 bg-white hover:bg-gray-50 flex items-center justify-between transition-colors">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-blue-900 text-sm">
                                  {positionGroup.positionName}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {incomeItems.length > 0 && (
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
                                      <TrendingUp className="w-3 h-3" />
                                      <span>{incomeItems.length}</span>
                                    </span>
                                  )}
                                  {expenseItems.length > 0 && (
                                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1">
                                      <TrendingDown className="w-3 h-3" />
                                      <span>{expenseItems.length}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {/* Расчеты в заголовке позиции */}
                                <div className="flex items-center space-x-4 text-sm">
                                  {positionIncomeTotal > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <TrendingUp className="w-3 h-3 text-green-600" />
                                      <span className="text-green-700 font-medium">
                                        {positionIncomeTotal.toLocaleString('ru-RU')} ₽
                                      </span>
                                    </div>
                                  )}
                                  {positionExpenseTotal > 0 && (
                                    <div className="flex items-center space-x-1">
                                      <TrendingDown className="w-3 h-3 text-red-600" />
                                      <span className="text-red-700 font-medium">
                                        {positionExpenseTotal.toLocaleString('ru-RU')} ₽
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1">
                                    <Ruble className="w-3 h-3 text-blue-600" />
                                    <span className="text-blue-700 font-bold">
                                      {positionTotal.toLocaleString('ru-RU')} ₽
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Кнопка сворачивания позиции */}
                                <button
                                  onClick={() => togglePositionCollapse(workTypeGroup.workType, positionGroup.positionName)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title={positionGroup.isCollapsed ? 'Развернуть позицию' : 'Свернуть позицию'}
                                >
                                  {positionGroup.isCollapsed ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Доходы и расходы */}
                            {!positionGroup.isCollapsed && (
                              <div>
                                {/* Доходы - БОЛЬШИЙ ОТСТУП ДЛЯ ИЕРАРХИИ */}
                                {incomeItems.length > 0 && (
                                  <div className="border-b border-gray-200">
                                    <button
                                      onClick={() => toggleIncomeExpenseCollapse(workTypeGroup.workType, positionGroup.positionName, 'Доходы')}
                                      className="w-full pl-12 pr-3 py-2 bg-white hover:bg-green-50 flex items-center justify-between text-left transition-colors"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                        <span className="font-medium text-green-800 text-sm">Доходы</span>
                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {incomeItems.length}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {/* Расчет для свернутых доходов */}
                                        {collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Доходы`) && (() => {
                                          const { totalRevenue, totalQuantity, averagePrice } = getCollapsedSectionData(incomeItems);
                                          return (
                                            <div className="flex items-center space-x-2 text-xs text-green-700 mr-2">
                                              <span>{averagePrice.toLocaleString('ru-RU')} × {totalQuantity} =</span>
                                              <span className="font-bold text-green-600">
                                                {totalRevenue.toLocaleString('ru-RU')} ₽
                                              </span>
                                            </div>
                                          );
                                        })()}
                                        {collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Доходы`) ? (
                                          <ChevronDown className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <ChevronUp className="w-4 h-4 text-green-600" />
                                        )}
                                      </div>
                                    </button>
                                    {!collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Доходы`) && (
                                      <div className="pl-16 pr-2 py-2 space-y-2">
                                        {incomeItems.map((groupedItem) => (
                                          <GroupedRepairItemCard
                                            key={groupedItem.id}
                                            item={groupedItem}
                                            onDragStart={handleDragStartGrouped}
                                            fromPositionId={position.id}
                                            isBeingDragged={draggedItem?.groupedIds.some(id => groupedItem.groupedIds.includes(id))}
                                            onQuantityChange={handleQuantityChange}
                                            maxAvailableQuantity={getMaxAvailableQuantity(groupedItem)}
                                            onPriceChange={handlePriceChange}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Расходы - БОЛЬШИЙ ОТСТУП ДЛЯ ИЕРАРХИИ */}
                                {expenseItems.length > 0 && (
                                  <div className="border-b border-gray-200">
                                    <button
                                      onClick={() => toggleIncomeExpenseCollapse(workTypeGroup.workType, positionGroup.positionName, 'Расходы')}
                                      className="w-full pl-12 pr-3 py-2 bg-white hover:bg-red-50 flex items-center justify-between text-left transition-colors"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                        <span className="font-medium text-red-800 text-sm">Расходы</span>
                                        <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          {expenseItems.length}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {/* Расчет для свернутых расходов */}
                                        {collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Расходы`) && (() => {
                                          const { totalRevenue, totalQuantity, averagePrice } = getCollapsedSectionData(expenseItems);
                                          return (
                                            <div className="flex items-center space-x-2 text-xs text-red-700 mr-2">
                                              <span>{Math.abs(averagePrice).toLocaleString('ru-RU')} × {totalQuantity} =</span>
                                              <span className="font-bold text-red-600">
                                                {Math.abs(totalRevenue).toLocaleString('ru-RU')} ₽
                                              </span>
                                            </div>
                                          );
                                        })()}
                                        {collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Расходы`) ? (
                                          <ChevronDown className="w-4 h-4 text-red-600" />
                                        ) : (
                                          <ChevronUp className="w-4 h-4 text-red-600" />
                                        )}
                                      </div>
                                    </button>
                                    {!collapsedIncomeExpense.has(`${workTypeGroup.workType}_${positionGroup.positionName}_Расходы`) && (
                                      <div className="pl-16 pr-2 py-2 space-y-2">
                                        {expenseItems.map((groupedItem) => (
                                          <GroupedRepairItemCard
                                            key={groupedItem.id}
                                            item={groupedItem}
                                            onDragStart={handleDragStartGrouped}
                                            fromPositionId={position.id}
                                            isBeingDragged={draggedItem?.groupedIds.some(id => groupedItem.groupedIds.includes(id))}
                                            onQuantityChange={handleQuantityChange}
                                            maxAvailableQuantity={getMaxAvailableQuantity(groupedItem)}
                                            onPriceChange={handlePriceChange}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Элементы без статьи работ */}
            {groupedItemsByWorkType.itemsWithoutWorkType.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <div className="px-3 py-2 bg-gray-100 flex items-center space-x-2">
                  <span className="font-medium text-gray-900 text-sm">Без статьи работ</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    {groupedItemsByWorkType.itemsWithoutWorkType.length}
                  </span>
                </div>
                
                <div className="bg-white p-2 space-y-2">
                  {groupedItemsByWorkType.itemsWithoutWorkType.map((groupedItem) => (
                    <GroupedRepairItemCard
                      key={groupedItem.id}
                      item={groupedItem}
                      onDragStart={handleDragStartGrouped}
                      fromPositionId={position.id}
                      isBeingDragged={draggedItem?.groupedIds.some(id => groupedItem.groupedIds.includes(id))}
                      onQuantityChange={handleQuantityChange}
                      maxAvailableQuantity={getMaxAvailableQuantity(groupedItem)}
                      onPriceChange={handlePriceChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {isDragOver && canReceiveDrop && (
              <div className="border-2 border-blue-400 border-dashed rounded-lg p-4 bg-blue-50 text-center">
                <p className="text-blue-600 font-medium">Отпустите для добавления</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionCard;