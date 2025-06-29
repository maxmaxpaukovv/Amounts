/*
  # Создание справочника сотрудников

  1. Новые таблицы
    - `employees`
      - `id` (uuid, primary key)
      - `name` (text) - Название должности (слесарь, токарь, обмотчик)
      - `hourly_rate` (decimal) - Ставка оплаты труда за 1 час
      - `description` (text) - Описание должности
      - `is_active` (boolean) - Активна ли должность
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Безопасность
    - Включить RLS для таблицы `employees`
    - Добавить политики для чтения данных
*/

-- Создаем таблицу сотрудников
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  hourly_rate decimal(10,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Включаем RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных (доступно всем)
CREATE POLICY "Anyone can read employees"
  ON employees
  FOR SELECT
  USING (true);

-- Политика для вставки данных (доступно всем для демо)
CREATE POLICY "Anyone can insert employees"
  ON employees
  FOR INSERT
  WITH CHECK (true);

-- Политика для обновления данных (доступно всем для демо)
CREATE POLICY "Anyone can update employees"
  ON employees
  FOR UPDATE
  USING (true);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставляем начальные данные
INSERT INTO employees (name, hourly_rate, description) VALUES
  ('Слесарь', 300.00, 'Слесарные работы по ремонту электродвигателей'),
  ('Токарь', 350.00, 'Токарные работы по обработке деталей'),
  ('Обмотчик', 400.00, 'Перемотка обмоток электродвигателей'),
  ('Электрик', 320.00, 'Электромонтажные работы'),
  ('Сварщик', 380.00, 'Сварочные работы по ремонту корпусов'),
  ('Балансировщик', 360.00, 'Балансировка роторов электродвигателей')
ON CONFLICT (name) DO NOTHING;