import type { RtosConfig } from "./types.ts";

export interface RtosScenario { id:string; title:string; lesson:string; code:string; config:Partial<RtosConfig>; }

export const RTOS_SCENARIOS:RtosScenario[]=[
  {id:"round-robin",title:"时间片与抢占",lesson:"观察两个同优先级任务在 busy_for 期间轮转。",config:{max_ticks:40,time_slice_ticks:2},code:`#include "rtos_sim.h"

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
}`},
  {id:"mutex",title:"互斥锁与优先级继承",lesson:"高优先级任务等待低优先级任务持有的锁时，锁持有者继承优先级。",config:{max_ticks:50,time_slice_ticks:2},code:`#include "rtos_sim.h"

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
}`},
  {id:"queue",title:"生产者 / 消费者队列",lesson:"队列为空时消费者阻塞，生产者发送后立即唤醒消费者。",config:{max_ticks:60},code:`#include "rtos_sim.h"

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
}`},
  {id:"semaphore",title:"信号量同步",lesson:"工作任务阻塞等待信号量，控制任务释放令牌后继续运行。",config:{max_ticks:50},code:`#include "rtos_sim.h"

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
}`},
];

export const DEFAULT_SCENARIO=RTOS_SCENARIOS[0];
