import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Download, Filter, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDisplay, parseISODate, dateToISOString } from "@/lib/date-utils";

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
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [selectedType, setSelectedType] = useState("all");
  const [bankAccountName, setBankAccountName] = useState<string>("");
  const [initialBalance, setInitialBalance] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchCashFlowData();
    }
  }, [user, selectedPeriod]);

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
      
      switch (selectedPeriod) {
        case "last":
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          break;
        case "quarter":
          startDate = startOfMonth(subMonths(new Date(), 3));
          endDate = endOfMonth(new Date());
          break;
        case "year":
          startDate = startOfMonth(subMonths(new Date(), 12));
          endDate = endOfMonth(new Date());
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
          status,
          customers:customer_id (name),
          categories:category_id (name),
          subcategories:subcategory_id (name)
        `)
        .eq('status', 'paid')
        .gte('payment_date', dateToISOString(startDate))
        .lte('payment_date', dateToISOString(endDate));

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
          status,
          suppliers:supplier_id (name),
          categories:category_id (name),
          subcategories:subcategory_id (name)
        `)
        .eq('status', 'paid')
        .gte('payment_date', dateToISOString(startDate))
        .lte('payment_date', dateToISOString(endDate));

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
          date: item.payment_date || '',
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
          date: item.payment_date || '',
          description: item.description,
          type: "expense",
          amount: item.amount,
          status: item.status,
          category: item.subcategories?.name || item.categories?.name || 'Sem categoria'
        });
      });

      // Sort by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate running balance for each entry
      let runningBalance = accountId ? initialBalance : 0;
      entries.forEach(entry => {
        if (entry.type === 'income') {
          runningBalance += entry.amount;
        } else {
          runningBalance -= entry.amount;
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

  const filteredData = cashFlowData.filter(entry => {
    if (selectedType === "all") return true;
    return entry.type === selectedType;
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
        
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Mês Atual</SelectItem>
              <SelectItem value="last">Último Mês</SelectItem>
              <SelectItem value="quarter">Último Trimestre</SelectItem>
              <SelectItem value="year">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          
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
            <div className="flex items-center space-x-4">
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
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Nenhuma movimentação encontrada</TableCell>
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