/**
 * RTOS 并发模拟器 · 预置教学场景
 *
 * 覆盖 DESIGN.md 规定的全部 8 类核心 RTOS 并发机制：
 *  - 时间片轮转与抢占 (01_round_robin.cpp)
 *  - 线程生命周期管理 (02_thread_lifecycle.cpp)
 *  - 生产者/消费者消息队列 (03_producer_consumer_queue.cpp)
 *  - 互斥锁与优先级继承 / 优先级反转 (04_priority_inversion.cpp)
 *  - 条件变量与虚假唤醒注入 (05_condvar_spurious.cpp)
 *  - 哲学家就餐与等待图死锁环检测 (06_dining_philosophers.cpp)
 *  - ISR 中断延迟处理 (07_isr_deferred.cpp)
 *  - 软件定时器与事件组多条件同步 (08_timer_eventgroup.cpp)
 */

import type { RtosConfig } from "./types.ts";

export interface RtosScenario {
  id: string;
  aliases?: string[];
  file?: string;
  title: string;
  lesson: string;
  code: string;
  config: Partial<RtosConfig>;
}

export const RTOS_SCENARIOS: RtosScenario[] = [
  {
    id: "round-robin",
    aliases: ["01_round_robin"],
    file: "examples/rtos/01_round_robin.cpp",
    title: "01 · 时间片与抢占",
    lesson: "观察两个同优先级任务在 busy_for 期间按时间片轮转执行。",
    config: { max_ticks: 40, time_slice_ticks: 2 },
    code: `#include "rtos_sim.h"

void workerA() {
  std::cout << "A start\\n";
  rtos::busy_for(6ms);
  std::cout << "A done\\n";
}

void workerB() {
  std::cout << "B start\\n";
  rtos::busy_for(6ms);
  std::cout << "B done\\n";
}

int main() {
  rtos::thread a({.name = "worker A", .priority = 3}, workerA);
  rtos::thread b({.name = "worker B", .priority = 3}, workerB);
  a.join();
  b.join();
  return 0;
}`,
  },
  {
    id: "mutex",
    aliases: ["priority-inversion", "04_priority_inversion"],
    file: "examples/rtos/04_priority_inversion.cpp",
    title: "02 · 互斥锁与优先级继承",
    lesson: "高优先级任务等待低优先级任务持有的锁时，锁持有者临时继承高优先级（可改为 rtos::mutex{rtos::no_priority_inheritance} 对比反转）。",
    config: { max_ticks: 50, time_slice_ticks: 2 },
    code: `#include "rtos_sim.h"

std::mutex bus;

void lowTask() {
  bus.lock();
  rtos::busy_for(8ms);
  bus.unlock();
}

void highTask() {
  std::this_thread::sleep_for(2ms);
  bus.lock();
  std::cout << "high acquired bus\\n";
  bus.unlock();
}

int main() {
  rtos::thread low({.name = "low", .priority = 2}, lowTask);
  rtos::thread high({.name = "high", .priority = 5}, highTask);
  low.join();
  high.join();
}`,
  },
  {
    id: "queue",
    aliases: ["producer-consumer-queue", "03_producer_consumer_queue"],
    file: "examples/rtos/03_producer_consumer_queue.cpp",
    title: "03 · 生产者 / 消费者队列",
    lesson: "队列为空时消费者阻塞，生产者发送后立即唤醒更高优先级的消费者抢占运行。",
    config: { max_ticks: 60 },
    code: `#include "rtos_sim.h"

rtos::message_queue<int, 2> samples;

void producer() {
  std::this_thread::sleep_for(3ms);
  samples.send(42, 10ms);
  samples.send(84, 10ms);
}

void consumer() {
  int value = 0;
  samples.receive(value, rtos::kWaitForever);
  std::cout << "sample=" << value << '\\n';
}

int main() {
  rtos::thread rx({.name = "consumer", .priority = 4}, consumer);
  rtos::thread tx({.name = "producer", .priority = 2}, producer);
  rx.join();
  tx.join();
}`,
  },
  {
    id: "semaphore",
    title: "04 · 信号量同步",
    lesson: "工作任务阻塞等待二值信号量，控制任务释放令牌后唤醒工作任务继续运行。",
    config: { max_ticks: 50 },
    code: `#include "rtos_sim.h"

std::binary_semaphore ready(0);

void worker() {
  ready.acquire();
  std::cout << "device ready\\n";
}

void controller() {
  std::this_thread::sleep_for(4ms);
  ready.release();
}

int main() {
  std::thread task(worker);
  std::thread control(controller);
  task.join();
  control.join();
}`,
  },
  {
    id: "thread-lifecycle",
    aliases: ["02_thread_lifecycle"],
    file: "examples/rtos/02_thread_lifecycle.cpp",
    title: "05 · 任务生命周期 (Suspend / Resume)",
    lesson: "观察任务在 Ready / Running / Blocked / Suspended / Deleted 五种状态之间的完整转移。",
    config: { max_ticks: 60 },
    code: `#include "rtos_sim.h"

int progress = 0;

void backgroundWorker() {
  std::cout << "worker step 1\\n";
  progress = 1;
  std::this_thread::sleep_for(4ms);
  std::cout << "worker step 2\\n";
  progress = 2;
}

int main() {
  rtos::thread worker({.name = "worker", .priority = 3}, backgroundWorker);
  std::this_thread::sleep_for(2ms);
  rtos::suspend(worker);
  std::cout << "worker suspended\\n";
  std::this_thread::sleep_for(3ms);
  rtos::resume(worker);
  worker.join();
  std::cout << "all done\\n";
  return 0;
}`,
  },
  {
    id: "condvar-spurious",
    aliases: ["05_condvar_spurious"],
    file: "examples/rtos/05_condvar_spurious.cpp",
    title: "06 · 条件变量与虚假唤醒",
    lesson: "注入周期性虚假唤醒，观察 cv.wait(lk, pred) 自动复检谓词并抵御虚假唤醒。",
    config: { max_ticks: 60, spurious_wakeup_every: 2 },
    code: `#include "rtos_sim.h"

std::mutex m;
std::condition_variable cv;
bool dataReady = false;

void consumer() {
  std::unique_lock<std::mutex> lk(m);
  cv.wait(lk, [] { return dataReady; });
  std::cout << "consumer: dataReady=" << dataReady << '\\n';
}

void producer() {
  std::this_thread::sleep_for(6ms);
  std::lock_guard<std::mutex> lk(m);
  dataReady = true;
  cv.notify_one();
}

int main() {
  rtos::config({.spurious_wakeup_every = 2, .max_ticks = 60});
  rtos::thread c({.name = "consumer", .priority = 4}, consumer);
  rtos::thread p({.name = "producer", .priority = 3}, producer);
  c.join();
  p.join();
  return 0;
}`,
  },
  {
    id: "dining-philosophers",
    aliases: ["deadlock", "06_dining_philosophers"],
    file: "examples/rtos/06_dining_philosophers.cpp",
    title: "07 · 哲学家就餐与死锁检测",
    lesson: "两个任务以相反顺序获取两把锁触发循环等待，等待图自动标红死锁环（可改用 std::scoped_lock 修复）。",
    config: { max_ticks: 40 },
    code: `#include "rtos_sim.h"

std::mutex fork0;
std::mutex fork1;

void philosopher0() {
  fork0.lock();
  std::this_thread::sleep_for(2ms);
  fork1.lock();
  std::cout << "P0 eating\\n";
  fork1.unlock();
  fork0.unlock();
}

void philosopher1() {
  fork1.lock();
  std::this_thread::sleep_for(2ms);
  fork0.lock();
  std::cout << "P1 eating\\n";
  fork0.unlock();
  fork1.unlock();
}

int main() {
  rtos::thread p0({.name = "P0", .priority = 3}, philosopher0);
  rtos::thread p1({.name = "P1", .priority = 3}, philosopher1);
  p0.join();
  p1.join();
  return 0;
}`,
  },
  {
    id: "isr-deferred",
    aliases: ["07_isr_deferred"],
    file: "examples/rtos/07_isr_deferred.cpp",
    title: "08 · ISR 延迟中断处理",
    lesson: "硬件中断触发后调用 release_from_isr() 唤醒高优先级处理任务，实现下半部延迟处理。",
    config: { max_ticks: 40 },
    code: `#include "rtos_sim.h"

std::binary_semaphore irqSem(0);
int packetCount = 0;

void deferredHandler() {
  irqSem.acquire();
  packetCount += 1;
  std::cout << "handled packet #" << packetCount << '\\n';
}

int main() {
  rtos::thread handler({.name = "irq_worker", .priority = 5}, deferredHandler);
  rtos::isr uart("UART_RX", [] {
    irqSem.release_from_isr();
  });
  uart.trigger_at(4ms);
  handler.join();
  return 0;
}`,
  },
  {
    id: "timer-eventgroup",
    aliases: ["08_timer_eventgroup"],
    file: "examples/rtos/08_timer_eventgroup.cpp",
    title: "09 · 软件定时器与事件组",
    lesson: "软件定时器在 timer_svc 守护任务中置位事件位，与初始化任务共同满足 wait_all 同步条件。",
    config: { max_ticks: 50 },
    code: `#include "rtos_sim.h"

rtos::event_group sysEvents;
int ticksFired = 0;

void coordinator() {
  auto bits = sysEvents.wait(0b11, {.wait_all = true, .clear_on_exit = true}, 20ms);
  std::cout << "all ready bits=" << bits << '\\n';
}

void sensorInit() {
  std::this_thread::sleep_for(3ms);
  sysEvents.set(0b01);
}

int main() {
  rtos::timer beat("heartbeat", 4ms, rtos::once, [] {
    ticksFired += 1;
    sysEvents.set(0b10);
  });
  beat.start();
  rtos::thread coord({.name = "coordinator", .priority = 4}, coordinator);
  rtos::thread sensor({.name = "sensor", .priority = 3}, sensorInit);
  coord.join();
  sensor.join();
  return 0;
}`,
  },
];

export const DEFAULT_SCENARIO = RTOS_SCENARIOS[0];

export function findScenario(idOrAlias: string | null | undefined): RtosScenario {
  if (!idOrAlias) return DEFAULT_SCENARIO;
  return (
    RTOS_SCENARIOS.find(
      (s) => s.id === idOrAlias || (s.aliases && s.aliases.includes(idOrAlias)),
    ) ?? DEFAULT_SCENARIO
  );
}
