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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Check, Calendar, DollarSign, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountReceivable {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  next_due_date: string | null;
  parent_transaction_id: string | null;
  recurrence_count: number | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  cost_center_id: string | null;
  category_id: string | null;
  payment_method: 'boleto' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'pix' | 'cheque' | 'dinheiro' | 'outro' | null;
  attachment_url: string | null;
  customers: {
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

const ContasReceber = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountReceivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountReceivable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "all">("all");

  const [formData, setFormData] = useState({
    customer_id: "",
    description: "",
    amount: "",
    due_date: "",
    notes: "",
    is_recurring: false,
    recurrence_frequency: "monthly",
    recurrence_interval: 1,
    recurrence_end_date: "",
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchCustomers();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      // Buscar contas existentes
      const { data: existingAccounts, error: existingError } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          customers:customer_id (
            name
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

      let allAccounts = existingAccounts || [];

      // Gerar parcelas futuras para contas recorrentes
      const recurringAccounts = allAccounts.filter(account => 
        account.is_recurring && account.next_due_date
      );

      for (const account of recurringAccounts) {
        const generatedAccounts = generateFutureInstallments(account, 12); // Gerar 12 meses à frente
        allAccounts = [...allAccounts, ...generatedAccounts];
      }

      // Remover duplicatas baseado no ID
      const uniqueAccounts = allAccounts.filter((account, index, self) => 
        index === self.findIndex(a => a.id === account.id)
      );

      setAccounts(uniqueAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFutureInstallments = (parentAccount: AccountReceivable, monthsAhead: number) => {
    const generatedAccounts: AccountReceivable[] = [];
    let currentDate = new Date(parentAccount.next_due_date || parentAccount.due_date);
    
    for (let i = 1; i <= monthsAhead; i++) {
      // Calcular próxima data baseada na frequência
      let nextDate = new Date(currentDate);
      
      switch (parentAccount.recurrence_frequency) {
        case 'daily':
          nextDate.setDate(currentDate.getDate() + (parentAccount.recurrence_interval || 1) * i);
          break;
        case 'weekly':
          nextDate.setDate(currentDate.getDate() + (parentAccount.recurrence_interval || 1) * 7 * i);
          break;
        case 'monthly':
          nextDate = addMonths(currentDate, (parentAccount.recurrence_interval || 1) * i);
          break;
        case 'quarterly':
          nextDate = addMonths(currentDate, (parentAccount.recurrence_interval || 1) * 3 * i);
          break;
        case 'yearly':
          nextDate = addMonths(currentDate, (parentAccount.recurrence_interval || 1) * 12 * i);
          break;
      }

      // Verificar se não passou da data limite
      if (parentAccount.recurrence_end_date && nextDate > new Date(parentAccount.recurrence_end_date)) {
        break;
      }

      generatedAccounts.push({
        ...parentAccount,
        id: `${parentAccount.id}-future-${i}`,
        due_date: nextDate.toISOString().split('T')[0],
        description: `${parentAccount.description} (Parcela ${(parentAccount.recurrence_count || 0) + i + 1})`,
        status: 'pending' as const,
        payment_date: null,
        recurrence_count: (parentAccount.recurrence_count || 0) + i,
        next_due_date: null, // Parcelas futuras não precisam de next_due_date
        company_id: parentAccount.company_id,
        created_at: parentAccount.created_at,
        updated_at: parentAccount.updated_at,
        customers: parentAccount.customers
      });
    }

    return generatedAccounts;
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

  const resetForm = () => {
    setFormData({
      customer_id: "",
      description: "",
      amount: "",
      due_date: "",
      notes: "",
      is_recurring: false,
      recurrence_frequency: "monthly",
      recurrence_interval: 1,
      recurrence_end_date: "",
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
        ...formData,
        amount: parseFloat(formData.amount),
        company_id: profile.company_id,
        next_due_date: formData.is_recurring ? formData.due_date : null,
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

  const handleEdit = (account: AccountReceivable) => {
    setEditingAccount(account);
    setFormData({
      customer_id: account.customer_id,
      description: account.description,
      amount: account.amount.toString(),
      due_date: account.due_date,
      notes: account.notes || "",
      is_recurring: account.is_recurring || false,
      recurrence_frequency: account.recurrence_frequency || "monthly",
      recurrence_interval: account.recurrence_interval || 1,
      recurrence_end_date: account.recurrence_end_date || "",
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
    
    // Filtro por mês se modo mensal estiver ativo
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Gerencie suas contas a receber</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta a Receber
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta a Receber"}</DialogTitle>
              <DialogDescription>
                {editingAccount ? "Atualize as informações da conta" : "Cadastre uma nova conta a receber"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
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
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    placeholder="Observações"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                {/* Configuração de Recorrência */}
                <div className="col-span-2 space-y-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({...formData, is_recurring: !!checked})}
                    />
                    <Label htmlFor="is_recurring" className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Configurar recorrência de recebimento
                    </Label>
                  </div>

                  {formData.is_recurring && (
                    <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-lg">
                      <div className="space-y-2">
                        <Label>Frequência</Label>
                        <Select 
                          value={formData.recurrence_frequency} 
                          onValueChange={(value) => setFormData({...formData, recurrence_frequency: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diariamente</SelectItem>
                            <SelectItem value="weekly">Semanalmente</SelectItem>
                            <SelectItem value="monthly">Mensalmente</SelectItem>
                            <SelectItem value="quarterly">Trimestralmente</SelectItem>
                            <SelectItem value="yearly">Anualmente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Intervalo</Label>
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={formData.recurrence_interval}
                          onChange={(e) => setFormData({...formData, recurrence_interval: parseInt(e.target.value) || 1})}
                          placeholder="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.recurrence_frequency === 'monthly' ? 'A cada X meses' : 
                           formData.recurrence_frequency === 'weekly' ? 'A cada X semanas' :
                           formData.recurrence_frequency === 'daily' ? 'A cada X dias' :
                           formData.recurrence_frequency === 'quarterly' ? 'A cada X trimestres' :
                           'A cada X anos'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Data limite (opcional)</Label>
                        <Input
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) => setFormData({...formData, recurrence_end_date: e.target.value})}
                        />
                        <p className="text-xs text-muted-foreground">
                          Deixe vazio para recorrência indefinida
                        </p>
                      </div>
                    </div>
                  )}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceived)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOverdue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
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
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Nenhuma conta encontrada</TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {account.customers.name || 'N/A'}
                    </TableCell>
                    <TableCell>{account.description}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.amount)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(account.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>
                      {account.is_recurring ? (
                        <div className="flex items-center gap-1">
                          <Repeat className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            {account.recurrence_frequency === 'monthly' ? 'Mensal' :
                             account.recurrence_frequency === 'quarterly' ? 'Trimestral' :
                             account.recurrence_frequency === 'yearly' ? 'Anual' :
                             account.recurrence_frequency === 'weekly' ? 'Semanal' :
                             'Diário'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
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
                        <Button variant="ghost" size="sm">
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