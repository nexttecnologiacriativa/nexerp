import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { Plus, Ban, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SuperAdminAssinaturas = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '',
    plan_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    is_trial: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subscriptionsRes, plansRes, companiesRes] = await Promise.all([
        supabase
          .from('company_subscriptions')
          .select('*, companies(name), subscription_plans(name, price_monthly)')
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true }),
        supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true }),
      ]);

      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (plansRes.error) throw plansRes.error;
      if (companiesRes.error) throw companiesRes.error;

      setSubscriptions(subscriptionsRes.data || []);
      setPlans(plansRes.data || []);
      setCompanies(companiesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('company_subscriptions')
        .insert([{
          ...formData,
          end_date: formData.end_date || null,
          status: 'active',
          payment_status: 'pending',
          created_by: user?.id,
        }]);

      if (error) throw error;

      toast.success('Assinatura criada com sucesso');
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Erro ao criar assinatura');
    }
  };

  const resetForm = () => {
    setFormData({
      company_id: '',
      plan_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      is_trial: false,
    });
  };

  const updateStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates: any = { status: newStatus };
      
      if (newStatus === 'suspended') {
        updates.suspended_at = new Date().toISOString();
        updates.suspended_by = user?.id;
      } else {
        updates.suspended_at = null;
        updates.suspended_by = null;
        updates.suspended_reason = null;
      }

      const { error } = await supabase
        .from('company_subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Status atualizado');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      active: { label: 'Ativo', variant: 'default' },
      suspended: { label: 'Suspenso', variant: 'destructive' },
      cancelled: { label: 'Cancelado', variant: 'secondary' },
      expired: { label: 'Expirado', variant: 'secondary' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Assinaturas</h1>
            <p className="text-muted-foreground">Controlar assinaturas das empresas</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Assinatura
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assinaturas Ativas</CardTitle>
            <CardDescription>Lista de todas as assinaturas do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">
                      {subscription.companies?.name}
                    </TableCell>
                    <TableCell>{subscription.subscription_plans?.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(subscription.subscription_plans?.price_monthly || 0)}
                    </TableCell>
                    <TableCell>{format(new Date(subscription.start_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {subscription.end_date ? format(new Date(subscription.end_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {subscription.status === 'active' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => updateStatus(subscription.id, 'suspended')}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {subscription.status === 'suspended' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateStatus(subscription.id, 'active')}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Assinatura</DialogTitle>
              <DialogDescription>
                Criar uma nova assinatura para uma empresa
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan_id">Plano *</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) => setFormData({ ...formData, plan_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(plan.price_monthly)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início *</Label>
                  <DateInput
                    id="start_date"
                    value={formData.start_date}
                    onChange={(value) => setFormData({ ...formData, start_date: value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Fim</Label>
                  <DateInput
                    id="end_date"
                    value={formData.end_date}
                    onChange={(value) => setFormData({ ...formData, end_date: value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Assinatura</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SuperAdminAssinaturas;
