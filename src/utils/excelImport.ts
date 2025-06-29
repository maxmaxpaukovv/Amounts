import * as XLSX from 'xlsx';
import { RepairItem } from '../types';

export const importFromExcel = (file: File): Promise<RepairItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Конвертируем в JSON без заголовков (массив массивов)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          throw new Error('Файл должен содержать заголовки и данные');
        }
        
        // Пропускаем первую строку (заголовки) и обрабатываем данные
        const rows = jsonData.slice(1) as any[][];
        
        // Маппинг по индексам столбцов для новой структуры
        // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12, N=13, O=14, P=15, Q=16, R=17, S=18, T=19, U=20, V=21, W=22
        const columnMapping = {
          id: 0,              // A - ID
          uniqueKey: 1,       // B - Уникальный ключ
          positionName: 2,    // C - Название позиции
          year: 3,            // D - Год
          month: 4,           // E - Месяц
          quarter: 5,         // F - Квартал
          date: 6,            // G - Дата
          analytics1: 7,      // H - Аналитика1
          analytics2: 8,      // I - Аналитика2
          analytics3: 9,      // J - Аналитика3
          analytics4: 10,     // K - Аналитика4
          analytics5: 11,     // L - Аналитика5
          analytics6: 12,     // M - Аналитика6
          analytics7: 13,     // N - Аналитика7
          analytics8: 14,     // O - Аналитика8
          debitAccount: 15,   // P - Счет Дт
          creditAccount: 16,  // Q - Счет Кт
          revenue: 17,        // R - Выручка
          quantity: 18,       // S - Кол-во
          sumWithoutVAT: 19,  // T - Сумма без НДС
          vatAmount: 20,      // U - НДС в руб
          workType: 21,       // V - Статья работ
          incomeExpenseType: 22 // W - Доходы/Расходы
        };
        
        // Конвертируем данные
        const repairItems: RepairItem[] = rows
          .filter(row => row && row.length > 0 && row[columnMapping.id]) // Фильтруем пустые строки
          .map((row, index) => {
            try {
              // Обработка даты
              let dateValue = row[columnMapping.date];
              if (typeof dateValue === 'number') {
                // Excel serial date
                const excelDate = new Date((dateValue - 25569) * 86400 * 1000);
                dateValue = excelDate.toLocaleDateString('ru-RU');
              } else if (dateValue instanceof Date) {
                dateValue = dateValue.toLocaleDateString('ru-RU');
              } else {
                dateValue = String(dateValue || '');
              }
              
              // Обработка числовых значений
              const parseNumber = (value: any, defaultValue: number = 0): number => {
                if (typeof value === 'number') return value;
                const parsed = parseFloat(String(value || defaultValue).replace(/[^\d.-]/g, ''));
                return isNaN(parsed) ? defaultValue : parsed;
              };
              
              const parseInteger = (value: any, defaultValue: number = 0): number => {
                if (typeof value === 'number') return Math.round(value);
                const parsed = parseInt(String(value || defaultValue));
                return isNaN(parsed) ? defaultValue : parsed;
              };

              // Обработка типа доходы/расходы
              const incomeExpenseValue = String(row[columnMapping.incomeExpenseType] || 'Доходы').trim();
              const incomeExpenseType: 'Доходы' | 'Расходы' = 
                incomeExpenseValue === 'Расходы' ? 'Расходы' : 'Доходы';
              
              return {
                id: String(row[columnMapping.id] || `imported-${Date.now()}-${index}`),
                uniqueKey: String(row[columnMapping.uniqueKey] || ''),
                positionName: String(row[columnMapping.positionName] || ''),
                year: parseInteger(row[columnMapping.year], new Date().getFullYear()),
                month: parseInteger(row[columnMapping.month], 1),
                quarter: String(row[columnMapping.quarter] || ''),
                date: dateValue,
                analytics1: String(row[columnMapping.analytics1] || ''),
                analytics2: String(row[columnMapping.analytics2] || ''),
                analytics3: String(row[columnMapping.analytics3] || ''),
                analytics4: String(row[columnMapping.analytics4] || ''),
                analytics5: String(row[columnMapping.analytics5] || ''),
                analytics6: String(row[columnMapping.analytics6] || ''),
                analytics7: String(row[columnMapping.analytics7] || ''),
                analytics8: String(row[columnMapping.analytics8] || ''),
                debitAccount: String(row[columnMapping.debitAccount] || ''),
                creditAccount: String(row[columnMapping.creditAccount] || ''),
                revenue: parseNumber(row[columnMapping.revenue]),
                quantity: parseInteger(row[columnMapping.quantity], 1),
                sumWithoutVAT: parseNumber(row[columnMapping.sumWithoutVAT]),
                vatAmount: parseNumber(row[columnMapping.vatAmount]),
                workType: String(row[columnMapping.workType] || '').trim(),
                incomeExpenseType // Новое поле
              };
            } catch (error) {
              console.warn(`Ошибка обработки строки ${index + 2}:`, error);
              return null;
            }
          })
          .filter((item): item is RepairItem => item !== null);
        
        if (repairItems.length === 0) {
          throw new Error('Не удалось импортировать данные. Проверьте формат файла.');
        }
        
        resolve(repairItems);
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