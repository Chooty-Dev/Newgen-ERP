"use client";

import * as React from "react";

export type ShopTabId =
  | "overview"
  | "itemSales"
  | "items"
  | "inventory"
  | "inventoryHistory"
  | "utilityBills"
  | "wastage"
  | "credits"
  | "dailySettlement"
  | "discrepancies"
  | "staff";

export interface ShopNavCounts {
  inventory?: number;
  utilityBills?: number;
  credit?: number;
  staff?: number;
}

export interface ShopNavInfo {
  shopId: string;
  shopName: string;
  shopCode: string;
  shopType: string;
  isCommunication: boolean;
  isInventoryOnly: boolean;
  activeTab: ShopTabId;
  setActiveTab: (tab: ShopTabId) => void;
  counts: ShopNavCounts;
}

interface ShopNavContextValue {
  shopNav: ShopNavInfo | null;
  setShopNav: React.Dispatch<React.SetStateAction<ShopNavInfo | null>>;
}

const ShopNavContext = React.createContext<ShopNavContextValue>({
  shopNav: null,
  setShopNav: () => {},
});

export function ShopNavProvider({ children }: { children: React.ReactNode }) {
  const [shopNav, setShopNav] = React.useState<ShopNavInfo | null>(null);

  return (
    <ShopNavContext.Provider value={{ shopNav, setShopNav }}>
      {children}
    </ShopNavContext.Provider>
  );
}

export function useShopNav() {
  return React.useContext(ShopNavContext);
}
