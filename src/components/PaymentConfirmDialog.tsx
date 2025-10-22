import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amount: number;
  bankAccounts: Array<{ id: string; name: string; bank_name: string }>;
  currentBankAccountId?: string | null;
  currentPaymentMethod?: string | null;
  onConfirm: (bankAccountId: string, paymentMethod: string) => void;
  type: "payment" | "receipt";
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  title,
  amount,
  bankAccounts,
  currentBankAccountId,
  currentPaymentMethod,
  onConfirm,
  type
}: PaymentConfirmDialogProps) {
  const [bankAccountId, setBankAccountId] = useState(currentBankAccountId || "");
  const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod || "");

  const handleConfirm = () => {
    if (!bankAccountId || !paymentMethod) {
      return;
    }
    onConfirm(bankAccountId, paymentMethod);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const paymentMethodOptions = [
    { value: "cash", label: "Dinheiro" },
    { value: "credit_card", label: "Cartão de Crédito" },
    { value: "debit_card", label: "Cartão de Débito" },
    { value: "pix", label: "PIX" },
    { value: "bank_transfer", label: "Transferência Bancária" },
    { value: "bank_slip", label: "Boleto" },
    { value: "check", label: "Cheque" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Confirme as informações do {type === "payment" ? "pagamento" : "recebimento"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank-account">Banco *</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button 
            type="button"
            onClick={handleConfirm}
            disabled={!bankAccountId || !paymentMethod}
          >
            Confirmar {type === "payment" ? "Pagamento" : "Recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
