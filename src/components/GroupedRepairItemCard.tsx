import React, { useState } from 'react';
import { GroupedRepairItem } from '../types';
import { QuantityControl } from './QuantityControl';
import { Package, RussianRuble as Ruble, Calendar, Hash, Copy, Check, Tag, Users, ArrowRight, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';

interface GroupedRepairItemCardProps {
  item: GroupedRepairItem;
  onDragStart: (item: GroupedRepairItem, fromPositionId?: string) => void;
  fromPositionId?: string;
  isDraggable?: boolean;
  isBeingDragged?: boolean;
  searchQuery?: string;
  onQuantityChange?: (item: GroupedRepairItem, newQuantity: number) => void;
  maxAvailableQuantity?: number;
  onCreatePosition?: (item: GroupedRepairItem) => void;
  onPriceChange?: (itemId: string, newRevenue: number) => void;
}

export const GroupedRepairItemCard: React.FC<GroupedRepairItemCardProps> = ({
  item,
  onDragStart,
  fromPositionId,
  isDraggable = true,
  isBeingDragged = false,
  searchQuery = '',
  onQuantityChange,
  maxAvailableQuantity,
  onCreatePosition,
  onPriceChange
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceValue, setEditPriceValue] = useState('');

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(item, fromPositionId);
  };

  const handleCopyPositionName = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.positionName);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (onQuantityChange) {
      onQuantityChange(item, newQuantity);
    }
  };

  const handleCreatePosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onCreatePosition) {
      onCreatePosition(item);
    }
  };

  // ИСПРАВЛЕННАЯ обработка редактирования цены для конкретного элемента
  const handlePriceEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPriceChange || !fromPositionId) return;
    
    // Для сгруппированных элементов берем общую сумму
    setEditPriceValue(item.revenue.toString());
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    if (!onPriceChange || !fromPositionId) return;
    
    const newRevenue = parseFloat(editPriceValue);
    
    console.log('🎯 Сохранение цены для элемента:', {
      itemId: item.id,
      groupedIds: item.groupedIds,
      editPriceValue,
      newRevenue,
      isNaN: isNaN(newRevenue)
    });
    
    if (!isNaN(newRevenue)) {
      // ВАЖНО: Если это группа элементов, изменяем каждый элемент отдельно
      if (item.groupedIds.length > 1) {
        // Для группы распределяем сумму поровну между элементами
        const revenuePerItem = newRevenue / item.groupedIds.length;
        item.groupedIds.forEach(itemId => {
          onPriceChange(itemId, revenuePerItem);
        });
      } else {
        // Для одиночного элемента изменяем напрямую
        onPriceChange(item.groupedIds[0], newRevenue);
      }
    } else {
      console.warn('Некорректное значение цены:', editPriceValue);
    }
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setIsEditingPrice(false);
    setEditPriceValue('');
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePriceSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handlePriceCancel();
    }
  };

  // Функция для подсветки найденного текста (только для неразмещенных)
  const highlightText = (text: string, query: string) => {
    if (!query.trim() || fromPositionId) return text; // Не подсвечиваем в собранных позициях
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const isGrouped = item.groupedIds.length > 1;
  const showQuantityControl = fromPositionId && onQuantityChange && maxAvailableQuantity !== undefined;
  const currentQuantity = item.groupedIds.length;
  const maxQuantity = currentQuantity + (maxAvailableQuantity || 0);
  const showCreateButton = !fromPositionId && onCreatePosition;
  const isExpense = item.incomeExpenseType === 'Расходы';
  const showPriceEdit = fromPositionId && onPriceChange;

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      className={`
        bg-white rounded-lg border-2 p-4 transition-all duration-200 cursor-move relative
        ${isBeingDragged 
          ? 'opacity-50 border-blue-300 shadow-lg transform scale-105' 
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
        }
        ${!isDraggable ? 'cursor-default opacity-60' : ''}
        ${isGrouped ? 'border-l-4 border-l-orange-400' : ''}
        ${isExpense ? 'border-r-4 border-r-red-400' : ''}
      `}
    >
      {/* Индикатор группировки - перемещен в левый верхний угол */}
      {isGrouped && (
        <div className="absolute top-2 left-2 flex items-center space-x-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
          <Users className="w-3 h-3" />
          <span>{item.groupedIds.length}</span>
        </div>
      )}

      {/* Индикатор типа доходы/расходы */}
      <div className={`absolute top-2 ${isGrouped ? 'left-16' : 'left-2'} flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
        isExpense 
          ? 'bg-red-100 text-red-700' 
          : 'bg-green-100 text-green-700'
      }`}>
        {isExpense ? (
          <TrendingDown className="w-3 h-3" />
        ) : (
          <TrendingUp className="w-3 h-3" />
        )}
        <span>{item.incomeExpenseType}</span>
      </div>

      {/* Кнопка создания позиции - теперь в правом верхнем углу */}
      {showCreateButton && (
        <div className="absolute top-2 right-2">
          <button
            onClick={handleCreatePosition}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors group bg-white shadow-sm border border-gray-200"
            title="Создать позицию из этой группы"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Контрол количества для позиций - в правом верхнем углу */}
      {showQuantityControl && (
        <div className="absolute top-2 right-2">
          <QuantityControl
            currentQuantity={currentQuantity}
            maxQuantity={maxQuantity}
            onQuantityChange={handleQuantityChange}
          />
        </div>
      )}

      {/* Основной контент с отступом сверху для кнопок */}
      <div className={`${isGrouped || showCreateButton || showQuantityControl ? 'mt-8' : 'mt-6'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1">
            <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 line-clamp-2">
              {highlightText(item.analytics8, searchQuery)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <Ruble className={`w-4 h-4 ${isExpense ? 'text-red-600' : 'text-green-600'}`} />
            {isEditingPrice ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="any"
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(e.target.value)}
                  onBlur={handlePriceSave}
                  onKeyDown={handlePriceKeyDown}
                  className={`text-lg font-bold border border-gray-300 rounded px-2 py-1 w-32 ${
                    isExpense ? 'text-red-600' : 'text-green-600'
                  }`}
                  placeholder="Сумма"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <span className={`text-lg font-bold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                  {item.revenue.toLocaleString('ru-RU')}
                </span>
                {showPriceEdit && (
                  <button
                    onClick={handlePriceEdit}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    title="Редактировать сумму"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500">
            Кол-во: {item.quantity}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>Без НДС: {item.sumWithoutVAT.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <span>НДС: {item.vatAmount.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{item.date}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>{item.year}/{item.month}</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 truncate mb-2">
          {highlightText(item.analytics3, searchQuery)}
        </div>

        {/* Статья работ */}
        {item.workType && (
          <div className="flex items-center space-x-1 mb-2 text-xs">
            <Tag className="w-3 h-3 text-purple-600" />
            <span className="text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded">
              {highlightText(item.workType, searchQuery)}
            </span>
          </div>
        )}

        {/* Название позиции с кнопкой копирования */}
        <div className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs">
          <span className="text-gray-600 truncate flex-1 mr-2" title={item.positionName}>
            {highlightText(item.positionName, searchQuery)}
          </span>
          <button
            onClick={handleCopyPositionName}
            className={`
              p-1 rounded transition-all duration-200 flex-shrink-0
              ${isCopied 
                ? 'bg-green-100 text-green-600' 
                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
              }
            `}
            title={isCopied ? 'Скопировано!' : 'Копировать название позиции'}
          >
            {isCopied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Показываем ID сгруппированных элементов для отладки */}
        {isGrouped && (
          <div className="mt-2 text-xs text-gray-400">
            <details>
              <summary className="cursor-pointer hover:text-gray-600">
                ID элементов ({item.groupedIds.length})
              </summary>
              <div className="mt-1 space-y-1">
                {item.groupedIds.map((id, index) => (
                  <div key={id} className="font-mono text-xs">
                    {index + 1}. {id}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Информация о доступных элементах для позиций */}
        {showQuantityControl && maxAvailableQuantity > 0 && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Доступно еще: {maxAvailableQuantity}
          </div>
        )}
      </div>
    </div>
  );
};