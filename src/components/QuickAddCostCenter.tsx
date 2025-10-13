import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuickAddCostCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (costCenterId: string) => void;
  companyId: string;
}

export function QuickAddCostCenter({ open, onOpenChange, onSuccess, companyId }: QuickAddCostCenterProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Digite o nome do centro de custo");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cost_centers")
        .insert([
          {
            company_id: companyId,
            name: formData.name,
            description: formData.description,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Centro de custo cadastrado com sucesso!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
      });
    } catch (error: any) {
      console.error("Error creating cost center:", error);
      toast.error(error.message || "Erro ao cadastrar centro de custo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Centro de Custo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome do centro de custo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição (opcional)"
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
