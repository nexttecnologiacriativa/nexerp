import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface QuickAddSubcategoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (subcategoryId: string) => void;
  companyId: string;
  categoryId: string;
}

export function QuickAddSubcategory({ open, onOpenChange, onSuccess, companyId, categoryId }: QuickAddSubcategoryProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6B7280",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Digite o nome da subcategoria");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subcategories")
        .insert([
          {
            company_id: companyId,
            category_id: categoryId,
            name: formData.name,
            description: formData.description,
            color: formData.color,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success("Subcategoria cadastrada com sucesso!");
      onSuccess(data.id);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        color: "#6B7280",
      });
    } catch (error: any) {
      console.error("Error creating subcategory:", error);
      toast.error(error.message || "Erro ao cadastrar subcategoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Subcategoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome da subcategoria"
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

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#6B7280"
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
