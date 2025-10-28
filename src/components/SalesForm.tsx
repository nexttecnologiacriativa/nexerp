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
import { format } from "date-fns";
import { dateToISOString, parseISODate } from "@/lib/date-utils";
import { QuickAddCustomer } from "@/components/QuickAddCustomer";
import { QuickAddCategory } from "@/components/QuickAddCategory";
import { QuickAddSubcategory } from "@/components/QuickAddSubcategory";
import { QuickAddCostCenter } from "@/components/QuickAddCostCenter";
import { QuickAddService } from "@/components/QuickAddService";
import { QuickAddBankAccount } from "@/components/QuickAddBankAccount";

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

interface SalesFormProps {
  defaultType?: "budget" | "sale";
  onSuccess?: () => void;
  onCancel?: () => void;
  editSaleId?: string;
}

const SalesForm = ({ defaultType = "sale", onSuccess, onCancel, editSaleId }: SalesFormProps) => {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(!!editSaleId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showInstallments, setShowInstallments] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Quick add modals state
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [quickAddCategoryOpen, setQuickAddCategoryOpen] = useState(false);
  const [quickAddSubcategoryOpen, setQuickAddSubcategoryOpen] = useState(false);
  const [quickAddCostCenterOpen, setQuickAddCostCenterOpen] = useState(false);
  const [quickAddServiceOpen, setQuickAddServiceOpen] = useState(false);
  const [quickAddBankAccountOpen, setQuickAddBankAccountOpen] = useState(false);

  const [saleType, setSaleType] = useState(defaultType);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentInfo, setPaymentInfo] = useState({
    payment_method: "",
    receiving_account: "",
    installments: 1,
    due_date: dateToISOString(new Date()),
    discount_type: "fixed" as "fixed" | "percentage",
    discount_value: 0,
    addition_type: "fixed" as "fixed" | "percentage",
    addition_value: 0,
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    sale_number: "",
    client_id: "",
    sale_date: dateToISOString(new Date()),
    category_id: "",
    subcategory_id: "",
    cost_center_id: "",
    salesperson: "",
    status: defaultType === "budget" ? "pending" : "approved",
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

  // Load sale data if in edit mode
  useEffect(() => {
    if (editSaleId && userProfile?.company_id) {
      loadSaleData(editSaleId);
    }
  }, [editSaleId, userProfile?.company_id]);

  // Generate next sale number when sale type changes (only if not editing)
  useEffect(() => {
    if (userProfile?.company_id && !isEditMode) {
      updateSaleNumber();
    }
    // Update status based on sale type (only if not editing)
    if (!isEditMode) {
      if (saleType === "budget") {
        setFormData((prev) => ({ ...prev, status: "pending" }));
      } else {
        setFormData((prev) => ({ ...prev, status: "approved" }));
      }
    }
  }, [saleType, userProfile?.company_id, isEditMode]);

  const updateSaleNumber = async () => {
    try {
      const prefix = saleType === "budget" ? "ORC" : "VND";

      const { data: salesData } = await supabase
        .from("sales")
        .select("sale_number")
        .eq("company_id", userProfile.company_id)
        .like("sale_number", `${prefix}%`)
        .order("sale_number", { ascending: false })
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

  const loadSaleData = async (saleId: string) => {
    try {
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select(`
          *,
          sale_items (
            id,
            service_id,
            description,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq("id", saleId)
        .single();

      if (saleError) {
        console.error("Error loading sale:", saleError);
        toast.error("Erro ao carregar dados da venda");
        return;
      }

      // Determine sale type from sale_number
      const isBudget = saleData.sale_number?.startsWith("ORC");
      setSaleType(isBudget ? "budget" : "sale");

      // Load form data
      setFormData({
        sale_number: saleData.sale_number || "",
        client_id: saleData.customer_id || "",
        sale_date: saleData.sale_date || dateToISOString(new Date()),
        category_id: "",
        subcategory_id: "",
        cost_center_id: "",
        salesperson: "",
        status: saleData.status || "pending",
        notes: saleData.notes || "",
        tags: [],
      });

      // Load sale items
      if (saleData.sale_items && saleData.sale_items.length > 0) {
        const items = saleData.sale_items.map((item: any) => ({
          id: item.id,
          service_id: item.service_id || "",
          service_name: "",
          description: item.description || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: item.total_price || 0,
        }));
        setSaleItems(items);
      }

      // Load payment info from accounts_receivable
      const { data: receivables } = await supabase
        .from("accounts_receivable")
        .select("*")
        .eq("document_number", saleData.sale_number)
        .order("due_date", { ascending: true });

      if (receivables && receivables.length > 0) {
        const firstReceivable = receivables[0];
        setPaymentInfo({
          payment_method: firstReceivable.payment_method || "",
          receiving_account: firstReceivable.bank_account_id || "",
          installments: receivables.length,
          due_date: firstReceivable.due_date || dateToISOString(new Date()),
          discount_type: "fixed",
          discount_value: Math.abs(saleData.discount_amount || 0),
          addition_type: "fixed",
          addition_value: 0,
        });

        // Load installments
        const loadedInstallments = receivables.map((r: any, idx: number) => ({
          number: idx + 1,
          amount: r.amount || 0,
          due_date: r.due_date || dateToISOString(new Date()),
        }));
        setInstallments(loadedInstallments);
      }

      toast.success("Dados carregados com sucesso");
    } catch (error) {
      console.error("Error loading sale data:", error);
      toast.error("Erro ao carregar dados da venda");
    }
  };

  const loadData = async () => {
    try {
      // Get user profile first to get company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
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
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  // Quick add callbacks
  const handleQuickAddCustomer = async (customerId: string) => {
    // Reload customers
    const { data } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setCustomers(data);
      setFormData({ ...formData, client_id: customerId });
    }
  };

  const handleQuickAddCategory = async (categoryId: string) => {
    // Reload categories
    const { data } = await supabase
      .from("categories")
      .select("id, name, color")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setCategories(data);
      setFormData({ ...formData, category_id: categoryId });
    }
  };

  const handleQuickAddSubcategory = async (subcategoryId: string) => {
    // Reload subcategories
    const { data } = await supabase
      .from("subcategories")
      .select("id, category_id, name, color")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setSubcategories(data);
      setFormData({ ...formData, subcategory_id: subcategoryId });
    }
  };

  const handleQuickAddCostCenter = async (costCenterId: string) => {
    // Reload cost centers
    const { data } = await supabase
      .from("cost_centers")
      .select("id, name")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setCostCenters(data);
      setFormData({ ...formData, cost_center_id: costCenterId });
    }
  };

  const handleQuickAddService = async (serviceId: string) => {
    // Reload services
    const { data } = await supabase
      .from("services")
      .select("id, name, price")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setServices(data);
      // Don't auto-add an item, just update the list
      // User can manually add items using the "+ Adicionar item" button
    }
  };

  const handleQuickAddBankAccount = async (accountId: string) => {
    // Reload bank accounts
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, name, bank_name, account_number")
      .eq("company_id", userProfile.company_id)
      .eq("status", "active");

    if (data) {
      setBankAccounts(data);
      setPaymentInfo({ ...paymentInfo, receiving_account: accountId });
    }
  };

  const generateNextSaleNumber = (lastSaleNumber?: string) => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, "0");

    const prefix = saleType === "budget" ? "ORC" : "VND";
    const periodPrefix = `${prefix}${year}${month}`;

    if (!lastSaleNumber || !lastSaleNumber.startsWith(periodPrefix)) {
      return `${periodPrefix}0001`;
    }

    // Extract number from last sale (últimos 4 dígitos)
    const lastNumber = parseInt(lastSaleNumber.slice(-4)) || 0;
    const nextNumber = (lastNumber + 1).toString().padStart(4, "0");

    return `${periodPrefix}${nextNumber}`;
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

  const handleUpdate = async () => {
    try {
      const subtotal = getTotalAmount();
      const discountAmount = getDiscountAmount();
      const additionAmount = getAdditionAmount();
      const finalAmount = getFinalAmount();

      console.log("=== ATUALIZANDO VENDA ===");
      console.log("Sale ID:", editSaleId);

      // Update sale
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          customer_id: formData.client_id,
          total_amount: subtotal,
          discount_amount: discountAmount - additionAmount,
          net_amount: finalAmount,
          sale_date: formData.sale_date,
          notes: formData.tags.length > 0 ? `${formData.notes}\n\nTags: ${formData.tags.join(", ")}` : formData.notes,
        })
        .eq("id", editSaleId);

      if (saleError) {
        console.error("Erro ao atualizar venda:", saleError);
        throw saleError;
      }

      // Delete old sale items
      const { error: deleteItemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", editSaleId);

      if (deleteItemsError) {
        console.error("Erro ao deletar itens antigos:", deleteItemsError);
        throw deleteItemsError;
      }

      // Create new sale items
      const saleItemsData = saleItems.map((item) => ({
        sale_id: editSaleId,
        service_id: item.service_id,
        description: item.description || item.service_name || "Serviço",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }));

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsData);

      if (itemsError) {
        console.error("Erro ao criar novos itens:", itemsError);
        throw itemsError;
      }

      // Delete old accounts receivable
      const { error: deleteReceivablesError } = await supabase
        .from("accounts_receivable")
        .delete()
        .eq("document_number", formData.sale_number);

      if (deleteReceivablesError) {
        console.error("Erro ao deletar contas a receber antigas:", deleteReceivablesError);
        throw deleteReceivablesError;
      }

      // Create new accounts receivable entries
      const finalInstallments =
        installments.length > 0
          ? installments
          : [
              {
                number: 1,
                amount: finalAmount,
                due_date: paymentInfo.due_date || dateToISOString(new Date()),
              },
            ];

      const saleTypeLabel = saleType === "budget" ? "Orçamento" : saleType === "sale" ? "Venda" : "Venda Recorrente";

      const receivableEntries = finalInstallments.map((installment) => ({
        company_id: userProfile.company_id,
        customer_id: formData.client_id,
        description:
          finalInstallments.length === 1
            ? `${saleTypeLabel} ${formData.sale_number}`
            : `${saleTypeLabel} ${formData.sale_number} - Parcela ${installment.number}/${finalInstallments.length}`,
        amount: installment.amount,
        due_date: installment.due_date,
        status: "pending" as const,
        payment_method: (paymentInfo.payment_method || null) as any,
        notes: `Gerado automaticamente do ${saleTypeLabel.toLowerCase()} ${formData.sale_number}`,
        bank_account_id: paymentInfo.receiving_account || null,
        is_recurring: false,
        document_number: formData.sale_number,
      }));

      const { error: receivableError } = await supabase.from("accounts_receivable").insert(receivableEntries);

      if (receivableError) {
        console.error("Erro ao criar contas a receber:", receivableError);
        throw receivableError;
      }

      toast.success("Orçamento atualizado com sucesso!");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("=== ERRO AO ATUALIZAR VENDA ===", error);
      toast.error(`Erro ao atualizar: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log("=== INICIANDO SALVAMENTO DE VENDA ===");
    console.log("IsEditMode:", isEditMode);
    console.log("EditSaleId:", editSaleId);
    console.log("UserProfile:", userProfile);
    console.log("FormData:", formData);
    console.log("SaleItems:", saleItems);
    console.log("SaleType:", saleType);

    if (!userProfile?.company_id) {
      console.error("Erro: company_id não encontrado");
      toast.error("Erro: empresa não identificada");
      return;
    }
    if (!formData.client_id) {
      console.error("Erro: client_id não encontrado");
      toast.error("Selecione um cliente");
      return;
    }
    if (saleItems.length === 0) {
      console.error("Erro: nenhum item adicionado");
      toast.error("Adicione pelo menos um item à venda");
      return;
    }
    if (saleItems.some((item) => !item.service_id)) {
      console.error("Erro: item sem serviço");
      toast.error("Todos os itens devem ter um serviço selecionado");
      return;
    }

    setLoading(true);

    try {
      // If editing, update existing sale
      if (isEditMode && editSaleId) {
        return await handleUpdate();
      }

      // Otherwise, create new sale
      const subtotal = getTotalAmount();
      const discountAmount = getDiscountAmount();
      const additionAmount = getAdditionAmount();
      const finalAmount = getFinalAmount();
      console.log("Subtotal:", subtotal);
      console.log("Discount:", discountAmount);
      console.log("Addition:", additionAmount);
      console.log("Final amount:", finalAmount);

      // Generate unique sale number with retry logic
      let finalSaleNumber = "";
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        console.log(`Tentativa ${attempts + 1} de gerar número único...`);
        const prefix = saleType === "budget" ? "ORC" : "VND";
        const today = new Date();
        const year = today.getFullYear().toString().slice(-2);
        const month = (today.getMonth() + 1).toString().padStart(2, "0");
        const periodPrefix = `${prefix}${year}${month}`;

        const { data: lastSale } = await supabase
          .from("sales")
          .select("sale_number")
          .eq("company_id", userProfile.company_id)
          .like("sale_number", `${periodPrefix}%`)
          .order("sale_number", { ascending: false })
          .limit(1);

        const lastNumber = lastSale?.[0]?.sale_number ? parseInt(lastSale[0].sale_number.slice(-4)) || 0 : 0;

        const nextNumber = (lastNumber + 1 + attempts).toString().padStart(4, "0");
        finalSaleNumber = `${periodPrefix}${nextNumber}`;

        console.log("Número gerado:", finalSaleNumber);

        // Check if number already exists
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("company_id", userProfile.company_id)
          .eq("sale_number", finalSaleNumber)
          .maybeSingle();

        if (!existing) {
          console.log("Número único confirmado!");
          break;
        }

        console.log("Número já existe, tentando próximo...");
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error("Não foi possível gerar um número único de venda. Tente novamente.");
      }

      // Create sale
      console.log("Criando venda...");
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          company_id: userProfile.company_id,
          customer_id: formData.client_id,
          total_amount: subtotal,
          discount_amount: discountAmount - additionAmount, // Store net discount (discount minus additions)
          net_amount: finalAmount,
          sale_date: formData.sale_date,
          sale_number: finalSaleNumber,
          notes: formData.tags.length > 0 ? `${formData.notes}\n\nTags: ${formData.tags.join(", ")}` : formData.notes,
          status: "active",
        })
        .select()
        .single();

      if (saleError) {
        console.error("Erro ao criar venda:", saleError);
        throw saleError;
      }

      console.log("Venda criada com sucesso:", saleData);

      // Create sale items
      console.log("Criando itens da venda...");
      const saleItemsData = saleItems.map((item) => ({
        sale_id: saleData.id,
        service_id: item.service_id,
        description: item.description || item.service_name || "Serviço",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total,
      }));

      console.log("Sale items data:", saleItemsData);

      const { error: itemsError } = await supabase.from("sale_items").insert(saleItemsData);

      if (itemsError) {
        console.error("Erro ao criar itens:", itemsError);
        throw itemsError;
      }

      console.log("Itens criados com sucesso");

      // Create accounts receivable entries
      console.log("Criando contas a receber...");
      
      // Ensure installments are generated if empty
      const finalInstallments =
        installments.length > 0
          ? installments
          : [
              {
                number: 1,
                amount: finalAmount,
                due_date: paymentInfo.due_date || dateToISOString(new Date()),
              },
            ];

      console.log("Installments:", finalInstallments);
      console.log("Payment method:", paymentInfo.payment_method);
      console.log("Bank account:", paymentInfo.receiving_account);

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
        payment_method: (paymentInfo.payment_method || null) as any,
        notes: `Gerado automaticamente do ${saleTypeLabel.toLowerCase()} ${formData.sale_number}`,
        bank_account_id: paymentInfo.receiving_account || null,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_interval: null,
        recurrence_end_date: null,
        document_number: formData.sale_number,
      }));

      console.log("Receivable entries:", receivableEntries);

      const { error: receivableError } = await supabase.from("accounts_receivable").insert(receivableEntries);

      if (receivableError) {
        console.error("Erro ao criar contas a receber:", receivableError);
        throw receivableError;
      }

      console.log("Contas a receber criadas com sucesso");

      const saleTypeText = saleType === "budget" ? "Orçamento" : "Venda";

      console.log("=== VENDA SALVA COM SUCESSO ===");

      // Show success message
      toast.success(`${saleTypeText} ${saleType === "budget" ? "criado" : "criada"} com sucesso!`);

      // Call onSuccess callback to refresh data and close dialog
      console.log("Chamando onSuccess callback...");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("=== ERRO AO SALVAR VENDA ===");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);

      // More detailed error message
      const errorMessage = error?.message || "Erro desconhecido";
      toast.error(`Erro ao salvar: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log("=== FINALIZANDO SALVAMENTO ===");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isEditMode 
              ? `Editar ${saleType === "budget" ? "Orçamento" : "Venda"} ${formData.sale_number}`
              : `Novo ${saleType === "budget" ? "Orçamento" : "Venda"} ${formData.sale_number}`
            }
          </h2>
          <p className="text-muted-foreground">
            {isEditMode 
              ? `Edite ${saleType === "budget" ? "o orçamento" : "a venda"}`
              : `Cadastre ${saleType === "budget" ? "um novo orçamento" : "uma nova venda"}`
            }
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Venda - só mostra se não tiver defaultType definido */}
          {!defaultType && (
            <div>
              <Label>Tipo</Label>
              <Tabs
                value={saleType}
                onValueChange={(value) => setSaleType(value as "budget" | "sale")}
                className="mt-2"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="budget">Orçamento</TabsTrigger>
                  <TabsTrigger value="sale">Venda</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Situação da negociação */}
            <div>
              <Label htmlFor="status">Situação da negociação *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Em andamento</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
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
              <div className="flex gap-2">
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
                <Button type="button" size="icon" variant="outline" onClick={() => setQuickAddCustomerOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
              <div className="flex gap-2">
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
                <Button type="button" size="icon" variant="outline" onClick={() => setQuickAddCategoryOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Subcategoria */}
            <div>
              <Label htmlFor="subcategory">Subcategoria</Label>
              <div className="flex gap-2">
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
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setQuickAddSubcategoryOpen(true)}
                  disabled={!formData.category_id}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Centro de custo */}
            <div>
              <Label htmlFor="cost_center">Centro de custo</Label>
              <div className="flex gap-2">
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
                <Button type="button" size="icon" variant="outline" onClick={() => setQuickAddCostCenterOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
                        <div className="flex gap-2">
                          <div className="flex-1">
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
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => setQuickAddServiceOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
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
                  <SelectItem value="bank_slip">Boleto Bancário</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conta de recebimento */}
            <div>
              <Label htmlFor="receiving_account">Conta de recebimento</Label>
              <div className="flex gap-2">
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
                <Button type="button" size="icon" variant="outline" onClick={() => setQuickAddBankAccountOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
                <span className="text-2xl text-primary dark:text-white">
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
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || saleItems.length === 0 || !formData.client_id}
              className="min-w-[120px]"
            >
              {loading
                ? isEditMode ? "Atualizando..." : "Salvando..."
                : isEditMode ? `Atualizar ${saleType === "budget" ? "Orçamento" : "Venda"}` : `Salvar ${saleType === "budget" ? "Orçamento" : saleType === "sale" ? "Venda" : "Venda Recorrente"}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Modals */}
      {userProfile?.company_id && (
        <>
          <QuickAddCustomer
            open={quickAddCustomerOpen}
            onOpenChange={setQuickAddCustomerOpen}
            onSuccess={handleQuickAddCustomer}
            companyId={userProfile.company_id}
          />
          <QuickAddCategory
            open={quickAddCategoryOpen}
            onOpenChange={setQuickAddCategoryOpen}
            onSuccess={handleQuickAddCategory}
            companyId={userProfile.company_id}
            type="revenue"
          />
          <QuickAddSubcategory
            open={quickAddSubcategoryOpen}
            onOpenChange={setQuickAddSubcategoryOpen}
            onSuccess={handleQuickAddSubcategory}
            companyId={userProfile.company_id}
            categoryId={formData.category_id}
          />
          <QuickAddCostCenter
            open={quickAddCostCenterOpen}
            onOpenChange={setQuickAddCostCenterOpen}
            onSuccess={handleQuickAddCostCenter}
            companyId={userProfile.company_id}
          />
          <QuickAddService
            open={quickAddServiceOpen}
            onOpenChange={setQuickAddServiceOpen}
            onSuccess={handleQuickAddService}
            companyId={userProfile.company_id}
          />
          <QuickAddBankAccount
            open={quickAddBankAccountOpen}
            onOpenChange={setQuickAddBankAccountOpen}
            onSuccess={handleQuickAddBankAccount}
            companyId={userProfile.company_id}
          />
        </>
      )}
    </div>
  );
};

export default SalesForm;
