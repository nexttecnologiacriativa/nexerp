import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, DollarSign, Users, Package, FileText, BarChart3, Settings, Building2, CreditCard, Receipt, UserCog, LogOut, ChevronDown, Truck, Tag, Shield, Zap, DollarSignIcon } from "lucide-react";
import { useHasRole } from "@/hooks/use-has-role";
import { useUserRole } from "@/hooks/use-user-role";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Logo from "@/components/Logo";

const menuItems = [{
  title: "Dashboard",
  url: "/dashboard",
  icon: LayoutDashboard
}, {
  title: "Vendas e Orçamentos",
  url: "/faturamento",
  icon: Receipt
}, {
  title: "Financeiro",
  icon: DollarSign,
  subItems: [{
    title: "Contas a Pagar",
    url: "/financeiro/contas-pagar",
    icon: CreditCard
  }, {
    title: "Contas a Receber",
    url: "/financeiro/contas-receber",
    icon: Receipt
  }, {
    title: "Fluxo de Caixa",
    url: "/financeiro/fluxo-caixa",
    icon: BarChart3
  }, {
    title: "Bancos",
    url: "/financeiro/bancos",
    icon: CreditCard
  }]
}, {
  title: "Cadastros",
  icon: Users,
  subItems: [{
    title: "Clientes",
    url: "/cadastros/clientes",
    icon: Users
  }, {
    title: "Fornecedores",
    url: "/cadastros/fornecedores",
    icon: Truck
  }, {
    title: "Serviços",
    url: "/cadastros/servicos",
    icon: Package
  }, {
    title: "Centro de Custos",
    url: "/cadastros/centro-custos",
    icon: Building2
  }, {
    title: "Categorias",
    url: "/cadastros/categorias",
    icon: Tag
  }]
}, {
  title: "Relatórios",
  url: "/relatorios",
  icon: BarChart3
}];

const systemItems = [{
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings
}, {
  title: "Usuários",
  url: "/usuarios",
  icon: UserCog
}];

export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const { hasRole: isSuperAdmin, loading: loadingRole } = useHasRole('super_admin');
  const { role: userRole, loading: loadingUserRole } = useUserRole();
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";
  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => prev.includes(groupTitle) ? prev.filter(g => g !== groupTitle) : [...prev, groupTitle]);
  };

  // Função para verificar se o usuário tem permissão para acessar um item
  const canAccessItem = (item: any): boolean => {
    if (loadingUserRole || !userRole) return true; // Mostra tudo enquanto carrega
    
    // Admin tem acesso total
    if (userRole === 'admin') return true;
    
    // Vendedor: apenas Vendas e Orçamentos + Clientes
    if (userRole === 'salesperson') {
      if (item.url === '/faturamento') return true;
      if (item.title === 'Cadastros') {
        // Filtra apenas Clientes dentro de Cadastros
        if (item.subItems) {
          item.subItems = item.subItems.filter((sub: any) => sub.url === '/cadastros/clientes');
          return item.subItems.length > 0;
        }
      }
      return false;
    }
    
    // Financeiro: tudo exceto Usuários e Configurações (info da empresa)
    if (userRole === 'financial') {
      if (item.url === '/usuarios' || item.url === '/configuracoes') return false;
      return true;
    }
    
    // Usuário padrão: sem restrições específicas (ou implementar conforme necessário)
    return true;
  };
  const renderMenuItem = (item: any) => {
    if (item.subItems) {
      const isExpanded = expandedGroups.includes(item.title);
      const hasActiveChild = item.subItems.some((subItem: any) => isActive(subItem.url));
      return <Collapsible key={item.title} open={isExpanded} onOpenChange={() => toggleGroup(item.title)}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className={hasActiveChild ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}>
                <item.icon className="h-4 w-4" />
                {!collapsed && <>
                    <span>{item.title}</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </>}
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {!collapsed && <CollapsibleContent>
                <SidebarMenuSub>
                  {item.subItems.map((subItem: any) => <SidebarMenuSubItem key={subItem.url}>
                      <SidebarMenuSubButton asChild>
                        <NavLink to={subItem.url} className={getNavCls}>
                          <subItem.icon className="h-4 w-4" />
                          <span>{subItem.title}</span>
                        </NavLink>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>)}
                </SidebarMenuSub>
              </CollapsibleContent>}
          </SidebarMenuItem>
        </Collapsible>;
    }
    return <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink to={item.url} className={getNavCls}>
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>;
  };
  return <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center justify-start">
            <Logo className="h-8" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(canAccessItem).map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.filter(canAccessItem).map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!loadingRole && isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin" className={getNavCls}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Dashboard</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin/empresas" className={getNavCls}>
                      <Building2 className="h-4 w-4" />
                      {!collapsed && <span>Empresas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin/usuarios" className={getNavCls}>
                      <UserCog className="h-4 w-4" />
                      {!collapsed && <span>Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin/planos" className={getNavCls}>
                      <Zap className="h-4 w-4" />
                      {!collapsed && <span>Planos</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin/assinaturas" className={getNavCls}>
                      <DollarSignIcon className="h-4 w-4" />
                      {!collapsed && <span>Assinaturas</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && <div className="space-y-2">
            
            <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>}
      </SidebarFooter>
    </Sidebar>;
}