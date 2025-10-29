import { useState } from "react";

export type NotificationType = "success" | "error";

export interface Notification {
  message: string;
  type: NotificationType;
}

export const useNotifications = () => {
  const [notification, setNotification] = useState<Notification | null>(null);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ message, type });
  };

  return { notification, showNotification, setNotification };
};
