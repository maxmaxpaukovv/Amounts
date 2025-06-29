import { useState, useEffect } from 'react';
import { Employee } from '../types';
import { supabase } from '../utils/supabaseClient';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setEmployees(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding employee:', err);
      throw err;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp));
      return data;
    } catch (err) {
      console.error('Error updating employee:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    addEmployee,
    updateEmployee
  };
};