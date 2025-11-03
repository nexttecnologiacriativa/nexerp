import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import SettingsDropdown from "@/components/SettingsDropdown";
import { GlobalSearch } from "@/components/GlobalSearch";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut } = useAuth();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <SettingsDropdown />
              
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                <div className="text-right text-sm">
                  <p className="font-medium text-foreground">{user?.user_metadata?.full_name || 'Usuário'}</p>
                  <p className="text-muted-foreground">Logado como: {user?.email}</p>
                </div>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;