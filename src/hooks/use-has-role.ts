import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'company_admin' | 'manager' | 'user';

export const useHasRole = (role: AppRole) => {
  const [hasRole, setHasRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setHasRole(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', role)
          .maybeSingle();
        
        setHasRole(!!data && !error);
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRole(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkRole();
  }, [role]);

  return { hasRole, loading };
};
