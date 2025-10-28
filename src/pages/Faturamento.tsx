import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  Edit,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  PiggyBank,
  FileDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import SalesForm from "@/components/SalesForm";
import { formatDateForDisplay } from "@/lib/date-utils";
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
  notes?: string;
}

interface SaleItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleDetails extends Sale {
  sale_items: SaleItem[];
  customers?: {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
}
interface BillingMetrics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  pendingReceivables: number;
  monthlyGrowth: number;
  topCustomer: string;
  totalBudgets: number;
  budgetValue: number;
}
const Faturamento = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [budgets, setBudgets] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [metrics, setMetrics] = useState<BillingMetrics>({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    pendingReceivables: 0,
    monthlyGrowth: 0,
    topCustomer: "-",
    totalBudgets: 0,
    budgetValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("current_month");
  const { toast } = useToast();
  const [viewingSale, setViewingSale] = useState<SaleDetails | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  useEffect(() => {
    fetchBillingData();
  }, [periodFilter]);
  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Get user's company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return;
      const companyId = profile.company_id;

      // Date filters
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      let dateFilter = "";
      switch (periodFilter) {
        case "current_month":
          dateFilter = currentMonth.toISOString();
          break;
        case "last_month":
          dateFilter = lastMonth.toISOString();
          break;
        case "last_3_months":
          dateFilter = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
          break;
        default:
          dateFilter = currentMonth.toISOString();
      }

      // Fetch all sales and separate by type
      const { data: allSalesData, error: salesError } = await supabase
        .from("sales")
        .select("*, customers(name)")
        .eq("company_id", companyId)
        .gte("sale_date", dateFilter)
        .order("sale_date", { ascending: false });

      if (salesError) {
        console.error("Error fetching sales:", salesError);
        throw salesError;
      }

      const formattedData =
        allSalesData?.map((sale) => ({
          ...sale,
          customer_name: sale.customers?.name || "Cliente não informado",
        })) || [];

      // Separate sales from budgets based on sale_number prefix or notes
      const actualSales = formattedData.filter(
        (sale) =>
          !sale.sale_number?.startsWith("ORC") &&
          // Orçamentos não começam com ORC
          !sale.notes?.toLowerCase().includes("orçamento"), // Ou não têm "orçamento" nas notas
      );
      const budgetData = formattedData.filter(
        (sale) =>
          sale.sale_number?.startsWith("ORC") ||
          // Orçamentos começam com ORC
          sale.notes?.toLowerCase().includes("orçamento"), // Ou têm "orçamento" nas notas
      );
      setSales(actualSales);
      setBudgets(budgetData);

      // Calculate metrics for sales only (not budgets)
      const totalSales = actualSales.length;

      // Calcular receita total apenas de contratos pagos (cruzar com contas a receber pagas)
      const { data: paidReceivables } = await supabase
        .from("accounts_receivable")
        .select("amount")
        .eq("company_id", companyId)
        .eq("status", "paid");

      const totalRevenue = paidReceivables?.reduce((sum, receivable) => sum + Number(receivable.amount), 0) || 0;
      const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Calculate budget metrics
      const totalBudgets = budgetData.length;
      const budgetValue = budgetData.reduce((sum, budget) => sum + Number(budget.net_amount), 0);

      // Fetch pending receivables
      const { data: receivables } = await supabase
        .from("accounts_receivable")
        .select("amount")
        .eq("company_id", companyId)
        .eq("status", "pending");
      const pendingReceivables = receivables?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // Calculate monthly growth for sales only (compare with previous period)
      const { data: previousSales } = await supabase
        .from("sales")
        .select("net_amount, sale_number, notes")
        .eq("company_id", companyId)
        .gte("sale_date", lastMonth.toISOString())
        .lte("sale_date", lastMonthEnd.toISOString());
      const previousActualSales =
        previousSales?.filter(
          (sale) => !sale.sale_number?.startsWith("ORC") && !sale.notes?.toLowerCase().includes("orçamento"),
        ) || [];
      const previousRevenue = previousActualSales.reduce((sum, sale) => sum + Number(sale.net_amount), 0);
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Find top customer from actual sales only
      const customerSales = actualSales.reduce(
        (acc, sale) => {
          const customer = sale.customer_name || "Sem cliente";
          acc[customer] = (acc[customer] || 0) + Number(sale.net_amount);
          return acc;
        },
        {} as Record<string, number>,
      );
      const topCustomer = Object.entries(customerSales).sort(([, a], [, b]) => b - a)[0]?.[0] || "-";
      setMetrics({
        totalSales,
        totalRevenue,
        averageTicket,
        pendingReceivables,
        monthlyGrowth,
        topCustomer,
        totalBudgets,
        budgetValue,
      });
    } catch (error) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de faturamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const filteredSales = sales.filter((sale) => {
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    return matchesStatus;
  });
  const filteredBudgets = budgets.filter((budget) => {
    const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
    return matchesStatus;
  });
  const handleViewSale = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            id,
            description,
            quantity,
            unit_price,
            total_price
          ),
          customers (
            name,
            email,
            phone,
            document
          )
        `)
        .eq("id", saleId)
        .single();

      if (error) throw error;

      setViewingSale(data as SaleDetails);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar venda",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditSale = (saleId: string) => {
    // Por enquanto só abre um novo formulário - implementar edição depois
    setShowSalesForm(true);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "cancelled":
        return "destructive";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "outline";
    }
  };
  const getSaleType = (sale: Sale) => {
    if (sale.sale_number?.startsWith("ORC") || sale.notes?.toLowerCase().includes("orçamento")) {
      return "Orçamento";
    }
    // Verificar se é recorrente baseado nas notas ou outros campos
    if (sale.notes?.toLowerCase().includes("recorrente") || sale.notes?.toLowerCase().includes("mensal")) {
      return "Recorrente";
    }
    return "Avulsa";
  };
  const handleViewRecurrences = async (sale: Sale) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return;

      // Buscar TODAS as contas a receber relacionadas a esta venda (não apenas recorrentes)
      const { data: relatedReceivables } = await supabase
        .from("accounts_receivable")
        .select("*")
        .eq("company_id", profile.company_id)
        .ilike("description", `%${sale.sale_number}%`)
        .order("due_date", {
          ascending: true,
        });

      if (relatedReceivables && relatedReceivables.length > 0) {
        // Navegar para contas a receber com filtro específico para esta venda
        navigate(`/financeiro/contas-receber?filter=${sale.sale_number}`);
      } else {
        toast({
          title: "Nenhuma cobrança encontrada",
          description: "Não há cobranças relacionadas a esta venda.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching receivables:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar as cobranças.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a venda ${sale.sale_number}? Esta ação também excluirá todas as cobranças relacionadas e não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile?.company_id) return;

      // Primeiro, excluir todas as cobranças relacionadas no contas a receber
      const { error: receivablesError } = await supabase
        .from("accounts_receivable")
        .delete()
        .eq("company_id", profile.company_id)
        .ilike("description", `%${sale.sale_number}%`);

      if (receivablesError) {
        console.error("Error deleting receivables:", receivablesError);
        toast({
          title: "Erro ao excluir cobranças",
          description: "Não foi possível excluir as cobranças relacionadas.",
          variant: "destructive",
        });
        return;
      }

      // Depois, excluir a venda
      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", sale.id)
        .eq("company_id", profile.company_id);

      if (saleError) {
        console.error("Error deleting sale:", saleError);
        toast({
          title: "Erro ao excluir venda",
          description: "Não foi possível excluir a venda.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar a lista após exclusão
      await fetchBillingData();

      toast({
        title: "Venda excluída",
        description: `A venda ${sale.sale_number} e suas cobranças foram excluídas com sucesso.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a venda.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePDF = (item: Sale, type: "sale" | "budget") => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const title = type === "sale" ? "Venda" : "Orçamento";
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title} - ${item.sale_number}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 30px;
            }
            .info-item { 
              margin-bottom: 10px; 
            }
            .label { 
              font-weight: bold; 
              color: #666;
            }
            .value { 
              margin-left: 10px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${title} #${item.sale_number}</h1>
            <p>Data: ${format(new Date(item.sale_date), "dd/MM/yyyy", { locale: ptBR })}</p>
          </div>
          
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="label">Cliente:</span>
                <span class="value">${item.customer_name || "Não informado"}</span>
              </div>
              <div class="info-item">
                <span class="label">Status:</span>
                <span class="value">${item.status === "active" ? "Ativo" : item.status === "cancelled" ? "Cancelado" : "Pendente"}</span>
              </div>
              <div class="info-item">
                <span class="label">Tipo:</span>
                <span class="value">${getSaleType(item)}</span>
              </div>
            </div>
            
            <div>
              <div class="info-item">
                <span class="label">Valor Total:</span>
                <span class="value">${formatCurrency(Number(item.total_amount))}</span>
              </div>
              <div class="info-item">
                <span class="label">Desconto:</span>
                <span class="value">${item.discount_amount > 0 ? formatCurrency(Number(item.discount_amount)) : "Nenhum"}</span>
              </div>
              <div class="info-item">
                <span class="label">Valor Líquido:</span>
                <span class="value"><strong>${formatCurrency(Number(item.net_amount))}</strong></span>
              </div>
            </div>
          </div>

          ${
            item.notes
              ? `
            <div style="margin-top: 20px;">
              <div class="label">Observações:</div>
              <div style="margin-top: 10px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                ${item.notes}
              </div>
            </div>
          `
              : ""
          }
          
          <div class="footer">
            <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vendas e Orçamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Indicadores de vendas e gestão de orçamentos</p>
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

          <Dialog open={showBudgetForm} onOpenChange={setShowBudgetForm}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Orçamento</DialogTitle>
              </DialogHeader>
              <SalesForm
                defaultType="budget"
                onSuccess={() => {
                  setShowBudgetForm(false);
                  fetchBillingData();
                }}
                onCancel={() => setShowBudgetForm(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showSalesForm} onOpenChange={setShowSalesForm}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Venda</DialogTitle>
              </DialogHeader>
              <SalesForm
                defaultType="sale"
                onSuccess={() => {
                  setShowSalesForm(false);
                  fetchBillingData();
                }}
                onCancel={() => setShowSalesForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{metrics.totalSales}</div>
            <p className="text-xs text-muted-foreground">vendas realizadas</p>
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
            <p className="text-xs text-muted-foreground">apenas contratos pagos</p>
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
            <p className="text-xs text-muted-foreground">valor médio por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Em Negociação</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600 break-all">
              {formatCurrency(metrics.budgetValue)}
            </div>
            <p className="text-xs text-muted-foreground">orçamentos em negociação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total do período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 break-all">
              {formatCurrency(metrics.totalRevenue + metrics.budgetValue)}
            </div>
            <p className="text-xs text-muted-foreground">receita total + em negociação</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Vendas e Dinheiro na Mesa */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Vendas Efetivas</TabsTrigger>
            <TabsTrigger value="budgets">Dinheiro na Mesa</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            {/* Sales Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Vendas</CardTitle>
                <CardDescription>Vendas efetivas (avulsa e recorrente) realizadas no período</CardDescription>

                <div className="flex justify-end">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
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
                      Não há vendas efetivas para o período e filtros selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Número</TableHead>
                          <TableHead className="min-w-[80px]">Tipo</TableHead>
                          <TableHead className="min-w-[100px]">Data</TableHead>
                          <TableHead className="min-w-[150px]">Cliente</TableHead>
                          <TableHead className="min-w-[120px]">Valor Líquido</TableHead>
                          <TableHead className="min-w-[80px]">Status</TableHead>
                          <TableHead className="min-w-[120px]">Tags</TableHead>
                          <TableHead className="min-w-[120px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">{sale.sale_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getSaleType(sale)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateForDisplay(sale.sale_date)}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={sale.customer_name}>
                              {sale.customer_name}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(Number(sale.net_amount))}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(sale.status)} className="text-xs">
                                {sale.status === "active"
                                  ? "Ativo"
                                  : sale.status === "cancelled"
                                    ? "Cancelado"
                                    : sale.status === "overdue"
                                      ? "Atrasado"
                                      : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {/* Extrair tags das notas */}
                              {(() => {
                                const notesContent = sale.notes || "";
                                const tagsMatch = notesContent.match(/Tags:\s*(.+)/);
                                const tags = tagsMatch ? tagsMatch[1].split(",").map((tag) => tag.trim()) : [];

                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {tags.length > 0 ? (
                                      tags.slice(0, 2).map((tag, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        Sem tags
                                      </Badge>
                                    )}
                                    {tags.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{tags.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGeneratePDF(sale, "sale")}
                                  title="Gerar PDF da venda"
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewRecurrences(sale)}
                                  title="Ver recorrências desta venda"
                                >
                                  <PiggyBank className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSale(sale.id)}
                                  title="Visualizar venda"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSale(sale)}
                                  title="Excluir venda"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="budgets">
            {/* Budget Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total de Orçamentos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{metrics.totalBudgets}</div>
                  <p className="text-xs text-muted-foreground">orçamentos criados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Valor Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 break-all">
                    {formatCurrency(metrics.budgetValue)}
                  </div>
                  <p className="text-xs text-muted-foreground">potencial de faturamento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Ticket Médio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold break-all">
                    {formatCurrency(metrics.totalBudgets > 0 ? metrics.budgetValue / metrics.totalBudgets : 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">valor médio por orçamento</p>
                </CardContent>
              </Card>
            </div>

            {/* Budgets Table */}
            <Card>
              <CardHeader>
                <CardTitle>Dinheiro na Mesa</CardTitle>
                <CardDescription>Orçamentos que podem se transformar em vendas efetivas</CardDescription>

                <div className="flex justify-end">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBudgets.length === 0 ? (
                  <div className="text-center py-10">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold">Nenhum orçamento encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Não há orçamentos para o período e filtros selecionados.
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
                          <TableHead className="min-w-[120px]">Valor Líquido</TableHead>
                          <TableHead className="min-w-[100px]">Status</TableHead>
                          <TableHead className="text-right min-w-[120px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBudgets.map((budget) => (
                          <TableRow key={budget.id}>
                            <TableCell className="font-medium">{budget.sale_number}</TableCell>
                            <TableCell>{formatDateForDisplay(budget.sale_date)}</TableCell>
                            <TableCell className="max-w-[150px] truncate" title={budget.customer_name}>
                              {budget.customer_name}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(Number(budget.net_amount))}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(budget.status)} className="text-xs">
                                {budget.status === "active"
                                  ? "Ativo"
                                  : budget.status === "cancelled"
                                    ? "Cancelado"
                                    : budget.status === "overdue"
                                      ? "Atrasado"
                                      : "Pendente"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGeneratePDF(budget, "budget")}
                                  title="Gerar PDF do orçamento"
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSale(budget.id)}
                                  title="Visualizar orçamento"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSale(budget)}
                                  title="Excluir orçamento"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>

        {/* View Sale Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Venda</DialogTitle>
            </DialogHeader>
            {viewingSale && (
              <div className="space-y-6">
                {/* Sale Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações da Venda</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Número da Venda</p>
                      <p className="font-medium">{viewingSale.sale_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">{formatDateForDisplay(viewingSale.sale_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={getStatusVariant(viewingSale.status)}>
                        {viewingSale.status === "active"
                          ? "Ativo"
                          : viewingSale.status === "cancelled"
                            ? "Cancelado"
                            : viewingSale.status === "overdue"
                              ? "Atrasado"
                              : "Pendente"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <Badge variant="outline">{getSaleType(viewingSale)}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{viewingSale.customers?.name || viewingSale.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Documento</p>
                      <p className="font-medium">{viewingSale.customers?.document || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{viewingSale.customers?.email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{viewingSale.customers?.phone || "-"}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sale Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Itens da Venda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Valor Unitário</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingSale.sale_items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(item.total_price))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(Number(viewingSale.total_amount))}</span>
                    </div>
                    {Number(viewingSale.discount_amount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="font-medium text-red-600">
                          - {formatCurrency(Number(viewingSale.discount_amount))}
                        </span>
                      </div>
                    )}
                    {Number(viewingSale.discount_amount) < 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Acréscimo</span>
                        <span className="font-medium text-green-600">
                          + {formatCurrency(Math.abs(Number(viewingSale.discount_amount)))}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Valor Total</span>
                      <span className="font-bold text-lg">{formatCurrency(Number(viewingSale.net_amount))}</span>
                    </div>
                    {viewingSale.payment_method && (
                      <div className="flex justify-between mt-4">
                        <span className="text-muted-foreground">Método de Pagamento</span>
                        <span className="font-medium capitalize">{viewingSale.payment_method.replace("_", " ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes and Tags */}
                {viewingSale.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Observações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{viewingSale.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
export default Faturamento;
