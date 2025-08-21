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
  Eye
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

      console.log('Fetched data:', {
        allReceivables: allReceivables?.length || 0,
        paidReceivables: paidReceivables?.length || 0,
        allPayables: allPayables?.length || 0,
        paidPayables: paidPayables?.length || 0,
        sales: sales?.length || 0,
        customers: customers?.length || 0,
        products: products?.length || 0
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
    const { receivables, paidReceivables, payables, paidPayables, sales, customers, products, startDate, endDate } = data;

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
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {reportData?.financial.revenue.reduce((sum, item) => sum + item.receitas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +12% em relação ao período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {reportData?.financial.expenses.reduce((sum, item) => sum + item.despesas, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  -5% em relação ao período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {reportData?.financial.cashFlow.reduce((sum, item) => sum + item.lucro, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +25% em relação ao período anterior
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
                  {reportData?.financial.revenue.reduce((sum, item) => sum + item.receitas, 0) > 0 
                    ? ((reportData?.financial.cashFlow.reduce((sum, item) => sum + item.lucro, 0) / reportData?.financial.revenue.reduce((sum, item) => sum + item.receitas, 0)) * 100).toFixed(1)
                    : '0.0'
                  }%
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +3.2% em relação ao período anterior
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
                    <Bar dataKey="receitas" fill="#8884d8" name="Receitas" />
                    <Bar dataKey="despesas" fill="#82ca9d" name="Despesas" />
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

        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produtos com Estoque Baixo</CardTitle>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => exportToCSV(reportData?.products.lowStock || [], 'estoque-baixo')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData?.products.lowStock.slice(0, 8).map((product: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">{product.stock_quantity}</div>
                        <div className="text-xs text-muted-foreground">{product.unit_type}</div>
                      </div>
                    </div>
                  ))}
                  {reportData?.products.lowStock.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum produto com estoque baixo
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Inventário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total de Produtos</span>
                    <span className="text-2xl font-bold">{reportData?.products.inventory.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Produtos Ativos</span>
                    <span className="text-2xl font-bold text-green-600">
                      {reportData?.products.inventory.filter(p => p.status === 'active').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Estoque Baixo</span>
                    <span className="text-2xl font-bold text-red-600">
                      {reportData?.products.lowStock.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Valor Total em Estoque</span>
                    <span className="text-xl font-bold text-blue-600">
                      R$ {reportData?.products.inventory.reduce((total: number, p: any) => 
                        total + (p.price * p.stock_quantity), 0
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;