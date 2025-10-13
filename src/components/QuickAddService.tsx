import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuickAddServiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (serviceId: string) => void;
  companyId: string;
}

export function QuickAddService({ open, onOpenChange, onSuccess, companyId }: QuickAddServiceProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error("Preencha o nome e o valor unitário");
      return;
    }

    const price = parseFloat(formData.price.replace(",", "."));
    if (isNaN(price) || price <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .insert([
          {
            company_id: companyId,
            name: formData.name,
            price: price,
            description: formData.description,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Serviço cadastrado com sucesso!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        price: "",
        description: "",
      });
    } catch (error: any) {
      console.error("Error creating service:", error);
      toast.error(error.message || "Erro ao cadastrar serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Serviço *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome do serviço"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Valor Unitário *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do serviço (opcional)"
              rows={3}
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
