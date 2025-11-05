import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";
import { TwoFactorDialog } from "@/components/TwoFactorDialog";
import TestimonialCarousel from "@/components/TestimonialCarousel";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, verifyTwoFactor } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempSession, setTempSession] = useState<any>(null);
  
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    company: ""
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) return;

    setLoading(true);
    try {
      const result = await signIn(loginData.email, loginData.password);
      
      if (result.requiresTwoFactor) {
        setTempSession(result.tempSession);
        setShowTwoFactor(true);
      } else if (!result.error) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorVerify = async (code: string) => {
    if (!tempSession) return false;

    try {
      const result = await verifyTwoFactor(code, tempSession);
      if (!result.error) {
        setShowTwoFactor(false);
        setTempSession(null);
        navigate("/dashboard");
        return true;
      }
      return false;
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setTempSession(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.fullName || !signupData.email || !signupData.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await signUp(
        signupData.email, 
        signupData.password, 
        signupData.fullName, 
        signupData.company || 'Minha Empresa'
      );
      
      if (error) {
        // Error is already shown by AuthContext
        console.error('Signup error:', error);
      } else {
        // Clear form
        setSignupData({
          fullName: "",
          email: "",
          password: "",
          company: ""
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex auth-gradient-bg">
      <div className="w-full grid lg:grid-cols-2">
        {/* Left Column - Auth Forms */}
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md auth-card">
            <CardHeader className="space-y-4 text-center pb-8">
              <div className="flex justify-center">
                <Logo className="h-10" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Bem-vindo ao NexERP</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Sistema completo de gestão empresarial
                </p>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 text-sm"
                        onClick={() => toast({ description: "Funcionalidade em desenvolvimento" })}
                      >
                        Esqueceu sua senha?
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome Completo *</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-company">Nome da Empresa</Label>
                      <Input
                        id="signup-company"
                        type="text"
                        placeholder="Nome da sua empresa"
                        value={signupData.company}
                        onChange={(e) => setSignupData({ ...signupData, company: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                          disabled={loading}
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                    </div>

                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Cadastrando..." : "Criar Conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Testimonials */}
        <div className="hidden lg:flex bg-primary/95">
          <TestimonialCarousel />
        </div>
      </div>

      {/* Two Factor Dialog */}
      <TwoFactorDialog
        isOpen={showTwoFactor}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
        loading={loading}
      />
    </div>
  );
};

export default Auth;