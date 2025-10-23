import { cn } from "@/lib/utils";
import { LogOut, LucideIcon } from "lucide-react";
import { Link, Location } from "react-router-dom";
import { Button } from "../ui/button";
import React from "react";

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface RestaurantSidebarProps {
  navItems: NavItem[];
  location: Location;
  signOut: () => void;
}

export function RestaurantSidebar({
  navItems,
  location,
  signOut,
}: RestaurantSidebarProps) {
  const pathname = location.pathname;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r bg-background p-4 md:flex">
      <div className="mb-8 text-2xl font-bold text-primary">
        Restaurant Panel
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg p-3 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <Button onClick={signOut} variant="outline" className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}