import { useState } from "react";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { timeAgo } from "@/lib/format";
import { Bell, Check, Trash2, MailOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "@tanstack/react-router";

export function AdminNotificationsBell() {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  } = useOrdersRealtime();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotifClick = (notif: typeof notifications[0]) => {
    markNotificationAsRead(notif.id);
    
    if (notif.orderId) {
      // Navega para a página de pedidos
      navigate({ to: "/admin/pedidos" });
      
      // Dispara evento customizado para abrir os detalhes do pedido
      setTimeout(() => {
        const event = new CustomEvent("open-order-details", {
          detail: { orderId: notif.orderId },
        });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5 text-foreground/80 transition-colors group-hover:text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllNotificationsAsRead}
              className="h-7 text-xs px-2 text-primary hover:text-primary/90 hover:bg-primary/5"
            >
              <MailOpen className="h-3.5 w-3.5 mr-1" />
              Lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-center p-6 text-muted-foreground">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs mt-0.5">Novos pedidos aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left p-3.5 hover:bg-muted/40 transition flex items-start gap-2.5 ${
                    !n.read ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <span className={`text-xs font-semibold ${!n.read ? "text-primary" : "text-foreground/90"}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2.5 border-t bg-muted/20 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="h-7 text-xs px-2 text-destructive hover:text-destructive/90 hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpar todas
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
