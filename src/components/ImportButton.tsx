import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { RepairItem } from '../types';
import { importFromExcel } from '../utils/excelImport';

interface ImportButtonProps {
  onImport: (items: RepairItem[]) => void;
  disabled?: boolean;
}

export const ImportButton: React.FC<ImportButtonProps> = ({ onImport, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      setImportStatus({
        type: 'error',
        message: 'Поддерживаются только файлы Excel (.xlsx, .xls) и CSV'
      });
      return;
    }

    setIsLoading(true);
    setImportStatus({ type: null, message: '' });

    try {
      const importedItems = await importFromExcel(file);
      onImport(importedItems);
      
      setImportStatus({
        type: 'success',
        message: `Успешно импортировано ${importedItems.length} позиций`
      });
      
      // Очищаем статус через 3 секунды
      setTimeout(() => {
        setImportStatus({ type: null, message: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Ошибка импорта файла'
      });
    } finally {
      setIsLoading(false);
      // Очищаем input для возможности повторного выбора того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (disabled || isLoading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={handleButtonClick}
        disabled={disabled || isLoading}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${disabled || isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md active:transform active:scale-95'
          }
        `}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Импорт...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Импорт из Excel</span>
          </>
        )}
      </button>

      {/* Статус импорта */}
      {importStatus.type && (
        <div className={`
          absolute top-full left-0 mt-2 p-3 rounded-lg shadow-lg z-10 min-w-64 max-w-80
          ${importStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
          }
        `}>
          <div className="flex items-start space-x-2">
            {importStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                importStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {importStatus.type === 'success' ? 'Импорт завершен' : 'Ошибка импорта'}
              </p>
              <p className={`text-sm mt-1 ${
                importStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {importStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Подсказка о формате файла */}
      <div className="absolute top-full left-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <FileSpreadsheet className="w-3 h-3" />
            <span>Поддерживаются файлы .xlsx, .xls, .csv</span>
          </div>
        </div>
      </div>
    </div>
  );
};