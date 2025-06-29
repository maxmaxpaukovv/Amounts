import { useState, useEffect } from 'react';
import { Wire } from '../types';
import { supabase } from '../utils/supabaseClient';

export const useWires = () => {
  const [wires, setWires] = useState<Wire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWires = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('wires')
        .select('*')
        .eq('is_active', true)
        .order('brand')
        .order('cross_section');

      if (fetchError) {
        throw fetchError;
      }

      setWires(data || []);
    } catch (err) {
      console.error('Error fetching wires:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки проводов');
    } finally {
      setLoading(false);
    }
  };

  const addWire = async (wire: Omit<Wire, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('wires')
        .insert([wire])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setWires(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error adding wire:', err);
      throw err;
    }
  };

  const updateWire = async (id: string, updates: Partial<Wire>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('wires')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setWires(prev => prev.map(wire => wire.id === id ? data : wire));
      return data;
    } catch (err) {
      console.error('Error updating wire:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchWires();
  }, []);

  return {
    wires,
    loading,
    error,
    fetchWires,
    addWire,
    updateWire
  };
};