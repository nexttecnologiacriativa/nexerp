import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Users, Package, FileText, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialData {
  receivable: number;
  payable: number;
  balance: number;
  bankBalance: number;
  customers: number;
  products: number;
  sales: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState<FinancialData>({
    receivable: 0,
    payable: 0,
    balance: 0,
    bankBalance: 0,
    customers: 0,
    products: 0,
    sales: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("current");
  const [showValues, setShowValues] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user's company_id from profile
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

      // Fetch ALL receivables for flow calculation
      const { data: allReceivables } = await supabase
        .from('accounts_receivable')
        .select('amount, status')
        .eq('company_id', profile.company_id);

      // Fetch ALL payables for flow calculation  
      const { data: allPayables } = await supabase
        .from('accounts_payable')
        .select('amount, status')
        .eq('company_id', profile.company_id);

      // Fetch pending receivables for display
      const { data: receivables } = await supabase
        .from('accounts_receivable')
        .select('amount, status')
        .eq('company_id', profile.company_id)
        .eq('status', 'pending');

      // Fetch pending payables for display
      const { data: payables } = await supabase
        .from('accounts_payable')
        .select('amount, status')
        .eq('company_id', profile.company_id)
        .eq('status', 'pending');

      // Fetch bank accounts balance
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('balance, status')
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      // Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      // Fetch services count
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      // Fetch sales count
      const { count: salesCount } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id)
        .eq('status', 'active');

      const totalReceivable = receivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalPayable = payables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const totalBankBalance = bankAccounts?.reduce((sum, account) => sum + Number(account.balance), 0) || 0;

      setFinancialData({
        receivable: totalReceivable,
        payable: totalPayable,
        balance: totalBankBalance + totalReceivable - totalPayable,
        bankBalance: totalBankBalance,
        customers: customersCount || 0,
        products: (productsCount || 0) + (servicesCount || 0),
        sales: salesCount || 0,
      });

      // Calculate flow with ALL accounts (receivable - payable)
      const allReceivableTotal = allReceivables?.reduce((sum, item) => sum + parseFloat(String(item.amount) || '0'), 0) || 0;
      const allPayableTotal = allPayables?.reduce((sum, item) => sum + parseFloat(String(item.amount) || '0'), 0) || 0;
      const monthlyFlow = allReceivableTotal - allPayableTotal;

      // Fetch monthly data for trend analysis
      await fetchMonthlyTrends(profile.company_id);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyTrends = async (companyId: string) => {
    try {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);

        // Fetch ALL receivables for the month
        const { data: income } = await supabase
          .from('accounts_receivable')
          .select('amount')
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Fetch ALL payables for the month
        const { data: expenses } = await supabase
          .from('accounts_payable')
          .select('amount')
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const monthIncome = income?.reduce((sum, item) => sum + parseFloat(String(item.amount) || '0'), 0) || 0;
        const monthExpenses = expenses?.reduce((sum, item) => sum + parseFloat(String(item.amount) || '0'), 0) || 0;

        months.push({
          month: format(date, 'MMM/yyyy', { locale: ptBR }),
          income: monthIncome,
          expenses: monthExpenses,
          balance: monthIncome - monthExpenses,
        });
      }

      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
    }
  };

  const getBalanceStatus = (balance: number) => {
    if (balance > 0) {
      return { color: "text-green-600", icon: TrendingUp, label: "Positivo" };
    } else if (balance < 0) {
      return { color: "text-red-600", icon: TrendingDown, label: "Negativo" };
    }
    return { color: "text-gray-600", icon: DollarSign, label: "Neutro" };
  };

  const formatCurrency = (value: number) => {
    if (!showValues) {
      return "••••••";
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    if (!showValues) {
      return "••••";
    }
    return value.toString();
  };

  const balanceStatus = getBalanceStatus(financialData.balance);
  const BalanceIcon = balanceStatus.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">{/* Removido p-6 pois já está no Layout */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Visão geral da situação financeira da empresa</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowValues(!showValues)}
            className="flex items-center gap-2"
          >
            {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showValues ? "Ocultar valores" : "Mostrar valores"}
          </Button>
          
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
        </div>
      </div>

      {/* Main Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Contas a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-all">
              {formatCurrency(financialData.receivable)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores pendentes de recebimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Contas a Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 break-all">
              {formatCurrency(financialData.payable)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valores pendentes de pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo Bancário</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-all">
              {formatCurrency(financialData.bankBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo atual nas contas bancárias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo Projetado</CardTitle>
            <BalanceIcon className={`h-4 w-4 ${balanceStatus.color} flex-shrink-0`} />
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${balanceStatus.color} break-all`}>
              {formatCurrency(financialData.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Bancário + Receber - Pagar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo Mensal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyData.length > 0 
                ? formatCurrency(monthlyData[monthlyData.length - 1].balance)
                : formatCurrency(financialData.balance)
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyData.length > 0 ? 'Resultado do último mês' : 'Saldo atual projetado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialData.customers}</div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos/Serviços</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialData.products}</div>
            <p className="text-xs text-muted-foreground">
              Itens no catálogo ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{financialData.sales}</div>
            <p className="text-xs text-muted-foreground">
              Total de vendas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência dos Últimos 6 Meses</CardTitle>
          <CardDescription>
            Análise do fluxo de receitas e despesas mensais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-medium">{month.month}</div>
                  <div className="flex items-center space-x-6">
                    <div className="text-sm">
                      <span className="text-green-600 font-medium">
                        +{formatCurrency(month.income)}
                      </span>
                      <span className="text-muted-foreground ml-1">receitas</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-red-600 font-medium">
                        -{formatCurrency(month.expenses)}
                      </span>
                      <span className="text-muted-foreground ml-1">despesas</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={month.balance >= 0 ? "default" : "destructive"}>
                    {formatCurrency(month.balance)}
                  </Badge>
                  {month.balance >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;