import { RepairItem, Position } from '../types';

export const exportToCSV = (positions: Position[]) => {
  const headers = [
    'ID',
    'Уникальный ключ',
    'Название позиции',
    'Год',
    'Месяц',
    'Квартал',
    'Дата',
    'Аналитика1',
    'Аналитика2', 
    'Аналитика3',
    'Аналитика4',
    'Аналитика5',
    'Аналитика6',
    'Аналитика7',
    'Аналитика8',
    'Счет Дт',
    'Счет Кт',
    'Выручка',
    'Кол-во',
    'Сумма без НДС',
    'НДС в руб',
    'Статья работ',
    'Доходы/Расходы',
    'Зарплата/Товары',
    'Услуга',
    'Номер позиции'
  ];

  // Функция для форматирования чисел с запятой как десятичным разделителем
  const formatNumber = (num: number): string => {
    return num.toString().replace('.', ',');
  };

  // Функция для форматирования даты в читаемый формат
  const formatDate = (dateString: string): string => {
    try {
      // Если дата уже в формате YYYY-MM-DD, конвертируем в DD.MM.YYYY
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}.${month}.${year}`;
      }
      
      // Если дата в формате числа Excel (например, 45637.380543981481)
      if (!isNaN(Number(dateString))) {
        const excelDate = Number(dateString);
        // Excel считает дни с 1 января 1900 года (с поправкой на ошибку в Excel)
        const excelEpoch = new Date(1899, 11, 30); // 30 декабря 1899
        const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
        
        const day = jsDate.getDate().toString().padStart(2, '0');
        const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
        const year = jsDate.getFullYear();
        
        return `${day}.${month}.${year}`;
      }
      
      // Если дата уже в нормальном формате, возвращаем как есть
      return dateString;
    } catch (error) {
      console.warn('Ошибка форматирования даты:', dateString, error);
      return dateString;
    }
  };

  // Функция для безопасного получения значения поля
  const getSafeValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    return value.toString().trim();
  };

  const rows: string[][] = [];
  
  positions.forEach(position => {
    position.items.forEach(item => {
      rows.push([
        getSafeValue(item.id),
        getSafeValue(item.uniqueKey),
        getSafeValue(item.positionName),
        getSafeValue(item.year),
        getSafeValue(item.month),
        getSafeValue(item.quarter),
        formatDate(getSafeValue(item.date)), // Форматируем дату
        getSafeValue(item.analytics1), // Убеждаемся, что поля аналитики экспортируются
        getSafeValue(item.analytics2),
        getSafeValue(item.analytics3),
        getSafeValue(item.analytics4),
        getSafeValue(item.analytics5),
        getSafeValue(item.analytics6),
        getSafeValue(item.analytics7),
        getSafeValue(item.analytics8),
        getSafeValue(item.debitAccount),
        getSafeValue(item.creditAccount),
        formatNumber(item.revenue),
        getSafeValue(item.quantity),
        formatNumber(item.sumWithoutVAT),
        formatNumber(item.vatAmount),
        getSafeValue(item.workType),
        getSafeValue(item.incomeExpenseType),
        getSafeValue(item.salaryGoods),
        getSafeValue(position.service),
        getSafeValue(position.positionNumber)
      ]);
    });
  });

  // Создаем CSV с правильным разделителем и кодировкой
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => {
      // Экранируем кавычки и оборачиваем в кавычки для безопасности
      const escapedField = field.replace(/"/g, '""');
      return `"${escapedField}"`;
    }).join(';'))
    .join('\n');

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const blob = new Blob(['\ufeff' + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `grouped_positions_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Очищаем URL для освобождения памяти
  URL.revokeObjectURL(url);
};