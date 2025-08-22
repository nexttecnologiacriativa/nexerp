import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { DatePickerWithRange } from '@/components/ui/calendar';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  FileBarChart, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Receipt,
  Calendar,
  Eye,
  Landmark,
  PiggyBank
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  financial: {
    revenue: any[];
    expenses: any[];
    cashFlow: any[];
  };
  sales: {
    monthly: any[];
    byProduct: any[];
    byCustomer: any[];
  };
  customers: {
    new: any[];
    active: any[];
    byLocation: any[];
  };
  products: {
    topSelling: any[];
    inventory: any[];
    lowStock: any[];
  };
  banks: {
    accounts: any[];
    totalBalance: number;
  };
  costCenters: {
    expenses: any[];
    data: any[];
    totalExpenses: number;
    totalRevenue: number;
    totalProfit: number;
    total: number;
  };
}

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('last6months');
  const [dateRange, setDateRange] = useState<{from: Date, to: Date} | undefined>();
  const { toast } = useToast();

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
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

      const companyId = profile.company_id;
      
      // Calcular período baseado na seleção (mesma lógica do FluxoCaixa)
      let startDate: Date;
      let endDate: Date;
      
      switch (selectedPeriod) {
        case 'last3months':
          startDate = subMonths(endOfMonth(new Date()), 3);
          endDate = endOfMonth(new Date());
          break;
        case 'last6months':
          startDate = subMonths(endOfMonth(new Date()), 6);
          endDate = endOfMonth(new Date());
          break;
        case 'last12months':
          startDate = subMonths(endOfMonth(new Date()), 12);
          endDate = endOfMonth(new Date());
          break;
        case 'custom':
          if (dateRange?.from && dateRange?.to) {
            startDate = startOfMonth(dateRange.from);
            endDate = endOfMonth(dateRange.to);
          } else {
            startDate = subMonths(endOfMonth(new Date()), 6);
            endDate = endOfMonth(new Date());
          }
          break;
        default:
          startDate = subMonths(endOfMonth(new Date()), 6);
          endDate = endOfMonth(new Date());
      }

      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      console.log('Fetching report data for period:', startDateStr, 'to', endDateStr);

      // Fetch TODAS as receitas (accounts_receivable) - incluindo pagas e pendentes
      const { data: allReceivables, error: receivablesError } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr);

      if (receivablesError) {
        console.error('Error fetching receivables:', receivablesError);
      }

      // Fetch receitas PAGAS (para fluxo de caixa real)
      const { data: paidReceivables } = await supabase
        .from('accounts_receivable')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('payment_date', startDateStr)
        .lte('payment_date', endDateStr);

      // Fetch TODAS as despesas (accounts_payable) - incluindo pagas e pendentes
      const { data: allPayables, error: payablesError } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr);

      if (payablesError) {
        console.error('Error fetching payables:', payablesError);
      }

      // Fetch despesas PAGAS (para fluxo de caixa real)
      const { data: paidPayables } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('payment_date', startDateStr)
        .lte('payment_date', endDateStr);

      // Fetch vendas (sales)
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name),
          sale_items (
            *,
            products (name)
          )
        `)
        .eq('company_id', companyId)
        .gte('sale_date', startDateStr)
        .lte('sale_date', endDateStr);

      if (salesError) {
        console.error('Error fetching sales:', salesError);
      }

      // Fetch clientes
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);

      if (customersError) {
        console.error('Error fetching customers:', customersError);
      }

      // Fetch produtos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      }

      // Fetch contas bancárias
      const { data: bankAccounts, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (bankError) {
        console.error('Error fetching bank accounts:', bankError);
      }

      // Fetch centros de custos e suas despesas
      const { data: costCenters, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (costCentersError) {
        console.error('Error fetching cost centers:', costCentersError);
      }

      console.log('Fetched data:', {
        allReceivables: allReceivables?.length || 0,
        paidReceivables: paidReceivables?.length || 0,
        allPayables: allPayables?.length || 0,
        paidPayables: paidPayables?.length || 0,
        sales: sales?.length || 0,
        customers: customers?.length || 0,
        products: products?.length || 0,
        bankAccounts: bankAccounts?.length || 0,
        costCenters: costCenters?.length || 0
      });

      // Processar dados para gráficos
      const processedData = processReportData({
        receivables: allReceivables || [],
        paidReceivables: paidReceivables || [],
        payables: allPayables || [],
        paidPayables: paidPayables || [],
        sales: sales || [],
        customers: customers || [],
        products: products || [],
        bankAccounts: bankAccounts || [],
        costCenters: costCenters || [],
        startDate,
        endDate
      });

      setReportData(processedData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar os dados dos relatórios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (data: any): ReportData => {
    const { receivables, paidReceivables, payables, paidPayables, sales, customers, products, bankAccounts, costCenters, startDate, endDate } = data;

    // Processar dados mensais
    const monthlyData = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);
      const monthKey = format(current, 'MMM yyyy', { locale: ptBR });

      // Receitas do período (TODAS - não apenas as pagas)
      const monthReceivables = receivables.filter((r: any) => {
        const date = new Date(r.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      // Receitas PAGAS no período (para fluxo de caixa real)
      const monthPaidReceivables = paidReceivables.filter((r: any) => {
        const date = new Date(r.payment_date);
        return date >= monthStart && date <= monthEnd;
      });

      // Despesas do período (TODAS - não apenas as pagas)
      const monthPayables = payables.filter((p: any) => {
        const date = new Date(p.created_at);  
        return date >= monthStart && date <= monthEnd;
      });

      // Despesas PAGAS no período (para fluxo de caixa real)
      const monthPaidPayables = paidPayables.filter((p: any) => {
        const date = new Date(p.payment_date);  
        return date >= monthStart && date <= monthEnd;
      });

      const monthSales = sales.filter((s: any) => {
        const date = new Date(s.sale_date);
        return date >= monthStart && date <= monthEnd;
      });

      // Calcular valores - usando TODAS as contas (não apenas pagas) para receitas e despesas projetadas
      const revenue = monthReceivables.reduce((sum: number, r: any) => {
        const amount = parseFloat(String(r.amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const expenses = monthPayables.reduce((sum: number, p: any) => {
        const amount = parseFloat(String(p.amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      // Calcular fluxo de caixa real (apenas contas pagas)
      const paidRevenue = monthPaidReceivables.reduce((sum: number, r: any) => {
        const amount = parseFloat(String(r.amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const paidExpenses = monthPaidPayables.reduce((sum: number, p: any) => {
        const amount = parseFloat(String(p.amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const salesAmount = monthSales.reduce((sum: number, s: any) => {
        const amount = parseFloat(String(s.total_amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      monthlyData.push({
        month: monthKey,
        receitas: revenue,
        despesas: expenses,
        receitasPagas: paidRevenue,
        despesasPagas: paidExpenses,
        vendas: salesAmount,
        lucro: paidRevenue - paidExpenses, // Lucro baseado em valores pagos
        lucroProjetado: revenue - expenses // Lucro projetado baseado em todas as contas
      });

      current.setMonth(current.getMonth() + 1);
    }

    // Top produtos vendidos
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
    
    sales.forEach((sale: any) => {
      if (sale.sale_items && Array.isArray(sale.sale_items)) {
        sale.sale_items.forEach((item: any) => {
          const productName = item.products?.name || `Produto ${item.product_id}`;
          if (!productSales[productName]) {
            productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
          }
          const quantity = parseFloat(String(item.quantity || '0'));
          const totalPrice = parseFloat(String(item.total_price || '0'));
          
          productSales[productName].quantity += isNaN(quantity) ? 0 : quantity;
          productSales[productName].revenue += isNaN(totalPrice) ? 0 : totalPrice;
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Clientes por cidade
    const customersByLocation: { [key: string]: number } = {};
    customers.forEach((customer: any) => {
      const city = customer.city || 'Não informado';
      customersByLocation[city] = (customersByLocation[city] || 0) + 1;
    });

    const locationData = Object.entries(customersByLocation)
      .map(([city, count]) => ({ name: city, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Produtos com estoque baixo
    const lowStockProducts = products
      .filter((p: any) => (p.stock_quantity || 0) <= 10)
      .sort((a: any, b: any) => (a.stock_quantity || 0) - (b.stock_quantity || 0))
      .slice(0, 10);

    // Processar dados dos bancos
    const totalBankBalance = bankAccounts.reduce((sum: number, account: any) => {
      return sum + (Number(account.balance) || 0);
    }, 0);

    // Processar receitas e despesas por centro de custos
    const costCenterData: { [key: string]: { 
      name: string, 
      expenses: number, 
      revenue: number,
      profit: number,
      color: string 
    } } = {};
    
    const centerColors = [
      'hsl(var(--primary))',
      'hsl(var(--secondary))', 
      'hsl(220, 70%, 50%)',
      'hsl(160, 60%, 45%)',
      'hsl(30, 100%, 50%)',
      'hsl(270, 50%, 60%)',
      'hsl(340, 80%, 55%)',
      'hsl(200, 90%, 45%)'
    ];
    
    // Inicializar centros de custos
    costCenters.forEach((center: any, index: number) => {
      costCenterData[center.id] = {
        name: center.name,
        expenses: 0,
        revenue: 0,
        profit: 0,
        color: centerColors[index % centerColors.length]
      };
    });

    // Agregar despesas por centro de custos (APENAS CONTAS PAGAS)
    paidPayables.forEach((expense: any) => {
      if (expense.cost_center_id && costCenterData[expense.cost_center_id]) {
        costCenterData[expense.cost_center_id].expenses += Number(expense.amount) || 0;
      }
    });

    // Para receitas, vamos usar as vendas que podem ter sido associadas indiretamente
    // Como accounts_receivable não tem cost_center_id, vamos usar vendas como proxy
    paidReceivables.forEach((revenue: any) => {
      // Se não há centro específico, distribuir proporcionalmente ou usar um centro padrão
      // Por simplicidade, vamos usar o primeiro centro ativo para mostrar o conceito
      const firstCenterId = Object.keys(costCenterData)[0];
      if (firstCenterId) {
        costCenterData[firstCenterId].revenue += Number(revenue.amount) || 0;
      }
    });

    // Calcular lucro (receita - despesa) para cada centro
    Object.keys(costCenterData).forEach(centerId => {
      const center = costCenterData[centerId];
      center.profit = center.revenue - center.expenses;
    });

    const costCenterArray = Object.values(costCenterData)
      .filter(center => center.expenses > 0 || center.revenue > 0)
      .sort((a, b) => b.expenses - a.expenses);

    const totalCostCenterExpenses = costCenterArray.reduce((sum, center) => sum + center.expenses, 0);
    const totalCostCenterRevenue = costCenterArray.reduce((sum, center) => sum + center.revenue, 0);
    const totalCostCenterProfit = totalCostCenterRevenue - totalCostCenterExpenses;

    return {
      financial: {
        revenue: monthlyData,
        expenses: monthlyData,
        cashFlow: monthlyData
      },
      sales: {
        monthly: monthlyData,
        byProduct: topProducts,
        byCustomer: sales.slice(0, 10)
      },
      customers: {
        new: monthlyData,
        active: customers,
        byLocation: locationData
      },
      products: {
        topSelling: topProducts,
        inventory: products,
        lowStock: lowStockProducts
      },
      banks: {
        accounts: bankAccounts,
        totalBalance: totalBankBalance
      },
      costCenters: {
        expenses: costCenterArray,
        data: costCenterArray,
        totalExpenses: totalCostCenterExpenses,
        totalRevenue: totalCostCenterRevenue,
        totalProfit: totalCostCenterProfit,
        total: totalCostCenterExpenses // manter compatibilidade
      }
    };
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, dateRange]);

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Nenhum dado encontrado para o período selecionado</p>
          <Button onClick={fetchReportData} className="mt-4">Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Análise completa dos dados da sua empresa</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last3months">Últimos 3 meses</SelectItem>
                  <SelectItem value="last6months">Últimos 6 meses</SelectItem>
                  <SelectItem value="last12months">Últimos 12 meses</SelectItem>
                  <SelectItem value="custom">Período personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Período personalizado</Label>
                <div className="flex space-x-2">
                  <Input 
                    type="date" 
                    placeholder="Data inicial"
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setDateRange(prev => ({ ...prev, from: newDate, to: prev?.to || new Date() }));
                    }}
                  />
                  <Input 
                    type="date" 
                    placeholder="Data final"
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setDateRange(prev => ({ from: prev?.from || new Date(), to: newDate }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="centers">Centros de Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Recebida</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {reportData?.financial.revenue.reduce((sum, item) => sum + item.receitasPagas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  apenas valores recebidos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {reportData?.financial.expenses.reduce((sum, item) => sum + item.despesasPagas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  apenas valores pagos
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido Real</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {reportData?.financial.cashFlow.reduce((sum, item) => sum + item.lucro, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  receitas - despesas pagas
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo em Bancos</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {reportData?.banks.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <PiggyBank className="mr-1 h-3 w-3" />
                  total em {reportData?.banks.accounts.length} conta(s)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData?.financial.revenue.reduce((sum, item) => sum + item.receitasPagas, 0) > 0 
                    ? ((reportData?.financial.cashFlow.reduce((sum, item) => sum + item.lucro, 0) / reportData?.financial.revenue.reduce((sum, item) => sum + item.receitasPagas, 0)) * 100).toFixed(1)
                    : '0.0'
                  }%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  baseado em valores reais
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receitas vs Despesas</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.financial.revenue || [], 'receitas-despesas')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.financial.revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    />
                    <Legend />
                    <Bar dataKey="receitasPagas" fill="#8884d8" name="Receitas Recebidas" />
                    <Bar dataKey="despesasPagas" fill="#82ca9d" name="Despesas Pagas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.financial.cashFlow || [], 'fluxo-caixa')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData?.financial.cashFlow || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    />
                    <Area type="monotone" dataKey="lucro" stroke="#8884d8" fill="#8884d8" name="Lucro" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vendas Mensais</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.sales.monthly || [], 'vendas-mensais')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData?.sales.monthly || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    />
                    <Line type="monotone" dataKey="vendas" stroke="#8884d8" strokeWidth={2} name="Vendas" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Produtos Vendidos</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.sales.byProduct || [], 'top-produtos')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.sales.byProduct || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toLocaleString('pt-BR')}`, '']}
                    />
                    <Bar dataKey="quantity" fill="#8884d8" name="Quantidade Vendida" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Localização</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.customers.byLocation || [], 'clientes-localizacao')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData?.customers.byLocation || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData?.customers.byLocation?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Clientes</span>
                    <span className="text-2xl font-bold">{reportData?.customers.active.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Clientes Ativos</span>
                    <span className="text-2xl font-bold text-green-600">
                      {reportData?.customers.active.filter(c => c.status === 'active').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Novos este Mês</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {reportData?.customers.active.filter(c => {
                        const customerDate = new Date(c.created_at);
                        const now = new Date();
                        return customerDate.getMonth() === now.getMonth() && customerDate.getFullYear() === now.getFullYear();
                      }).length || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="centers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Centros</CardTitle>
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                  {reportData?.costCenters.data?.length || 0}
                </div>
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mt-1">
                  <Eye className="mr-1 h-3 w-3" />
                  centros ativos
                </div>
              </CardContent>
              <div className="absolute -bottom-2 -right-2 opacity-10">
                <Package className="h-16 w-16" />
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Receitas</CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-800 dark:text-green-200">
                  R$ {(reportData?.costCenters.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-1">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  receitas por centro
                </div>
              </CardContent>
              <div className="absolute -bottom-2 -right-2 opacity-10">
                <TrendingUp className="h-16 w-16" />
              </div>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Despesas</CardTitle>
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-800 dark:text-red-200">
                  R$ {(reportData?.costCenters.totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-red-600 dark:text-red-400 mt-1">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  despesas por centro
                </div>
              </CardContent>
              <div className="absolute -bottom-2 -right-2 opacity-10">
                <TrendingDown className="h-16 w-16" />
              </div>
            </Card>

            <Card className={`relative overflow-hidden border-2 ${
              (reportData?.costCenters.totalProfit || 0) >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-300 dark:border-emerald-700' 
                : 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-300 dark:border-orange-700'
            }`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${
                  (reportData?.costCenters.totalProfit || 0) >= 0 
                    ? 'text-emerald-700 dark:text-emerald-300' 
                    : 'text-orange-700 dark:text-orange-300'
                }`}>
                  Lucro/Prejuízo
                </CardTitle>
                <DollarSign className={`h-5 w-5 ${
                  (reportData?.costCenters.totalProfit || 0) >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${
                  (reportData?.costCenters.totalProfit || 0) >= 0 
                    ? 'text-emerald-800 dark:text-emerald-200' 
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {(reportData?.costCenters.totalProfit || 0) >= 0 ? '+' : ''}
                  R$ {(reportData?.costCenters.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center text-xs mt-1 ${
                  (reportData?.costCenters.totalProfit || 0) >= 0 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {(reportData?.costCenters.totalProfit || 0) >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {(reportData?.costCenters.totalProfit || 0) >= 0 ? 'lucro total' : 'prejuízo total'}
                </div>
              </CardContent>
              <div className="absolute -bottom-2 -right-2 opacity-10">
                <DollarSign className="h-16 w-16" />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Receitas vs Despesas</CardTitle>
                    <CardDescription>Comparativo por centro de custos</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="hover-scale"
                    onClick={() => exportToCSV(
                      reportData?.costCenters.data?.map(center => ({
                        centro: center.name,
                        receitas: center.revenue,
                        despesas: center.expenses,
                        lucro: center.profit
                      })) || [], 
                      'receitas-despesas-centros-custos'
                    )}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={reportData?.costCenters.data || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value, name) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name === 'revenue' ? 'Receitas' : name === 'expenses' ? 'Despesas' : 'Lucro'
                      ]}
                    />
                    <Legend />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--primary))" 
                      name="Receitas"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="hsl(var(--destructive))" 
                      name="Despesas"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10 border-b">
                <CardTitle className="text-lg font-semibold">Distribuição de Despesas</CardTitle>
                <CardDescription>Proporção por centro de custos</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={reportData?.costCenters.data?.filter(center => center.expenses > 0) || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 5 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={120}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="expenses"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {reportData?.costCenters.data?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color || COLORS[index % COLORS.length]}
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Despesas']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10 border-b">
              <CardTitle className="text-lg font-semibold">Detalhamento por Centro de Custos</CardTitle>
              <CardDescription>Análise completa de receitas, despesas e lucratividade</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-semibold">Centro de Custos</th>
                      <th className="text-right p-4 font-semibold text-green-700 dark:text-green-400">Receitas</th>
                      <th className="text-right p-4 font-semibold text-red-700 dark:text-red-400">Despesas</th>
                      <th className="text-right p-4 font-semibold">Lucro/Prejuízo</th>
                      <th className="text-right p-4 font-semibold">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.costCenters.data?.map((center, index) => {
                      const margin = center.revenue > 0 ? ((center.profit / center.revenue) * 100) : 0;
                      return (
                        <tr 
                          key={index} 
                          className="border-b hover:bg-muted/30 transition-colors animate-fade-in"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full shadow-sm"
                                style={{ backgroundColor: center.color }}
                              />
                              <span className="font-medium">{center.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-green-700 dark:text-green-400">
                            R$ {center.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-right font-mono text-red-700 dark:text-red-400">
                            R$ {center.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-4 text-right font-mono font-semibold ${
                            center.profit >= 0 
                              ? 'text-emerald-700 dark:text-emerald-400' 
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {center.profit >= 0 ? '+' : ''}R$ {center.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`p-4 text-right font-mono ${
                            margin >= 0 
                              ? 'text-emerald-700 dark:text-emerald-400' 
                              : 'text-orange-700 dark:text-orange-400'
                          }`}>
                            {margin >= 0 ? '+' : ''}{margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;