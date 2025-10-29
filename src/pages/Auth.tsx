import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    setLoading(true);
    
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName, signupData.company);
    
    if (!error) {
      navigate("/dashboard");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex auth-gradient-bg">
      <div className="w-full grid lg:grid-cols-2">
        {/* Left Column - Login Form */}
        <div className="flex items-center justify-center p-8">
          <Card className="w-full max-w-md auth-card">
            <CardHeader className="space-y-4 text-center pb-8">
              <div className="flex justify-center">
                <Logo className="h-10" variant="dark" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre com suas credenciais para acessar o sistema
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
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
                  className="w-full auth-button-green"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Continuar"}
                </Button>
              </form>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Não tem uma conta? </span>
                <Button
                  type="button"
                  variant="link"
                  className="px-1"
                  onClick={() => toast({ description: "Funcionalidade em desenvolvimento" })}
                >
                  Cadastre-se
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Testimonials */}
        <div className="hidden lg:flex bg-white/10 backdrop-blur-sm">
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