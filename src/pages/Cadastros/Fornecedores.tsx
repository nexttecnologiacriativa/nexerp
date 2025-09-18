import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCPF, normalizeCPF } from '@/lib/cpf-utils';
import { formatCNPJ, normalizeCNPJ } from '@/lib/cnpj-utils';
import { CPFInput } from '@/components/ui/cpf-input';
import { CNPJInput } from '@/components/ui/cnpj-input';

interface Supplier {
  id: string;
  name: string;
  email: string;
  document: string;
  document_type: 'cpf' | 'cnpj';
  city: string;
  state: string;
  status: 'active' | 'inactive' | 'pending';
}

const Fornecedores = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    document_type: 'cnpj' as 'cpf' | 'cnpj',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const [documentValid, setDocumentValid] = useState(false);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      
      // Get user's company_id from profile
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
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      document_type: 'cnpj' as 'cpf' | 'cnpj',
      address: '',
      city: '',
      state: '',
      zip_code: ''
    });
    setDocumentValid(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentValid) {
      toast({
        title: "Erro de validação",
        description: formData.document_type === 'cpf' ? "CPF deve ter 11 dígitos válidos" : "CNPJ deve ter 14 dígitos válidos",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const supplierData = {
        ...formData,
        document: formData.document_type === 'cpf' ? normalizeCPF(formData.document) : normalizeCNPJ(formData.document),
        company_id: profile.company_id,
      };

      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id);

        if (error) throw error;

        toast({
          title: "Fornecedor atualizado!",
          description: "As informações do fornecedor foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);

        if (error) throw error;

        toast({
          title: "Fornecedor cadastrado!",
          description: "O novo fornecedor foi adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: "Erro ao salvar fornecedor",
        description: "Não foi possível salvar as informações do fornecedor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    const formattedDocument = supplier.document_type === 'cpf' 
      ? formatCPF(supplier.document || '')
      : formatCNPJ(supplier.document || '');
    
    setFormData({
      name: supplier.name,
      email: supplier.email || '',
      phone: '',
      document: formattedDocument,
      document_type: supplier.document_type || 'cnpj',
      address: '',
      city: supplier.city || '',
      state: supplier.state || '',
      zip_code: ''
    });
    setDocumentValid(true); // Assume existing documents are valid
    setEditingSupplier(supplier);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Fornecedor excluído!",
        description: "O fornecedor foi removido com sucesso.",
      });

      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erro ao excluir fornecedor",
        description: "Não foi possível excluir o fornecedor",
        variant: "destructive",
      });
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.document?.includes(searchTerm)
  );

  const pessoaFisicaSuppliers = filteredSuppliers.filter(supplier => 
    supplier.document_type === "cpf"
  );

  const pessoaJuridicaSuppliers = filteredSuppliers.filter(supplier => 
    supplier.document_type === "cnpj"
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie os fornecedores da sua empresa</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier ? 'Atualize as informações do fornecedor' : 'Preencha as informações do novo fornecedor'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document_type">Tipo de Documento</Label>
                  <Select
                    value={formData.document_type}
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        document_type: value as "cpf" | "cnpj",
                        document: '' // Reset document when type changes
                      }));
                      setDocumentValid(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="document">Documento *</Label>
                  {formData.document_type === 'cpf' ? (
                    <CPFInput
                      value={formData.document}
                      onChange={(value, isValid) => {
                        setFormData(prev => ({ ...prev, document: value }));
                        setDocumentValid(isValid);
                      }}
                    />
                  ) : (
                    <CNPJInput
                      value={formData.document}
                      onChange={(value, normalizedValue) => {
                        setFormData(prev => ({ ...prev, document: value }));
                        setDocumentValid(normalizedValue.length === 14);
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSupplier ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos">Todos ({filteredSuppliers.length})</TabsTrigger>
              <TabsTrigger value="fisica">Pessoa Física ({pessoaFisicaSuppliers.length})</TabsTrigger>
              <TabsTrigger value="juridica">Pessoa Jurídica ({pessoaJuridicaSuppliers.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="todos" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhum fornecedor encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>
                          {supplier.document_type === "cpf" 
                            ? formatCPF(supplier.document) 
                            : formatCNPJ(supplier.document)
                          }
                        </TableCell>
                        <TableCell>{supplier.city || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                            {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(supplier.id)}
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
            </TabsContent>

            <TabsContent value="fisica" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pessoaFisicaSuppliers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhum fornecedor pessoa física encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pessoaFisicaSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>{formatCPF(supplier.document)}</TableCell>
                        <TableCell>{supplier.city || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                            {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(supplier.id)}
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
            </TabsContent>

            <TabsContent value="juridica" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : pessoaJuridicaSuppliers.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Nenhum fornecedor pessoa jurídica encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pessoaJuridicaSuppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.email || '-'}</TableCell>
                        <TableCell>{formatCNPJ(supplier.document)}</TableCell>
                        <TableCell>{supplier.city || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                            {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(supplier.id)}
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fornecedores;