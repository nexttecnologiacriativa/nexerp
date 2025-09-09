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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Search, Plus, Edit, Trash2, CreditCard, History, ArrowUpRight, ArrowDownLeft, Calendar, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BankAccount {
  id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_type: 'checking' | 'savings' | 'credit';
  balance: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  customer_name?: string;
  supplier_name?: string;
  category_name?: string;
  subcategory_name?: string;
}

const Bancos = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Por Mês');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    bank_name: '',
    account_number: '',
    account_type: 'checking',
    balance: '',
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
        .from('bank_accounts')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;

      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as contas bancárias",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'Por Mês':
        return {
          startDate: startOfMonth(currentMonth),
          endDate: endOfMonth(currentMonth)
        };
      case 'Hoje':
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now)
        };
      case 'Este Ano':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        };
      case 'Personalizado':
        if (customStartDate && customEndDate) {
          return {
            startDate: startOfDay(customStartDate),
            endDate: endOfDay(customEndDate)
          };
        }
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
      default: // 'Todas'
        return null;
    }
  };

  const fetchTransactions = async () => {
    if (!selectedAccount) return;
    
    try {
      setTransactionsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const dateRange = getDateRange();

      // Base query para contas a receber
      let receivablesQuery = supabase
        .from('accounts_receivable')
        .select(`
          id,
          description,
          amount,
          due_date,
          payment_date,
          status,
          bank_account_id,
          customers(name),
          categories(name),
          subcategories(name)
        `)
        .eq('company_id', profile.company_id);

      // Base query para contas a pagar
      let payablesQuery = supabase
        .from('accounts_payable')
        .select(`
          id,
          description,
          amount,
          due_date,
          payment_date,
          status,
          bank_account_id,
          suppliers(name),
          categories(name),
          subcategories(name)
        `)
        .eq('company_id', profile.company_id);

      // Filtrar por conta bancária se existir transações com essa conta
      // Primeiro, vamos buscar todas as transações da empresa e depois filtrar por conta
      if (dateRange) {
        receivablesQuery = receivablesQuery
          .gte('due_date', format(dateRange.startDate, 'yyyy-MM-dd'))
          .lte('due_date', format(dateRange.endDate, 'yyyy-MM-dd'));
        
        payablesQuery = payablesQuery
          .gte('due_date', format(dateRange.startDate, 'yyyy-MM-dd'))
          .lte('due_date', format(dateRange.endDate, 'yyyy-MM-dd'));
      }

      const [{ data: allReceivables }, { data: allPayables }] = await Promise.all([
        receivablesQuery.order('due_date', { ascending: false }),
        payablesQuery.order('due_date', { ascending: false })
      ]);

      // Filtrar transações que estão vinculadas à conta bancária selecionada
      const receivables = (allReceivables || []).filter(item => 
        item.bank_account_id === selectedAccount
      );

      const payables = (allPayables || []).filter(item => 
        item.bank_account_id === selectedAccount
      );

      const allTransactions: BankTransaction[] = [
        ...receivables.map(item => ({
          id: item.id,
          date: item.payment_date || item.due_date,
          description: item.description,
          amount: item.amount,
          type: 'income' as const,
          status: item.status,
          customer_name: item.customers?.name,
          category_name: item.categories?.name,
          subcategory_name: item.subcategories?.name,
        })),
        ...payables.map(item => ({
          id: item.id,
          date: item.payment_date || item.due_date,
          description: item.description,
          amount: item.amount,
          type: 'expense' as const,
          status: item.status,
          supplier_name: item.suppliers?.name,
          category_name: item.categories?.name,
          subcategory_name: item.subcategories?.name,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erro ao carregar extrato",
        description: "Não foi possível carregar as movimentações",
        variant: "destructive",
      });
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchTransactions();
    }
  }, [selectedAccount, selectedPeriod, currentMonth, customStartDate, customEndDate]);

  const resetForm = () => {
    setFormData({
      name: '',
      bank_name: '',
      account_number: '',
      account_type: 'checking',
      balance: '',
    });
    setEditingAccount(null);
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

      const accountData = {
        name: formData.name,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_type: formData.account_type as 'checking' | 'savings' | 'credit',
        balance: parseFloat(formData.balance) || 0,
        company_id: profile.company_id,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);

        if (error) throw error;

        toast({
          title: "Conta bancária atualizada!",
          description: "As informações foram atualizadas com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('bank_accounts')
          .insert([accountData]);

        if (error) throw error;

        toast({
          title: "Conta bancária cadastrada!",
          description: "A nova conta bancária foi adicionada com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving account:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as informações",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (account: BankAccount) => {
    setFormData({
      name: account.name,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_type: account.account_type,
      balance: account.balance?.toString() || '',
    });
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Conta bancária excluída!",
        description: "A conta bancária foi removida com sucesso.",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a conta bancária",
        variant: "destructive",
      });
    }
  };

  const filteredAccounts = bankAccounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountTypeLabel = (type: string) => {
    const types = {
      checking: 'Conta Corrente',
      savings: 'Poupança',
      credit: 'Cartão de Crédito'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusLabel = (status: string) => {
    const statuses = {
      pending: 'Em Aberto',
      paid: 'Pago',
      cancelled: 'Cancelado',
      overdue: 'Vencido'
    };
    return statuses[status as keyof typeof statuses] || status;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'Por Mês':
        return `${format(currentMonth, 'MMMM yyyy', { locale: ptBR })}`;
      case 'Hoje':
        return 'Hoje';
      case 'Este Ano':
        return 'Este Ano';
      case 'Personalizado':
        if (customStartDate && customEndDate) {
          return `${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`;
        }
        return 'Personalizado';
      default:
        return 'Todas';
    }
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const renderPeriodSelector = () => (
    <div className="space-y-2">
      <Label>Período</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {getPeriodLabel(selectedPeriod)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-2">
            <div className="space-y-1">
              {['Por Mês', 'Hoje', 'Este Ano', 'Todas', 'Personalizado'].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedPeriod(option);
                    if (option === 'Por Mês') {
                      setCurrentMonth(new Date());
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground",
                    selectedPeriod === option && "bg-accent text-accent-foreground"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            {selectedPeriod === 'Por Mês' && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {selectedPeriod === 'Personalizado' && (
              <div className="border-t pt-3 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const getSummaryData = () => {
    const incomeOpen = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const incomePaid = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const expenseOpen = transactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const expensePaid = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
    const totalPeriod = incomePaid - expensePaid;
    
    // Calcular saldo: saldo inicial da conta + receitas pagas - despesas pagas
    const currentBalance = (selectedAccountData?.balance || 0) + incomePaid - expensePaid;

    return { incomeOpen, incomePaid, expenseOpen, expensePaid, totalPeriod, currentBalance };
  };
  
  const selectedAccountData = bankAccounts.find(acc => acc.id === selectedAccount);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie as contas bancárias e visualize extratos</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta Bancária
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
              </DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Atualize as informações' : 'Preencha as informações da nova conta bancária'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Conta Principal Banco do Brasil"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Nome do Banco</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_number">Número da Conta</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="123456-7"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_type">Tipo de Conta</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, account_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Conta Corrente</SelectItem>
                      <SelectItem value="savings">Poupança</SelectItem>
                      <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo Inicial (R$)</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                  placeholder="0,00"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounts">
            <CreditCard className="mr-2 h-4 w-4" />
            Contas Bancárias
          </TabsTrigger>
          <TabsTrigger value="statement">
            <History className="mr-2 h-4 w-4" />
            Extrato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankAccounts.length}</div>
            <p className="text-xs text-muted-foreground">contas cadastradas</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {bankAccounts.reduce((total, acc) => total + (acc.balance || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">saldo total das contas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bankAccounts.filter(acc => acc.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">contas ativas</p>
          </CardContent>
        </Card>
          </div>

          <Card>
        <CardHeader>
          <CardTitle>Lista de Contas Bancárias</CardTitle>
          <CardDescription>
            Visualize e gerencie todas as contas bancárias cadastradas
          </CardDescription>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, banco ou número da conta..."
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
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-10">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Nenhuma conta bancária encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece cadastrando a primeira conta bancária da sua empresa.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.bank_name || '-'}</TableCell>
                    <TableCell>{account.account_number || '-'}</TableCell>
                    <TableCell>{getAccountTypeLabel(account.account_type)}</TableCell>
                    <TableCell>
                      R$ {(account.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                        {account.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
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
        </TabsContent>

        <TabsContent value="statement" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-select">Conta Bancária</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderPeriodSelector()}
          </div>

          {selectedAccount && selectedAccountData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {selectedAccountData.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedAccountData.bank_name} • {getPeriodLabel(selectedPeriod)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Receitas em aberto</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {getSummaryData().incomeOpen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Receitas realizadas</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {getSummaryData().incomePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Despesas em aberto</p>
                            <p className="text-lg font-bold text-red-600">
                              R$ {getSummaryData().expenseOpen.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <ArrowDownLeft className="h-4 w-4 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Despesas realizadas</p>
                            <p className="text-lg font-bold text-red-600">
                              R$ {getSummaryData().expensePaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <ArrowDownLeft className="h-4 w-4 text-red-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                            <p className={`text-lg font-bold ${getSummaryData().currentBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              R$ {getSummaryData().currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total do período</p>
                            <p className={`text-lg font-bold ${getSummaryData().totalPeriod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              R$ {getSummaryData().totalPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Extrato de Movimentações</CardTitle>
                  <CardDescription>
                    Histórico detalhado das transações da conta selecionada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-10">
                      <History className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-semibold">Nenhuma movimentação encontrada</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Não há transações para o período selecionado.
                      </p>
                    </div>
                  ) : (
                    <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead>Data</TableHead>
                           <TableHead>Tipo</TableHead>
                           <TableHead>Descrição</TableHead>
                           <TableHead>Categoria</TableHead>
                           <TableHead>Status</TableHead>
                           <TableHead>Valor</TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {transactions.map((transaction) => (
                           <TableRow key={transaction.id}>
                             <TableCell>
                               {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                             </TableCell>
                             <TableCell>
                               <div className="flex items-center gap-2">
                                 {transaction.type === 'income' ? (
                                   <ArrowUpRight className="h-4 w-4 text-green-600" />
                                 ) : (
                                   <ArrowDownLeft className="h-4 w-4 text-red-600" />
                                 )}
                                 <span className="text-sm font-medium">
                                   {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                                 </span>
                               </div>
                             </TableCell>
                             <TableCell>
                               <div>
                                 <p className="font-medium">{transaction.description}</p>
                                 {transaction.customer_name && (
                                   <p className="text-sm text-muted-foreground">Cliente: {transaction.customer_name}</p>
                                 )}
                                 {transaction.supplier_name && (
                                   <p className="text-sm text-muted-foreground">Fornecedor: {transaction.supplier_name}</p>
                                 )}
                               </div>
                             </TableCell>
                             <TableCell>
                               <div>
                                 <p className="text-sm">
                                   {transaction.category_name || 'Sem categoria'}
                                 </p>
                                 {transaction.subcategory_name && (
                                   <p className="text-xs text-muted-foreground">
                                     {transaction.subcategory_name}
                                   </p>
                                 )}
                               </div>
                             </TableCell>
                             <TableCell>
                               <Badge 
                                 variant={
                                   transaction.status === 'paid' ? 'default' : 
                                   transaction.status === 'pending' ? 'secondary' : 'destructive'
                                 }
                               >
                                 {getStatusLabel(transaction.status)}
                               </Badge>
                             </TableCell>
                             <TableCell>
                               <span className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                 {transaction.type === 'income' ? '+' : '-'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                               </span>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Bancos;