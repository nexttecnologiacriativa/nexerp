import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, User, Bell, Lock, Palette, Database, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Company {
  id: string;
  name: string;
  document: string;
  document_type: string;
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
  email: string;
  phone: string;
}

const Configuracoes = () => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  const [companyForm, setCompanyForm] = useState({
    name: '',
    document: '',
    document_type: 'cnpj' as 'cpf' | 'cnpj' | 'passport',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: ''
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: false,
    theme: 'system',
    language: 'pt-BR',
    currency: 'BRL',
    timezone: 'America/Sao_Paulo'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone || ''
        });

        // Fetch company if user has one
        if (profileData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', profileData.company_id)
            .maybeSingle();

          if (companyData) {
            setCompany(companyData);
            setCompanyForm({
              name: companyData.name || '',
              document: companyData.document || '',
              document_type: companyData.document_type || 'cnpj',
              email: companyData.email || '',
              phone: companyData.phone || '',
              address: companyData.address || '',
              city: companyData.city || '',
              state: companyData.state || '',
              zip_code: companyData.zip_code || ''
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
  }, []);

  const handleProfileSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update(profileForm)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações pessoais foram atualizadas com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error updating profile:', error);
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

      const { error } = await supabase
        .from('companies')
        .update(companyForm)
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: "Empresa atualizada!",
        description: "As informações da empresa foram atualizadas com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Erro ao atualizar empresa",
        description: "Não foi possível atualizar as informações da empresa",
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
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
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
              <CardDescription>
                Gerencie os dados da sua empresa
              </CardDescription>
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
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_document">CNPJ</Label>
                      <Input
                        id="company_document"
                        value={companyForm.document}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, document: e.target.value }))}
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
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_phone">Telefone</Label>
                      <Input
                        id="company_phone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_address">Endereço</Label>
                    <Input
                      id="company_address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_city">Cidade</Label>
                      <Input
                        id="company_city"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_state">Estado</Label>
                      <Input
                        id="company_state"
                        value={companyForm.state}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_zip">CEP</Label>
                      <Input
                        id="company_zip"
                        value={companyForm.zip_code}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, zip_code: e.target.value }))}
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
              <CardDescription>
                Personalize a experiência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações importantes por email
                    </p>
                  </div>
                  <Switch
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, email_notifications: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações em tempo real
                    </p>
                  </div>
                  <Switch
                    checked={preferences.push_notifications}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, push_notifications: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tema</Label>
                    <Select value={preferences.theme} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, theme: value }))
                    }>
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
                    <Select value={preferences.language} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, language: value }))
                    }>
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
                    <Select value={preferences.currency} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, currency: value }))
                    }>
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
                    <Select value={preferences.timezone} onValueChange={(value) => 
                      setPreferences(prev => ({ ...prev, timezone: value }))
                    }>
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
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Alterar Senha</h4>
                  <p className="text-sm text-muted-foreground">
                    Mantenha sua conta segura com uma senha forte
                  </p>
                  <Button variant="outline" className="mt-2">
                    Alterar Senha
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium">Autenticação de Dois Fatores</h4>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança à sua conta
                  </p>
                  <Button variant="outline" className="mt-2">
                    Configurar 2FA
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium">Sessões Ativas</h4>
                  <p className="text-sm text-muted-foreground">
                    Gerencie onde você está logado
                  </p>
                  <Button variant="outline" className="mt-2">
                    Ver Sessões
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium">Backup de Dados</h4>
                  <p className="text-sm text-muted-foreground">
                    Baixe uma cópia dos seus dados
                  </p>
                  <Button variant="outline" className="mt-2">
                    <Database className="mr-2 h-4 w-4" />
                    Solicitar Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;