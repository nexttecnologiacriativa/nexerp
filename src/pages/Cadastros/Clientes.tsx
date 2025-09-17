import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CPFInput } from "@/components/ui/cpf-input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { normalizeCPF, formatCPF } from "@/lib/cpf-utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  document_type: "cpf" | "cnpj" | "passport";
  responsible?: string;
  city: string;
  state: string;
  status: string;
}

const Clientes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [cpfError, setCpfError] = useState<string | null>(null);
  
  // Hook para modal de confirmação
  const confirmDialog = useConfirmDialog();

  const [formData, setFormData] = useState({
    personType: "fisica" as "fisica" | "juridica",
    name: "",
    email: "",
    phone: "",
    document: "",
    document_type: "cpf" as "cpf" | "cnpj",
    responsible: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  });

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) {
        toast({
          title: "Erro ao carregar clientes",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      personType: "fisica" as "fisica" | "juridica",
      name: "",
      email: "",
      phone: "",
      document: "",
      document_type: "cpf" as "cpf" | "cnpj",
      responsible: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
    });
    setCpfError(null);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.name || !formData.email || !formData.phone || !formData.document) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Validar CPF se for pessoa física
    if (formData.personType === "fisica" && cpfError) {
      toast({
        title: "CPF inválido",
        description: cpfError,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Você precisa estar associado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      // Verificar duplicidade de CPF/CNPJ
      const normalizedDocument = formData.document_type === "cpf" ? normalizeCPF(formData.document) : formData.document;
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', profile.company_id)
        .eq('document', normalizedDocument)
        .eq('document_type', formData.document_type)
        .neq('id', editingCustomer?.id || '');

      if (existingCustomer && existingCustomer.length > 0) {
        toast({
          title: "Cliente já existe",
          description: `Já existe um cliente cadastrado com este ${formData.document_type === 'cpf' ? 'CPF' : 'CNPJ'}`,
          variant: "destructive",
        });
        return;
      }

      const customerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document: normalizedDocument,
        document_type: formData.document_type,
        responsible: formData.personType === "juridica" ? formData.responsible : null,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        company_id: profile.company_id,
      };

      let error;
      if (editingCustomer) {
        const { error: updateError } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('customers')
          .insert(customerData);
        error = insertError;
      }

      if (error) {
        toast({
          title: "Erro ao salvar cliente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: editingCustomer ? "Cliente atualizado!" : "Cliente cadastrado!",
          description: "Cliente salvo com sucesso",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      personType: customer.document_type === "cnpj" ? "juridica" : "fisica",
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      document: customer.document || "",
      document_type: (customer.document_type as "cpf" | "cnpj") || "cpf",
      responsible: customer.responsible || "",
      address: "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await confirmDialog.confirm(
      {
        title: "Confirmação de exclusão",
        description: "Tem certeza que deseja excluir este cliente?",
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive"
      },
      async () => {
        try {
          const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

          if (error) {
            toast({
              title: "Erro ao excluir cliente",
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Cliente excluído!",
              description: "Cliente removido com sucesso",
            });
            fetchCustomers();
          }
        } catch (error) {
          console.error('Error deleting customer:', error);
        }
      }
    );
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.document?.includes(searchTerm)
  );

  const pessoaFisicaCustomers = filteredCustomers.filter(customer => 
    customer.document_type === "cpf"
  );

  const pessoaJuridicaCustomers = filteredCustomers.filter(customer => 
    customer.document_type === "cnpj"
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Atualize as informações do cliente" : "Cadastre um novo cliente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Seleção de tipo de pessoa */}
                <div className="space-y-2">
                  <Label htmlFor="personType">Tipo de Pessoa *</Label>
                  <Select 
                    value={formData.personType} 
                    onValueChange={(value: "fisica" | "juridica") => {
                      setFormData({
                        ...formData, 
                        personType: value,
                        document_type: value === "fisica" ? "cpf" : "cnpj"
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica">Pessoa Física</SelectItem>
                      <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {formData.personType === "juridica" ? "Nome Fantasia" : "Nome"} *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="document">
                      {formData.personType === "juridica" ? "CNPJ" : "CPF"} *
                    </Label>
                    {formData.personType === "fisica" ? (
                      <CPFInput
                        id="document"
                        value={formData.document}
                        onChange={(value, isValid) => setFormData({...formData, document: value})}
                        onValidationChange={setCpfError}
                        required
                      />
                    ) : (
                      <Input
                        id="document"
                        placeholder="00.000.000/0000-00"
                        value={formData.document}
                        onChange={(e) => setFormData({...formData, document: e.target.value})}
                        required
                      />
                    )}
                  </div>
                  
                  {formData.personType === "juridica" && (
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="responsible">Responsável</Label>
                      <Input
                        id="responsible"
                        value={formData.responsible}
                        onChange={(e) => setFormData({...formData, responsible: e.target.value})}
                        placeholder="Nome da pessoa de contato"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="premium" disabled={loading}>
                  {loading ? "Salvando..." : (editingCustomer ? "Atualizar" : "Cadastrar")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pessoa-fisica" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pessoa-fisica">Pessoa Física</TabsTrigger>
              <TabsTrigger value="pessoa-juridica">Pessoa Jurídica</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pessoa-fisica" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : pessoaFisicaCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        {searchTerm ? "Nenhum cliente pessoa física encontrado" : "Nenhum cliente pessoa física cadastrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pessoaFisicaCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{formatCPF(customer.document)}</TableCell>
                        <TableCell>{customer.city || "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="pessoa-juridica" className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : pessoaJuridicaCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        {searchTerm ? "Nenhum cliente pessoa jurídica encontrado" : "Nenhum cliente pessoa jurídica cadastrado"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pessoaJuridicaCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.document}</TableCell>
                        <TableCell>{customer.responsible || "-"}</TableCell>
                        <TableCell>{customer.city || "-"}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.handleClose}
        onConfirm={confirmDialog.handleConfirm}
        title={confirmDialog.options.title}
        description={confirmDialog.options.description}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        variant={confirmDialog.options.variant}
      />
    </div>
  );
};

export default Clientes;