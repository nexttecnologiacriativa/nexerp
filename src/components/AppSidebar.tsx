import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, DollarSign, Users, Package, FileText, BarChart3, Settings, Building2, CreditCard, Receipt, UserCog, LogOut, ChevronDown, Truck, Tag } from "lucide-react";
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
  }, {
    title: "Bancos",
    url: "/cadastros/bancos",
    icon: CreditCard
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
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";
  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => prev.includes(groupTitle) ? prev.filter(g => g !== groupTitle) : [...prev, groupTitle]);
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
        <div className="flex items-center justify-start">
          <Logo className="h-8" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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