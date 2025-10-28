import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderContextType = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderContextType>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferência do usuário do banco de dados
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user) {
        setTheme(defaultTheme);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .single();

        if (!error && data?.theme_preference) {
          setTheme(data.theme_preference as Theme);
        } else {
          setTheme(defaultTheme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        setTheme(defaultTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [user, defaultTheme]);

  // Aplicar o tema no DOM
  useEffect(() => {
    if (isLoading) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, isLoading]);

  const value = {
    theme,
    setTheme: async (newTheme: Theme) => {
      setTheme(newTheme);
      
      // Salvar no banco de dados se o usuário estiver logado
      if (user) {
        try {
          await supabase
            .from('profiles')
            .update({ theme_preference: newTheme })
            .eq('id', user.id);
        } catch (error) {
          console.error('Error saving theme preference:', error);
        }
      }
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};