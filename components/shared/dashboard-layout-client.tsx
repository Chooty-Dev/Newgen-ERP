"use client";

import * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { Toaster } from "@/components/ui/toast";
import { ShopNavProvider } from "@/components/shared/shop-nav-context";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
    shops?: Array<{ _id: string; name: string; code: string; shopType?: string }>;
  };
  children: React.ReactNode;
}

export function DashboardLayoutClient({
  user,
  children,
}: DashboardLayoutClientProps) {
  return (
    <ShopNavProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground antialiased selection:bg-muted/40">
          <AppSidebar user={user} />
          <div className="flex flex-1 flex-col h-screen overflow-hidden">
            <AppHeader user={user} />
            <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 no-scrollbar">
              <div className="mx-auto max-w-7xl space-y-10 pb-16">{children}</div>
            </main>
          </div>
        </div>
        <Toaster />
      </SidebarProvider>
    </ShopNavProvider>
  );
}
