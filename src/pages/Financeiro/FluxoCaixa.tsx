import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Download, Filter, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDisplay, parseISODate, dateToISOString } from "@/lib/date-utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CashFlowEntry {
  id: string;
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  status: string;
  category: string;
  balance?: number;
}

interface DailyBalance {
  date: string;
  income: number;
  expenses: number;
  balance: number;
  accumulated: number;
}

const FluxoCaixa = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('accountId');
  
  const [cashFlowData, setCashFlowData] = useState<CashFlowEntry[]>([]);
  const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (user) {
      fetchCashFlowData();
    }
  }, [user, selectedPeriod, customStartDate, customEndDate]);

  const fetchCashFlowData = async () => {
    try {
      setLoading(true);
      
      // Buscar nome e saldo da conta bancária se accountId estiver definido
      if (accountId) {
        const { data: bankAccount } = await supabase
          .from('bank_accounts')
          .select('name, balance')
          .eq('id', accountId)
          .single();
        
        if (bankAccount) {
          setBankAccountName(bankAccount.name);
          setInitialBalance(bankAccount.balance || 0);
        }
      } else {
        setBankAccountName("");
        setInitialBalance(0);
      }
      
      // Calculate date range based on selected period
      let startDate: Date;
      let endDate: Date;
      let useAllDates = false;
      
      switch (selectedPeriod) {
        case "today":
          startDate = startOfDay(new Date());
          endDate = endOfDay(new Date());
          break;
        case "month":
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case "year":
          startDate = startOfYear(new Date());
          endDate = endOfYear(new Date());
          break;
        case "custom":
          if (customStartDate && customEndDate) {
            startDate = startOfDay(customStartDate);
            endDate = endOfDay(customEndDate);
          } else {
            startDate = startOfMonth(new Date());
            endDate = endOfMonth(new Date());
          }
          break;
        case "all":
          useAllDates = true;
          startDate = new Date(2000, 0, 1); // Data arbitrária antiga
          endDate = new Date(2099, 11, 31); // Data arbitrária futura
          break;
        default:
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
      }

      // Base query para contas a receber
      let receivablesQuery = supabase
        .from('accounts_receivable')
        .select(`
          id,
          description,
          amount,
          payment_date,
          due_date,
          status,
          customers:customer_id (name),
          categories:category_id (name),
          subcategories:subcategory_id (name)
        `);
      
      // Aplicar filtros de data apenas se não for "all"
      if (!useAllDates) {
        receivablesQuery = receivablesQuery
          .gte('due_date', dateToISOString(startDate))
          .lte('due_date', dateToISOString(endDate));
      }

      // Filtrar por conta bancária se accountId estiver definido
      if (accountId) {
        receivablesQuery = receivablesQuery.eq('bank_account_id', accountId);
      }

      const { data: receivables } = await receivablesQuery;

      // Base query para contas a pagar
      let payablesQuery = supabase
        .from('accounts_payable')
        .select(`
          id,
          description,
          amount,
          payment_date,
          due_date,
          status,
          suppliers:supplier_id (name),
          categories:category_id (name),
          subcategories:subcategory_id (name)
        `);
      
      // Aplicar filtros de data apenas se não for "all"
      if (!useAllDates) {
        payablesQuery = payablesQuery
          .gte('due_date', dateToISOString(startDate))
          .lte('due_date', dateToISOString(endDate));
      }

      // Filtrar por conta bancária se accountId estiver definido
      if (accountId) {
        payablesQuery = payablesQuery.eq('bank_account_id', accountId);
      }

      const { data: payables } = await payablesQuery;

      // Transform data for cash flow
      const entries: CashFlowEntry[] = [];

      receivables?.forEach(item => {
        entries.push({
          id: item.id,
          date: item.payment_date || item.due_date || '',
          description: item.description,
          type: "income",
          amount: item.amount,
          status: item.status,
          category: item.subcategories?.name || item.categories?.name || 'Sem categoria'
        });
      });

      payables?.forEach(item => {
        entries.push({
          id: item.id,
          date: item.payment_date || item.due_date || '',
          description: item.description,
          type: "expense",
          amount: item.amount,
          status: item.status,
          category: item.subcategories?.name || item.categories?.name || 'Sem categoria'
        });
      });

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate running balance for each entry (apenas para pagos)
      let runningBalance = accountId ? initialBalance : 0;
      entries.forEach(entry => {
        if (entry.status === 'paid') {
          if (entry.type === 'income') {
            runningBalance += entry.amount;
          } else {
            runningBalance -= entry.amount;
          }
        }
        entry.balance = runningBalance;
      });
      
      setCashFlowData(entries);

      // Calculate daily balances
      calculateDailyBalances(entries, startDate, endDate);

    } catch (error) {
      console.error('Error fetching cash flow data:', error);
      toast({
        title: "Erro ao carregar fluxo de caixa",
        description: "Não foi possível carregar os dados do fluxo de caixa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyBalances = (entries: CashFlowEntry[], startDate: Date, endDate: Date) => {
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    
    // Initialize all days in the period
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = format(current, 'yyyy-MM-dd');
      dailyMap.set(dateKey, { income: 0, expenses: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Aggregate by date
    entries.forEach(entry => {
      const dateKey = entry.date;
      if (dailyMap.has(dateKey)) {
        const day = dailyMap.get(dateKey)!;
        if (entry.type === 'income') {
          day.income += entry.amount;
        } else {
          day.expenses += entry.amount;
        }
      }
    });

    // Calculate accumulated balance
    let accumulated = 0;
    const balances: DailyBalance[] = [];

    Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, data]) => {
        const balance = data.income - data.expenses;
        accumulated += balance;
        
        balances.push({
          date,
          income: data.income,
          expenses: data.expenses,
          balance,
          accumulated
        });
      });

    setDailyBalances(balances);
  };

  const exportCashFlow = () => {
    // Simple CSV export functionality
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...cashFlowData.map(entry => [
        formatDateForDisplay(entry.date),
        entry.description,
        entry.type === 'income' ? 'Receita' : 'Despesa',
        entry.category,
        entry.amount.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fluxo-caixa.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Opções de status dinâmicas baseadas no tipo selecionado
  const getStatusOptions = () => {
    if (selectedType === "income") {
      return [
        { value: "all", label: "Todos os status" },
        { value: "pending", label: "Pendente" },
        { value: "received", label: "Recebido" }
      ];
    } else if (selectedType === "expense") {
      return [
        { value: "all", label: "Todos os status" },
        { value: "pending", label: "Pendente" },
        { value: "paid", label: "Pago" }
      ];
    } else {
      return [
        { value: "all", label: "Todos os status" },
        { value: "pending", label: "Pendente" },
        { value: "paid", label: "Pago" },
        { value: "received", label: "Recebido" }
      ];
    }
  };

  const filteredData = cashFlowData.filter(entry => {
    // Filtro por tipo
    if (selectedType !== "all" && entry.type !== selectedType) {
      return false;
    }
    
    // Filtro por status
    if (selectedStatus !== "all") {
      if (selectedStatus === "pending" && entry.status === "paid") {
        return false;
      }
      if (selectedStatus === "paid" && entry.status !== "paid") {
        return false;
      }
      if (selectedStatus === "received" && entry.status !== "paid") {
        return false;
      }
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            {accountId && (
              <Link to="/financeiro/bancos">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {accountId ? `Extrato - ${bankAccountName}` : 'Fluxo de Caixa'}
              </h1>
              <p className="text-muted-foreground">
                {accountId 
                  ? 'Movimentações desta conta bancária' 
                  : 'Acompanhe entradas e saídas de dinheiro'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !customEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
          
          <Button variant="outline" onClick={exportCashFlow}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters and Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações Financeiras</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Nenhuma movimentação encontrada</TableCell>
                </TableRow>
              ) : (
                filteredData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {formatDateForDisplay(entry.date)}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant={entry.type === 'income' ? 'default' : 'destructive'}>
                        {entry.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          entry.status === 'paid' 
                            ? 'default' 
                            : entry.status === 'overdue' 
                              ? 'destructive' 
                              : 'secondary'
                        }
                      >
                        {entry.status === 'paid' 
                          ? 'Pago' 
                          : entry.status === 'overdue' 
                            ? 'Atrasado' 
                            : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'income' ? '+' : '-'}
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.balance || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Diária do Saldo</CardTitle>
          <CardDescription>
            Acompanhe a evolução do saldo acumulado dia a dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {dailyBalances
              .filter(day => day.income > 0 || day.expenses > 0)
              .map((day, index) => {
                const [year, month, dayNum] = day.date.split('-');
                const formattedDay = `${dayNum}/${month}`;
                return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-20 text-sm font-medium">
                      {formattedDay}
                    </div>
                    <div className="flex items-center space-x-6">
                      {day.income > 0 && (
                        <div className="text-sm text-green-600">
                          +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.income)}
                        </div>
                      )}
                      {day.expenses > 0 && (
                        <div className="text-sm text-red-600">
                          -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.expenses)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={day.accumulated >= 0 ? "default" : "destructive"}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(day.accumulated)}
                    </Badge>
                  </div>
                </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoCaixa;