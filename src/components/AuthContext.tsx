import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import * as OTPAuth from 'otpauth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; requiresTwoFactor?: boolean; tempSession?: any }>;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  verifyTwoFactor: (code: string, tempSession: any) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const verifyTOTP = (token: string, secret: string) => {
    const totp = new OTPAuth.TOTP({
      issuer: 'NexERP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Verificar se o usuário tem 2FA ativado
      if (data.user?.user_metadata?.two_factor_enabled) {
        // Não fazer logout, apenas retornar indicador de 2FA necessário
        return {
          error: null,
          requiresTwoFactor: true,
          tempSession: { email, password, user: data.user }
        };
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao NexERP",
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const verifyTwoFactor = async (code: string, tempSession: any) => {
    try {
      // Verificar o código TOTP
      const secret = tempSession.user?.user_metadata?.totp_secret;
      if (!secret || !verifyTOTP(code, secret)) {
        toast({
          title: "Código inválido",
          description: "Verifique o código e tente novamente",
          variant: "destructive",
        });
        return { error: new Error('Código inválido') };
      }

      // Fazer login novamente se o código estiver correto
      const { error } = await supabase.auth.signInWithPassword({
        email: tempSession.email,
        password: tempSession.password,
      });

      if (error) {
        return { error };
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao NexERP",
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName?: string) => {
    try {
      const redirectUrl = import.meta.env.VITE_GOTRUE_SITE_URL || "";

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company_name: companyName || 'Minha Empresa'
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Verifique seu email para confirmar a conta",
        });
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado com sucesso!",
        description: "Até logo!",
      });
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    verifyTwoFactor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};