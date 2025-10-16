import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const SuperAdminPlanos = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    max_users: '',
    max_companies: '',
    is_active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        price_monthly: parseFloat(formData.price_monthly),
        price_yearly: formData.price_yearly ? parseFloat(formData.price_yearly) : null,
        max_users: formData.max_users ? parseInt(formData.max_users) : null,
        max_companies: formData.max_companies ? parseInt(formData.max_companies) : null,
        is_active: formData.is_active,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Plano atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Plano criado com sucesso');
      }

      setIsDialogOpen(false);
      resetForm();
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price_monthly: '',
      price_yearly: '',
      max_users: '',
      max_companies: '',
      is_active: true,
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly.toString(),
      price_yearly: plan.price_yearly?.toString() || '',
      max_users: plan.max_users?.toString() || '',
      max_companies: plan.max_companies?.toString() || '',
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const toggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;
      toast.success('Status atualizado');
      loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast.error('Erro ao atualizar status');
    }
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
            <h1 className="text-3xl font-bold">Gerenciar Planos</h1>
            <p className="text-muted-foreground">Criar e editar planos de assinatura</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planos de Assinatura</CardTitle>
            <CardDescription>Lista de todos os planos disponíveis</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço Mensal</TableHead>
                  <TableHead>Preço Anual</TableHead>
                  <TableHead>Máx. Usuários</TableHead>
                  <TableHead>Máx. Empresas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(plan.price_monthly)}
                    </TableCell>
                    <TableCell>
                      {plan.price_yearly ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(plan.price_yearly) : '-'}
                    </TableCell>
                    <TableCell>{plan.max_users || 'Ilimitado'}</TableCell>
                    <TableCell>{plan.max_companies || 'Ilimitado'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(plan.id, plan.is_active)}
                      >
                        {plan.is_active ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do plano de assinatura
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_monthly">Preço Mensal (R$) *</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    step="0.01"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price_yearly">Preço Anual (R$)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    step="0.01"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_users">Máx. Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                    placeholder="Deixe vazio para ilimitado"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_companies">Máx. Empresas</Label>
                  <Input
                    id="max_companies"
                    type="number"
                    value={formData.max_companies}
                    onChange={(e) => setFormData({ ...formData, max_companies: e.target.value })}
                    placeholder="Deixe vazio para ilimitado"
                  />
                </div>

                <div className="space-y-2 flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Plano Ativo</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Atualizar' : 'Criar'} Plano
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default SuperAdminPlanos;
