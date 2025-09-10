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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Check, Calendar, DollarSign, ChevronLeft, ChevronRight, CreditCard, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUpload } from "@/components/FileUpload";

interface AccountPayable {
  id: string;
  supplier_id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  document_number: string | null;
  suppliers: { name: string };
  bank_accounts: { name: string; bank_name: string } | null;
  cost_centers: { name: string } | null;
  categories: { name: string; color: string } | null;
  subcategories: { name: string; color: string } | null;
  is_recurring: boolean;
  recurrence_frequency: string;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  parent_transaction_id: string | null;
  receipt_file_path: string | null;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  document?: string;
  city?: string;
  state?: string;
}

const ContasPagar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<"monthly" | "today" | "year" | "all" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    supplier_id: "",
    description: "",
    amount: "",
    due_date: "",
    notes: "",
    document_number: "",
    is_recurring: false,
    recurrence_frequency: "monthly",
    recurrence_interval: 1,
    recurrence_end_date: "",
    bank_account_id: "",
    cost_center_id: "",
    category_id: "",
    subcategory_id: "",
    receipt_file_path: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const [supplierFormData, setSupplierFormData] = useState({
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

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchSuppliers();
      fetchBankAccounts();
      fetchCostCenters();
      fetchCategories();
      fetchSubcategories();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data: existingAccounts, error: existingError } = await supabase
        .from('accounts_payable')
        .select(`
          *,
          suppliers:supplier_id (
            name
          ),
          bank_accounts:bank_account_id (
            name,
            bank_name
          ),
          cost_centers:cost_center_id (
            name
          ),
          categories:category_id (
            name,
            color
          ),
          subcategories:subcategory_id (
            name,
            color
          )
        `)
        .order('due_date', { ascending: false });

      if (existingError) {
        console.error('Error fetching accounts:', existingError);
        toast({
          title: "Erro ao carregar contas",
          description: existingError.message,
          variant: "destructive",
        });
        return;
      }

      setAccounts((existingAccounts as any[]) || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, email, document, city, state')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
      } else {
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name, account_number')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, name, description')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, color, category_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
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
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        ...supplierFormData,
        company_id: profile.company_id,
      };

      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Fornecedor cadastrado!",
        description: "O novo fornecedor foi adicionado com sucesso.",
      });

      // Close supplier dialog
      setSupplierDialogOpen(false);
      resetSupplierForm();
      
      // Refresh suppliers and auto-select the new one
      await fetchSuppliers();
      setFormData(prev => ({ ...prev, supplier_id: newSupplier.id }));
      
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: "Erro ao salvar fornecedor",
        description: "Não foi possível salvar as informações do fornecedor",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      description: "",
      amount: "",
      due_date: "",
      notes: "",
      document_number: "",
      is_recurring: false,
      recurrence_frequency: "monthly",
      recurrence_interval: 1,
      recurrence_end_date: "",
      bank_account_id: "",
      cost_center_id: "",
      category_id: "",
      subcategory_id: "",
      receipt_file_path: "",
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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

      const accountData = {
        supplier_id: formData.supplier_id || null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        notes: formData.notes || null,
        document_number: formData.document_number || null,
        company_id: profile.company_id,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.recurrence_frequency,
        recurrence_interval: parseInt(formData.recurrence_interval.toString()),
        recurrence_end_date: formData.recurrence_end_date || null,
        bank_account_id: formData.bank_account_id || null,
        cost_center_id: formData.cost_center_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        receipt_file_path: formData.receipt_file_path || null,
      };

      let error;
      if (editingAccount) {
        const { error: updateError } = await supabase
          .from('accounts_payable')
          .update(accountData)
          .eq('id', editingAccount.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('accounts_payable')
          .insert([accountData]);
        error = insertError;
      }

      if (error) {
        toast({
          title: "Erro ao salvar conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: editingAccount ? "Conta atualizada!" : "Conta cadastrada!",
          description: "Conta salva com sucesso",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ 
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao registrar pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamento registrado!",
          description: "Conta marcada como paga",
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Buscar informações da conta
      const { data: account, error: fetchError } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !account) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar a conta",
          variant: "destructive",
        });
        return;
      }

      // Se é uma conta recorrente pai, perguntar sobre as próximas parcelas
      if (account.is_recurring && !account.parent_transaction_id) {
        const { data: futureInstallments } = await supabase
          .from('accounts_payable')
          .select('id')
          .eq('parent_transaction_id', id)
          .eq('status', 'pending');

        if (futureInstallments && futureInstallments.length > 0) {
          const choice = confirm(
            `Esta conta possui ${futureInstallments.length} parcelas futuras pendentes.\n\n` +
            `Escolha uma opção:\n` +
            `• OK: Excluir apenas esta conta\n` +
            `• Cancelar: Não excluir nada`
          );

          if (!choice) {
            return;
          }

          // Se escolheu OK, continua apenas com a exclusão da conta específica
        }
      }

      // Se é uma parcela de uma recorrência, perguntar sobre toda a série
      if (account.parent_transaction_id) {
        const { data: parentAccount } = await supabase
          .from('accounts_payable')
          .select('description')
          .eq('id', account.parent_transaction_id)
          .single();

        const { data: seriesInstallments } = await supabase
          .from('accounts_payable')
          .select('id, status')
          .or(`id.eq.${account.parent_transaction_id},parent_transaction_id.eq.${account.parent_transaction_id}`)
          .neq('status', 'paid');

        if (seriesInstallments && seriesInstallments.length > 1) {
          const choice = window.prompt(
            `Esta conta faz parte de uma série recorrente "${parentAccount?.description || 'N/A'}" com ${seriesInstallments.length} parcelas não pagas.\n\n` +
            `Digite sua escolha:\n` +
            `1 - Excluir apenas esta conta\n` +
            `2 - Excluir toda a série de recorrência\n` +
            `Qualquer outro valor - Cancelar`,
            "1"
          );

          if (choice === "2") {
            // Excluir toda a série
            const idsToDelete = seriesInstallments.map(inst => inst.id);
            const { error: deleteSeriesError } = await supabase
              .from('accounts_payable')
              .delete()
              .in('id', idsToDelete);

            if (deleteSeriesError) {
              toast({
                title: "Erro ao excluir série",
                description: deleteSeriesError.message,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Série excluída!",
                description: `${seriesInstallments.length} contas foram removidas`,
              });
              fetchAccounts();
            }
            return;
          } else if (choice !== "1") {
            toast({
              title: "Opção inválida",
              description: "Operação cancelada",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Confirmar exclusão da conta específica
      if (!confirm(`Tem certeza que deseja excluir apenas esta conta?`)) {
        return;
      }

      // Deletar apenas a conta específica
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao excluir conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta excluída!",
          description: "Conta removida com sucesso",
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleEdit = (account: AccountPayable) => {
    setEditingAccount(account);
    setFormData({
      supplier_id: account.supplier_id,
      description: account.description,
      amount: account.amount.toString(),
      due_date: account.due_date,
      notes: account.notes || "",
      document_number: account.document_number || "",
      is_recurring: account.is_recurring || false,
      recurrence_frequency: account.recurrence_frequency || "monthly",
      recurrence_interval: account.recurrence_interval || 1,
      recurrence_end_date: account.recurrence_end_date || "",
      bank_account_id: account.bank_account_id || "",
      cost_center_id: account.cost_center_id || "",
      category_id: account.category_id || "",
      subcategory_id: account.subcategory_id || "",
      receipt_file_path: account.receipt_file_path || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      overdue: { label: "Vencido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.suppliers.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || account.status === statusFilter;
    
    // Filtro por período
    let matchesPeriod = true;
    const accountDate = new Date(account.due_date);
    
    switch (periodFilter) {
      case "monthly":
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        matchesPeriod = isWithinInterval(accountDate, { start: monthStart, end: monthEnd });
        break;
      case "today":
        matchesPeriod = isToday(accountDate);
        break;
      case "year":
        const yearStart = startOfYear(new Date());
        const yearEnd = endOfYear(new Date());
        matchesPeriod = isWithinInterval(accountDate, { start: yearStart, end: yearEnd });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          matchesPeriod = isWithinInterval(accountDate, { start, end });
        }
        break;
      case "all":
      default:
        matchesPeriod = true;
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalPending = accounts
    .filter(account => account.status === 'pending')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalPaid = accounts
    .filter(account => account.status === 'paid')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalOverdue = accounts
    .filter(account => account.status === 'overdue')
    .reduce((sum, account) => sum + account.amount, 0);
    
  const totalValue = totalPending + totalPaid + totalOverdue;

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas a pagar</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="premium" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
                <DialogDescription>
                  {editingAccount ? "Atualize as informações da conta" : "Cadastre uma nova conta a pagar"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Fornecedor *</Label>
                    <Select 
                      value={formData.supplier_id} 
                      onValueChange={(value) => {
                        if (value === '__add_new__') {
                          setSupplierDialogOpen(true);
                        } else {
                          setFormData({...formData, supplier_id: value});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-primary font-medium">
                          <Plus className="mr-2 h-4 w-4" />
                          Cadastrar Fornecedor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Input
                      id="description"
                      placeholder="Descrição da conta"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Data de Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_number">Número do Documento</Label>
                    <Input
                      id="document_number"
                      placeholder="Número da nota/boleto"
                      value={formData.document_number}
                      onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      placeholder="Observações adicionais"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="premium" disabled={loading}>
                    {loading ? "Salvando..." : (editingAccount ? "Atualizar" : "Cadastrar")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Supplier Registration Dialog */}
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo fornecedor
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-name">Nome *</Label>
                    <Input
                      id="supplier-name"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier-email">Email</Label>
                    <Input
                      id="supplier-email"
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-document-type">Tipo de Documento</Label>
                    <Select
                      value={supplierFormData.document_type}
                      onValueChange={(value) => setSupplierFormData(prev => ({ ...prev, document_type: value as "cpf" | "cnpj" }))}
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
                    <Label htmlFor="supplier-document">Documento</Label>
                    <Input
                      id="supplier-document"
                      value={supplierFormData.document}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, document: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Telefone</Label>
                  <Input
                    id="supplier-phone"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Endereço</Label>
                  <Input
                    id="supplier-address"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-city">Cidade</Label>
                    <Input
                      id="supplier-city"
                      value={supplierFormData.city}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier-state">Estado</Label>
                    <Input
                      id="supplier-state"
                      value={supplierFormData.state}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, state: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier-zip">CEP</Label>
                    <Input
                      id="supplier-zip"
                      value={supplierFormData.zip_code}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Salvar Fornecedor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencido</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contas a Pagar</CardTitle>
            <CardDescription>Visualize e gerencie suas contas a pagar</CardDescription>
            
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por descrição ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Por Mês</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {periodFilter === "monthly" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-32 text-center">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {periodFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.suppliers?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{account.description}</TableCell>
                      <TableCell className="font-semibold">
                        R$ {account.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(account.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(account.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {account.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePayment(account.id)}
                              title="Marcar como pago"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(account.id)}
                            title="Excluir conta"
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
    </>
  );
};

export default ContasPagar;