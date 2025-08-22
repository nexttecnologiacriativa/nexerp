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
import { Plus, Search, Edit, Trash2, Check, Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
import { FileUpload } from "@/components/FileUpload";

interface AccountReceivable {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  document_number: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  subcategory_id: string | null;
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer' | 'bank_slip' | 'check' | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  recurrence_count?: number;
  parent_transaction_id?: string | null;
  next_due_date?: string | null;
  bank_account_id: string | null;
  customers: {
    name: string;
  };
  bank_accounts?: {
    name: string;
    bank_name: string;
  };
  categories?: {
    name: string;
    color: string;
  };
  subcategories?: {
    name: string;
    color: string;
  };
  receipt_file_path?: string | null;
}

interface Customer {
  id: string;
  name: string;
}

const ContasReceber = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountReceivable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "all">("all");
  
  // Pegar filtro da URL para filtrar por venda específica
  const saleFilter = searchParams.get('filter');

  const [formData, setFormData] = useState({
    customer_id: "",
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
    category_id: "",
    subcategory_id: "",
    receipt_file_path: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const fetchAccounts = async () => {
    try {
      const { data: existingAccounts, error: existingError } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          customers:customer_id (
            name
          ),
          bank_accounts:bank_account_id (
            name,
            bank_name
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
        .order('due_date', { ascending: true });

      if (existingError) {
        toast({
          title: "Erro ao carregar contas a receber",
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

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchCustomers();
      fetchBankAccounts();
      fetchCategories();
      fetchSubcategories();
    }
  }, [user]);

  // Aplicar filtro da URL quando disponível
  useEffect(() => {
    if (saleFilter) {
      setSearchTerm(saleFilter);
    }
  }, [saleFilter]);

  const resetForm = () => {
    setFormData({
      customer_id: "",
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

      const accountData = {
        customer_id: formData.customer_id || null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        notes: formData.notes || null,
        document_number: formData.document_number || null,
        company_id: profile.company_id,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.is_recurring ? formData.recurrence_frequency : null,
        recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
        recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
        bank_account_id: formData.bank_account_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        next_due_date: formData.is_recurring ? formData.due_date : null,
        recurrence_count: 0,
        parent_transaction_id: null,
        receipt_file_path: formData.receipt_file_path || null,
      };

      let error;
      if (editingAccount) {
        const { error: updateError } = await supabase
          .from('accounts_receivable')
          .update(accountData)
          .eq('id', editingAccount.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('accounts_receivable')
          .insert(accountData);
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
        .from('accounts_receivable')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao registrar recebimento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Recebimento registrado!",
          description: "Conta marcada como recebida",
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
        .from('accounts_receivable')
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

      // Se for conta recorrente (pai) ou conta filha de recorrente
      if (account.is_recurring || account.parent_transaction_id) {
        const isParent = account.is_recurring && !account.parent_transaction_id;
        const parentId = isParent ? account.id : account.parent_transaction_id;
        
        // Contar quantas contas relacionadas existem
        const { data: relatedAccounts } = await supabase
          .from('accounts_receivable')
          .select('id')
          .or(
            isParent 
              ? `parent_transaction_id.eq.${parentId}`
              : `id.eq.${parentId},parent_transaction_id.eq.${parentId}`
          );

        const relatedCount = relatedAccounts?.length || 0;
        
        if (relatedCount > 0) {
          const monthYear = format(new Date(account.due_date), 'MMMM/yyyy', { locale: ptBR });
          const options = isParent 
            ? `Esta é uma conta recorrente com ${relatedCount} parcela(s) futura(s).\n\nEscolha uma opção:\n\n1️⃣ - Deletar apenas esta conta (${monthYear})\n2️⃣ - Deletar toda a série recorrente\n3️⃣ - Cancelar\n\nDigite 1, 2 ou 3:`
            : `Esta conta faz parte de uma recorrência com ${relatedCount} parcela(s) relacionada(s).\n\nEscolha uma opção:\n\n1️⃣ - Deletar apenas esta conta (${monthYear})\n2️⃣ - Deletar toda a série recorrente\n3️⃣ - Cancelar\n\nDigite 1, 2 ou 3:`;
            
          const choice = prompt(options);
          
          if (choice === "3" || choice === null) {
            return; // Cancelar
          }
          
          if (choice === "2") {
            // Deletar toda a série
            const parentId = isParent ? account.id : account.parent_transaction_id;
            const { error } = await supabase
              .from('accounts_receivable')
              .delete()
              .or(`id.eq.${parentId},parent_transaction_id.eq.${parentId}`);

            if (error) {
              toast({
                title: "Erro ao excluir contas",
                description: error.message,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Série recorrente excluída!",
                description: "Conta principal e todas as parcelas foram removidas",
              });
              fetchAccounts();
            }
            return;
          }
          
          if (choice === "1") {
            // Deletar apenas esta conta (padrão - continua abaixo)
          } else {
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
        .from('accounts_receivable')
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

  const handleEdit = (account: AccountReceivable) => {
    setEditingAccount(account);
    setFormData({
      customer_id: account.customer_id,
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
      category_id: account.category_id || "",
      subcategory_id: account.subcategory_id || "",
      receipt_file_path: account.receipt_file_path || "",
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Recebido", variant: "default" as const },
      overdue: { label: "Vencido", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.customers.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || account.status === statusFilter;
    
    let matchesMonth = true;
    if (viewMode === "monthly") {
      const accountDate = new Date(account.due_date);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      matchesMonth = isWithinInterval(accountDate, { start: monthStart, end: monthEnd });
    }
    
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const totalPending = accounts
    .filter(account => account.status === 'pending')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalReceived = accounts
    .filter(account => account.status === 'paid')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalOverdue = accounts
    .filter(account => account.status === 'overdue')
    .reduce((sum, account) => sum + account.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Contas a Receber {saleFilter && `- ${saleFilter}`}
          </h1>
          <p className="text-muted-foreground">
            {saleFilter 
              ? `Cobranças relacionadas à venda ${saleFilter}` 
              : "Gerencie suas contas a receber"
            }
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Receber
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta a Receber"}</DialogTitle>
              <DialogDescription>
                {editingAccount ? "Atualize as informações da conta" : "Cadastre uma nova conta a receber"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Cliente *</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
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
                
                <div className="space-y-2 col-span-2">
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
                    placeholder="Número do documento"
                    value={formData.document_number}
                    onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank_account_id">Conta Bancária</Label>
                  <Select value={formData.bank_account_id} onValueChange={(value) => setFormData({...formData, bank_account_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta bancária" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {account.bank_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category_id">Categoria</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value, subcategory_id: ""})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subcategory_id">Subcategoria</Label>
                  <Select 
                    value={formData.subcategory_id} 
                    onValueChange={(value) => setFormData({...formData, subcategory_id: value})}
                    disabled={!formData.category_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a subcategoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories
                        .filter(sub => sub.category_id === formData.category_id)
                        .map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: subcategory.color }}
                            />
                            {subcategory.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-4 col-span-2 border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label htmlFor="is_recurring" className="text-base font-medium">
                        🔄 Configurar recorrência de recebimento
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Ative para criar automaticamente as próximas contas de acordo com a frequência definida
                      </p>
                    </div>
                  </div>

                  {formData.is_recurring && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_frequency" className="flex items-center gap-2">
                          📅 Frequência
                        </Label>
                        <Select value={formData.recurrence_frequency} onValueChange={(value) => setFormData({...formData, recurrence_frequency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">🗓️ Semanalmente</SelectItem>
                            <SelectItem value="monthly">📅 Mensalmente</SelectItem>
                            <SelectItem value="yearly">🎂 Anualmente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_interval" className="flex items-center gap-2">
                          🔢 Intervalo
                        </Label>
                        <Input
                          id="recurrence_interval"
                          type="number"
                          min="1"
                          max="12"
                          value={formData.recurrence_interval}
                          onChange={(e) => setFormData({...formData, recurrence_interval: parseInt(e.target.value) || 1})}
                        />
                        <p className="text-xs text-muted-foreground">
                          A cada {formData.recurrence_interval} {
                            formData.recurrence_frequency === 'weekly' ? 'semana(s)' :
                            formData.recurrence_frequency === 'monthly' ? 'mês/meses' : 'ano(s)'
                          }
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="recurrence_end_date" className="flex items-center gap-2">
                          🏁 Data limite
                          <span className="text-xs text-muted-foreground">(opcional)</span>
                        </Label>
                        <Input
                          id="recurrence_end_date"
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) => setFormData({...formData, recurrence_end_date: e.target.value})}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.recurrence_end_date ? 
                            `Até ${format(new Date(formData.recurrence_end_date), 'dd/MM/yyyy')}` : 
                            '♾️ Sem data limite (para sempre)'
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {formData.is_recurring && (
                    <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border-l-4 border-green-500">
                      <div className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">ℹ️</span>
                        <div className="text-sm">
                          <p className="font-medium text-green-700 dark:text-green-300">Como funciona:</p>
                          <p className="text-green-600 dark:text-green-400 mt-1">
                            O sistema criará automaticamente as próximas contas {formData.recurrence_frequency === 'weekly' ? 'semanalmente' : formData.recurrence_frequency === 'monthly' ? 'mensalmente' : 'anualmente'} com 30 dias de antecedência.
                            {!formData.recurrence_end_date && ' Esta conta será gerada indefinidamente.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    placeholder="Observações"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <FileUpload
                    onFileUploaded={(filePath) => setFormData({...formData, receipt_file_path: filePath})}
                    currentFile={formData.receipt_file_path}
                    companyId={user?.user_metadata?.company_id || 'temp'}
                    accountId={editingAccount?.id}
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
       </div>

       {/* Statistics Cards and Table - simplified for space */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceived)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOverdue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação por mês e filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Contas a Receber</CardTitle>
              <CardDescription>Gerencie suas contas a receber</CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "monthly" | "all")}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="monthly">Por Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {viewMode === "monthly" && (
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <CardDescription>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <Input
                  placeholder="Buscar contas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Recebido</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Subcategoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">Nenhuma conta encontrada</TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.customers?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{account.description}</TableCell>
                    <TableCell>
                      {account.categories ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: account.categories.color }}
                          />
                          {account.categories.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {account.subcategories ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: account.subcategories.color }}
                          />
                          {account.subcategories.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.amount)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(account.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {account.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePayment(account.id)}
                            title="Marcar como recebido"
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContasReceber;