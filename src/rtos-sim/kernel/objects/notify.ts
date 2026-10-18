/**
 * Direct-to-Task Notification 辅助逻辑（FreeRTOS xTaskNotifyGive / ulTaskNotifyTake 语义）
 */

import type { TaskId } from "../../types.ts";

export interface TaskNotifyState {
  task: TaskId;
  notifyValue: number;
}
