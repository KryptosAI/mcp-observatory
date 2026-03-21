declare module "update-notifier" {
  interface Options {
    pkg: { name: string; version: string };
    updateCheckInterval?: number;
  }
  interface NotifyOptions {
    message?: string;
    defer?: boolean;
    isGlobal?: boolean;
  }
  interface UpdateNotifier {
    notify(options?: NotifyOptions): void;
  }
  export default function updateNotifier(options: Options): UpdateNotifier;
}
