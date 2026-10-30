import type { MessageInstance } from "antd/es/message/interface";
import type { NotificationInstance } from "antd/es/notification/interface";

// antd's App context instances, registered once by <NotifyBridge /> so that
// non-React code (the zustand store) can show notifications too.
let messageApi: MessageInstance | null = null;
let notificationApi: NotificationInstance | null = null;

export function registerNotify(message: MessageInstance, notification: NotificationInstance) {
  messageApi = message;
  notificationApi = notification;
}

export const notify = {
  success: (content: string) => messageApi?.success(content),
  error: (content: string) => messageApi?.error(content),
  info: (content: string) => messageApi?.info(content),
  warning: (title: string, description?: string) =>
    notificationApi?.warning({ message: title, description, placement: "topRight" }),
};
