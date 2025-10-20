import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

type NavLinkItem = { label: string; to: string };
type NavGroupItem = { label: string; children: NavLinkItem[] };
type NavItem = NavLinkItem | NavGroupItem;

const navItems: NavItem[] = [
  { to: "/", label: "Overview" },
  { to: "/transactions", label: "Payments" },
  { to: "/orders", label: "Orders" },
  { to: "/history", label: "State history" },
  { to: "/refunds", label: "Refunds" },
  { to: "/disputes", label: "Disputes" },
  { to: "/users", label: "Users" },
  { to: "/companies", label: "Companies" },
  { to: "/webhooks", label: "Webhooks" },
  {
    label: "Liquidaciones",
    children: [
      { to: "/liquidations/webpay", label: "Webpay" },
      { to: "/liquidations/paypal", label: "Paypal" },
    ],
  },
  { to: "/status-checks", label: "Status checks" },
  { to: "/crm/push-queue", label: "CRM queue" },
  { to: "/crm/event-logs", label: "CRM logs" },
  { to: "/health", label: "Health" },
];

const isNavGroup = (item: NavItem): item is NavGroupItem => "children" in item;

export const Sidebar = () => {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    const activeGroup = navItems
      .filter(isNavGroup)
      .find((group) => group.children.some((child) => location.pathname.startsWith(child.to)));
    if (activeGroup) {
      setOpenGroup(activeGroup.label);
    }
  }, [location.pathname]);

  const handleToggle = (label: string) => {
    setOpenGroup((current) => (current === label ? null : label));
  };

  return (
    <aside className="sticky top-0 h-screen w-64 border-r bg-card/40">
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Ninja Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Payments control center</p>
      </div>
      <nav className="flex flex-col gap-1 px-4">
        {navItems.map((item) => {
          if (isNavGroup(item)) {
            const isActiveGroup = item.children.some((child) => location.pathname.startsWith(child.to));
            const isOpen = openGroup === item.label;
            return (
              <div key={item.label} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleToggle(item.label)}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isOpen || isActiveGroup
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-xs">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen ? (
                  <div className="ml-3 flex flex-col gap-1 border-l border-border/50 pl-2">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        className={({ isActive }) =>
                          cn(
                            "rounded-md px-3 py-2 text-sm transition-colors",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                          )
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
