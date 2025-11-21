import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuickAddBankAccountProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accountId: string) => void;
  companyId: string;
}

export function QuickAddBankAccount({ open, onOpenChange, onSuccess, companyId }: QuickAddBankAccountProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bank_name: "",
    agency: "",
    account_number: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.bank_name) {
      toast.error("Preencha o nome da conta e o banco");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([
          {
            company_id: companyId,
            name: formData.name,
            bank_name: formData.bank_name,
            agency: formData.agency || null,
            account_number: formData.account_number || "N/A",
            account_type: "checking",
            balance: 0,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Conta bancária cadastrada com sucesso!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        bank_name: "",
        agency: "",
        account_number: "",
      });
    } catch (error: any) {
      console.error("Error creating bank account:", error);
      toast.error(error.message || "Erro ao cadastrar conta bancária");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Conta Bancária</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Conta Corrente Principal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_name">Banco *</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="Ex: Banco do Brasil"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agency">Agência</Label>
              <Input
                id="agency"
                value={formData.agency}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                placeholder="1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Número da Conta</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="1234-5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
