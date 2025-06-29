import React, { useState, useMemo } from 'react';
import { RepairItem, GroupedRepairItem } from '../types';
import { GroupedRepairItemCard } from './GroupedRepairItemCard';
import { groupByBasePositionName } from '../utils/groupingUtils';
import { Package2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minimize2, Maximize2, TrendingUp, TrendingDown, RussianRuble as Ruble } from 'lucide-react';

interface UnallocatedItemsPanelProps {
  items: RepairItem[];
  onDragStart: (item: GroupedRepairItem) => void;
  onDrop: () => void;
  onDragOver: (e: React.DragEvent) => void;
  draggedItem: GroupedRepairItem | null;
  draggedFromPositionId: string | null;
  searchQuery?: string;
  totalUnallocatedCount?: number;
  onIncreaseQuantity: (item: GroupedRepairItem) => void;
  onCreatePositionFromGroup?: (item: GroupedRepairItem) => void;
}

interface SalaryGoodsGroup {
  salaryGoods: string;
  workTypeGroups: WorkTypeGroup[];
  isCollapsed: boolean;
}

interface WorkTypeGroup {
  workType: string;
  items: GroupedRepairItem[];
  isCollapsed: boolean;
}

export const UnallocatedItemsPanel: React.FC<UnallocatedItemsPanelProps> = ({
  items,
  onDragStart,
  onDrop,
  onDragOver,
  draggedItem,
  draggedFromPositionId,
  searchQuery = '',
  totalUnallocatedCount = 0,
  onIncreaseQuantity,
  onCreatePositionFromGroup
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [collapsedSalaryGoods, setCollapsedSalaryGoods] = useState<Set<string>>(new Set());
  const [collapsedWorkTypes, setCollapsedWorkTypes] = useState<Set<string>>(new Set());

  // Группируем по Зарплата/Товары -> Статья работ -> Базовое название позиции
  const groupedItems = useMemo(() => {
    // Используем функцию группировки по базовому названию
    const baseGrouped = groupByBasePositionName(items);
    
    const salaryGoodsGroups: SalaryGoodsGroup[] = [];
    const itemsWithoutSalaryGoods: GroupedRepairItem[] = [];

    // Группируем по Зарплата/Товары
    const salaryGoodsMap = new Map<string, GroupedRepairItem[]>();
    
    baseGrouped.forEach(item => {
      const salaryGoods = item.salaryGoods.trim();
      if (salaryGoods) {
        if (!salaryGoodsMap.has(salaryGoods)) {
          salaryGoodsMap.set(salaryGoods, []);
        }
        salaryGoodsMap.get(salaryGoods)!.push(item);
      } else {
        itemsWithoutSalaryGoods.push(item);
      }
    });

    // Создаем группы Зарплата/Товары
    salaryGoodsMap.forEach((salaryGoodsItems, salaryGoods) => {
      // Внутри каждой группы Зарплата/Товары группируем по статье работ
      const workTypeMap = new Map<string, GroupedRepairItem[]>();
      
      salaryGoodsItems.forEach(item => {
        const workType = item.workType.trim();
        const key = workType || 'Без статьи работ';
        if (!workTypeMap.has(key)) {
          workTypeMap.set(key, []);
        }
        workTypeMap.get(key)!.push(item);
      });

      // Создаем группы статей работ
      const workTypeGroups: WorkTypeGroup[] = [];
      
      workTypeMap.forEach((workTypeItems, workType) => {
        workTypeGroups.push({
          workType,
          items: workTypeItems,
          isCollapsed: collapsedWorkTypes.has(`${salaryGoods}_${workType}`)
        });
      });

      // Сортируем статьи работ по названию
      workTypeGroups.sort((a, b) => a.workType.localeCompare(b.workType, 'ru'));

      salaryGoodsGroups.push({
        salaryGoods,
        workTypeGroups,
        isCollapsed: collapsedSalaryGoods.has(salaryGoods)
      });
    });

    // Сортируем группы Зарплата/Товары по названию
    salaryGoodsGroups.sort((a, b) => a.salaryGoods.localeCompare(b.salaryGoods, 'ru'));

    return { salaryGoodsGroups, itemsWithoutSalaryGoods };
  }, [items, collapsedSalaryGoods, collapsedWorkTypes]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const toggleSalaryGoodsCollapse = (salaryGoods: string) => {
    const newCollapsedSalaryGoods = new Set(collapsedSalaryGoods);
    if (newCollapsedSalaryGoods.has(salaryGoods)) {
      newCollapsedSalaryGoods.delete(salaryGoods);
    } else {
      newCollapsedSalaryGoods.add(salaryGoods);
    }
    setCollapsedSalaryGoods(newCollapsedSalaryGoods);
  };

  const toggleWorkTypeCollapse = (salaryGoods: string, workType: string) => {
    const key = `${salaryGoods}_${workType}`;
    const newCollapsedWorkTypes = new Set(collapsedWorkTypes);
    if (newCollapsedWorkTypes.has(key)) {
      newCollapsedWorkTypes.delete(key);
    } else {
      newCollapsedWorkTypes.add(key);
    }
    setCollapsedWorkTypes(newCollapsedWorkTypes);
  };

  // Функция для сворачивания/разворачивания всех групп
  const toggleAllGroups = () => {
    const allSalaryGoods = groupedItems.salaryGoodsGroups.map(group => group.salaryGoods);
    
    if (collapsedSalaryGoods.size === allSalaryGoods.length) {
      // Если все группы свернуты, разворачиваем все
      setCollapsedSalaryGoods(new Set());
    } else {
      // Иначе сворачиваем все
      setCollapsedSalaryGoods(new Set(allSalaryGoods));
    }
  };

  // Функция для получения доходов и расходов из группы
  const getIncomeExpenseFromGroup = (groupedItem: GroupedRepairItem, originalItems: RepairItem[]) => {
    // Находим все исходные элементы группы
    const groupItems = originalItems.filter(item => groupedItem.groupedIds.includes(item.id));
    
    const incomeItems = groupItems.filter(item => item.incomeExpenseType === 'Доходы');
    const expenseItems = groupItems.filter(item => item.incomeExpenseType === 'Расходы');
    
    const totalIncome = incomeItems.reduce((sum, item) => sum + item.revenue, 0);
    const totalExpense = expenseItems.reduce((sum, item) => sum + Math.abs(item.revenue), 0);
    
    return {
      incomeItems,
      expenseItems,
      totalIncome,
      totalExpense,
      hasIncome: incomeItems.length > 0,
      hasExpense: expenseItems.length > 0
    };
  };

  // Обработчик перетаскивания для группы
  const handleGroupDragStart = (e: React.DragEvent, groupedItem: GroupedRepairItem) => {
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(groupedItem);
  };

  const canReceiveDrop = draggedItem !== null && draggedFromPositionId !== null;
  const hasSearchFilter = searchQuery.trim() !== '';
  const displayCount = hasSearchFilter ? items.length : totalUnallocatedCount || items.length;

  // Подсчитываем общее количество сгруппированных элементов
  const totalGroupedItems = groupedItems.salaryGoodsGroups.reduce((sum, salaryGroup) => 
    sum + salaryGroup.workTypeGroups.reduce((workSum, workGroup) => workSum + workGroup.items.length, 0), 0
  ) + groupedItems.itemsWithoutSalaryGoods.length;

  // Проверяем, есть ли группы для отображения кнопки
  const hasGroups = groupedItems.salaryGoodsGroups.length > 0;
  const allGroupsCollapsed = collapsedSalaryGoods.size === groupedItems.salaryGoodsGroups.length;

  return (
    <div className={`
      bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0
      ${isCollapsed ? 'w-12' : 'w-96'}
    `}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
        {!isCollapsed && (
          <>
            <div className="flex items-center space-x-2">
              <Package2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Неразмещенные позиции
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {hasSearchFilter && items.length !== totalUnallocatedCount && (
                <span className="text-xs text-gray-500">
                  {items.length}/{totalUnallocatedCount}
                </span>
              )}
              <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                {displayCount}
              </div>
              {totalGroupedItems !== items.length && (
                <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  {totalGroupedItems}
                </div>
              )}
              {/* Кнопка сворачивания всех групп */}
              {hasGroups && (
                <button
                  onClick={toggleAllGroups}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title={allGroupsCollapsed ? 'Развернуть все группы' : 'Свернуть все группы'}
                >
                  {allGroupsCollapsed ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable Content */}
      {!isCollapsed && (
        <div
          className={`
            flex-1 p-4 overflow-y-auto min-h-0 transition-all duration-200
            ${isDragOver && canReceiveDrop ? 'bg-red-50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragOver && canReceiveDrop && (
            <div className="border-2 border-red-400 border-dashed rounded-lg p-4 bg-red-50 text-center mb-3">
              <p className="text-red-600 font-medium">Отпустите для возврата в неразмещенные</p>
            </div>
          )}
          
          {items.length === 0 && !isDragOver ? (
            <div className="text-center py-8">
              <Package2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                {hasSearchFilter ? 'Ничего не найдено' : 'Все позиции размещены'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Группы по Зарплата/Товары */}
              {groupedItems.salaryGoodsGroups.map((salaryGoodsGroup) => (
                <div key={salaryGoodsGroup.salaryGoods} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Заголовок группы Зарплата/Товары */}
                  <button
                    onClick={() => toggleSalaryGoodsCollapse(salaryGoodsGroup.salaryGoods)}
                    className="w-full px-3 py-2 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-between text-left transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-indigo-900 text-sm">
                        {salaryGoodsGroup.salaryGoods}
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-xs font-medium">
                        {salaryGoodsGroup.workTypeGroups.reduce((sum, wg) => sum + wg.items.length, 0)}
                      </span>
                    </div>
                    {salaryGoodsGroup.isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-indigo-500" />
                    )}
                  </button>
                  
                  {/* Группы по статье работ внутри Зарплата/Товары */}
                  {!salaryGoodsGroup.isCollapsed && (
                    <div className="bg-white">
                      {salaryGoodsGroup.workTypeGroups.map((workTypeGroup) => (
                        <div key={`${salaryGoodsGroup.salaryGoods}_${workTypeGroup.workType}`} className="border-b border-gray-200 last:border-b-0">
                          {/* Заголовок статьи работ */}
                          <button
                            onClick={() => toggleWorkTypeCollapse(salaryGoodsGroup.salaryGoods, workTypeGroup.workType)}
                            className="w-full pl-6 pr-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {workTypeGroup.workType}
                              </span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                {workTypeGroup.items.length}
                              </span>
                            </div>
                            {workTypeGroup.isCollapsed ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          
                          {/* Элементы статьи работ */}
                          {!workTypeGroup.isCollapsed && (
                            <div className="bg-white space-y-2 p-2 pl-8">
                              {workTypeGroup.items.map((groupedItem) => {
                                const { hasIncome, hasExpense, totalIncome, totalExpense } = getIncomeExpenseFromGroup(groupedItem, items);
                                const isBeingDragged = draggedItem?.groupedIds.some(id => groupedItem.groupedIds.includes(id));
                                
                                return (
                                  <div 
                                    key={groupedItem.id} 
                                    className={`
                                      border border-gray-200 rounded-lg overflow-hidden cursor-move transition-all duration-200
                                      ${isBeingDragged 
                                        ? 'opacity-50 border-blue-300 shadow-lg transform scale-105' 
                                        : 'hover:border-blue-300 hover:shadow-md'
                                      }
                                    `}
                                    draggable={true}
                                    onDragStart={(e) => handleGroupDragStart(e, groupedItem)}
                                  >
                                    {/* Заголовок позиции */}
                                    <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-gray-900 text-sm">
                                          {groupedItem.positionName}
                                        </span>
                                        <div className="flex items-center space-x-1">
                                          {hasIncome && (
                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                              Доходы
                                            </span>
                                          )}
                                          {hasExpense && (
                                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                              Расходы
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Кнопка создания позиции */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onCreatePositionFromGroup) {
                                            onCreatePositionFromGroup(groupedItem);
                                          }
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors group bg-white shadow-sm border border-gray-200"
                                        title="Создать позицию из этой группы"
                                      >
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                      </button>
                                    </div>
                                    
                                    {/* Содержимое позиции */}
                                    <div className="bg-white">
                                      {/* Показываем доходы и расходы */}
                                      <div className="p-3 space-y-2">
                                        {hasIncome && (
                                          <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-2">
                                              <TrendingUp className="w-4 h-4 text-green-600" />
                                              <span className="text-green-700 font-medium">Доходы</span>
                                            </div>
                                            <span className="text-green-700 font-bold">
                                              {totalIncome.toLocaleString('ru-RU')} ₽
                                            </span>
                                          </div>
                                        )}
                                        
                                        {hasExpense && (
                                          <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-2">
                                              <TrendingDown className="w-4 h-4 text-red-600" />
                                              <span className="text-red-700 font-medium">Расходы</span>
                                            </div>
                                            <span className="text-red-700 font-bold">
                                              {totalExpense.toLocaleString('ru-RU')} ₽
                                            </span>
                                          </div>
                                        )}
                                        
                                        {/* Итого */}
                                        <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                                          <div className="flex items-center space-x-2">
                                            <Ruble className="w-4 h-4 text-blue-600" />
                                            <span className="text-blue-700 font-medium">Итого</span>
                                          </div>
                                          <span className="text-blue-700 font-bold">
                                            {(totalIncome - totalExpense).toLocaleString('ru-RU')} ₽
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Элементы без Зарплата/Товары */}
              {groupedItems.itemsWithoutSalaryGoods.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 flex items-center space-x-2">
                    <span className="font-medium text-gray-900 text-sm">Без категории</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      {groupedItems.itemsWithoutSalaryGoods.length}
                    </span>
                  </div>
                  
                  <div className="bg-white space-y-2 p-2">
                    {groupedItems.itemsWithoutSalaryGoods.map((groupedItem) => {
                      const { hasIncome, hasExpense, totalIncome, totalExpense } = getIncomeExpenseFromGroup(groupedItem, items);
                      const isBeingDragged = draggedItem?.groupedIds.some(id => groupedItem.groupedIds.includes(id));
                      
                      return (
                        <div 
                          key={groupedItem.id} 
                          className={`
                            border border-gray-200 rounded-lg overflow-hidden cursor-move transition-all duration-200
                            ${isBeingDragged 
                              ? 'opacity-50 border-blue-300 shadow-lg transform scale-105' 
                              : 'hover:border-blue-300 hover:shadow-md'
                            }
                          `}
                          draggable={true}
                          onDragStart={(e) => handleGroupDragStart(e, groupedItem)}
                        >
                          {/* Заголовок позиции */}
                          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {groupedItem.positionName}
                              </span>
                              <div className="flex items-center space-x-1">
                                {hasIncome && (
                                  <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                    Доходы
                                  </span>
                                )}
                                {hasExpense && (
                                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                    Расходы
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Кнопка создания позиции */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onCreatePositionFromGroup) {
                                  onCreatePositionFromGroup(groupedItem);
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors group bg-white shadow-sm border border-gray-200"
                              title="Создать позицию из этой группы"
                            >
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                          
                          {/* Содержимое позиции */}
                          <div className="bg-white">
                            {/* Показываем доходы и расходы */}
                            <div className="p-3 space-y-2">
                              {hasIncome && (
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700 font-medium">Доходы</span>
                                  </div>
                                  <span className="text-green-700 font-bold">
                                    {totalIncome.toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                              )}
                              
                              {hasExpense && (
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-2">
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                    <span className="text-red-700 font-medium">Расходы</span>
                                  </div>
                                  <span className="text-red-700 font-bold">
                                    {totalExpense.toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                              )}
                              
                              {/* Итого */}
                              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <Ruble className="w-4 h-4 text-blue-600" />
                                  <span className="text-blue-700 font-medium">Итого</span>
                                </div>
                                <span className="text-blue-700 font-bold">
                                  {(totalIncome - totalExpense).toLocaleString('ru-RU')} ₽
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};