import { ACTION_LABELS } from "./frontend/apiCatalog.ts";
import type { KernelObjectView, RtosSnapshot, RtosTraceEvent, TaskView, TimelineSegment, WaitForEdge } from "./types.ts";
import { MAX_RTOS_SNAPSHOTS } from "./types.ts";

const cloneObjects=(objects:Map<string,KernelObjectView>)=>[...objects.values()].map(o=>structuredClone(o));
const cloneTasks=(tasks:Map<string,TaskView>)=>[...tasks.values()].map(t=>structuredClone(t));

function describe(e:RtosTraceEvent,tasks:Map<string,TaskView>,objects:Map<string,KernelObjectView>):string {
  const task="task" in e&&typeof e.task==="string"?(tasks.get(e.task)?.name??e.task):"";
  switch(e.op){
    case"task_create":return`创建任务 ${e.name}（优先级 ${e.priority}）`;
    case"task_delete":return`${task} 已结束（${e.reason === "return" ? "函数返回" : "被终止"}）`;
    case"task_state":return`${task}: ${e.from} → ${e.to}${e.reason?` · ${e.reason}`:""}`;
    case"context_switch":return`上下文切换：${e.from??"启动"} → ${e.to}`;
    case"obj_create":return`创建 ${e.object.name}（${e.object.kind}）`;
    case"obj_op":return`${task} ${ACTION_LABELS[e.action]??e.action} ${objects.get(e.objectId)?.name??e.objectId}${e.ok?"":"（等待/失败）"}`;
    case"stdout":return`${task} 输出 ${JSON.stringify(e.text)}`;
    case"var_update":return`${task} 更新 ${e.name} = ${e.value}`;
    case"prio_inherit":return`${task} 优先级继承 ${e.from} → ${e.to}`;
    case"prio_restore":return`${task} 优先级恢复 ${e.from} → ${e.to}`;
    case"deadlock_detected":return`检测到死锁：${e.cycle.join(" → ")}`;
    case"system_stall":return"所有任务均在等待，系统无法继续推进";
    case"diagnostic":return e.message;
    case"isr_enter":return`进入中断 ${e.isr}`;
    case"isr_exit":return`退出中断 ${e.isr}`;
    case"timer_fire":return`软件定时器 ${e.timer} 到期`;
    case"spurious_wakeup":return`${task} 发生虚假唤醒`;
  }
}

function waitEdges(tasks:Map<string,TaskView>,objects:Map<string,KernelObjectView>):WaitForEdge[]{
  const edges:WaitForEdge[]=[];
  for(const task of tasks.values()){
    if(!task.blockedOn)continue;
    const object=[...objects.values()].find(o=>o.name===task.blockedOn?.objectName);
    if(object?.kind==="mutex"&&object.owner)edges.push({from:task.id,to:object.owner,via:object.id,label:object.name});
    else if(task.blockedOn.objectName)edges.push({from:task.id,to:object?.id??task.blockedOn.objectName,via:object?.id??"wait",label:task.blockedOn.objectName});
  }
  return edges;
}

export function computeRtosSnapshots(events:RtosTraceEvent[],timeline:TimelineSegment[]=[]):RtosSnapshot[]{
  const tasks=new Map<string,TaskView>();const objects=new Map<string,KernelObjectView>();const vars=new Map<string,{name:string;type:string;value:string;status:"normal"|"modified"}>();
  const warnings:string[]=[];let stdout="";let running:string|null=null;const snapshots:RtosSnapshot[]=[];
  for(const e of events.slice(0,MAX_RTOS_SNAPSHOTS)){
    if(e.op==="task_create")tasks.set(e.task,{id:e.task,name:e.name,kind:e.task==="main"?"main":"user",state:"Ready",basePriority:e.priority,effectivePriority:e.priority,blockedOn:null,currentLine:e.line,frames:[],joinable:e.task!=="main",notifyValue:0});
    else if(e.op==="task_delete"){const t=tasks.get(e.task);if(t)t.state="Deleted";}
    else if(e.op==="task_state"){const t=tasks.get(e.task);if(t){t.state=e.to;t.currentLine=e.line;t.blockedOn=e.reason?{reason:e.reason,objectName:e.objectId?objects.get(e.objectId)?.name??e.objectId:null}:null;}}
    else if(e.op==="context_switch")running=e.to==="idle"?null:e.to;
    else if(e.op==="prio_inherit"||e.op==="prio_restore"){const t=tasks.get(e.task);if(t)t.effectivePriority=e.to;}
    else if(e.op==="obj_create"){const i=e.object.init;let o:KernelObjectView;if(i.kind==="mutex")o={kind:"mutex",id:e.object.id,name:e.object.name,owner:null,ownerEffective:0,recursion:0,inherit:i.inherit,recursive:i.recursive,waiters:[]};else if(i.kind==="semaphore")o={kind:"semaphore",id:e.object.id,name:e.object.name,count:i.count,max:i.max,waiters:[]};else if(i.kind==="condvar")o={kind:"condvar",id:e.object.id,name:e.object.name,waiters:[],attachedLock:null};else if(i.kind==="queue")o={kind:"queue",id:e.object.id,name:e.object.name,capacity:i.capacity,buffer:[],head:0,senders:[],receivers:[]};else if(i.kind==="event_group")o={kind:"event_group",id:e.object.id,name:e.object.name,bits:0,waiters:[]};else if(i.kind==="timer")o={kind:"timer",id:e.object.id,name:e.object.name,periodMs:i.periodMs,periodic:i.periodic,running:false,nextFireTick:null};else o={kind:"isr",id:e.object.id,name:e.object.name,nextFireTick:null,everyMs:null,firedCount:0};objects.set(o.id,o);}
    else if(e.op==="obj_op"&&e.state)objects.set(e.objectId,structuredClone(e.state));
    else if(e.op==="stdout")stdout+=e.text;
    else if(e.op==="var_update"){vars.set(`${e.scope}:${e.name}`,{name:e.name,type:e.type,value:e.value,status:"modified"});const t=tasks.get(e.task);if(t)t.currentLine=e.line;}
    else if(e.op==="diagnostic"||e.op==="system_stall"||e.op==="deadlock_detected")warnings.push(describe(e,tasks,objects));
    const activeLines:Record<string,number>={};for(const t of tasks.values())if(t.currentLine>0&&t.state!=="Deleted")activeLines[t.id]=t.currentLine;
    snapshots.push({stepIndex:snapshots.length,tick:e.tick,description:describe(e,tasks,objects),running:eventRunning(e,running),tasks:cloneTasks(tasks),objects:cloneObjects(objects),waitFor:waitEdges(tasks,objects),timelineUntilTick:e.tick,stdout,warnings:[...warnings],activeLines,globals:[...vars.values()].map(v=>({...v,status:v.status})),event:e});
  }
  return snapshots;
}

function eventRunning(e:RtosTraceEvent,running:string|null):string|"isr"|null{return e.op==="isr_enter"?"isr":running;}
