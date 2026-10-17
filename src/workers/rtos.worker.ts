import { simulateRtos } from "../rtos-sim/simulate.ts";
import type { RtosConfig } from "../rtos-sim/types.ts";

self.onmessage=(event:MessageEvent<{code:string;config:Partial<RtosConfig>}>)=>{
  self.postMessage(simulateRtos(event.data.code,event.data.config));
};
