import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Users, Ban, CheckCircle } from "lucide-react";
import { EditCompanyDialog } from "@/components/SuperAdmin/EditCompanyDialog";
import { CompanyUsersDialog } from "@/components/SuperAdmin/CompanyUsersDialog";
import { useNavigate } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  status: string;
  is_blocked: boolean;
  subscription_status: string | null;
  created_at: string;
  users_count?: number;
}

const Empresas = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      
      // Buscar empresas
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (companiesError) throw companiesError;

      // Buscar contagem de usuários para cada empresa
      const companiesWithCounts = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { count } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id);

          return {
            ...company,
            users_count: count || 0,
          };
        })
      );

      setCompanies(companiesWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar empresas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditDialogOpen(true);
  };

  const handleViewUsers = (company: Company) => {
    setSelectedCompany(company);
    setUsersDialogOpen(true);
  };

  const handleManageSubscription = (companyId: string) => {
    navigate(`/super-admin/assinaturas?company=${companyId}`);
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.document.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c) => !c.is_blocked).length;
  const blockedCompanies = companies.filter((c) => c.is_blocked).length;
  const withSubscription = companies.filter(
    (c) => c.subscription_status === "active" || c.subscription_status === "trial"
  ).length;

  const getSubscriptionBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Sem Assinatura</Badge>;
    
    switch (status) {
      case "active":
        return <Badge className="bg-primary">Ativo</Badge>;
      case "trial":
        return <Badge className="bg-success">Trial</Badge>;
      case "expired":
        return <Badge variant="destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Empresas</h1>
          <p className="text-muted-foreground">
            Visualize e edite informações das empresas cadastradas
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloqueadas</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blockedCompanies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Assinatura</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withSubscription}</div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
          <CardDescription>
            Busque por nome, documento ou email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.document}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{company.email || "-"}</div>
                          <div className="text-muted-foreground">{company.phone || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => handleViewUsers(company)}
                          className="p-0 h-auto"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          {company.users_count || 0}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {company.is_blocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge className="bg-success">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getSubscriptionBadge(company.subscription_status)}</TableCell>
                      <TableCell>
                        {new Date(company.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(company)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleManageSubscription(company.id)}
                          >
                            Assinatura
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedCompany && (
        <>
          <EditCompanyDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            company={selectedCompany}
            onSuccess={fetchCompanies}
          />
          <CompanyUsersDialog
            open={usersDialogOpen}
            onOpenChange={setUsersDialogOpen}
            company={selectedCompany}
          />
        </>
      )}
    </div>
  );
};

export default Empresas;