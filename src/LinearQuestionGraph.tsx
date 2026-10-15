import { useEffect,useId,useRef,useState } from 'react';
import JXG from 'jsxgraph';
import type { LinearModel } from './exploration';
JXG.Options.jc.compile=false;
export default function LinearQuestionGraph({model}:{model:LinearModel}) {
  const id=`question-line-${useId().replace(/:/g,'')}`,container=useRef<HTMLDivElement>(null),values=useRef(model),board=useRef<ReturnType<typeof JXG.JSXGraph.initBoard>|null>(null),[failed,setFailed]=useState(false);values.current=model;
  useEffect(()=>{
    if(!container.current)return;
    let resize:ResizeObserver|undefined;
    try {
      const active=JXG.JSXGraph.initBoard(id,{boundingbox:model.bounds,axis:true,showCopyright:false,showNavigation:false,keepaspectratio:false,pan:{enabled:false},zoom:{wheel:false,min:1,max:1,pinchHorizontal:false,pinchVertical:false},resize:{enabled:false,throttle:10},...{keyboard:{enabled:false}},defaultAxes:{x:{name:'x',withLabel:true,ticks:{minorTicks:0,drawLabels:true,label:{fontSize:11}}},y:{name:'y',withLabel:true,ticks:{minorTicks:0,drawLabels:true,label:{fontSize:11}}}}});
      board.current=active;
      const hidden={visible:false,fixed:true,name:''};
      const start=active.create('point',[0,()=>values.current.b],hidden),end=active.create('point',[1,()=>values.current.m+values.current.b],hidden);
      active.create('line',[start,end],{strokeColor:'#087E8B',strokeWidth:3,fixed:true,highlight:false});
      const t1=active.create('point',[0,()=>values.current.target??0],hidden),t2=active.create('point',[1,()=>values.current.target??0],hidden);
      active.create('line',[t1,t2],{visible:()=>values.current.target!==undefined,strokeColor:'#A84616',strokeWidth:2,dash:2,fixed:true,highlight:false});
      active.create('point',[()=>values.current.point?.x??0,()=>values.current.point?.y??0],{visible:()=>values.current.point!==null,name:'',withLabel:false,size:5,fillColor:'#2457D6',strokeColor:'#fff',strokeWidth:2,fixed:true,highlight:false});
      container.current.tabIndex=-1;container.current.style.touchAction='pan-y';
      container.current.querySelectorAll('[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));
      const frame=container.current.parentElement!;
      resize=new ResizeObserver(()=>{const w=frame.clientWidth,h=frame.clientHeight;if(w>0&&h>0&&(w!==active.canvasWidth||h!==active.canvasHeight))active.resizeContainer(w,h);});resize.observe(frame);
      return ()=>{resize?.disconnect();JXG.JSXGraph.freeBoard(active);board.current=null;};
    } catch {resize?.disconnect();if(board.current){JXG.JSXGraph.freeBoard(board.current);board.current=null;}setFailed(true);}
  // One board; current parameters are read through values.current.
  },[id]);
  useEffect(()=>{board.current?.setBoundingBox(model.bounds,false);board.current?.update();},[model]);
  return failed?<p role="status">The graph could not load. The current values and table remain available.</p>:<div id={id} ref={container} className="graph-board" aria-hidden="true" data-m={model.m} data-b={model.b} data-target={model.target} data-point-x={model.point?.x} data-point-y={model.point?.y} data-solution-status={model.status} data-bounds={model.bounds.join(',')}/>;
}
