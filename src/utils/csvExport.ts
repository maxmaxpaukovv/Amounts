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
    'Услуга',
    'Номер позиции',
    'Цена'
  ];

  // Функция для форматирования чисел с запятой как десятичным разделителем
  const formatNumber = (num: number): string => {
    return num.toString().replace('.', ',');
  };

  const rows: string[][] = [];
  
  positions.forEach(position => {
    position.items.forEach(item => {
      rows.push([
        item.id,
        item.uniqueKey,
        item.positionName,
        item.year.toString(),
        item.month.toString(),
        item.quarter,
        item.date,
        item.analytics1,
        item.analytics2,
        item.analytics3,
        item.analytics4,
        item.analytics5,
        item.analytics6,
        item.analytics7,
        item.analytics8,
        item.debitAccount,
        item.creditAccount,
        formatNumber(item.revenue),
        item.quantity.toString(),
        formatNumber(item.sumWithoutVAT),
        formatNumber(item.vatAmount),
        item.workType,
        item.incomeExpenseType, // Добавляем новое поле в экспорт
        position.service,
        position.positionNumber.toString(),
        formatNumber(item.revenue)
      ]);
    });
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `grouped_positions_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};