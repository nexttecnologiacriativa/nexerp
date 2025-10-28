import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown, Landmark, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndicatorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'revenue' | 'expenses' | 'profit' | 'bankBalance' | 'margin' | 'costCenterTotal' | 'costCenterRevenue' | 'costCenterExpenses' | 'costCenterProfit' | null;
  data: any;
  period: string;
}

export function IndicatorDetailsDialog({
  open,
  onOpenChange,
  type,
  data,
  period
}: IndicatorDetailsDialogProps) {
  
  if (!type || !data) return null;

  const getTitle = () => {
    switch(type) {
      case 'revenue': return 'Detalhes de Receitas Recebidas';
      case 'expenses': return 'Detalhes de Despesas Pagas';
      case 'profit': return 'Detalhes do Lucro Líquido';
      case 'bankBalance': return 'Detalhes de Saldo em Bancos';
      case 'margin': return 'Detalhes da Margem de Lucro';
      case 'costCenterTotal': return 'Detalhes de Centros de Custos';
      case 'costCenterRevenue': return 'Detalhes de Receitas por Centro';
      case 'costCenterExpenses': return 'Detalhes de Despesas por Centro';
      case 'costCenterProfit': return 'Detalhes de Lucro/Prejuízo por Centro';
      default: return 'Detalhes';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'revenue': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'expenses': return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'profit': return <DollarSign className="h-5 w-5 text-emerald-600" />;
      case 'bankBalance': return <Landmark className="h-5 w-5 text-blue-600" />;
      case 'margin': return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'costCenterTotal': return <DollarSign className="h-5 w-5 text-blue-600" />;
      case 'costCenterRevenue': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'costCenterExpenses': return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'costCenterProfit': return <DollarSign className="h-5 w-5 text-emerald-600" />;
      default: return null;
    }
  };

  const exportToCSV = () => {
    let csvData: any[] = [];
    let filename = '';

    if (type === 'revenue' && data.receivables) {
      csvData = data.receivables.map((item: any) => ({
        Data: format(new Date(item.payment_date || item.due_date), 'dd/MM/yyyy'),
        Descrição: item.description,
        Valor: item.amount,
        Status: item.status
      }));
      filename = 'receitas-recebidas';
    } else if (type === 'expenses' && data.payables) {
      csvData = data.payables.map((item: any) => ({
        Data: format(new Date(item.payment_date || item.due_date), 'dd/MM/yyyy'),
        Descrição: item.description,
        Valor: item.amount,
        Status: item.status
      }));
      filename = 'despesas-pagas';
    } else if (type === 'bankBalance' && data.accounts) {
      csvData = data.accounts.map((item: any) => ({
        Banco: item.bank_name,
        'Tipo de Conta': item.account_type === 'checking' ? 'Corrente' : 'Poupança',
        Saldo: item.balance,
        Status: item.status
      }));
      filename = 'saldo-bancos';
    } else if ((type === 'costCenterTotal' || type === 'costCenterRevenue' || type === 'costCenterExpenses' || type === 'costCenterProfit') && data.centers) {
      csvData = data.centers.map((item: any) => ({
        Centro: item.name,
        Receitas: item.revenue,
        Despesas: item.expenses,
        Lucro: item.profit
      }));
      filename = 'centros-custos';
    }

    if (csvData.length === 0) return;

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => 
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

  const renderContent = () => {
    if (type === 'revenue' && data.receivables) {
      const total = data.receivables.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido no Período</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{data.receivables.length} transação(ões)</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.receivables.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(item.payment_date || item.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">
                        Pago
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    if (type === 'expenses' && data.payables) {
      const total = data.payables.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div>
              <p className="text-sm text-muted-foreground">Total Pago no Período</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{data.payables.length} transação(ões)</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payables.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(item.payment_date || item.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        Pago
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    if (type === 'profit' && data.receivables && data.payables) {
      const revenue = data.receivables.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const expenses = data.payables.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const profit = revenue - expenses;
      
      return (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${
            profit >= 0 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Receitas Recebidas</span>
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                  + R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Despesas Pagas</span>
                <span className="text-lg font-semibold text-red-700 dark:text-red-300">
                  - R$ {expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lucro Líquido</span>
                  <span className={`text-2xl font-bold ${
                    profit >= 0 
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {profit >= 0 ? '+' : ''} R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-muted-foreground">Transações de Receita</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{data.receivables.length}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs text-muted-foreground">Transações de Despesa</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300">{data.payables.length}</p>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'bankBalance' && data.accounts) {
      const total = data.accounts.reduce((sum: number, item: any) => sum + Number(item.balance || 0), 0);
      
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{data.accounts.length} conta(s) ativa(s)</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.accounts.map((item: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.bank_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.account_type === 'checking' ? 'Corrente' : 'Poupança'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {Number(item.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-blue-600">
                        Ativa
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    if (type === 'margin' && data.revenue && data.profit) {
      const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      
      return (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Receitas Recebidas</span>
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                  R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lucro Líquido</span>
                <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  R$ {data.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Margem de Lucro</span>
                  <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Como é calculada?</h4>
            <p className="text-sm text-muted-foreground">
              A margem de lucro é calculada dividindo o lucro líquido pelas receitas recebidas e multiplicando por 100.
            </p>
            <div className="mt-3 p-3 bg-background rounded border">
              <code className="text-xs">
                Margem = (Lucro Líquido ÷ Receitas) × 100
              </code>
            </div>
          </div>
        </div>
      );
    }

    if ((type === 'costCenterTotal' || type === 'costCenterRevenue' || type === 'costCenterExpenses' || type === 'costCenterProfit') && data.centers) {
      const totalRevenue = data.centers.reduce((sum: number, center: any) => sum + Number(center.revenue || 0), 0);
      const totalExpenses = data.centers.reduce((sum: number, center: any) => sum + Number(center.expenses || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Receitas</span>
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Despesas</span>
                <span className="text-lg font-semibold text-red-700 dark:text-red-300">
                  R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Lucro/Prejuízo Total</span>
                  <span className={`text-2xl font-bold ${
                    totalProfit >= 0 
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-orange-700 dark:text-orange-300'
                  }`}>
                    {totalProfit >= 0 ? '+' : ''} R$ {totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Detalhamento por Centro de Custos</h4>
            <Button size="sm" variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centro de Custos</TableHead>
                  <TableHead className="text-right">Receitas</TableHead>
                  <TableHead className="text-right">Despesas</TableHead>
                  <TableHead className="text-right">Lucro/Prejuízo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.centers.map((center: any, index: number) => {
                  const profit = Number(center.revenue || 0) - Number(center.expenses || 0);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell className="text-right text-green-700 dark:text-green-300">
                        R$ {Number(center.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-red-700 dark:text-red-300">
                        R$ {Number(center.expenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        profit >= 0 
                          ? 'text-emerald-700 dark:text-emerald-300' 
                          : 'text-orange-700 dark:text-orange-300'
                      }`}>
                        {profit >= 0 ? '+' : ''} R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    return <p className="text-center text-muted-foreground">Nenhum dado disponível</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            Período: {period}
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
