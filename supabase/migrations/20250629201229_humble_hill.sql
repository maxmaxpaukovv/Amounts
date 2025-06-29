/*
  # Создание справочника проводов

  1. Новые таблицы
    - `wires`
      - `id` (uuid, primary key)
      - `brand` (text) - марка провода
      - `cross_section` (decimal) - сечение провода в мм²
      - `insulation_type` (text) - тип изоляции
      - `voltage_rating` (integer) - номинальное напряжение в В
      - `price_per_meter` (decimal) - цена за метр
      - `description` (text) - описание
      - `is_active` (boolean) - активен ли провод
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `wires`
    - Добавить политики для чтения, вставки и обновления
*/

-- Создаем таблицу проводов
CREATE TABLE IF NOT EXISTS wires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  cross_section decimal(8,2) NOT NULL,
  insulation_type text DEFAULT '',
  voltage_rating integer DEFAULT 0,
  price_per_meter decimal(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Создаем уникальный индекс для комбинации марки, сечения и типа изоляции
CREATE UNIQUE INDEX IF NOT EXISTS wires_brand_section_insulation_key 
  ON wires (brand, cross_section, insulation_type) 
  WHERE is_active = true;

-- Включаем RLS
ALTER TABLE wires ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных (доступно всем)
CREATE POLICY "Anyone can read wires"
  ON wires
  FOR SELECT
  USING (true);

-- Политика для вставки данных (доступно всем для демо)
CREATE POLICY "Anyone can insert wires"
  ON wires
  FOR INSERT
  WITH CHECK (true);

-- Политика для обновления данных (доступно всем для демо)
CREATE POLICY "Anyone can update wires"
  ON wires
  FOR UPDATE
  USING (true);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_wires_updated_at
  BEFORE UPDATE ON wires
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставляем начальные данные проводов
INSERT INTO wires (brand, cross_section, insulation_type, voltage_rating, price_per_meter, description) VALUES
  ('ПВ-1', 0.75, 'ПВХ', 660, 45.50, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  ('ПВ-1', 1.0, 'ПВХ', 660, 52.30, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  ('ПВ-1', 1.5, 'ПВХ', 660, 68.90, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  ('ПВ-1', 2.5, 'ПВХ', 660, 89.40, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  ('ПВ-1', 4.0, 'ПВХ', 660, 125.60, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  ('ПВ-1', 6.0, 'ПВХ', 660, 178.20, 'Провод с ПВХ изоляцией для внутренних электроустановок'),
  
  ('ПВ-3', 0.75, 'ПВХ', 660, 48.70, 'Гибкий провод с ПВХ изоляцией'),
  ('ПВ-3', 1.0, 'ПВХ', 660, 56.80, 'Гибкий провод с ПВХ изоляцией'),
  ('ПВ-3', 1.5, 'ПВХ', 660, 74.30, 'Гибкий провод с ПВХ изоляцией'),
  ('ПВ-3', 2.5, 'ПВХ', 660, 96.20, 'Гибкий провод с ПВХ изоляцией'),
  ('ПВ-3', 4.0, 'ПВХ', 660, 134.50, 'Гибкий провод с ПВХ изоляцией'),
  
  ('ПУГНП', 2.5, 'ПВХ', 250, 78.90, 'Провод универсальный гибкий плоский'),
  ('ПУГНП', 1.5, 'ПВХ', 250, 65.40, 'Провод универсальный гибкий плоский'),
  ('ПУГНП', 1.0, 'ПВХ', 250, 54.20, 'Провод универсальный гибкий плоский'),
  
  ('ВВГ', 1.5, 'ПВХ', 660, 72.10, 'Кабель силовой с ПВХ изоляцией'),
  ('ВВГ', 2.5, 'ПВХ', 660, 94.80, 'Кабель силовой с ПВХ изоляцией'),
  ('ВВГ', 4.0, 'ПВХ', 660, 142.30, 'Кабель силовой с ПВХ изоляцией'),
  ('ВВГ', 6.0, 'ПВХ', 660, 198.70, 'Кабель силовой с ПВХ изоляцией'),
  
  ('ШВВП', 0.75, 'ПВХ', 380, 42.60, 'Шнур соединительный с ПВХ изоляцией'),
  ('ШВВП', 1.0, 'ПВХ', 380, 49.80, 'Шнур соединительный с ПВХ изоляцией'),
  ('ШВВП', 1.5, 'ПВХ', 380, 63.50, 'Шнур соединительный с ПВХ изоляцией')
ON CONFLICT DO NOTHING;