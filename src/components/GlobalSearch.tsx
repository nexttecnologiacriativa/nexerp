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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const searchData = async () => {
      if (!query || query.length < 2) {
        setResults([]);
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

        // Search Customers
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('company_id', companyId)
          .ilike('name', searchTerm)
          .limit(5);

        customers?.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'Cliente',
            title: customer.name,
            subtitle: customer.email,
            path: '/cadastros/clientes',
            icon: User
          });
        });

        // Search Products
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('company_id', companyId)
          .ilike('name', searchTerm)
          .limit(5);

        products?.forEach(product => {
          searchResults.push({
            id: product.id,
            type: 'Produto',
            title: product.name,
            subtitle: `R$ ${product.price?.toFixed(2)}`,
            path: '/cadastros/produtos',
            icon: Package
          });
        });

        // Search Services
        const { data: services } = await supabase
          .from('services')
          .select('id, name, price')
          .eq('company_id', companyId)
          .ilike('name', searchTerm)
          .limit(5);

        services?.forEach(service => {
          searchResults.push({
            id: service.id,
            type: 'Serviço',
            title: service.name,
            subtitle: `R$ ${service.price?.toFixed(2)}`,
            path: '/cadastros/servicos',
            icon: Briefcase
          });
        });

        // Search Sales
        const { data: sales } = await supabase
          .from('sales')
          .select('id, sale_number, net_amount, customers(name)')
          .eq('company_id', companyId)
          .ilike('sale_number', searchTerm)
          .limit(5);

        sales?.forEach(sale => {
          searchResults.push({
            id: sale.id,
            type: 'Venda',
            title: sale.sale_number,
            subtitle: `${(sale as any).customers?.name || 'Sem cliente'} - R$ ${sale.net_amount?.toFixed(2)}`,
            path: '/vendas',
            icon: ShoppingCart
          });
        });

        // Search Suppliers
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name, email')
          .eq('company_id', companyId)
          .ilike('name', searchTerm)
          .limit(5);

        suppliers?.forEach(supplier => {
          searchResults.push({
            id: supplier.id,
            type: 'Fornecedor',
            title: supplier.name,
            subtitle: supplier.email,
            path: '/cadastros/fornecedores',
            icon: Users
          });
        });

        // Search Accounts Receivable
        const { data: receivables } = await supabase
          .from('accounts_receivable')
          .select('id, description, amount')
          .eq('company_id', companyId)
          .ilike('description', searchTerm)
          .limit(5);

        receivables?.forEach(receivable => {
          searchResults.push({
            id: receivable.id,
            type: 'Conta a Receber',
            title: receivable.description,
            subtitle: `R$ ${receivable.amount?.toFixed(2)}`,
            path: '/financeiro/contas-receber',
            icon: DollarSign
          });
        });

        // Search Accounts Payable
        const { data: payables } = await supabase
          .from('accounts_payable')
          .select('id, description, amount')
          .eq('company_id', companyId)
          .ilike('description', searchTerm)
          .limit(5);

        payables?.forEach(payable => {
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
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchData();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, user?.id]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
    setQuery("");
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
        <CommandInput 
          placeholder="Buscar clientes, produtos, vendas..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          )}
          
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {!loading && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
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
