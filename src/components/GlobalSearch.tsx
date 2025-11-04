import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Search, User, Package, ShoppingCart, FileText, Users, Briefcase, DollarSign, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthContext";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  path: string;
  icon: any;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const searchData = async () => {
      if (!query || query.length < 1) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Get company_id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user?.id)
          .single();

        if (!profileData?.company_id) {
          setLoading(false);
          return;
        }

        const companyId = profileData.company_id;
        const searchTerm = `%${query}%`;

        // Faz todas as buscas em paralelo
        const [customers, products, services, sales, suppliers, receivables, payables] = await Promise.all([
          // Search Customers
          supabase
            .from('customers')
            .select('id, name, email, document')
            .eq('company_id', companyId)
            .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},document.ilike.${searchTerm}`)
            .limit(5),
          
          // Search Products
          supabase
            .from('products')
            .select('id, name, price, description, sku')
            .eq('company_id', companyId)
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm},sku.ilike.${searchTerm}`)
            .limit(5),
          
          // Search Services
          supabase
            .from('services')
            .select('id, name, price, description')
            .eq('company_id', companyId)
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),
          
          // Search Sales
          supabase
            .from('sales')
            .select('id, sale_number, net_amount, customers(name)')
            .eq('company_id', companyId)
            .ilike('sale_number', searchTerm)
            .limit(5),
          
          // Search Suppliers
          supabase
            .from('suppliers')
            .select('id, name, email, document')
            .eq('company_id', companyId)
            .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},document.ilike.${searchTerm}`)
            .limit(5),
          
          // Search Accounts Receivable
          supabase
            .from('accounts_receivable')
            .select('id, description, amount, document_number')
            .eq('company_id', companyId)
            .or(`description.ilike.${searchTerm},document_number.ilike.${searchTerm}`)
            .limit(5),
          
          // Search Accounts Payable
          supabase
            .from('accounts_payable')
            .select('id, description, amount, document_number')
            .eq('company_id', companyId)
            .or(`description.ilike.${searchTerm},document_number.ilike.${searchTerm}`)
            .limit(5)
        ]);

        customers.data?.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'Cliente',
            title: customer.name,
            subtitle: customer.email || customer.document,
            path: '/cadastros/clientes',
            icon: User
          });
        });

        products.data?.forEach(product => {
          searchResults.push({
            id: product.id,
            type: 'Produto',
            title: product.name,
            subtitle: `R$ ${product.price?.toFixed(2)}`,
            path: '/cadastros/produtos',
            icon: Package
          });
        });

        services.data?.forEach(service => {
          searchResults.push({
            id: service.id,
            type: 'Serviço',
            title: service.name,
            subtitle: `R$ ${service.price?.toFixed(2)}`,
            path: '/cadastros/servicos',
            icon: Briefcase
          });
        });

        sales.data?.forEach(sale => {
          searchResults.push({
            id: sale.id,
            type: 'Venda',
            title: sale.sale_number,
            subtitle: `${(sale as any).customers?.name || 'Sem cliente'} - R$ ${sale.net_amount?.toFixed(2)}`,
            path: '/vendas',
            icon: ShoppingCart
          });
        });

        suppliers.data?.forEach(supplier => {
          searchResults.push({
            id: supplier.id,
            type: 'Fornecedor',
            title: supplier.name,
            subtitle: supplier.email || supplier.document,
            path: '/cadastros/fornecedores',
            icon: Users
          });
        });

        receivables.data?.forEach(receivable => {
          searchResults.push({
            id: receivable.id,
            type: 'Conta a Receber',
            title: receivable.description,
            subtitle: `R$ ${receivable.amount?.toFixed(2)}`,
            path: '/financeiro/contas-receber',
            icon: DollarSign
          });
        });

        payables.data?.forEach(payable => {
          searchResults.push({
            id: payable.id,
            type: 'Conta a Pagar',
            title: payable.description,
            subtitle: `R$ ${payable.amount?.toFixed(2)}`,
            path: '/financeiro/contas-pagar',
            icon: Banknote
          });
        });

        setResults(searchResults);
        setLoading(false);
      } catch (error) {
        console.error('Search error:', error);
        setLoading(false);
      }
    };

    // Debounce reduzido para resposta mais rápida
    const debounceTimer = setTimeout(() => {
      searchData();
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [query, user?.id]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    navigate(path);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <div className="relative w-96 max-w-sm cursor-pointer" onClick={() => setOpen(true)}>
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9">
          <span className="text-muted-foreground">Buscar... (Ctrl+K)</span>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <VisuallyHidden>
          <DialogTitle>Busca Global</DialogTitle>
        </VisuallyHidden>
        <CommandInput 
          placeholder="Buscar clientes, produtos, vendas, serviços..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          
          {!loading && query.length >= 1 && results.length === 0 && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {!loading && query.length < 1 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Digite para começar a buscar
            </div>
          )}

          {!loading && Object.keys(groupedResults).map((type) => (
            <CommandGroup key={type} heading={type}>
              {groupedResults[type].map((result) => {
                const Icon = result.icon;
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result.path)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
