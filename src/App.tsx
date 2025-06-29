import React, { useState } from 'react';
import { RepairItem, Position, GroupedRepairItem } from './types';
import { UnallocatedItemsPanel } from './components/UnallocatedItemsPanel';
import PositionCard from './components/PositionCard';
import { ImportButton } from './components/ImportButton';
import { SearchBar } from './components/SearchBar';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useSearch } from './hooks/useSearch';
import { exportToCSV } from './utils/csvExport';
import { getBasePositionName, groupSimilarItems, ungroupItems, groupByBasePositionName } from './utils/groupingUtils';
import { Plus, Download, Settings, TrendingUp, TrendingDown } from 'lucide-react';

function App() {
  // ИСПРАВЛЕНИЕ: Убираем тестовые данные - начинаем с пустого массива
  const [unallocatedItems, setUnallocatedItems] = useState<RepairItem[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [nextPositionNumber, setNextPositionNumber] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    draggedItem,
    isDragging,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDropToUnallocated
  } = useDragAndDrop();

  const { filteredUnallocatedItems } = useSearch(
    unallocatedItems,
    positions,
    searchQuery
  );

  const createNewPosition = () => {
    const newPosition: Position = {
      id: `position-${Date.now()}`,
      service: 'Нажмите для ввода услуги',
      positionNumber: nextPositionNumber,
      items: [],
      totalPrice: 0,
      totalIncome: 0,
      totalExpense: 0
    };
    
    setPositions([...positions, newPosition]);
    setNextPositionNumber(nextPositionNumber + 1);
  };

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

  // Создание позиции из группы с объединением доходов и расходов
  const createPositionFromGroup = (groupedItem: GroupedRepairItem) => {
    const basePositionName = getBasePositionName(groupedItem.positionName);
    
    // Находим ВСЕ элементы с таким же базовым названием (и доходы, и расходы)
    const allRelatedItems = unallocatedItems.filter(item => 
      getBasePositionName(item.positionName) === basePositionName
    );
    
    if (allRelatedItems.length === 0) {
      alert('Не найдены элементы для создания позиции');
      return;
    }

    console.log(`Создание позиции для "${basePositionName}":`, {
      basePositionName,
      foundItems: allRelatedItems.length,
      items: allRelatedItems.map(item => ({
        id: item.id,
        type: item.incomeExpenseType,
        revenue: item.revenue
      }))
    });

    const totals = recalculatePositionTotals(allRelatedItems);
    
    const newPosition: Position = {
      id: `position-${Date.now()}`,
      service: basePositionName, // Используем базовое название без ID
      positionNumber: nextPositionNumber,
      items: allRelatedItems, // Включаем ВСЕ связанные элементы
      ...totals
    };

    // Добавляем новую позицию
    setPositions(prevPositions => [...prevPositions, newPosition]);
    setNextPositionNumber(nextPositionNumber + 1);
    
    // Удаляем ВСЕ связанные элементы из неразмещенных
    setUnallocatedItems(prevItems => 
      prevItems.filter(item => 
        getBasePositionName(item.positionName) !== basePositionName
      )
    );

    console.log(`Создана позиция "${basePositionName}" с ${allRelatedItems.length} элементами`);
  };

  // Создание отдельных позиций для каждого элемента в группе (старая логика)
  const createIndividualPositionsFromGroup = (groupedItem: GroupedRepairItem) => {
    // Получаем все исходные элементы для этой группы
    const groupItems = ungroupItems(groupedItem, unallocatedItems);
    
    if (groupItems.length === 0) {
      alert('Не найдены элементы для создания позиций');
      return;
    }

    const newPositions: Position[] = [];
    let currentPositionNumber = nextPositionNumber;

    // Создаем отдельную позицию для каждого элемента
    groupItems.forEach((item) => {
      const totals = recalculatePositionTotals([item]);
      
      const newPosition: Position = {
        id: `position-${Date.now()}-${currentPositionNumber}`,
        service: item.positionName, // Используем полное название позиции с ID
        positionNumber: currentPositionNumber,
        items: [item], // Только один элемент в позиции
        ...totals
      };

      newPositions.push(newPosition);
      currentPositionNumber++;
    });

    // Добавляем новые позиции
    setPositions(prevPositions => [...prevPositions, ...newPositions]);
    setNextPositionNumber(currentPositionNumber);
    
    // Удаляем элементы из неразмещенных
    setUnallocatedItems(prevItems => 
      prevItems.filter(item => !groupedItem.groupedIds.includes(item.id))
    );

    console.log(`Создано ${newPositions.length} отдельных позиций для "${groupedItem.positionName}"`);
  };

  // ИСПРАВЛЕННАЯ функция для изменения цены конкретного элемента по ID
  const handlePriceChange = (positionId: string, itemId: string, newRevenue: number) => {
    console.log('🎯 Изменение цены конкретного элемента:', {
      positionId,
      itemId,
      newRevenue
    });

    setPositions(prevPositions => 
      prevPositions.map(position => {
        if (position.id === positionId) {
          const updatedItems = position.items.map(item => {
            // ИЗМЕНЯЕМ ТОЛЬКО КОНКРЕТНЫЙ ЭЛЕМЕНТ ПО ЕГО ID
            if (item.id === itemId) {
              console.log(`✅ Обновляем элемент ${itemId}:`, {
                oldRevenue: item.revenue,
                newRevenue,
                incomeExpenseType: item.incomeExpenseType
              });

              // Сохраняем пропорции НДС (если они были)
              let newSumWithoutVAT, newVatAmount;
              if (item.revenue !== 0) {
                const vatRatio = item.vatAmount / item.revenue;
                const withoutVatRatio = item.sumWithoutVAT / item.revenue;
                newVatAmount = newRevenue * vatRatio;
                newSumWithoutVAT = newRevenue * withoutVatRatio;
              } else {
                // Если старая сумма была 0, используем стандартные пропорции
                newSumWithoutVAT = newRevenue * 0.8; // 80% без НДС
                newVatAmount = newRevenue * 0.2; // 20% НДС
              }

              return {
                ...item,
                revenue: newRevenue,
                sumWithoutVAT: newSumWithoutVAT,
                vatAmount: newVatAmount
              };
            }
            
            // ВСЕ ОСТАЛЬНЫЕ ЭЛЕМЕНТЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ
            console.log(`⏸️ Элемент ${item.id} остается без изменений`);
            return item;
          });

          // Пересчитываем общие суммы позиции
          const totals = recalculatePositionTotals(updatedItems);
          
          console.log('📊 Новые суммы позиции:', totals);
          
          return {
            ...position,
            items: updatedItems,
            ...totals
          };
        }
        return position;
      })
    );
  };

  const updatePositionService = (positionId: string, newService: string) => {
    setPositions(positions.map(position => 
      position.id === positionId 
        ? { ...position, service: newService }
        : position
    ));
  };

  const deletePosition = (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (position) {
      // Return items to unallocated
      setUnallocatedItems([...unallocatedItems, ...position.items]);
      // Remove position
      setPositions(positions.filter(p => p.id !== positionId));
    }
  };

  const handlePositionDrop = (targetPositionId: string) => {
    handleDrop(targetPositionId, positions, unallocatedItems, setPositions, setUnallocatedItems);
  };

  const handleUnallocatedDrop = () => {
    handleDropToUnallocated(positions, unallocatedItems, setPositions, setUnallocatedItems);
  };

  const handleExport = () => {
    if (positions.length === 0) {
      alert('Нет позиций для экспорта');
      return;
    }
    exportToCSV(positions);
  };

  const handleImport = (importedItems: RepairItem[]) => {
    // Добавляем импортированные элементы к существующим неразмещенным
    setUnallocatedItems(prevItems => [...prevItems, ...importedItems]);
  };

  const handleClearAll = () => {
    if (confirm('Вы уверены, что хотите очистить все данные?')) {
      setUnallocatedItems([]);
      setPositions([]);
      setNextPositionNumber(1);
    }
  };

  // Обработка изменения количества в позиции
  const handleQuantityChange = (positionId: string, groupedItem: GroupedRepairItem, newQuantity: number) => {
    const currentQuantity = groupedItem.groupedIds.length;
    const basePositionName = getBasePositionName(groupedItem.positionName);
    
    console.log('Изменение количества:', {
      positionId,
      basePositionName,
      currentQuantity,
      newQuantity,
      groupedItemType: groupedItem.incomeExpenseType
    });
    
    if (newQuantity > currentQuantity) {
      // Увеличиваем количество - добавляем элементы из неразмещенных
      const itemsToAdd = newQuantity - currentQuantity;
      const availableItems = unallocatedItems.filter(item => 
        getBasePositionName(item.positionName) === basePositionName &&
        item.incomeExpenseType === groupedItem.incomeExpenseType
      );
      
      if (availableItems.length < itemsToAdd) {
        alert(`Недостаточно доступных элементов. Доступно: ${availableItems.length}`);
        return;
      }
      
      const itemsToMove = availableItems.slice(0, itemsToAdd);
      
      console.log('Добавляем элементы:', itemsToMove.map(item => item.id));
      
      // Удаляем элементы из неразмещенных
      setUnallocatedItems(prevItems => 
        prevItems.filter(item => !itemsToMove.some(moveItem => moveItem.id === item.id))
      );
      
      // Добавляем элементы в позицию
      setPositions(prevPositions => 
        prevPositions.map(position => {
          if (position.id === positionId) {
            const newItems = [...position.items, ...itemsToMove];
            const totals = recalculatePositionTotals(newItems);
            return {
              ...position,
              items: newItems,
              ...totals
            };
          }
          return position;
        })
      );
    } else if (newQuantity < currentQuantity) {
      // Уменьшаем количество - возвращаем элементы в неразмещенные
      const itemsToRemove = currentQuantity - newQuantity;
      
      console.log('Уменьшаем количество на:', itemsToRemove);
      
      // Находим позицию
      const position = positions.find(p => p.id === positionId);
      if (!position) return;
      
      // ВАЖНО: Находим ВСЕ элементы с таким же базовым названием в позиции
      // НЕ фильтруем по типу доходы/расходы, чтобы вернуть и те, и другие
      const itemsWithSameName = position.items.filter(item => 
        getBasePositionName(item.positionName) === basePositionName
      );
      
      console.log('Все элементы с таким же названием в позиции:', {
        total: itemsWithSameName.length,
        доходы: itemsWithSameName.filter(item => item.incomeExpenseType === 'Доходы').length,
        расходы: itemsWithSameName.filter(item => item.incomeExpenseType === 'Расходы').length,
        items: itemsWithSameName.map(item => ({
          id: item.id,
          type: item.incomeExpenseType,
          revenue: item.revenue
        }))
      });
      
      // Берем элементы для удаления пропорционально
      // Если нужно удалить 1 элемент из группы, где есть и доходы, и расходы,
      // то удаляем по одному элементу каждого типа
      const incomeItems = itemsWithSameName.filter(item => item.incomeExpenseType === 'Доходы');
      const expenseItems = itemsWithSameName.filter(item => item.incomeExpenseType === 'Расходы');
      
      let itemsToMoveBack: RepairItem[] = [];
      
      // Если есть и доходы, и расходы, удаляем пропорционально
      if (incomeItems.length > 0 && expenseItems.length > 0) {
        // Удаляем по одному элементу каждого типа, если возможно
        const incomeToRemove = Math.min(itemsToRemove, incomeItems.length);
        const expenseToRemove = Math.min(itemsToRemove, expenseItems.length);
        
        itemsToMoveBack = [
          ...incomeItems.slice(-incomeToRemove),
          ...expenseItems.slice(-expenseToRemove)
        ];
      } else {
        // Если только один тип, берем из него
        itemsToMoveBack = itemsWithSameName.slice(-itemsToRemove);
      }
      
      console.log('Возвращаем элементы:', {
        count: itemsToMoveBack.length,
        доходы: itemsToMoveBack.filter(item => item.incomeExpenseType === 'Доходы').length,
        расходы: itemsToMoveBack.filter(item => item.incomeExpenseType === 'Расходы').length,
        items: itemsToMoveBack.map(item => ({
          id: item.id,
          type: item.incomeExpenseType,
          revenue: item.revenue
        }))
      });
      
      // ВАЖНО: Возвращаем элементы в неразмещенные КАК ОТДЕЛЬНЫЕ элементы
      // Это обеспечит правильное отображение доходов и расходов отдельно
      setUnallocatedItems(prevUnallocated => {
        const newUnallocated = [...prevUnallocated, ...itemsToMoveBack];
        console.log('Новые неразмещенные элементы:', newUnallocated.length);
        console.log('Возвращенные элементы по типам:', {
          доходы: itemsToMoveBack.filter(item => item.incomeExpenseType === 'Доходы').length,
          расходы: itemsToMoveBack.filter(item => item.incomeExpenseType === 'Расходы').length
        });
        return newUnallocated;
      });
      
      // Удаляем элементы из позиции
      setPositions(prevPositions => 
        prevPositions.map(pos => {
          if (pos.id === positionId) {
            const remainingItems = pos.items.filter(item => 
              !itemsToMoveBack.some(removeItem => removeItem.id === item.id)
            );
            
            console.log('Оставшиеся элементы в позиции:', remainingItems.length);
            
            const totals = recalculatePositionTotals(remainingItems);
            
            return {
              ...pos,
              items: remainingItems,
              ...totals
            };
          }
          return pos;
        })
      );
    }
  };

  // Обработка увеличения количества в неразмещенных позициях
  const handleIncreaseQuantityUnallocated = (groupedItem: GroupedRepairItem) => {
    // Эта функция не нужна для неразмещенных, так как там уже показаны все доступные элементы
    console.log('Увеличение количества в неразмещенных не требуется');
  };

  const totalItems = positions.reduce((sum, pos) => sum + pos.items.length, 0);
  const totalValue = positions.reduce((sum, pos) => sum + pos.totalPrice, 0);
  const totalIncome = positions.reduce((sum, pos) => sum + pos.totalIncome, 0);
  const totalExpense = positions.reduce((sum, pos) => sum + pos.totalExpense, 0);

  // Показываем результаты поиска только для неразмещенных
  const hasSearchResults = searchQuery.trim() !== '';

  // Подсчитываем количество групп в неразмещенных
  const groupedUnallocatedItems = groupByBasePositionName(unallocatedItems);
  const groupsCount = groupedUnallocatedItems.length;
  // Подсчитываем общее количество позиций, которые будут созданы
  const totalPositionsToCreate = groupedUnallocatedItems.reduce((sum, group) => sum + group.groupedIds.length, 0);

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Группировка позиций</h1>
            <p className="text-gray-600 mt-1">
              Создавайте группы услуг по ремонту электродвигателей
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 flex items-center space-x-4">
              <span><span className="font-medium">{totalItems}</span> позиций</span>
              
              {totalIncome > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">
                    {totalIncome.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              
              {totalExpense > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-600">
                    {totalExpense.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
              
              <span className="font-medium text-blue-600">
                Итого: {totalValue.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <ImportButton 
                onImport={handleImport}
                disabled={isDragging}
              />
              
              <button
                onClick={createNewPosition}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить позицию</span>
              </button>
              
              <button
                onClick={handleExport}
                disabled={positions.length === 0}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Скачать CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar - только для неразмещенных позиций */}
        {unallocatedItems.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder="Поиск в неразмещенных позициях..."
              />
            </div>
            
            {hasSearchResults && (
              <div className="text-sm text-gray-600 ml-4">
                Найдено: <span className="font-medium text-blue-600">{filteredUnallocatedItems.length}</span> из {unallocatedItems.length}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Fixed with independent scroll */}
        <UnallocatedItemsPanel
          items={filteredUnallocatedItems}
          onDragStart={handleDragStart}
          onDrop={handleUnallocatedDrop}
          onDragOver={(e) => e.preventDefault()}
          draggedItem={draggedItem}
          draggedFromPositionId={positions.find(p => p.items.some(item => draggedItem?.groupedIds.includes(item.id)))?.id || null}
          searchQuery={searchQuery}
          totalUnallocatedCount={unallocatedItems.length}
          onIncreaseQuantity={handleIncreaseQuantityUnallocated}
          onCreatePositionFromGroup={createPositionFromGroup}
        />

        {/* Right Content Area - Independent scroll */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-900">Собранные позиции</h2>
                  {unallocatedItems.length > 0 && positions.length === 0 && (
                    <div className="text-sm text-gray-500">
                      Неразмещенных позиций: <span className="font-medium text-orange-600">{unallocatedItems.length}</span>
                      {groupsCount > 0 && (
                        <span className="ml-2">
                          • Групп: <span className="font-medium text-purple-600">{groupsCount}</span>
                          • Будет создано: <span className="font-medium text-blue-600">{totalPositionsToCreate}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {positions.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg mb-2">Позиции еще не созданы</p>
                    <p className="text-gray-500 mb-4">
                      {unallocatedItems.length > 0 
                        ? groupsCount > 0 
                          ? 'Нажмите стрелку рядом с группой для создания объединенной позиции'
                          : 'Нажмите "Добавить позицию" для создания первой позиции'
                        : 'Импортируйте данные из Excel для начала работы'
                      }
                    </p>
                    {unallocatedItems.length === 0 && (
                      <div className="flex items-center justify-center">
                        <ImportButton onImport={handleImport} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-6">
                {positions.map((position) => (
                  <PositionCard
                    key={position.id}
                    position={position}
                    onDragStart={(item, fromPositionId) => {
                      // Преобразуем RepairItem в GroupedRepairItem для совместимости
                      const groupedItem: GroupedRepairItem = {
                        ...item,
                        groupedIds: [item.id],
                        totalQuantity: item.quantity,
                        totalRevenue: item.revenue,
                        totalSumWithoutVAT: item.sumWithoutVAT,
                        totalVatAmount: item.vatAmount
                      };
                      handleDragStart(groupedItem, fromPositionId);
                    }}
                    onDrop={handlePositionDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onUpdateService={updatePositionService}
                    onDeletePosition={deletePosition}
                    draggedItem={draggedItem}
                    onQuantityChange={handleQuantityChange}
                    unallocatedItems={unallocatedItems}
                    onPriceChange={handlePriceChange}
                  />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;