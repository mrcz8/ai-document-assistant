import { after } from "next/server";
import type { TaskScheduler } from "@/domain/ports";

export class AfterResponseScheduler implements TaskScheduler {
  schedule(task: () => Promise<void>): void {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error("Background task failed", error);
      }
    });
  }
}
