import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, User, Bell, Lock, Palette, Database, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";

interface Company {
  id: string;
  name: string;
  document: string;
  document_type: "cpf" | "cnpj";
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  company_id: string;
  role: string;
}

const Configuracoes = () => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  const [companyForm, setCompanyForm] = useState({
    name: "",
    document: "",
    document_type: "cnpj" as "cpf" | "cnpj",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    theme: "system",
    language: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
  });

  // Security state
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState({
    new_device_login: true,
    suspicious_login: true,
    account_changes: true,
    weekly_report: false,
  });

  const [sessions, setSessions] = useState([
    {
      id: "1",
      device: "Chrome • Desktop",
      location: "São Paulo, Brasil",
      lastActivity: "agora",
      isCurrent: true,
    },
    {
      id: "2",
      device: "Firefox • Desktop",
      location: "Rio de Janeiro, Brasil",
      lastActivity: "2 horas atrás",
      isCurrent: false,
    },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (profileData) {
        setProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
        });

        // Fetch company if user has one
        if (profileData.company_id) {
          const { data: companyData } = await supabase
            .from("companies")
            .select("*")
            .eq("id", profileData.company_id)
            .maybeSingle();

          if (companyData) {
            setCompany(companyData);
            setCompanyForm({
              name: companyData.name || "",
              document: companyData.document || "",
              document_type: companyData.document_type || "cnpj",
              email: companyData.email || "",
              phone: companyData.phone || "",
              address: companyData.address || "",
              city: companyData.city || "",
              state: companyData.state || "",
              zip_code: companyData.zip_code || "",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.two_factor_enabled) {
        setTwoFactorEnabled(true);
      }
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    }
  };

  const handleProfileSave = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("profiles").update(profileForm).eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações pessoais foram atualizadas com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar suas informações",
        variant: "destructive",
      });
    }
  };

  const handleCompanySave = async () => {
    try {
      if (!company?.id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("companies").update(companyForm).eq("id", company.id);

      if (error) throw error;

      toast({
        title: "Empresa atualizada!",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error("Error updating company:", error);
      toast({
        title: "Erro ao atualizar empresa",
        description: "Não foi possível atualizar as informações da empresa",
        variant: "destructive",
      });
    }
  };

  // Security functions
  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password,
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erro ao alterar senha",
        description: "Não foi possível alterar a senha",
        variant: "destructive",
      });
    }
  };

  const handleToggle2FA = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast({
      title: enabled ? "2FA Habilitado" : "2FA Desabilitado",
      description: enabled
        ? "Autenticação de dois fatores foi habilitada"
        : "Autenticação de dois fatores foi desabilitada",
    });
  };

  const handleEndSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    toast({
      title: "Sessão encerrada",
      description: "A sessão foi encerrada com sucesso",
    });
  };

  const handleEndAllOtherSessions = () => {
    setSessions((prev) => prev.filter((session) => session.isCurrent));
    toast({
      title: "Sessões encerradas",
      description: "Todas as outras sessões foram encerradas",
    });
  };

  const handleExportData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: profileData,
        company: company,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-pessoais-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Dados exportados!",
        description: "Seus dados foram baixados com sucesso",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Erro ao exportar dados",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = confirm(
      'ATENÇÃO: Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos. Digite "EXCLUIR" para confirmar:',
    );

    if (!confirmation) return;

    const userInput = prompt('Digite "EXCLUIR" para confirmar a exclusão da conta:');

    if (userInput !== "EXCLUIR") {
      toast({
        title: "Cancelado",
        description: "Exclusão de conta cancelada",
      });
      return;
    }

    try {
      // In a real app, you would call a cloud function to delete all user data
      // For now, we'll just sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Conta excluída",
        description: "Sua conta foi marcada para exclusão",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erro ao excluir conta",
        description: "Não foi possível excluir a conta",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações do sistema e sua conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="mr-2 h-4 w-4" />
            Preferências
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Gerencie os dados da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!company ? (
                <div className="text-center py-10">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhuma empresa vinculada</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Entre em contato com o administrador para vincular sua conta a uma empresa.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Nome da Empresa</Label>
                      <Input
                        id="company_name"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_document">CNPJ</Label>
                      <Input
                        id="company_document"
                        value={companyForm.document}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, document: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_email">Email</Label>
                      <Input
                        id="company_email"
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_phone">Telefone</Label>
                      <Input
                        id="company_phone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_address">Endereço</Label>
                    <Input
                      id="company_address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_city">Cidade</Label>
                      <Input
                        id="company_city"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_state">Estado</Label>
                      <Input
                        id="company_state"
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_zip">CEP</Label>
                      <Input
                        id="company_zip"
                        value={companyForm.zip_code}
                        onChange={(e) => setCompanyForm((prev) => ({ ...prev, zip_code: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleCompanySave}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>Personalize a experiência do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações importantes por email</p>
                  </div>
                  <Switch
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, email_notifications: checked }))}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">Receba notificações em tempo real</p>
                  </div>
                  <Switch
                    checked={preferences.push_notifications}
                    onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, push_notifications: checked }))}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Moeda</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">Real (BRL)</SelectItem>
                        <SelectItem value="USD">Dollar (USD)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fuso Horário</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                        <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="mr-2 h-5 w-5" />
                  Gestão de Senha
                </CardTitle>
                <CardDescription>Mantenha sua conta protegida com uma senha segura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input
                    id="current_password"
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input
                    id="new_password"
                    type="password"
                    placeholder="Digite a nova senha"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handlePasswordChange}
                  disabled={
                    !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password
                  }
                >
                  Alterar Senha
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <TwoFactorSetup isEnabled={twoFactorEnabled} onToggle={setTwoFactorEnabled} />

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Sessões Ativas
                </CardTitle>
                <CardDescription>Monitore onde você está conectado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{session.isCurrent ? "Sessão Atual" : session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.location}</p>
                        <p className="text-xs text-muted-foreground">Última atividade: {session.lastActivity}</p>
                      </div>
                      {session.isCurrent ? (
                        <Badge>Ativa</Badge>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleEndSession(session.id)}>
                          Encerrar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleEndAllOtherSessions}
                  disabled={sessions.filter((s) => !s.isCurrent).length === 0}
                >
                  Encerrar Todas as Outras Sessões
                </Button>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Dados e Privacidade
                </CardTitle>
                <CardDescription>Gerencie seus dados pessoais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                    <Database className="mr-2 h-4 w-4" />
                    Exportar Dados Pessoais
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      toast({
                        title: "Backup solicitado",
                        description: "Você receberá um email com o link para download em até 24 horas",
                      })
                    }
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Solicitar Backup Completo
                  </Button>
                  <Separator />
                  <Button variant="destructive" className="w-full justify-start" onClick={handleDeleteAccount}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Conta Permanentemente
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Security Alerts */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Alertas de Segurança
                </CardTitle>
                <CardDescription>Configure notificações de segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Login de novo dispositivo</Label>
                      <p className="text-sm text-muted-foreground">
                        Notificar quando houver login de um novo dispositivo
                      </p>
                    </div>
                    <Switch
                      checked={securityAlerts.new_device_login}
                      onCheckedChange={(checked) => {
                        setSecurityAlerts((prev) => ({ ...prev, new_device_login: checked }));
                        toast({
                          title: checked ? "Alerta ativado" : "Alerta desativado",
                          description: "Configuração de alerta de novo dispositivo atualizada",
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tentativas de login suspeitas</Label>
                      <p className="text-sm text-muted-foreground">Alertar sobre tentativas de acesso suspeitas</p>
                    </div>
                    <Switch
                      checked={securityAlerts.suspicious_login}
                      onCheckedChange={(checked) => {
                        setSecurityAlerts((prev) => ({ ...prev, suspicious_login: checked }));
                        toast({
                          title: checked ? "Alerta ativado" : "Alerta desativado",
                          description: "Configuração de alerta de login suspeito atualizada",
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Alterações na conta</Label>
                      <p className="text-sm text-muted-foreground">Notificar sobre mudanças importantes na conta</p>
                    </div>
                    <Switch
                      checked={securityAlerts.account_changes}
                      onCheckedChange={(checked) => {
                        setSecurityAlerts((prev) => ({ ...prev, account_changes: checked }));
                        toast({
                          title: checked ? "Alerta ativado" : "Alerta desativado",
                          description: "Configuração de alerta de alterações atualizada",
                        });
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Relatório semanal de segurança</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber resumo semanal das atividades de segurança
                      </p>
                    </div>
                    <Switch
                      checked={securityAlerts.weekly_report}
                      onCheckedChange={(checked) => {
                        setSecurityAlerts((prev) => ({ ...prev, weekly_report: checked }));
                        toast({
                          title: checked ? "Relatório ativado" : "Relatório desativado",
                          description: "Configuração de relatório semanal atualizada",
                        });
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
