import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  percentage: number;
  amount: number;
  installments: number;
  due_date: string;
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
  sku?: string;
}

interface Category {
  id: string;
  name: string;
}

interface CostCenter {
  id: string;
  name: string;
}

const Vendas = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  
  const [saleType, setSaleType] = useState("budget");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    payment_method: "pix",
    receiving_account: "",
    percentage: 100,
    amount: 0,
    installments: 1,
    due_date: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    sale_number: `VND${Date.now().toString().slice(-6)}`,
    client_id: "",
    sale_date: new Date().toISOString().split('T')[0],
    category_id: "",
    cost_center_id: "",
    salesperson: "",
    status: "approved",
    notes: ""
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user profile first to get company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        navigate('/auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        toast.error('Perfil do usuário não encontrado');
        return;
      }

      setUserProfile(profileData);

      const [customersData, servicesData, categoriesData, costCentersData] = await Promise.all([
        supabase.from('customers').select('id, name, email, phone').eq('status', 'active'),
        supabase.from('services').select('id, name, price, sku').eq('status', 'active'),
        supabase.from('categories').select('id, name').eq('status', 'active'),
        supabase.from('cost_centers').select('id, name').eq('status', 'active')
      ]);

      if (customersData.data) setCustomers(customersData.data);
      if (servicesData.data) setServices(servicesData.data);
      if (categoriesData.data) setCategories(categoriesData.data);
      if (costCentersData.data) setCostCenters(costCentersData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    }
  };

  const addSaleItem = () => {
    const newItem: SaleItem = {
      id: Math.random().toString(36).substr(2, 9),
      service_id: "",
      service_name: "",
      description: "",
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setSaleItems([...saleItems, newItem]);
  };

  const updateSaleItem = (id: string, field: keyof SaleItem, value: any) => {
    setSaleItems(items => items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If service is selected, update price and name
        if (field === 'service_id') {
          const selectedService = services.find(s => s.id === value);
          if (selectedService) {
            updatedItem.service_name = selectedService.name;
            updatedItem.unit_price = selectedService.price || 0;
          }
        }
        
        // Calculate total when quantity or price changes
        if (field === 'quantity' || field === 'unit_price' || field === 'service_id') {
          updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeSaleItem = (id: string) => {
    setSaleItems(items => items.filter(item => item.id !== id));
  };

  const getTotalAmount = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateInstallmentDate = (installmentNumber: number) => {
    const baseDate = new Date(paymentInfo.due_date || formData.sale_date);
    baseDate.setMonth(baseDate.getMonth() + installmentNumber - 1);
    return baseDate.toISOString().split('T')[0];
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
    if (saleItems.some(item => !item.service_id)) {
      toast.error("Todos os itens devem ter um serviço selecionado");
      return;
    }

    setLoading(true);

    try {
      const totalAmount = getTotalAmount();
      const discount = 0;
      const tax = 0;

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: userProfile.company_id,
          customer_id: formData.client_id,
          total_amount: totalAmount,
          discount,
          tax,
          net_amount: totalAmount - discount + tax,
          sale_date: formData.sale_date,
          invoice_number: formData.sale_number,
          notes: formData.notes,
          status: 'active'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = saleItems.map(item => ({
        sale_id: saleData.id,
        product_id: item.service_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Create accounts receivable entries based on installments
      const installmentAmount = totalAmount / paymentInfo.installments;
      const receivableEntries = [];

      for (let i = 1; i <= paymentInfo.installments; i++) {
        const description = paymentInfo.installments === 1 
          ? `Venda ${formData.sale_number}` 
          : `Venda ${formData.sale_number} - Parcela ${i}/${paymentInfo.installments}`;

        receivableEntries.push({
          company_id: userProfile.company_id,
          customer_id: formData.client_id,
          description,
          amount: installmentAmount,
          due_date: calculateInstallmentDate(i),
          status: 'pending',
          payment_method: paymentInfo.payment_method as any,
          category_id: formData.category_id || null,
          cost_center_id: formData.cost_center_id || null,
          notes: `Gerado automaticamente da venda ${formData.sale_number}`
        });
      }

      const { error: receivableError } = await supabase
        .from('accounts_receivable')
        .insert(receivableEntries);

      if (receivableError) throw receivableError;

      toast.success("Venda criada com sucesso!");
      
      // Redirect to sales list or dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error saving sale:', error);
      toast.error('Erro ao salvar venda');
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
          <Button variant="outline" onClick={() => navigate('/dashboard')}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Venda'}
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
                <TabsTrigger value="one-time">Venda avulsa</TabsTrigger>
                <TabsTrigger value="recurring">Venda recorrente (contrato)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Situação da negociação */}
            <div>
              <Label htmlFor="status">Situação da negociação *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número da venda */}
            <div>
              <Label htmlFor="sale_number">Número da venda *</Label>
              <div className="relative">
                <Input
                  id="sale_number"
                  value={formData.sale_number}
                  onChange={(e) => setFormData({...formData, sale_number: e.target.value})}
                />
                <Button size="sm" variant="ghost" className="absolute right-1 top-1 h-8 w-8 p-0">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({...formData, client_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
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
              <Input
                id="sale_date"
                type="date"
                value={formData.sale_date}
                onChange={(e) => setFormData({...formData, sale_date: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Categoria financeira */}
            <div>
              <Label htmlFor="category">Categoria financeira</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Centro de custo */}
            <div>
              <Label htmlFor="cost_center">Centro de custo</Label>
              <Select value={formData.cost_center_id} onValueChange={(value) => setFormData({...formData, cost_center_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map(center => (
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
              <Select value={formData.salesperson} onValueChange={(value) => setFormData({...formData, salesperson: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user1">Usuário do Sistema</SelectItem>
                </SelectContent>
              </Select>
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
                          onValueChange={(value) => updateSaleItem(item.id, 'service_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(service => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} {service.sku && `(${service.sku})`}
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
                          onChange={(e) => updateSaleItem(item.id, 'description', e.target.value)}
                          className="min-h-[60px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateSaleItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
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
                            onChange={(e) => updateSaleItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-sm mr-1">R$</span>
                          <span className="font-medium">
                            {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Forma de pagamento */}
            <div>
              <Label htmlFor="payment_method">Forma de pagamento</Label>
              <Select
                value={paymentInfo.payment_method}
                onValueChange={(value) => setPaymentInfo({...paymentInfo, payment_method: value})}
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
                onValueChange={(value) => setPaymentInfo({...paymentInfo, receiving_account: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conta_principal">Conta Principal</SelectItem>
                  <SelectItem value="conta_secundaria">Conta Secundária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Percentual */}
            <div>
              <Label htmlFor="percentage">Percentual</Label>
              <div className="flex items-center">
                <Input
                  type="number"
                  value={paymentInfo.percentage}
                  onChange={(e) => setPaymentInfo({...paymentInfo, percentage: parseFloat(e.target.value) || 0})}
                  min="0"
                  max="100"
                />
                <span className="ml-1 text-sm">%</span>
              </div>
            </div>

            {/* Valor a receber */}
            <div>
              <Label htmlFor="amount">Valor a receber</Label>
              <div className="flex items-center">
                <span className="text-sm mr-1">R$</span>
                <Input
                  type="number"
                  value={getTotalAmount()}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Condição de pagamento */}
            <div>
              <Label htmlFor="installments">Condição de pagamento *</Label>
              <Select
                value={paymentInfo.installments.toString()}
                onValueChange={(value) => setPaymentInfo({...paymentInfo, installments: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">À vista</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                  <SelectItem value="3">3x</SelectItem>
                  <SelectItem value="6">6x</SelectItem>
                  <SelectItem value="10">10x</SelectItem>
                  <SelectItem value="12">12x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vencimento */}
            <div>
              <Label htmlFor="due_date">Vencimento</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={paymentInfo.due_date}
                  onChange={(e) => setPaymentInfo({...paymentInfo, due_date: e.target.value})}
                />
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Editar parcelas
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total da Venda:</span>
            <span>R$ {getTotalAmount().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vendas;