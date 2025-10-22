import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDisplay } from "@/lib/date-utils";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "pagar" | "receber";
  description: string;
  amount: number;
  due_date: string;
}

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();

      if (!profile?.company_id) return;

      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      // Buscar contas a pagar vencendo em 7 dias
      const { data: contasPagar } = await supabase
        .from("accounts_payable")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("status", "pending")
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", nextWeek.toISOString().split("T")[0]);

      // Buscar contas a receber vencendo em 7 dias
      const { data: contasReceber } = await supabase
        .from("accounts_receivable")
        .select("*")
        .eq("company_id", profile.company_id)
        .eq("status", "pending")
        .gte("due_date", today.toISOString().split("T")[0])
        .lte("due_date", nextWeek.toISOString().split("T")[0]);

      const notificationsList: Notification[] = [];

      contasPagar?.forEach((conta) => {
        notificationsList.push({
          id: conta.id,
          type: "pagar",
          description: conta.description,
          amount: conta.amount,
          due_date: conta.due_date,
        });
      });

      contasReceber?.forEach((conta) => {
        notificationsList.push({
          id: conta.id,
          type: "receber",
          description: conta.description,
          amount: conta.amount,
          due_date: conta.due_date,
        });
      });

      // Filter out dismissed notifications
      const filteredNotifications = notificationsList.filter(n => !dismissedIds.has(n.id));
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000 * 60 * 5);
    return () => clearInterval(interval);
  }, [dismissedIds]);

  const handleNotificationClick = (notification: Notification) => {
    const path = notification.type === "pagar" ? "/financeiro/contas-pagar" : "/financeiro/contas-receber";
    navigate(path);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setDismissedIds(allIds);
    setNotifications([]);
    toast({
      title: "Notificações limpas",
      description: "Todas as notificações foram removidas.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notificações</h4>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  <Badge variant="secondary">{notifications.length}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 px-2 text-xs"
                  >
                    Limpar tudo
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-2 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={`mt-1 p-1 rounded ${
                      notification.type === "pagar" ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                    }`}
                  >
                    {notification.type === "pagar" ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {notification.type === "pagar" ? "Conta a Pagar" : "Conta a Receber"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{notification.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDateForDisplay(notification.due_date)}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          notification.type === "pagar" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {formatCurrency(notification.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;
