import { cn } from "@/lib/utils";
import { Home, Menu, Rocket, Settings, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import React from "react";

const navItems = [
  {
    name: "Home",
    href: "/restaurant",
    icon: Home,
  },
  {
    name: "Menu",
    href: "/restaurant/menu",
    icon: Menu,
  },
  {
    name: "Upgrade",
    href: "/restaurant/upgrade",
    icon: Rocket,
    isSpecial: true,
  },
  {
    name: "Orders",
    href: "/restaurant/orders",
    icon: ShoppingCart,
  },
  {
    name: "Settings",
    href: "/restaurant/settings",
    icon: Settings,
  },
];

export function RestaurantBottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background p-2 shadow-lg md:hidden">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isSpecial) {
            return (
              <Link
                key={item.name}
                to={item.href}
                className="relative -top-3 flex flex-col items-center gap-1.5 text-white"
              >
                <div
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full bg-accent shadow-lg shadow-accent/50",
                  )}
                >
                  <Icon className="size-6 text-white" />
                </div>
                <span className="text-xs font-bold text-accent">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}