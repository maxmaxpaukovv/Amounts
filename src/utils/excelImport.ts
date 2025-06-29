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
        
        // Находим индексы нужных столбцов
        const getColumnIndex = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const index = headers.findIndex(h => 
              h && h.toString().toLowerCase().includes(name.toLowerCase())
            );
            if (index !== -1) return index;
          }
          return -1;
        };
        
        const columnIndices = {
          id: getColumnIndex(['ID']),
          uniqueKey: getColumnIndex(['Уникальный ключ', 'Unique']),
          positionName: getColumnIndex(['Название позиции', 'Position', 'Позиция']),
          year: getColumnIndex(['Год', 'Year']),
          month: getColumnIndex(['Месяц', 'Month']),
          quarter: getColumnIndex(['Квартал', 'Quarter']),
          date: getColumnIndex(['Дата', 'Date']),
          analytics1: getColumnIndex(['Аналитика1', 'Analytics1']),
          analytics2: getColumnIndex(['Аналитика2', 'Analytics2']),
          analytics3: getColumnIndex(['Аналитика3', 'Analytics3']),
          analytics4: getColumnIndex(['Аналитика4', 'Analytics4']),
          analytics5: getColumnIndex(['Аналитика5', 'Analytics5']),
          analytics6: getColumnIndex(['Аналитика6', 'Analytics6']),
          analytics7: getColumnIndex(['Аналитика7', 'Analytics7']),
          analytics8: getColumnIndex(['Аналитика8', 'Analytics8']),
          debitAccount: getColumnIndex(['Счет Дт', 'Debit']),
          creditAccount: getColumnIndex(['Счет Кт', 'Credit']),
          revenue: getColumnIndex(['Выручка', 'Revenue']),
          quantity: getColumnIndex(['Кол-во', 'Quantity']),
          sumWithoutVAT: getColumnIndex(['Сумма без НДС', 'Sum without VAT']),
          vatAmount: getColumnIndex(['НДС в руб', 'VAT Amount']),
          workType: getColumnIndex(['Статья работ', 'Work Type']),
          incomeExpenseType: getColumnIndex(['Доходы/Расходы', 'Income/Expense']),
          salaryGoods: getColumnIndex(['Зарплата/Товары', 'Salary/Goods']) // Новое поле
        };
        
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
              return colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== null 
                ? row[colIndex] 
                : defaultValue;
            };
            
            const getStringValue = (colIndex: number, defaultValue: string = '') => {
              const value = getValue(colIndex, defaultValue);
              return value ? value.toString().trim() : defaultValue;
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
              salaryGoods: getStringValue(columnIndices.salaryGoods) // Новое поле
            };
            
            items.push(item);
          } catch (error) {
            console.warn(`Ошибка обработки строки ${index + 2}:`, error);
          }
        });
        
        if (items.length === 0) {
          throw new Error('Не удалось импортировать ни одной записи');
        }
        
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