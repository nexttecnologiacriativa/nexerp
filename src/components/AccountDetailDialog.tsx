import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FileUpload } from "@/components/FileUpload";
import { Separator } from "@/components/ui/separator";

interface AccountDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: any | null;
  type: "payable" | "receivable";
  onUpdate: () => void;
}

export const AccountDetailDialog = ({ isOpen, onClose, account, type, onUpdate }: AccountDetailDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    payment_date: "",
    status: "pending",
    payment_method_id: "",
    notes: "",
    document_number: "",
    supplier_id: "",
    customer_id: "",
    bank_account_id: "",
    cost_center_id: "",
    category_id: "",
    subcategory_id: "",
    receipt_file_path: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchRelatedData();
      if (account) {
        setFormData({
          description: account.description || "",
          amount: account.amount?.toString() || "",
          due_date: account.due_date || "",
          payment_date: account.payment_date || "",
          status: account.status || "pending",
          payment_method_id: account.payment_method_id || "",
          notes: account.notes || "",
          document_number: account.document_number || "",
          supplier_id: account.supplier_id || "",
          customer_id: account.customer_id || "",
          bank_account_id: account.bank_account_id || "",
          cost_center_id: account.cost_center_id || "",
          category_id: account.category_id || "",
          subcategory_id: account.subcategory_id || "",
          receipt_file_path: account.receipt_file_path || "",
        });
      }
    }
  }, [isOpen, account]);

  const fetchRelatedData = async () => {
    try {
      if (type === "payable") {
        const { data: suppliersData } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        setSuppliers(suppliersData || []);

        const { data: costCentersData } = await supabase
          .from('cost_centers')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        setCostCenters(costCentersData || []);
      } else {
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        setCustomers(customersData || []);
      }

      const { data: bankAccountsData } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name')
        .eq('status', 'active')
        .order('name');
      setBankAccounts(bankAccountsData || []);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('status', 'active')
        .order('name');
      setCategories(categoriesData || []);

      const { data: subcategoriesData } = await supabase
        .from('subcategories')
        .select('id, name, color, category_id')
        .eq('status', 'active')
        .order('name');
      setSubcategories(subcategoriesData || []);

      const { data: paymentMethodsData } = await supabase
        .from('payment_methods')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setPaymentMethods(paymentMethodsData || []);
    } catch (error) {
      console.error('Error fetching related data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tableName = type === "payable" ? "accounts_payable" : "accounts_receivable";
      const updateData: any = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        payment_method_id: formData.payment_method_id || null,
        notes: formData.notes || null,
        document_number: formData.document_number || null,
        bank_account_id: formData.bank_account_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        receipt_file_path: formData.receipt_file_path || null,
      };

      // Add payment_date only when status is paid
      if (formData.status === "paid") {
        updateData.payment_date = formData.payment_date || new Date().toISOString().split('T')[0];
      } else {
        updateData.payment_date = null;
      }

      if (type === "payable") {
        updateData.supplier_id = formData.supplier_id || null;
        updateData.cost_center_id = formData.cost_center_id || null;
      } else {
        updateData.customer_id = formData.customer_id || null;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: "Conta atualizada!",
        description: "As informações da conta foram atualizadas com sucesso.",
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar conta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return type === "payable" ? "Pago" : "Recebido";
      case "pending":
        return "Pendente";
      case "overdue":
        return "Atrasado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (!account) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Conta {type === "payable" ? "a Pagar" : "a Receber"}</DialogTitle>
          <DialogDescription>
            Visualize e edite as informações da conta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Status atual */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm text-muted-foreground">Status Atual</Label>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(account.status)}>
                    {getStatusLabel(account.status)}
                  </Badge>
                </div>
              </div>
              <Separator orientation="vertical" className="h-12" />
              <div>
                <Label className="text-sm text-muted-foreground">Criado em</Label>
                <div className="mt-1 text-sm">
                  {format(new Date(account.created_at), "dd/MM/yyyy HH:mm")}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier/Customer */}
              {type === "payable" ? (
                <div className="space-y-2">
                  <Label htmlFor="supplier_id">Fornecedor *</Label>
                  <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Cliente *</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <DateInput
                  id="due_date"
                  value={formData.due_date}
                  onChange={(value) => setFormData({...formData, due_date: value})}
                  required
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">{type === "payable" ? "Pago" : "Recebido"}</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date (only if paid) */}
              {formData.status === "paid" && (
                <div className="space-y-2">
                  <Label htmlFor="payment_date">{type === "payable" ? "Data de Pagamento" : "Data de Recebimento"}</Label>
                  <DateInput
                    id="payment_date"
                    value={formData.payment_date}
                    onChange={(value) => setFormData({...formData, payment_date: value})}
                  />
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment_method_id">Forma de Pagamento</Label>
                <Select value={formData.payment_method_id} onValueChange={(value) => setFormData({...formData, payment_method_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Account */}
              <div className="space-y-2">
                <Label htmlFor="bank_account_id">Conta Bancária</Label>
                <Select value={formData.bank_account_id} onValueChange={(value) => setFormData({...formData, bank_account_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost Center (only for payable) */}
              {type === "payable" && (
                <div className="space-y-2">
                  <Label htmlFor="cost_center_id">Centro de Custo</Label>
                  <Select value={formData.cost_center_id} onValueChange={(value) => setFormData({...formData, cost_center_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria</Label>
                <Select value={formData.category_id} onValueChange={(value) => {
                  setFormData({...formData, category_id: value, subcategory_id: ""});
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <Label htmlFor="subcategory_id">Subcategoria</Label>
                <Select 
                  value={formData.subcategory_id} 
                  onValueChange={(value) => setFormData({...formData, subcategory_id: value})}
                  disabled={!formData.category_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories
                      .filter(sub => sub.category_id === formData.category_id)
                      .map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: subcategory.color }}
                          />
                          {subcategory.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Number */}
              <div className="space-y-2">
                <Label htmlFor="document_number">Número do Documento</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                  placeholder="Ex: NF-12345"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Observações adicionais"
                />
              </div>

              {/* File Upload */}
              <div className="md:col-span-2">
                <FileUpload
                  onFileUploaded={(filePath) => setFormData({...formData, receipt_file_path: filePath})}
                  currentFile={formData.receipt_file_path}
                  companyId={account.company_id}
                  accountId={account.id}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
