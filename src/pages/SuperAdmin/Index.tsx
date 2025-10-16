import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Users, DollarSign, TrendingUp, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({ companies: 0, users: 0, activeSubscriptions: 0, revenue: 0 });
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*, company_subscriptions(*, subscription_plans(*))')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Carregar usuários
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

      if (profilesError) throw profilesError;

      // Carregar assinaturas ativas
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('company_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('status', 'active');

      if (subscriptionsError) throw subscriptionsError;

      // Calcular receita
      const revenue = subscriptionsData?.reduce((acc, sub) => {
        return acc + (Number(sub.subscription_plans?.price_monthly) || 0);
      }, 0) || 0;

      setStats({
        companies: companiesData?.length || 0,
        users: profilesData?.length || 0,
        activeSubscriptions: subscriptionsData?.length || 0,
        revenue,
      });

      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockCompany = async (companyId: string, isBlocked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('companies')
        .update({
          is_blocked: !isBlocked,
          blocked_at: !isBlocked ? new Date().toISOString() : null,
          blocked_by: !isBlocked ? user?.id : null,
          blocked_reason: !isBlocked ? 'Bloqueado pelo super admin' : null,
        })
        .eq('id', companyId);

      if (error) throw error;

      toast.success(isBlocked ? 'Empresa desbloqueada' : 'Empresa bloqueada');
      loadData();
    } catch (error) {
      console.error('Error toggling company block:', error);
      toast.error('Erro ao atualizar empresa');
    }
  };

  const getStatusBadge = (company: any) => {
    if (company.is_blocked) {
      return <Badge variant="destructive">Bloqueado</Badge>;
    }
    
    const subscription = company.company_subscriptions?.[0];
    if (!subscription) {
      return <Badge variant="secondary">Sem Assinatura</Badge>;
    }

    if (subscription.status === 'active') {
      return <Badge className="bg-success">Ativo</Badge>;
    }
    
    return <Badge variant="secondary">{subscription.status}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Super Admin</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.companies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.revenue)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
            <CardDescription>Gerenciar todas as empresas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.document}</TableCell>
                    <TableCell>{getStatusBadge(company)}</TableCell>
                    <TableCell>{format(new Date(company.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Button
                        variant={company.is_blocked ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => toggleBlockCompany(company.id, company.is_blocked)}
                      >
                        {company.is_blocked ? (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Bloquear
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;
