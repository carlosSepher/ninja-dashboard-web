import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/transactions", label: "Payments" },
  { to: "/orders", label: "Orders" },
  { to: "/history", label: "State history" },
  { to: "/refunds", label: "Refunds" },
  { to: "/disputes", label: "Disputes" },
  { to: "/companies", label: "Companies" },
  { to: "/webhooks", label: "Webhooks" },
  { to: "/status-checks", label: "Status checks" },
  { to: "/crm/push-queue", label: "CRM queue" },
  { to: "/crm/event-logs", label: "CRM logs" },
  { to: "/health", label: "Health" },
];

export const Sidebar = () => (
  <aside className="sticky top-0 h-screen w-64 border-r bg-card/40">
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Ninja Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Payments control center</p>
    </div>
    <nav className="flex flex-col gap-1 px-4">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )
          }
          end={item.to === "/"}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);
