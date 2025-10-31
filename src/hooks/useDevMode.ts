import { useState, useCallback } from 'react';

export const useDevMode = (setNotification: (notification: { message: string; type: "success" | "error" } | null) => void, t: (key: string) => string) => {
  const [devModeActive, setDevModeActive] = useState(false);

  const handleDevMode = useCallback(() => {
    const code = prompt(t("dev_mode_prompt"));
    if (code === "13.12") {
      setDevModeActive(true);
      setNotification({ message: t("dev_mode_activated"), type: "success" });
    }
  }, [t, setNotification]);

  return { devModeActive, handleDevMode };
};