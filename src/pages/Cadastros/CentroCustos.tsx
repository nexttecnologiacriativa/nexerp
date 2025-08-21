import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CostCenter {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

const CentroCustos = () => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;

      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os centros de custo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setEditingCostCenter(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const costCenterData = {
        name: formData.name,
        description: formData.description,
        company_id: profile.company_id,
      };

      if (editingCostCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update(costCenterData)
          .eq('id', editingCostCenter.id);

        if (error) throw error;

        toast({
          title: "Centro de custo atualizado!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('cost_centers')
          .insert([costCenterData]);

        if (error) throw error;

        toast({
          title: "Centro de custo cadastrado!",
          description: "O novo centro de custo foi adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving cost center:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setFormData({
      name: costCenter.name,
      description: costCenter.description || '',
    });
    setEditingCostCenter(costCenter);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este centro de custo?')) return;

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Centro de custo excluído!",
        description: "O centro de custo foi removido com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting cost center:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o centro de custo",
        variant: "destructive",
      });
    }
  };

  const filteredCostCenters = costCenters.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Custos</h1>
          <p className="text-muted-foreground">Gerencie os centros de custo da sua empresa</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Centro de Custo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </DialogTitle>
              <DialogDescription>
                {editingCostCenter ? 'Atualize as informações' : 'Preencha as informações do novo centro de custo'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCostCenter ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Centros de Custo</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os centros de custo cadastrados
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCostCenters.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Nenhum centro de custo encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece cadastrando o primeiro centro de custo da sua empresa.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCostCenters.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>{center.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={center.status === 'active' ? 'default' : 'secondary'}>
                        {center.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(center)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(center.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CentroCustos;