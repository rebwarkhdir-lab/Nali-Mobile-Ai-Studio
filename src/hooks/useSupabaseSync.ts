import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseSync<T>(key: string, initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const hasLoadedRef = useRef(false);
  const useLocalStorageFallback = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();

        if (error) {
          console.warn(`Supabase sync unavailable for ${key}. Falling back to local storage.`);
          useLocalStorageFallback.current = true;
          
          // Fallback to local storage
          const saved = localStorage.getItem(key);
          if (saved && isMounted) {
            setData(JSON.parse(saved));
          } else if (isMounted) {
            setData(initialData);
          }
        } else if (dbData && dbData.value) {
          if (isMounted) setData(dbData.value as unknown as T);
        } else {
          // No data found in Supabase
          const saved = localStorage.getItem(key);
          if (saved && isMounted) {
             setData(JSON.parse(saved)); // Migrate local to state
          } else if (isMounted) {
            setData(initialData);
          }
        }
      } catch (err) {
        console.warn(`Failed to load ${key} from Supabase. Falling back to local storage.`);
        useLocalStorageFallback.current = true;
        if (isMounted) setIsError(true);
        
        const saved = localStorage.getItem(key);
        if (saved && isMounted) {
          setData(JSON.parse(saved));
        } else if (isMounted) {
          setData(initialData);
        }
      } finally {
        if (isMounted) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    fetchData();
    
    
    // Set up Realtime subscription
    const channel = supabase
      .channel(`public:settings:key=eq.${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: `key=eq.${key}`
        },
        (payload) => {
          if (isMounted && payload.new && (payload.new as any).value) {
            setData((payload.new as any).value);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [key]);

  const updateData = async (newData: T | ((prev: T) => T)) => {
    const resolvedData = typeof newData === 'function' ? (newData as Function)(data) : newData;
    setData(resolvedData);
    
    if (hasLoadedRef.current) {
      if (useLocalStorageFallback.current) {
         localStorage.setItem(key, JSON.stringify(resolvedData));
         return;
      }

      try {
        const { error } = await supabase
          .from('settings')
          .upsert({ key, value: resolvedData as any }, { onConflict: 'key' });
          
        if (error) {
          console.warn(`Error saving ${key} to Supabase. Falling back to local storage.`);
          // Fallback if upsert fails
          useLocalStorageFallback.current = true;
          localStorage.setItem(key, JSON.stringify(resolvedData));
        }
      } catch (err) {
        console.warn(`Failed to save ${key} to Supabase. Falling back to local storage.`);
        useLocalStorageFallback.current = true;
        localStorage.setItem(key, JSON.stringify(resolvedData));
      }
    }
  };

  return { data, updateData, isLoading, isError };
}
