import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Check, Calendar, DollarSign, ChevronLeft, ChevronRight, CreditCard, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfYear, endOfYear, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileUpload } from "@/components/FileUpload";
import { CPFInput } from "@/components/ui/cpf-input";
import { CNPJInput } from "@/components/ui/cnpj-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { normalizeCPF } from "@/lib/cpf-utils";
import { normalizeCNPJ } from "@/lib/cnpj-utils";
import { formatPhone } from "@/lib/phone-utils";
import { AccountDetailsModal } from "@/components/AccountDetailsModal";

interface AccountPayable {
  id: string;
  supplier_id: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_method: "cash" | "credit_card" | "debit_card" | "pix" | "bank_transfer" | "bank_slip" | "check" | null;
  notes: string | null;
  document_number: string | null;
  suppliers: { name: string };
  bank_accounts: { name: string; bank_name: string } | null;
  cost_centers: { name: string } | null;
  categories: { name: string; color: string } | null;
  subcategories: { name: string; color: string } | null;
  is_recurring: boolean;
  recurrence_frequency: string;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  parent_transaction_id: string | null;
  receipt_file_path: string | null;
  bank_account_id: string | null;
  cost_center_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
}

interface Supplier {
  id: string;
  name: string;
  email?: string;
  document?: string;
  city?: string;
  state?: string;
}

const ContasPagar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [periodFilter, setPeriodFilter] = useState<"monthly" | "today" | "year" | "all" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [costCenterDialogOpen, setCostCenterDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  
  // Modal states for account details
  const [accountDetailsModal, setAccountDetailsModal] = useState({
    isOpen: false,
    accounts: [] as AccountPayable[],
    title: "",
    type: "pending" as "pending" | "paid" | "overdue" | "total",
    totalAmount: 0
  });

  const [formData, setFormData] = useState({
    supplier_id: "",
    description: "",
    amount: "",
    due_date: "",
    payment_method: "",
    notes: "",
    document_number: "",
    is_recurring: false,
    recurrence_frequency: "monthly",
    recurrence_interval: 1,
    recurrence_end_date: "",
    bank_account_id: "",
    cost_center_id: "",
    category_id: "",
    subcategory_id: "",
    receipt_file_path: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    document_type: 'cnpj' as 'cpf' | 'cnpj',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const [supplierDocumentValid, setSupplierDocumentValid] = useState(false);
  const [supplierPhoneValid, setSupplierPhoneValid] = useState(true);

  // Quick-add form states
  const [bankAccountFormData, setBankAccountFormData] = useState({
    name: "",
    bank_name: "",
    account_number: "",
    account_type: "checking" as "checking" | "savings",
  });

  const [costCenterFormData, setCostCenterFormData] = useState({
    name: "",
    description: "",
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: "",
    description: "",
    color: "#6B7280",
    category_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchSuppliers();
      fetchBankAccounts();
      fetchCostCenters();
      fetchCategories();
      fetchSubcategories();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data: existingAccounts, error: existingError } = await supabase
        .from('accounts_payable')
        .select(`
          *,
          suppliers:supplier_id (
            name
          ),
          bank_accounts:bank_account_id (
            name,
            bank_name
          ),
          cost_centers:cost_center_id (
            name
          ),
          categories:category_id (
            name,
            color
          ),
          subcategories:subcategory_id (
            name,
            color
          )
        `)
        .order('due_date', { ascending: false });

      if (existingError) {
        console.error('Error fetching accounts:', existingError);
        toast({
          title: "Erro ao carregar contas",
          description: existingError.message,
          variant: "destructive",
        });
        return;
      }

      setAccounts((existingAccounts as any[]) || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, email, document, city, state')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching suppliers:', error);
      } else {
        setSuppliers(data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, bank_name, account_number')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('id, name, description')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, color, category_id')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      document_type: 'cnpj' as 'cpf' | 'cnpj',
      address: '',
      city: '',
      state: '',
      zip_code: ''
    });
    setSupplierDocumentValid(false);
    setSupplierPhoneValid(true);
  };

  // Quick-add handlers
  const handleBankAccountQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Você precisa estar associado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          name: bankAccountFormData.name,
          bank_name: bankAccountFormData.bank_name,
          account_number: bankAccountFormData.account_number,
          account_type: bankAccountFormData.account_type,
          company_id: profile.company_id,
          balance: 0,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchBankAccounts();
      setFormData(prev => ({ ...prev, bank_account_id: data.id }));
      setBankAccountFormData({
        name: "",
        bank_name: "",
        account_number: "",
        account_type: "checking",
      });
      setBankAccountDialogOpen(false);
      
      toast({
        title: "Conta bancária cadastrada!",
        description: `${data.name} foi cadastrada e selecionada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar conta bancária",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCostCenterQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Você precisa estar associado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('cost_centers')
        .insert({
          name: costCenterFormData.name,
          description: costCenterFormData.description || null,
          company_id: profile.company_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCostCenters();
      setFormData(prev => ({ ...prev, cost_center_id: data.id }));
      setCostCenterFormData({
        name: "",
        description: "",
      });
      setCostCenterDialogOpen(false);
      
      toast({
        title: "Centro de custo cadastrado!",
        description: `${data.name} foi cadastrado e selecionado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar centro de custo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCategoryQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Você precisa estar associado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
          color: categoryFormData.color,
          company_id: profile.company_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchCategories();
      setFormData(prev => ({ ...prev, category_id: data.id }));
      setCategoryFormData({
        name: "",
        description: "",
        color: "#3B82F6",
      });
      setCategoryDialogOpen(false);
      
      toast({
        title: "Categoria cadastrada!",
        description: `${data.name} foi cadastrada e selecionada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar categoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubcategoryQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Você precisa estar associado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('subcategories')
        .insert({
          name: subcategoryFormData.name,
          description: subcategoryFormData.description || null,
          color: subcategoryFormData.color,
          category_id: subcategoryFormData.category_id,
          company_id: profile.company_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSubcategories();
      setFormData(prev => ({ ...prev, subcategory_id: data.id }));
      setSubcategoryFormData({
        name: "",
        description: "",
        color: "#6B7280",
        category_id: "",
      });
      setSubcategoryDialogOpen(false);
      
      toast({
        title: "Subcategoria cadastrada!",
        description: `${data.name} foi cadastrada e selecionada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar subcategoria",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supplierDocumentValid) {
      toast({
        title: "Erro de validação",
        description: supplierFormData.document_type === 'cpf' ? "CPF deve ter 11 dígitos válidos" : "CNPJ deve ter 14 dígitos válidos",
        variant: "destructive",
      });
      return;
    }
    
    if (!supplierPhoneValid) {
      toast({
        title: "Telefone inválido",
        description: "O telefone deve ter entre 10 e 11 dígitos",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const supplierData = {
        ...supplierFormData,
        document: supplierFormData.document_type === 'cpf' ? normalizeCPF(supplierFormData.document) : normalizeCNPJ(supplierFormData.document),
        company_id: profile.company_id,
      };

      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Fornecedor cadastrado!",
        description: "O novo fornecedor foi adicionado com sucesso.",
      });

      // Close supplier dialog
      setSupplierDialogOpen(false);
      resetSupplierForm();
      
      // Refresh suppliers and auto-select the new one
      await fetchSuppliers();
      setFormData(prev => ({ ...prev, supplier_id: newSupplier.id }));
      
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({
        title: "Erro ao salvar fornecedor",
        description: "Não foi possível salvar as informações do fornecedor",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      description: "",
      amount: "",
      due_date: "",
      payment_method: "",
      notes: "",
      document_number: "",
      is_recurring: false,
      recurrence_frequency: "monthly",
      recurrence_interval: 1,
      recurrence_end_date: "",
      bank_account_id: "",
      cost_center_id: "",
      category_id: "",
      subcategory_id: "",
      receipt_file_path: "",
    });
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Erro",
          description: "Usuário não está vinculado a uma empresa",
          variant: "destructive",
        });
        return;
      }

      const accountData = {
        supplier_id: formData.supplier_id || null,
        description: formData.description,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        payment_method: (formData.payment_method || null) as any,
        notes: formData.notes || null,
        document_number: formData.document_number || null,
        company_id: profile.company_id,
        is_recurring: formData.is_recurring,
        recurrence_frequency: formData.recurrence_frequency,
        recurrence_interval: parseInt(formData.recurrence_interval.toString()),
        recurrence_end_date: formData.recurrence_end_date || null,
        bank_account_id: formData.bank_account_id || null,
        cost_center_id: formData.cost_center_id || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        receipt_file_path: formData.receipt_file_path || null,
      };

      let error;
      if (editingAccount) {
        const { error: updateError } = await supabase
          .from('accounts_payable')
          .update(accountData)
          .eq('id', editingAccount.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('accounts_payable')
          .insert([accountData]);
        error = insertError;
      }

      if (error) {
        toast({
          title: "Erro ao salvar conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: editingAccount ? "Conta atualizada!" : "Conta cadastrada!",
          description: "Conta salva com sucesso",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .update({ 
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao registrar pagamento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Pagamento registrado!",
          description: "Conta marcada como paga",
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Buscar informações da conta
      const { data: account, error: fetchError } = await supabase
        .from('accounts_payable')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !account) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar a conta",
          variant: "destructive",
        });
        return;
      }

      // Se é uma conta recorrente pai, perguntar sobre as próximas parcelas
      if (account.is_recurring && !account.parent_transaction_id) {
        const { data: futureInstallments } = await supabase
          .from('accounts_payable')
          .select('id')
          .eq('parent_transaction_id', id)
          .eq('status', 'pending');

        if (futureInstallments && futureInstallments.length > 0) {
          const choice = confirm(
            `Esta conta possui ${futureInstallments.length} parcelas futuras pendentes.\n\n` +
            `Escolha uma opção:\n` +
            `• OK: Excluir apenas esta conta\n` +
            `• Cancelar: Não excluir nada`
          );

          if (!choice) {
            return;
          }

          // Se escolheu OK, continua apenas com a exclusão da conta específica
        }
      }

      // Se é uma parcela de uma recorrência, perguntar sobre toda a série
      if (account.parent_transaction_id) {
        const { data: parentAccount } = await supabase
          .from('accounts_payable')
          .select('description')
          .eq('id', account.parent_transaction_id)
          .single();

        const { data: seriesInstallments } = await supabase
          .from('accounts_payable')
          .select('id, status')
          .or(`id.eq.${account.parent_transaction_id},parent_transaction_id.eq.${account.parent_transaction_id}`)
          .neq('status', 'paid');

        if (seriesInstallments && seriesInstallments.length > 1) {
          const choice = window.prompt(
            `Esta conta faz parte de uma série recorrente "${parentAccount?.description || 'N/A'}" com ${seriesInstallments.length} parcelas não pagas.\n\n` +
            `Digite sua escolha:\n` +
            `1 - Excluir apenas esta conta\n` +
            `2 - Excluir toda a série de recorrência\n` +
            `Qualquer outro valor - Cancelar`,
            "1"
          );

          if (choice === "2") {
            // Excluir toda a série
            const idsToDelete = seriesInstallments.map(inst => inst.id);
            const { error: deleteSeriesError } = await supabase
              .from('accounts_payable')
              .delete()
              .in('id', idsToDelete);

            if (deleteSeriesError) {
              toast({
                title: "Erro ao excluir série",
                description: deleteSeriesError.message,
                variant: "destructive",
              });
            } else {
              toast({
                title: "Série excluída!",
                description: `${seriesInstallments.length} contas foram removidas`,
              });
              fetchAccounts();
            }
            return;
          } else if (choice !== "1") {
            toast({
              title: "Opção inválida",
              description: "Operação cancelada",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Confirmar exclusão da conta específica
      if (!confirm(`Tem certeza que deseja excluir apenas esta conta?`)) {
        return;
      }

      // Deletar apenas a conta específica
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erro ao excluir conta",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta excluída!",
          description: "Conta removida com sucesso",
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleEdit = (account: AccountPayable) => {
    setEditingAccount(account);
    setFormData({
      supplier_id: account.supplier_id,
      description: account.description,
      amount: account.amount.toString(),
      due_date: account.due_date,
      payment_method: account.payment_method || "",
      notes: account.notes || "",
      document_number: account.document_number || "",
      is_recurring: account.is_recurring || false,
      recurrence_frequency: account.recurrence_frequency || "monthly",
      recurrence_interval: account.recurrence_interval || 1,
      recurrence_end_date: account.recurrence_end_date || "",
      bank_account_id: account.bank_account_id || "",
      cost_center_id: account.cost_center_id || "",
      category_id: account.category_id || "",
      subcategory_id: account.subcategory_id || "",
      receipt_file_path: account.receipt_file_path || "",
    });
    setIsDialogOpen(true);
  };

  // Função para determinar o status real baseado na data de vencimento
  const getActualStatus = (account: AccountPayable) => {
    if (account.status === 'pending') {
      const today = new Date();
      const dueDate = new Date(account.due_date);
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        return 'overdue';
      }
    }
    return account.status;
  };

  // Funções para abrir modal com detalhes específicos
  const openAccountDetailsModal = (type: "pending" | "paid" | "overdue" | "total") => {
    let filteredAccountsForModal: AccountPayable[] = [];
    let title = "";
    let modalTotalAmount = 0;

    switch (type) {
      case "pending":
        filteredAccountsForModal = filteredAccounts.filter(account => account.status === 'pending');
        title = "Detalhes - Contas a Pagar";
        modalTotalAmount = totalPending;
        break;
      case "paid":
        filteredAccountsForModal = filteredAccounts.filter(account => account.status === 'paid');
        title = "Detalhes - Contas Pagas";
        modalTotalAmount = totalPaid;
        break;
      case "overdue":
        filteredAccountsForModal = filteredAccounts.filter(account => getActualStatus(account) === 'overdue');
        title = "Detalhes - Contas Vencidas";
        modalTotalAmount = totalOverdue;
        break;
      case "total":
        filteredAccountsForModal = filteredAccounts;
        title = "Detalhes - Todas as Contas";
        modalTotalAmount = totalValue;
        break;
    }

    setAccountDetailsModal({
      isOpen: true,
      accounts: filteredAccountsForModal,
      title,
      type,
      totalAmount: modalTotalAmount
    });
  };

  const getStatusBadge = (account: AccountPayable) => {
    const actualStatus = getActualStatus(account);
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      overdue: { label: "Atrasado", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "outline" as const },
    };
    
    const config = statusConfig[actualStatus as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.suppliers.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const actualStatus = getActualStatus(account);
    const matchesStatus = statusFilter === "all" || actualStatus === statusFilter;
    
    // Filtro por período
    let matchesPeriod = true;
    const accountDate = new Date(account.due_date);
    
    switch (periodFilter) {
      case "monthly":
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        matchesPeriod = isWithinInterval(accountDate, { start: monthStart, end: monthEnd });
        break;
      case "today":
        matchesPeriod = isToday(accountDate);
        break;
      case "year":
        const yearStart = startOfYear(new Date());
        const yearEnd = endOfYear(new Date());
        matchesPeriod = isWithinInterval(accountDate, { start: yearStart, end: yearEnd });
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          matchesPeriod = isWithinInterval(accountDate, { start, end });
        }
        break;
      case "all":
      default:
        matchesPeriod = true;
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalPending = filteredAccounts
    .filter(account => account.status === 'pending')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalPaid = filteredAccounts
    .filter(account => account.status === 'paid')
    .reduce((sum, account) => sum + account.amount, 0);

  const totalOverdue = filteredAccounts
    .filter(account => getActualStatus(account) === 'overdue')
    .reduce((sum, account) => sum + account.amount, 0);
    
  // Total = Paid + Pending (que já inclui os vencidos) - evita duplicação
  const totalValue = totalPaid + totalPending;

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie suas contas a pagar</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="premium" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta a Pagar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
                <DialogDescription>
                  {editingAccount ? "Atualize as informações da conta" : "Cadastre uma nova conta a pagar"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <ScrollArea className="max-h-[65vh] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Fornecedor *</Label>
                    <Select 
                      value={formData.supplier_id} 
                      onValueChange={(value) => {
                        if (value === '__add_new__') {
                          setSupplierDialogOpen(true);
                        } else {
                          setFormData({...formData, supplier_id: value});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                        <SelectItem 
                          value="__add_new__" 
                          className="flex items-center justify-start text-primary font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="leading-none">Cadastrar Fornecedor</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Input
                      id="description"
                      placeholder="Descrição da conta"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Data de Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document_number">Número do Documento</Label>
                    <Input
                      id="document_number"
                      placeholder="Número da nota/boleto"
                      value={formData.document_number}
                      onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_account_id">Conta Bancária</Label>
                    <Select 
                      value={formData.bank_account_id} 
                      onValueChange={(value) => {
                        if (value === "__add_new__") {
                          setBankAccountDialogOpen(true);
                        } else {
                          setFormData({...formData, bank_account_id: value});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta bancária" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {account.bank_name}
                          </SelectItem>
                        ))}
                        <SelectItem 
                          value="__add_new__" 
                          className="flex items-center justify-start text-primary font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="leading-none">Cadastrar Conta Bancária</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost_center_id">Centro de Custo</Label>
                    <Select 
                      value={formData.cost_center_id} 
                      onValueChange={(value) => {
                        if (value === "__add_new__") {
                          setCostCenterDialogOpen(true);
                        } else {
                          setFormData({...formData, cost_center_id: value});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o centro de custo" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                        <SelectItem 
                          value="__add_new__" 
                          className="flex items-center justify-start text-primary font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="leading-none">Cadastrar Centro de Custo</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoria</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => {
                        if (value === "__add_new__") {
                          setCategoryDialogOpen(true);
                        } else {
                          setFormData({...formData, category_id: value, subcategory_id: ""});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
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
                        <SelectItem 
                          value="__add_new__" 
                          className="flex items-center justify-start text-primary font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                        >
                          <div className="flex items-center">
                            <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="leading-none">Cadastrar Categoria</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory_id">Subcategoria</Label>
                    <Select 
                      value={formData.subcategory_id} 
                      onValueChange={(value) => {
                        if (value === "__add_new__") {
                          setSubcategoryFormData(prev => ({ ...prev, category_id: formData.category_id }));
                          setSubcategoryDialogOpen(true);
                        } else {
                          setFormData({...formData, subcategory_id: value});
                        }
                      }}
                      disabled={!formData.category_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a subcategoria" />
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
                        {formData.category_id && (
                          <SelectItem 
                            value="__add_new__" 
                            className="flex items-center justify-start text-primary font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center">
                              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="leading-none">Cadastrar Subcategoria</span>
                            </div>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 col-span-2 border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="is_recurring"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="is_recurring" className="text-base font-medium">
                          🔄 Configurar recorrência de pagamento
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ative para criar automaticamente as próximas contas de acordo com a frequência definida
                        </p>
                      </div>
                    </div>

                    {formData.is_recurring && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="recurrence_frequency" className="flex items-center gap-2">
                            📅 Frequência
                          </Label>
                          <Select value={formData.recurrence_frequency} onValueChange={(value) => setFormData({...formData, recurrence_frequency: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">🗓️ Semanalmente</SelectItem>
                              <SelectItem value="monthly">📅 Mensalmente</SelectItem>
                              <SelectItem value="yearly">🎂 Anualmente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="recurrence_interval" className="flex items-center gap-2">
                            🔢 Intervalo
                          </Label>
                          <Input
                            id="recurrence_interval"
                            type="number"
                            min="1"
                            max="12"
                            value={formData.recurrence_interval}
                            onChange={(e) => setFormData({...formData, recurrence_interval: parseInt(e.target.value) || 1})}
                          />
                          <p className="text-xs text-muted-foreground">
                            A cada {formData.recurrence_interval} {
                              formData.recurrence_frequency === 'weekly' ? 'semana(s)' :
                              formData.recurrence_frequency === 'monthly' ? 'mês/meses' : 'ano(s)'
                            }
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="recurrence_end_date" className="flex items-center gap-2">
                            🏁 Data limite
                            <span className="text-xs text-muted-foreground">(opcional)</span>
                          </Label>
                          <Input
                            id="recurrence_end_date"
                            type="date"
                            value={formData.recurrence_end_date}
                            onChange={(e) => setFormData({...formData, recurrence_end_date: e.target.value})}
                          />
                          <p className="text-xs text-muted-foreground">
                            {formData.recurrence_end_date ? 
                              `Até ${format(new Date(formData.recurrence_end_date), 'dd/MM/yyyy')}` : 
                              '♾️ Sem data limite (para sempre)'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {formData.is_recurring && (
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border-l-4 border-green-500">
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">ℹ️</span>
                          <div className="text-sm">
                            <p className="font-medium text-green-700 dark:text-green-300">Como funciona:</p>
                            <p className="text-green-600 dark:text-green-400 mt-1">
                              O sistema criará automaticamente as próximas contas {formData.recurrence_frequency === 'weekly' ? 'semanalmente' : formData.recurrence_frequency === 'monthly' ? 'mensalmente' : 'anualmente'} com 30 dias de antecedência.
                              {!formData.recurrence_end_date && ' Esta conta será gerada indefinidamente.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="payment_method">Forma de Pagamento *</Label>
                    <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="bank_transfer">Transferência Bancária (TED/DOC)</SelectItem>
                        <SelectItem value="bank_slip">Boleto Bancário</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="check">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      placeholder="Observações adicionais"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FileUpload
                      onFileUploaded={(filePath) => setFormData({...formData, receipt_file_path: filePath})}
                      currentFile={formData.receipt_file_path}
                      companyId={user?.user_metadata?.company_id || 'temp'}
                      accountId={editingAccount?.id}
                    />
                  </div>
                </div>
                </ScrollArea>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="premium" disabled={loading}>
                    {loading ? "Salvando..." : (editingAccount ? "Atualizar" : "Cadastrar")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Supplier Registration Dialog */}
          <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo fornecedor
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-name">Nome *</Label>
                    <Input
                      id="supplier-name"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier-email">Email *</Label>
                    <Input
                      id="supplier-email"
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="supplier-document-type">Tipo de Documento</Label>
                     <Select
                       value={supplierFormData.document_type}
                       onValueChange={(value) => {
                         setSupplierFormData(prev => ({ 
                           ...prev, 
                           document_type: value as "cpf" | "cnpj",
                           document: '' // Reset document when type changes
                         }));
                         setSupplierDocumentValid(false);
                       }}
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
                     <Label htmlFor="supplier-document">Documento *</Label>
                     {supplierFormData.document_type === 'cpf' ? (
                       <CPFInput
                         value={supplierFormData.document}
                         onChange={(value, isValid) => {
                           setSupplierFormData(prev => ({ ...prev, document: value }));
                           setSupplierDocumentValid(isValid);
                         }}
                       />
                     ) : (
                       <CNPJInput
                         value={supplierFormData.document}
                         onChange={(value, normalizedValue) => {
                           setSupplierFormData(prev => ({ ...prev, document: value }));
                           setSupplierDocumentValid(normalizedValue.length === 14);
                         }}
                       />
                     )}
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="supplier-phone">Telefone *</Label>
                     <Input
                       id="supplier-phone"
                       value={supplierFormData.phone}
                       onChange={(e) => setSupplierFormData(prev => ({ ...prev, phone: e.target.value }))}
                       required
                     />
                   </div>

                   <div className="space-y-2">
                     <Label htmlFor="supplier-zip">CEP</Label>
                     <Input
                       id="supplier-zip"
                       value={supplierFormData.zip_code}
                       onChange={(e) => setSupplierFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                     />
                   </div>
                 </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-address">Endereço</Label>
                  <Input
                    id="supplier-address"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="supplier-city">Cidade</Label>
                     <Input
                       id="supplier-city"
                       value={supplierFormData.city}
                       onChange={(e) => setSupplierFormData(prev => ({ ...prev, city: e.target.value }))}
                     />
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="supplier-state">Estado</Label>
                     <Input
                       id="supplier-state"
                       value={supplierFormData.state}
                       onChange={(e) => setSupplierFormData(prev => ({ ...prev, state: e.target.value }))}
                     />
                   </div>
                 </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Salvar Fornecedor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick-add Bank Account Dialog */}
          <Dialog open={bankAccountDialogOpen} onOpenChange={setBankAccountDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Conta Bancária</DialogTitle>
                <DialogDescription>
                  Adicione uma nova conta bancária rapidamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBankAccountQuickAdd}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Nome da Conta *</Label>
                    <Input
                      id="account_name"
                      placeholder="Ex: Conta Corrente Principal"
                      value={bankAccountFormData.name}
                      onChange={(e) => setBankAccountFormData({...bankAccountFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Nome do Banco *</Label>
                    <Input
                      id="bank_name"
                      placeholder="Ex: Banco do Brasil"
                      value={bankAccountFormData.bank_name}
                      onChange={(e) => setBankAccountFormData({...bankAccountFormData, bank_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Número da Conta *</Label>
                    <Input
                      id="account_number"
                      placeholder="Ex: 12345-6"
                      value={bankAccountFormData.account_number}
                      onChange={(e) => setBankAccountFormData({...bankAccountFormData, account_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Tipo de Conta</Label>
                    <Select value={bankAccountFormData.account_type} onValueChange={(value: "checking" | "savings") => setBankAccountFormData({...bankAccountFormData, account_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Conta Corrente</SelectItem>
                        <SelectItem value="savings">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setBankAccountDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick-add Cost Center Dialog */}
          <Dialog open={costCenterDialogOpen} onOpenChange={setCostCenterDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Centro de Custo</DialogTitle>
                <DialogDescription>
                  Adicione um novo centro de custo rapidamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCostCenterQuickAdd}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cost_center_name">Nome *</Label>
                    <Input
                      id="cost_center_name"
                      placeholder="Nome do centro de custo"
                      value={costCenterFormData.name}
                      onChange={(e) => setCostCenterFormData({...costCenterFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_center_description">Descrição</Label>
                    <Input
                      id="cost_center_description"
                      placeholder="Descrição do centro de custo"
                      value={costCenterFormData.description}
                      onChange={(e) => setCostCenterFormData({...costCenterFormData, description: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCostCenterDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick-add Category Dialog */}
          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Categoria</DialogTitle>
                <DialogDescription>
                  Adicione uma nova categoria rapidamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCategoryQuickAdd}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Nome *</Label>
                    <Input
                      id="category_name"
                      placeholder="Nome da categoria"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_description">Descrição</Label>
                    <Input
                      id="category_description"
                      placeholder="Descrição da categoria"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_color">Cor</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="category_color"
                        type="color"
                        value={categoryFormData.color}
                        onChange={(e) => setCategoryFormData({...categoryFormData, color: e.target.value})}
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                      />
                      <Input
                        value={categoryFormData.color}
                        onChange={(e) => setCategoryFormData({...categoryFormData, color: e.target.value})}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Quick-add Subcategory Dialog */}
          <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Subcategoria</DialogTitle>
                <DialogDescription>
                  Adicione uma nova subcategoria rapidamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubcategoryQuickAdd}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subcategory_name">Nome *</Label>
                    <Input
                      id="subcategory_name"
                      placeholder="Nome da subcategoria"
                      value={subcategoryFormData.name}
                      onChange={(e) => setSubcategoryFormData({...subcategoryFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory_description">Descrição</Label>
                    <Input
                      id="subcategory_description"
                      placeholder="Descrição da subcategoria"
                      value={subcategoryFormData.description}
                      onChange={(e) => setSubcategoryFormData({...subcategoryFormData, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subcategory_color">Cor</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subcategory_color"
                        type="color"
                        value={subcategoryFormData.color}
                        onChange={(e) => setSubcategoryFormData({...subcategoryFormData, color: e.target.value})}
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                      />
                      <Input
                        value={subcategoryFormData.color}
                        onChange={(e) => setSubcategoryFormData({...subcategoryFormData, color: e.target.value})}
                        placeholder="#6B7280"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setSubcategoryDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openAccountDetailsModal("pending")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openAccountDetailsModal("paid")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pago</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openAccountDetailsModal("overdue")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencido</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => openAccountDetailsModal("total")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contas a Pagar</CardTitle>
            <CardDescription>Visualize e gerencie suas contas a pagar</CardDescription>
            
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por descrição ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Por Mês</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {periodFilter === "monthly" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-32 text-center">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {periodFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhuma conta encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.suppliers?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{account.description}</TableCell>
                      <TableCell className="font-semibold">
                        R$ {account.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(account.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(account)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {(account.status === 'pending' || getActualStatus(account) === 'overdue') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePayment(account.id)}
                              title="Marcar como pago"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(account.id)}
                            title="Excluir conta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Details Modal */}
      <AccountDetailsModal
        isOpen={accountDetailsModal.isOpen}
        onClose={() => setAccountDetailsModal(prev => ({ ...prev, isOpen: false }))}
        accounts={accountDetailsModal.accounts}
        title={accountDetailsModal.title}
        type="payable"
        totalAmount={accountDetailsModal.totalAmount}
      />
    </>
  );
};

export default ContasPagar;