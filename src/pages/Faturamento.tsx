import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  Edit,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sale {
  id: string;
  sale_number: string;
  sale_date: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  net_amount: number;
  discount_amount: number;
  payment_method?: string;
  status: string;
  created_at: string;
}

interface BillingMetrics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  pendingReceivables: number;
  monthlyGrowth: number;
  topCustomer: string;
}

const Faturamento = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<BillingMetrics>({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    pendingReceivables: 0,
    monthlyGrowth: 0,
    topCustomer: '-'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('current_month');
  const { toast } = useToast();

  useEffect(() => {
    fetchBillingData();
  }, [periodFilter]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const companyId = profile.company_id;

      // Date filters
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      let dateFilter = '';
      switch (periodFilter) {
        case 'current_month':
          dateFilter = currentMonth.toISOString();
          break;
        case 'last_month':
          dateFilter = lastMonth.toISOString();
          break;
        case 'last_3_months':
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
          break;
        default:
          dateFilter = currentMonth.toISOString();
      }

      // Fetch sales with customer names
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customers!inner(name)
        `)
        .eq('company_id', companyId)
        .gte('sale_date', dateFilter)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      const formattedSales: Sale[] = salesData?.map(sale => ({
        ...sale,
        customer_name: sale.customers?.name || 'Cliente não informado'
      })) || [];

      setSales(formattedSales);

      // Calculate metrics
      const totalSales = formattedSales.length;
      const totalRevenue = formattedSales.reduce((sum, sale) => sum + Number(sale.net_amount), 0);
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Fetch pending receivables
      const { data: receivables } = await supabase
        .from('accounts_receivable')
        .select('amount')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      const pendingReceivables = receivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // Calculate monthly growth (compare with previous period)
      const { data: previousSales } = await supabase
        .from('sales')
        .select('net_amount')
        .eq('company_id', companyId)
        .gte('sale_date', lastMonth.toISOString())
        .lte('sale_date', lastMonthEnd.toISOString());

      const previousRevenue = previousSales?.reduce((sum, sale) => sum + Number(sale.net_amount), 0) || 0;
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Find top customer
      const customerSales = formattedSales.reduce((acc, sale) => {
        const customer = sale.customer_name || 'Sem cliente';
        acc[customer] = (acc[customer] || 0) + Number(sale.net_amount);
        return acc;
      }, {} as Record<string, number>);

      const topCustomer = Object.entries(customerSales)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';

      setMetrics({
        totalSales,
        totalRevenue,
        averageTicket,
        pendingReceivables,
        monthlyGrowth,
        topCustomer
      });

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de faturamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.sale_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'cancelled': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Indicadores de vendas e gestão de faturamento</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="last_month">Mês Anterior</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Vendas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              vendas no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 break-all">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              faturamento bruto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold break-all">
              {formatCurrency(metrics.averageTicket)}
            </div>
            <p className="text-xs text-muted-foreground">
              valor médio por venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">A Receber</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-all">
              {formatCurrency(metrics.pendingReceivables)}
            </div>
            <p className="text-xs text-muted-foreground">
              valores pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Crescimento</CardTitle>
            {metrics.monthlyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold ${metrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.monthlyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs. período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Melhor Cliente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base font-bold truncate" title={metrics.topCustomer}>
              {metrics.topCustomer}
            </div>
            <p className="text-xs text-muted-foreground">
              maior faturamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
          <CardDescription>
            Todas as vendas registradas no período selecionado
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da venda ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:max-w-sm"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">Nenhuma venda encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Não há vendas para o período e filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Número</TableHead>
                    <TableHead className="min-w-[100px]">Data</TableHead>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px]">Valor Bruto</TableHead>
                    <TableHead className="min-w-[100px]">Desconto</TableHead>
                    <TableHead className="min-w-[120px]">Valor Líquido</TableHead>
                    <TableHead className="min-w-[120px]">Pagamento</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="text-right min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {sale.sale_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={sale.customer_name}>
                        {sale.customer_name}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(sale.total_amount))}</TableCell>
                      <TableCell>
                        {sale.discount_amount > 0 ? formatCurrency(Number(sale.discount_amount)) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(sale.net_amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {sale.payment_method || 'Não informado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(sale.status)} className="text-xs">
                          {sale.status === 'active' ? 'Ativo' : 
                           sale.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Faturamento;