"use client";

import { useEffect } from "react";
import { MiniKitProvider } from "@worldcoin/minikit-js/minikit-provider";

export default function MiniKitWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const host = globalThis as unknown as { MiniKit?: { install?: (opts?: Record<string, unknown>) => void } };
      const appId = 'app_fe80f47dce293e5f434ea9553098015d';
      if (host?.MiniKit && typeof host.MiniKit.install === "function") {
        try {
          // Pass both snake_case and camelCase keys to support different host implementations
          if (appId) {
            const mini = host.MiniKit as unknown as { install?: (opts?: Record<string, unknown>) => void };
            mini.install?.({ app_id: appId, appId });
          } else {
            host.MiniKit.install();
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("MiniKit.install() failed in MiniKitWrapper", err);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("MiniKitWrapper init error", err);
    }
  }, []);

  return <MiniKitProvider>{children}</MiniKitProvider>;
}
