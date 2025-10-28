import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { dateToISOString, getTodayISO, parseISODate } from "@/lib/date-utils";

interface SaleItem {
  id: string;
  service_id: string;
  service_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface PaymentInfo {
  payment_method: string;
  receiving_account: string;
  installments: number;
  due_date: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  addition_type: "fixed" | "percentage";
  addition_value: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  color?: string;
}

interface CostCenter {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface Installment {
  number: number;
  amount: number;
  due_date: string;
}

const Vendas = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showInstallments, setShowInstallments] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [saleType, setSaleType] = useState("budget");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentInfo, setPaymentInfo] = useState({
    payment_method: "",
    receiving_account: "",
    installments: 1,
    due_date: getTodayISO(),
    discount_type: "fixed" as "fixed" | "percentage",
    discount_value: 0,
    addition_type: "fixed" as "fixed" | "percentage",
    addition_value: 0,
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    sale_number: "",
    client_id: "",
    sale_date: new Date().toISOString().split("T")[0],
    category_id: "",
    subcategory_id: "",
    cost_center_id: "",
    salesperson: "",
    status: "approved",
    notes: "",
    tags: [] as string[],
  });

  const [currentTag, setCurrentTag] = useState("");

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tag.trim()] });
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((tag) => tag !== tagToRemove) });
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(currentTag);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Generate next sale number when sale type changes
  useEffect(() => {
    if (userProfile?.company_id) {
      updateSaleNumber();
    }
  }, [saleType, userProfile?.company_id]);

  const updateSaleNumber = async () => {
    try {
      const prefix = saleType === "budget" ? "ORC" : "VND";

      const { data: salesData } = await supabase
        .from("sales")
        .select("sale_number")
        .eq("company_id", userProfile.company_id)
        .like("sale_number", `${prefix}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      const nextSaleNumber = generateNextSaleNumber(salesData?.[0]?.sale_number);
      setFormData((prev) => ({ ...prev, sale_number: nextSaleNumber }));
    } catch (error) {
      console.error("Error updating sale number:", error);
    }
  };

  // Generate installments when payment info changes
  useEffect(() => {
    generateInstallments();
  }, [paymentInfo.installments, paymentInfo.due_date, saleItems]);

  const loadData = async () => {
    try {
      // Get user profile first to get company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();

      if (!profileData) {
        toast.error("Perfil do usuário não encontrado");
        return;
      }

      setUserProfile(profileData);

      const [
        customersData,
        servicesData,
        categoriesData,
        subcategoriesData,
        costCentersData,
        usersData,
        salesData,
        bankAccountsData,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, email, phone")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
        supabase
          .from("services")
          .select("id, name, price")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
        supabase
          .from("categories")
          .select("id, name, color")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
        supabase
          .from("subcategories")
          .select("id, category_id, name, color")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
        supabase
          .from("cost_centers")
          .select("id, name")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
        supabase.from("profiles").select("id, full_name").eq("company_id", profileData.company_id),
        supabase
          .from("sales")
          .select("sale_number")
          .eq("company_id", profileData.company_id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("bank_accounts")
          .select("id, name, bank_name, account_number")
          .eq("company_id", profileData.company_id)
          .eq("status", "active"),
      ]);

      if (customersData.data) setCustomers(customersData.data);
      if (servicesData.data) setServices(servicesData.data);
      if (categoriesData.data) setCategories(categoriesData.data);
      if (subcategoriesData.data) setSubcategories(subcategoriesData.data);
      if (costCentersData.data) setCostCenters(costCentersData.data);
      if (usersData.data) setUsers(usersData.data);
      if (bankAccountsData.data) setBankAccounts(bankAccountsData.data);

      // Generate next sale number
      const nextSaleNumber = generateNextSaleNumber(salesData.data?.[0]?.sale_number);
      setFormData((prev) => ({ ...prev, sale_number: nextSaleNumber }));
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const generateNextSaleNumber = (lastSaleNumber?: string) => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, "0");

    const prefix = saleType === "budget" ? "ORC" : "VND";

    if (!lastSaleNumber || !lastSaleNumber.startsWith(prefix)) {
      return `${prefix}${year}${month}0001`;
    }

    // Extract number from last sale
    const lastNumber = parseInt(lastSaleNumber.slice(-4)) || 0;
    const nextNumber = (lastNumber + 1).toString().padStart(4, "0");

    return `${prefix}${year}${month}${nextNumber}`;
  };

  const generateInstallments = () => {
    const totalAmount = getFinalAmount();
    const installmentAmount = totalAmount / paymentInfo.installments;

    const newInstallments: Installment[] = [];

    for (let i = 1; i <= paymentInfo.installments; i++) {
      const dueDate = calculateInstallmentDate(i);
      newInstallments.push({
        number: i,
        amount: installmentAmount,
        due_date: dueDate,
      });
    }

    setInstallments(newInstallments);
  };

  const updateInstallment = (index: number, field: keyof Installment, value: any) => {
    setInstallments((prev) =>
      prev.map((installment, i) => (i === index ? { ...installment, [field]: value } : installment)),
    );
  };

  const addSaleItem = () => {
    const newItem: SaleItem = {
      id: Math.random().toString(36).substr(2, 9),
      service_id: "",
      service_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
    };
    setSaleItems([...saleItems, newItem]);
  };

  const updateSaleItem = (id: string, field: keyof SaleItem, value: any) => {
    setSaleItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // If service is selected, update price and name
          if (field === "service_id") {
            const selectedService = services.find((s) => s.id === value);
            if (selectedService) {
              updatedItem.service_name = selectedService.name;
              updatedItem.unit_price = selectedService.price || 0;
            }
          }

          // Calculate total when quantity or price changes
          if (field === "quantity" || field === "unit_price" || field === "service_id") {
            updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

  const removeSaleItem = (id: string) => {
    setSaleItems((items) => items.filter((item) => item.id !== id));
  };

  const getTotalAmount = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getTotalAmount();
    if (paymentInfo.discount_type === "percentage") {
      return (subtotal * paymentInfo.discount_value) / 100;
    }
    return paymentInfo.discount_value;
  };

  const getAdditionAmount = () => {
    const subtotal = getTotalAmount();
    if (paymentInfo.addition_type === "percentage") {
      return (subtotal * paymentInfo.addition_value) / 100;
    }
    return paymentInfo.addition_value;
  };

  const getFinalAmount = () => {
    const subtotal = getTotalAmount();
    const discount = getDiscountAmount();
    const addition = getAdditionAmount();
    return subtotal - discount + addition;
  };

  const calculateInstallmentDate = (installmentNumber: number) => {
    const baseDate = parseISODate(paymentInfo.due_date || formData.sale_date);
    baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);
    return dateToISOString(baseDate);
  };

  const handleSave = async () => {
    if (!userProfile?.company_id) {
      toast.error("Erro: empresa não identificada");
      return;
    }
    if (!formData.client_id) {
      toast.error("Selecione um cliente");
      return;
    }
    if (saleItems.length === 0) {
      toast.error("Adicione pelo menos um item à venda");
      return;
    }
    if (saleItems.some((item) => !item.service_id)) {
      toast.error("Todos os itens devem ter um serviço selecionado");
      return;
    }

    setLoading(true);

    try {
      const subtotal = getTotalAmount();
      const discountAmount = getDiscountAmount();
      const additionAmount = getAdditionAmount();
      const finalAmount = getFinalAmount();

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          company_id: userProfile.company_id,
          customer_id: formData.client_id,
          total_amount: subtotal,
          discount_amount: discountAmount - additionAmount, // Store net discount (discount minus additions)
          net_amount: finalAmount,
          sale_date: formData.sale_date,
          sale_number: formData.sale_number,
          notes: formData.tags.length > 0 ? `${formData.notes}\n\nTags: ${formData.tags.join(", ")}` : formData.notes,
          status: "active",
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = saleItems.map((item) => ({
        sale_id: saleData.id,
        service_id: item.service_id,
        description: item.description || item.service_name || "Serviço",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Create accounts receivable entries
      // Ensure at least one installment exists
      const finalInstallments =
        installments.length > 0
          ? installments
          : [
              {
                number: 1,
                amount: finalAmount,
                due_date: paymentInfo.due_date || formData.sale_date,
              },
            ];

      const saleTypeLabel = saleType === "budget" ? "Orçamento" : saleType === "sale" ? "Venda" : "Venda Recorrente";
      
      const receivableEntries = finalInstallments.map((installment, index) => ({
        company_id: userProfile.company_id,
        customer_id: formData.client_id,
        description:
          finalInstallments.length === 1
            ? `${saleTypeLabel} ${formData.sale_number}`
            : `${saleTypeLabel} ${formData.sale_number} - Parcela ${installment.number}/${finalInstallments.length}`,
        amount: installment.amount,
        due_date: installment.due_date,
        status: "pending" as const,
        payment_method: paymentInfo.payment_method as any,
        notes: `Gerado automaticamente do ${saleTypeLabel.toLowerCase()} ${formData.sale_number}. Número da venda/orçamento: ${formData.sale_number}`,
        bank_account_id: paymentInfo.receiving_account || null,
        is_recurring: saleType === "recurring",
        recurrence_frequency: saleType === "recurring" ? "monthly" : null,
        recurrence_interval: saleType === "recurring" ? 1 : null,
        recurrence_end_date: null,
        document_number: formData.sale_number,
      }));

      console.log("Creating receivables for", saleTypeLabel, formData.sale_number, ":", receivableEntries);

      const { error: receivableError } = await supabase.from("accounts_receivable").insert(receivableEntries);

      if (receivableError) {
        console.error("Error creating receivables:", receivableError);
        throw receivableError;
      }

      console.log("Receivables created successfully for", formData.sale_number);

      const saleTypeText = saleType === "budget" ? "Orçamento" : saleType === "sale" ? "Venda" : "Venda Recorrente";
      toast.success(`${saleTypeText} ${saleType === "budget" ? "criado" : "criada"} com sucesso!`);

      // Redirect based on sale type
      if (saleType === "budget") {
        navigate("/faturamento");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error saving sale:", error);
      toast.error("Erro ao salvar venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nova Venda {formData.sale_number}</h1>
          <p className="text-muted-foreground">Cadastre uma nova venda</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Venda"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Venda */}
          <div>
            <Label>Tipo da venda</Label>
            <Tabs value={saleType} onValueChange={setSaleType} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="budget">Orçamento</TabsTrigger>
                <TabsTrigger value="sale">Venda avulsa</TabsTrigger>
                <TabsTrigger value="recurring">Venda recorrente (contrato)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Situação da negociação */}
            <div>
              <Label htmlFor="status">Situação da negociação *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Em andamento</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número da venda */}
            <div>
              <Label htmlFor="sale_number">Número da venda *</Label>
              <Input
                id="sale_number"
                value={formData.sale_number}
                onChange={(e) => setFormData({ ...formData, sale_number: e.target.value })}
              />
            </div>

            {/* Cliente */}
            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
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

            {/* Data de venda */}
            <div>
              <Label htmlFor="sale_date">Data de venda *</Label>
              <DateInput
                id="sale_date"
                value={formData.sale_date}
                onChange={(value) => setFormData({ ...formData, sale_date: value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Categoria financeira */}
            <div>
              <Label htmlFor="category">Categoria financeira</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, category_id: value, subcategory_id: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || "#3B82F6" }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategoria */}
            <div>
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories
                    .filter((sub) => sub.category_id === formData.category_id)
                    .map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: subcategory.color || "#6B7280" }}
                          />
                          <span>{subcategory.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro de custo */}
            <div>
              <Label htmlFor="cost_center">Centro de custo</Label>
              <Select
                value={formData.cost_center_id}
                onValueChange={(value) => setFormData({ ...formData, cost_center_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um centro de custo" />
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

            {/* Vendedor responsável */}
            <div>
              <Label htmlFor="salesperson">Vendedor responsável</Label>
              <Select
                value={formData.salesperson}
                onValueChange={(value) => setFormData({ ...formData, salesperson: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags do sistema */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="tags">Tags do sistema</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma tag e pressione Enter..."
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(currentTag)}
                    disabled={!currentTag.trim()}
                  >
                    Adicionar
                  </Button>
                </div>

                {/* Tags predefinidas */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "Alta Prioridade",
                    "Cliente VIP",
                    "Projeto Especial",
                    "Desconto Aplicado",
                    "Pagamento Antecipado",
                    "Cliente Novo",
                    "Renovação",
                    "Upsell",
                  ].map((predefinedTag) => (
                    <Button
                      key={predefinedTag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(predefinedTag)}
                      disabled={formData.tags.includes(predefinedTag)}
                    >
                      {predefinedTag}
                    </Button>
                  ))}
                </div>

                {/* Tags ativas */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeTag(tag)}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Nenhuma tabela de preço aplicada à venda.</span>
            <Button variant="outline" size="sm">
              Aplicar tabela de preços à venda
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {saleItems.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto/Serviços *</TableHead>
                    <TableHead>Detalhes do item</TableHead>
                    <TableHead>Quantidade *</TableHead>
                    <TableHead>Valor unitário *</TableHead>
                    <TableHead>Total *</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.service_id}
                          onValueChange={(value) => updateSaleItem(item.id, "service_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!item.service_id && <p className="text-sm text-destructive mt-1">Campo obrigatório</p>}
                      </TableCell>
                      <TableCell>
                        <Textarea
                          placeholder="Detalhes do item"
                          value={item.description}
                          onChange={(e) => updateSaleItem(item.id, "description", e.target.value)}
                          className="min-h-[60px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateSaleItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm mr-1">R$</span>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateSaleItem(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm mr-1">R$</span>
                          <span className="font-medium">
                            {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSaleItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Button variant="outline" onClick={addSaleItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar nova linha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Primeira linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Forma de pagamento */}
            <div>
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select
                value={paymentInfo.payment_method}
                onValueChange={(value) => setPaymentInfo({ ...paymentInfo, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto_banco">Boleto Bancário</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conta de recebimento */}
            <div>
              <Label htmlFor="receiving_account">Conta de recebimento</Label>
              <Select
                value={paymentInfo.receiving_account}
                onValueChange={(value) => setPaymentInfo({ ...paymentInfo, receiving_account: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.bank_name} ({account.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desconto */}
            <div>
              <Label htmlFor="discount">Desconto</Label>
              <div className="flex gap-2">
                <Select
                  value={paymentInfo.discount_type}
                  onValueChange={(value: "fixed" | "percentage") =>
                    setPaymentInfo({ ...paymentInfo, discount_type: value })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">R$</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={paymentInfo.discount_value}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, discount_value: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Acréscimo */}
            <div>
              <Label htmlFor="addition">Acréscimo</Label>
              <div className="flex gap-2">
                <Select
                  value={paymentInfo.addition_type}
                  onValueChange={(value: "fixed" | "percentage") =>
                    setPaymentInfo({ ...paymentInfo, addition_type: value })
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">R$</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={paymentInfo.addition_value}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, addition_value: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Segunda linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Valor total */}
            <div>
              <Label htmlFor="amount">Valor total</Label>
              <div className="flex items-center">
                <span className="text-sm mr-1">R$</span>
                <Input type="number" value={getFinalAmount()} readOnly className="bg-muted" />
              </div>
            </div>

            {/* Condição de pagamento */}
            <div>
              <Label htmlFor="installments">Condição de pagamento *</Label>
              <Select
                value={paymentInfo.installments.toString()}
                onValueChange={(value) => setPaymentInfo({ ...paymentInfo, installments: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">À vista</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="4">4x</SelectItem>
                  <SelectItem value="5">5x</SelectItem>
                  <SelectItem value="6">6x</SelectItem>
                  <SelectItem value="7">7x</SelectItem>
                  <SelectItem value="8">8x</SelectItem>
                  <SelectItem value="9">9x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="11">11x</SelectItem>
                  <SelectItem value="12">12x</SelectItem>
                  <SelectItem value="18">18x</SelectItem>
                  <SelectItem value="24">24x</SelectItem>
                  <SelectItem value="36">36x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vencimento */}
            <div>
              <Label htmlFor="due_date">Vencimento</Label>
              <div className="flex items-center gap-2">
                <DateInput
                  value={paymentInfo.due_date}
                  onChange={(value) => setPaymentInfo({ ...paymentInfo, due_date: value })}
                  className="flex-1"
                />
                {paymentInfo.installments > 1 && (
                  <Button variant="outline" size="sm" onClick={() => setShowInstallments(!showInstallments)}>
                    <Edit className="h-4 w-4 mr-1" />
                    {showInstallments ? "Ocultar parcelas" : "Editar parcelas"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de parcelas editável */}
          {showInstallments && paymentInfo.installments > 1 && (
            <div className="mt-4">
              <Label>Parcelas</Label>
              <div className="mt-2 space-y-2">
                {installments.map((installment, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                    <span className="text-sm font-medium w-16">
                      {installment.number}/{installments.length}
                    </span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={installment.amount}
                        onChange={(e) => updateInstallment(index, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Valor"
                        step="0.01"
                      />
                    </div>
                    <div className="flex-1">
                      <DateInput
                        value={installment.due_date}
                        onChange={(value) => updateInstallment(index, "due_date", value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo e Ações */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-6">
            <div className="text-lg font-semibold space-y-2">
              <div className="flex items-center gap-4">
                <span>Subtotal:</span>
                <span className="text-lg">
                  R$ {getTotalAmount().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {getDiscountAmount() > 0 && (
                <div className="flex items-center gap-4 text-destructive">
                  <span>Desconto:</span>
                  <span>
                    - R$ {getDiscountAmount().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {getAdditionAmount() > 0 && (
                <div className="flex items-center gap-4 text-green-600">
                  <span>Acréscimo:</span>
                  <span>
                    + R$ {getAdditionAmount().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex items-center gap-4">
                <span>Total:</span>
                <span className="text-2xl text-primary dark:!text-white">
                  R$ {getFinalAmount().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {paymentInfo.installments > 1 && (
                <div className="text-sm text-muted-foreground mt-1">
                  {paymentInfo.installments}x de R${" "}
                  {(getFinalAmount() / paymentInfo.installments).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || saleItems.length === 0 || !formData.client_id}
              className="min-w-[120px]"
            >
              {loading
                ? "Salvando..."
                : `Salvar ${saleType === "budget" ? "Orçamento" : saleType === "sale" ? "Venda" : "Venda Recorrente"}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendas;
