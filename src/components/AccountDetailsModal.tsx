import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDisplay, parseISODate } from "@/lib/date-utils";
import { formatPhone } from "@/lib/phone-utils";

interface BaseAccount {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  document_number: string | null;
}

interface PayableAccount extends BaseAccount {
  suppliers?: { name: string };
}

interface ReceivableAccount extends BaseAccount {
  customers?: { name: string };
}

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: (PayableAccount | ReceivableAccount)[];
  title: string;
  type: "payable" | "receivable";
  totalAmount?: number;
}

export function AccountDetailsModal({ 
  isOpen, 
  onClose, 
  accounts, 
  title, 
  type,
  totalAmount 
}: AccountDetailsModalProps) {
  
  const getStatusBadge = (account: BaseAccount) => {
    const isOverdue = account.due_date < new Date().toISOString().split('T')[0] && account.status === 'pending';
    const actualStatus = isOverdue ? 'overdue' : account.status;

    switch (actualStatus) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/10 text-red-700 border-red-200">Vencido</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500/10 text-gray-700 border-gray-200">Cancelado</Badge>;
      default:
        return <Badge>Desconhecido</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      type === 'payable' ? 'Fornecedor' : 'Cliente',
      'Descrição',
      'Valor',
      'Vencimento',
      'Status',
      'Documento'
    ];

    const csvData = accounts.map(account => [
      type === 'payable' 
        ? (account as PayableAccount).suppliers?.name || 'N/A'
        : (account as ReceivableAccount).customers?.name || 'N/A',
      account.description,
      `R$ ${account.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      formatDateForDisplay(account.due_date),
      account.status === 'paid' ? 'Pago' : 
        account.status === 'pending' ? 'Pendente' :
        account.status === 'overdue' ? 'Vencido' : 'Cancelado',
      account.document_number || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma conta encontrada para este filtro.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {type === 'payable' ? 'Fornecedor' : 'Cliente'}
                  </TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {type === 'payable' 
                        ? (account as PayableAccount).suppliers?.name || 'N/A'
                        : (account as ReceivableAccount).customers?.name || 'N/A'
                      }
                    </TableCell>
                    <TableCell>{account.description}</TableCell>
                    <TableCell className="font-medium">
                      R$ {account.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {formatDateForDisplay(account.due_date)}
                    </TableCell>
                    <TableCell>{getStatusBadge(account)}</TableCell>
                    <TableCell>{account.document_number || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {accounts.length} conta{accounts.length !== 1 ? 's' : ''} encontrada{accounts.length !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold">
              Total: R$ {(totalAmount ?? accounts.reduce((sum, account) => sum + account.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}