import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeRtosSnapshots } from "./rtosReducer.ts";
import type { RtosConfig, RtosDiagnostic, VisualizerTraceV3 } from "./types.ts";

export function useRtosSession(initialCode:string,initialConfig:Partial<RtosConfig>={}){
  const [code,setCodeState]=useState(initialCode);const [trace,setTrace]=useState<VisualizerTraceV3|null>(null);const [diagnostics,setDiagnostics]=useState<RtosDiagnostic[]>([]);const [currentStep,setCurrentStepState]=useState(0);const [stale,setStale]=useState(false);
  const [status,setStatus]=useState<"idle"|"running">("idle");const workerRef=useRef<Worker|null>(null);
  const snapshots=useMemo(()=>trace?computeRtosSnapshots(trace.events,trace.timeline):[],[trace]);
  const setCode=useCallback((next:string)=>{setCodeState(next);setStale(true);},[]);
  const run=useCallback(()=>{workerRef.current?.terminate();const worker=new Worker(new URL("../workers/rtos.worker.ts",import.meta.url),{type:"module"});workerRef.current=worker;setStatus("running");worker.onmessage=event=>{const result=event.data;setTrace(result.trace);setDiagnostics(result.diagnostics);setCurrentStepState(0);setStale(false);setStatus("idle");worker.terminate();if(workerRef.current===worker)workerRef.current=null;};worker.onerror=()=>{setDiagnostics([{level:"error",message:"模拟器 Worker 启动失败，请重新运行"}]);setStatus("idle");worker.terminate();};worker.postMessage({code,config:initialConfig});},[code,initialConfig]);
  useEffect(()=>()=>workerRef.current?.terminate(),[]);
  const setCurrentStep=useCallback((step:number)=>setCurrentStepState(Math.max(0,Math.min(Math.max(0,snapshots.length-1),step))),[snapshots.length]);
  return{code,setCode,trace,diagnostics,snapshots,currentStep,setCurrentStep,run,stale,status};
}
