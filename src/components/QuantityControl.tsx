import React, { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';

interface QuantityControlProps {
  currentQuantity: number;
  maxQuantity: number;
  onQuantityChange: (newQuantity: number) => void;
  disabled?: boolean;
}

export const QuantityControl: React.FC<QuantityControlProps> = ({
  currentQuantity,
  maxQuantity,
  onQuantityChange,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(currentQuantity.toString());

  useEffect(() => {
    setInputValue(currentQuantity.toString());
  }, [currentQuantity]);

  const handleDecrease = () => {
    if (currentQuantity > 1) {
      onQuantityChange(currentQuantity - 1);
    }
  };

  const handleIncrease = () => {
    if (currentQuantity < maxQuantity) {
      onQuantityChange(currentQuantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Проверяем, что введено число
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= maxQuantity) {
      onQuantityChange(numValue);
    }
  };

  const handleInputBlur = () => {
    // При потере фокуса корректируем значение
    const numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < 1) {
      setInputValue('1');
      onQuantityChange(1);
    } else if (numValue > maxQuantity) {
      setInputValue(maxQuantity.toString());
      onQuantityChange(maxQuantity);
    } else {
      setInputValue(numValue.toString());
      onQuantityChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  return (
    <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
      <button
        onClick={handleDecrease}
        disabled={disabled || currentQuantity <= 1}
        className={`
          p-1 rounded transition-colors
          ${disabled || currentQuantity <= 1
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-red-600 hover:bg-red-50 hover:text-red-700'
          }
        `}
        title="Уменьшить количество"
      >
        <Minus className="w-3 h-3" />
      </button>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-8 text-center text-xs font-medium bg-transparent border-none outline-none
          ${disabled ? 'text-gray-400' : 'text-gray-700'}
        `}
        title={`Количество (макс. ${maxQuantity})`}
      />
      
      <button
        onClick={handleIncrease}
        disabled={disabled || currentQuantity >= maxQuantity}
        className={`
          p-1 rounded transition-colors
          ${disabled || currentQuantity >= maxQuantity
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-green-600 hover:bg-green-50 hover:text-green-700'
          }
        `}
        title="Увеличить количество"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};