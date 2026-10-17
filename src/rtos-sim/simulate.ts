import { parseCppSubset } from "./frontend/parse.ts";
import { createInterpreter } from "./interpreter/exec.ts";
import { runScheduler } from "./kernel/scheduler.ts";
import { DEFAULT_RTOS_CONFIG, MAX_RTOS_TICKS, type RtosConfig, type RtosSimulationResult } from "./types.ts";

export function simulateRtos(code:string, overrides:Partial<RtosConfig>={}):RtosSimulationResult {
  const parsed=parseCppSubset(code);
  if(!parsed.program||parsed.diagnostics.some(d=>d.level==="error"))return{trace:null,diagnostics:parsed.diagnostics};
  const config:RtosConfig={...DEFAULT_RTOS_CONFIG,...overrides};
  config.tick_ms=Math.max(1,config.tick_ms);config.time_slice_ticks=Math.max(1,config.time_slice_ticks);config.max_ticks=Math.min(MAX_RTOS_TICKS,Math.max(1,config.max_ticks));
  const runtimeDiagnostics=[...parsed.diagnostics];const runtime=createInterpreter(parsed.program,runtimeDiagnostics);const result=runScheduler(runtime,config);const diagnostics=[...runtimeDiagnostics,...result.diagnostics];
  return{trace:{schemaVersion:3,mode:"rtos-sim",accuracy:"exact",sourceCode:code,config,events:result.events,timeline:result.timeline,endedReason:result.endedReason},diagnostics};
}
