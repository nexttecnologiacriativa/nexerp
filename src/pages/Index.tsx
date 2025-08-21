import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, DollarSign, FileText, BarChart3, Shield } from "lucide-react";
import Logo from "@/components/Logo";
const Index = () => {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="layout-premium">
      {/* Header */}
      <header className="border-b border-border bg-background backdrop-blur-sm sticky top-0 z-50 dark:bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-8" />
            
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button variant="premium" onClick={() => navigate("/auth")}>
              Começar Grátis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center space-y-8">
          <Badge variant="outline" className="bg-primary/10">
            Sistema ERP Moderno
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground max-w-4xl mx-auto">
            Gerencie sua empresa com
            <span className="text-gradient"> NexERP</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sistema ERP completo para pequenas e médias empresas. Gestão financeira, 
            fiscal e administrativa em uma plataforma moderna e intuitiva.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="premium" size="lg" onClick={() => navigate("/auth")}>
              Teste Grátis por 30 dias
            </Button>
            <Button variant="outline" size="lg">
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Tudo que sua empresa precisa
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Funcionalidades completas para gerenciar todos os aspectos do seu negócio
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-premium">
              <CardHeader>
                <DollarSign className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Gestão Financeira</CardTitle>
                <CardDescription>
                  Controle completo de contas a pagar e receber, fluxo de caixa e relatórios financeiros
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Gestão de Clientes</CardTitle>
                <CardDescription>
                  Cadastro completo de clientes, histórico de vendas e relacionamento
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Notas Fiscais</CardTitle>
                <CardDescription>
                  Emissão de NFe, controle fiscal e integração com a Receita Federal
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Relatórios</CardTitle>
                <CardDescription>
                  Dashboard completo com indicadores de performance e relatórios gerenciais
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <Building2 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Multi-empresa</CardTitle>
                <CardDescription>
                  Gerencie múltiplas empresas em uma única plataforma com isolamento total dos dados
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="card-premium">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Controle de usuários, permissões e backup automático de todos os dados
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Pronto para começar?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já usam o NexERP para gerenciar seus negócios
          </p>
          <Button variant="premium" size="lg" onClick={() => navigate("/auth")}>
            Criar Conta Grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 NexERP. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>;
};
export default Index;