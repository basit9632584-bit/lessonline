import { validateProblem,isBasicProblem } from './problem.ts';
import type { Problem } from './problem.ts';
import { yAt } from './math.ts';
import { quadraticAt, derivativeAt, tangentAt } from './calculus.ts';
import { statisticsSummary } from './statistics.ts';
import { probabilityDistribution, expectedSuccesses } from './probability.ts';
export type LinearModel={kind:'linear';m:number;b:number;target?:number;status:'unique'|'none'|'infinite'|'evaluation';point:{x:number;y:number}|null;bounds:[number,number,number,number];table:{x:number;y:number}[]};
export function explorationModel(problem:Problem) {
  const error=validateProblem(problem);if(error)throw new Error(error);
  if(isBasicProblem(problem))return {kind:'basic' as const,problem};
  if(problem.task==='linear.solve'||problem.task==='linear.evaluate') {
    const {m,b}=problem.parameters;
    let point:LinearModel['point']=null,status:LinearModel['status']='evaluation',target:number|undefined;
    if(problem.task==='linear.solve') {target=problem.parameters.t;status=m===0?(b===target?'infinite':'none'):'unique';if(m!==0)point={x:(Math.round(target*100)-Math.round(b*100))/Math.round(m*100),y:target};}
    else point={x:problem.parameters.x,y:yAt(m,b,problem.parameters.x)};
    // Include origin and the answer with margin; these bounds never clamp math.
    const lowX=Math.min(-4,point?.x??0),highX=Math.max(4,point?.x??0),marginX=(highX-lowX)*.12;
    const xMin=lowX-marginX,xMax=highX+marginX;
    const ys=[0,b,m*xMin+b,m*xMax+b,...(target===undefined?[]:[target]),...(point?[point.y]:[])];
    const lowY=Math.min(-2,...ys),highY=Math.max(2,...ys),marginY=Math.max(1,(highY-lowY)*.1);
    const table=[xMin,(xMin+xMax)/2,xMax,...(point?[point.x]:[])].sort((a,b)=>a-b).filter((x,i,a)=>i===0||x!==a[i-1]).map(x=>({x,y:yAt(m,b,x)}));
    return {kind:'linear',m,b,target,status,point,bounds:[xMin,highY+marginY,xMax,lowY-marginY],table} as LinearModel;
  }
  if('a' in problem.parameters) {const p=problem.parameters;return {kind:'calculus' as const,parameters:p,point:{x:p.x0,y:quadraticAt(p,p.x0)},slope:derivativeAt(p,p.x0),table:[-1,-.5,0,.5,1].map(offset=>{const x=Number((p.x0+offset).toFixed(2));return {x,y:quadraticAt(p,x),tangent:tangentAt(p,x)};})};}
  if('values' in problem.parameters) {
    const values=[...problem.parameters.values],summary=statisticsSummary({values}),padding=Math.max(.02,summary.range*.12);
    const levels=new Map<number,number>();const dots=values.map((value,index)=>{const level=levels.get(value)??0;levels.set(value,level+1);return {value,index,level};});
    return {kind:'statistics' as const,values,summary,axis:{low:summary.min-padding,high:summary.max+padding},dots,maxStack:Math.max(...levels.values())};
  }
  const p=problem.parameters,distribution=probabilityDistribution({...p,k:p.k??0});
  return {kind:'probability' as const,n:p.n,p:p.p,selectedK:problem.task==='probability.exactly-k'?problem.parameters.k:undefined,distribution,expected:expectedSuccesses({...p,k:p.k??0}),maximum:Math.max(...distribution)};
}
export type ExplorationModel=ReturnType<typeof explorationModel>;
