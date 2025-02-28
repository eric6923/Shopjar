import { createContext, useContext, useEffect, useState } from "react";
import createApp from "@shopify/app-bridge";

interface AppBridgeContextType {
  appBridge: any | null;
}

export const AppBridgeContext = createContext<AppBridgeContextType | null>(null);

export function useAppBridge() {
  const context = useContext(AppBridgeContext);
  if (!context) {
    throw new Error("useAppBridge must be used within an AppBridgeProvider");
  }
  return context.appBridge;
}

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const [appBridge, setAppBridge] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const apiKey = "14993d74caaf7c040a712c77607dd865"
      const host = urlParams.get("host")!;

      if (apiKey && host) {
        const app = createApp({
          apiKey,
          host,
          forceRedirect: true, 
        });

        setAppBridge(app);
      }
    }
  }, []);

  return (
    <AppBridgeContext.Provider value={{ appBridge }}>
      {children}
    </AppBridgeContext.Provider>
  );
}
