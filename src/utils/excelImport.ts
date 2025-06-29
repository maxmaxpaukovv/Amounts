import * as XLSX from 'xlsx';
import { RepairItem } from '../types';

export const importFromExcel = async (file: File): Promise<RepairItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Конвертируем в JSON с заголовками
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Файл должен содержать заголовки и данные');
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        console.log('📋 Заголовки Excel файла:', headers);
        
        // УЛУЧШЕННАЯ функция поиска столбцов - ищем точные совпадения и частичные
        const getColumnIndex = (possibleNames: string[]): number => {
          // Сначала ищем точные совпадения (без учета регистра)
          for (const name of possibleNames) {
            const exactIndex = headers.findIndex(h => 
              h && h.toString().toLowerCase().trim() === name.toLowerCase().trim()
            );
            if (exactIndex !== -1) {
              console.log(`✅ Найден точный столбец "${name}" в позиции ${exactIndex}: "${headers[exactIndex]}"`);
              return exactIndex;
            }
          }
          
          // Затем ищем частичные совпадения
          for (const name of possibleNames) {
            const partialIndex = headers.findIndex(h => 
              h && h.toString().toLowerCase().includes(name.toLowerCase())
            );
            if (partialIndex !== -1) {
              console.log(`⚠️ Найден частичный столбец "${name}" в позиции ${partialIndex}: "${headers[partialIndex]}"`);
              return partialIndex;
            }
          }
          
          console.log(`❌ Не найден столбец для: ${possibleNames.join(', ')}`);
          return -1;
        };
        
        const columnIndices = {
          id: getColumnIndex(['ID', 'id']),
          uniqueKey: getColumnIndex(['Уникальный ключ', 'Unique Key', 'UniqueKey']),
          positionName: getColumnIndex(['Название позиции', 'Position Name', 'Position', 'Позиция']),
          year: getColumnIndex(['Год', 'Year']),
          month: getColumnIndex(['Месяц', 'Month']),
          quarter: getColumnIndex(['Квартал', 'Quarter']),
          date: getColumnIndex(['Дата', 'Date']),
          // ИСПРАВЛЕННЫЙ поиск полей аналитики - ищем точные названия
          analytics1: getColumnIndex(['Аналитика1', 'Analytics1', 'Аналитика 1']),
          analytics2: getColumnIndex(['Аналитика2', 'Analytics2', 'Аналитика 2']),
          analytics3: getColumnIndex(['Аналитика3', 'Analytics3', 'Аналитика 3']),
          analytics4: getColumnIndex(['Аналитика4', 'Analytics4', 'Аналитика 4']),
          analytics5: getColumnIndex(['Аналитика5', 'Analytics5', 'Аналитика 5']),
          analytics6: getColumnIndex(['Аналитика6', 'Analytics6', 'Аналитика 6']),
          analytics7: getColumnIndex(['Аналитика7', 'Analytics7', 'Аналитика 7']),
          analytics8: getColumnIndex(['Аналитика8', 'Analytics8', 'Аналитика 8']),
          debitAccount: getColumnIndex(['Счет Дт', 'Debit Account', 'Debit']),
          creditAccount: getColumnIndex(['Счет Кт', 'Credit Account', 'Credit']),
          revenue: getColumnIndex(['Выручка', 'Revenue']),
          quantity: getColumnIndex(['Кол-во', 'Quantity', 'Количество']),
          sumWithoutVAT: getColumnIndex(['Сумма без НДС', 'Sum without VAT', 'Сумма без НДС в руб']),
          vatAmount: getColumnIndex(['НДС в руб', 'VAT Amount', 'НДС']),
          workType: getColumnIndex(['Статья работ', 'Work Type']),
          incomeExpenseType: getColumnIndex(['Доходы/Расходы', 'Income/Expense']),
          salaryGoods: getColumnIndex(['Зарплата/Товары', 'Salary/Goods'])
        };
        
        console.log('🔍 Найденные индексы столбцов:', columnIndices);
        
        // Проверяем обязательные поля
        const requiredFields = ['id', 'positionName', 'revenue'];
        const missingFields = requiredFields.filter(field => columnIndices[field as keyof typeof columnIndices] === -1);
        
        if (missingFields.length > 0) {
          throw new Error(`Не найдены обязательные столбцы: ${missingFields.join(', ')}`);
        }
        
        const items: RepairItem[] = [];
        
        rows.forEach((row, index) => {
          try {
            // Пропускаем пустые строки
            if (!row || row.every(cell => !cell && cell !== 0)) {
              return;
            }
            
            const getValue = (colIndex: number, defaultValue: any = '') => {
              if (colIndex === -1) return defaultValue;
              const value = row[colIndex];
              return value !== undefined && value !== null ? value : defaultValue;
            };
            
            const getStringValue = (colIndex: number, defaultValue: string = '') => {
              const value = getValue(colIndex, defaultValue);
              const stringValue = value ? value.toString().trim() : defaultValue;
              
              // Логируем значения аналитики для отладки
              if (colIndex !== -1 && headers[colIndex] && headers[colIndex].toLowerCase().includes('аналитика')) {
                console.log(`📊 ${headers[colIndex]} (столбец ${colIndex}):`, `"${stringValue}"`);
              }
              
              return stringValue;
            };
            
            const getNumberValue = (colIndex: number, defaultValue: number = 0) => {
              const value = getValue(colIndex, defaultValue);
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                // Заменяем запятые на точки для правильного парсинга
                const cleanValue = value.replace(',', '.');
                const parsed = parseFloat(cleanValue);
                return isNaN(parsed) ? defaultValue : parsed;
              }
              return defaultValue;
            };
            
            // Определяем тип доходы/расходы
            let incomeExpenseType: 'Доходы' | 'Расходы' = 'Доходы';
            const incomeExpenseValue = getStringValue(columnIndices.incomeExpenseType);
            if (incomeExpenseValue.toLowerCase().includes('расход')) {
              incomeExpenseType = 'Расходы';
            }
            
            const item: RepairItem = {
              id: getStringValue(columnIndices.id, `item_${index + 1}`),
              uniqueKey: getStringValue(columnIndices.uniqueKey),
              positionName: getStringValue(columnIndices.positionName),
              year: getNumberValue(columnIndices.year, new Date().getFullYear()),
              month: getNumberValue(columnIndices.month, new Date().getMonth() + 1),
              quarter: getStringValue(columnIndices.quarter, 'Q1'),
              date: getStringValue(columnIndices.date, new Date().toISOString().split('T')[0]),
              // ИСПРАВЛЕННОЕ чтение полей аналитики
              analytics1: getStringValue(columnIndices.analytics1),
              analytics2: getStringValue(columnIndices.analytics2),
              analytics3: getStringValue(columnIndices.analytics3),
              analytics4: getStringValue(columnIndices.analytics4),
              analytics5: getStringValue(columnIndices.analytics5),
              analytics6: getStringValue(columnIndices.analytics6),
              analytics7: getStringValue(columnIndices.analytics7),
              analytics8: getStringValue(columnIndices.analytics8),
              debitAccount: getStringValue(columnIndices.debitAccount),
              creditAccount: getStringValue(columnIndices.creditAccount),
              revenue: getNumberValue(columnIndices.revenue),
              quantity: getNumberValue(columnIndices.quantity, 1),
              sumWithoutVAT: getNumberValue(columnIndices.sumWithoutVAT),
              vatAmount: getNumberValue(columnIndices.vatAmount),
              workType: getStringValue(columnIndices.workType),
              incomeExpenseType,
              salaryGoods: getStringValue(columnIndices.salaryGoods)
            };
            
            // Логируем первые несколько элементов для отладки
            if (index < 3) {
              console.log(`📝 Элемент ${index + 1}:`, {
                id: item.id,
                analytics1: item.analytics1,
                analytics2: item.analytics2,
                analytics3: item.analytics3,
                analytics8: item.analytics8
              });
            }
            
            items.push(item);
          } catch (error) {
            console.warn(`Ошибка обработки строки ${index + 2}:`, error);
          }
        });
        
        if (items.length === 0) {
          throw new Error('Не удалось импортировать ни одной записи');
        }
        
        console.log(`✅ Успешно импортировано ${items.length} элементов`);
        console.log('🔍 Пример данных аналитики из первого элемента:', {
          analytics1: items[0]?.analytics1,
          analytics2: items[0]?.analytics2,
          analytics3: items[0]?.analytics3,
          analytics8: items[0]?.analytics8
        });
        
        resolve(items);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };
    
    reader.readAsBinaryString(file);
  });
};