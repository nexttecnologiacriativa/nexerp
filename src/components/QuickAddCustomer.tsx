import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CPFInput } from "@/components/ui/cpf-input";
import { CNPJInput } from "@/components/ui/cnpj-input";
import { PhoneInput } from "@/components/ui/phone-input";

interface QuickAddCustomerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customerId: string) => void;
  companyId: string;
}

export function QuickAddCustomer({ open, onOpenChange, onSuccess, companyId }: QuickAddCustomerProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    document_type: "cpf" as "cpf" | "cnpj",
    document: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.document || !formData.email || !formData.phone) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            company_id: companyId,
            name: formData.name,
            document_type: formData.document_type,
            document: formData.document,
            email: formData.email,
            phone: formData.phone,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        document_type: "cpf",
        document: "",
        email: "",
        phone: "",
      });
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome/Razão Social *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de Documento *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value: "cpf" | "cnpj") => setFormData({ ...formData, document_type: value, document: "" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">{formData.document_type === "cpf" ? "CPF" : "CNPJ"} *</Label>
            {formData.document_type === "cpf" ? (
              <CPFInput
                value={formData.document}
                onChange={(value) => setFormData({ ...formData, document: value })}
                required
              />
            ) : (
              <CNPJInput
                value={formData.document}
                onChange={(value) => setFormData({ ...formData, document: value })}
                required
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <PhoneInput
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              required
            />
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
