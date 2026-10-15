type OcrWorker={recognize:(image:string)=>Promise<{data:{text:string}}>;terminate:()=>Promise<unknown>};
type Progress={status:string;progress:number};
type WorkerOptions={workerPath:string;corePath:string;langPath:string;workerBlobURL:boolean;cacheMethod:string;gzip:boolean;legacyCore:boolean;legacyLang:boolean;logger:(event:Progress)=>void;errorHandler:(error:unknown)=>void};
type WorkerFactory=(language:string,oem:number,options:WorkerOptions)=>Promise<OcrWorker>;
export type LocalReadOptions={signal?:AbortSignal;onProgress?:(event:Progress)=>void};
const warning='Local OCR can misread instructions, minus signs, exponents and decimals. Compare every value with the image and correct the text before solving.';
const cancelled=()=>new DOMException('Image reading was cancelled.','AbortError');
export function createLocalQuestionReader({loadFactory,baseUrl,timeoutMs=60000}:{loadFactory:()=>Promise<WorkerFactory>;baseUrl:()=>string;timeoutMs?:number}) {
  let busy:object|null=null;
  return async function read(image:string,{signal,onProgress}:LocalReadOptions={}):Promise<{text:string;issues:string[]}> {
    if(signal?.aborted)throw cancelled();
    if(busy)throw new Error('A local image reader is still stopping or starting. Wait a moment; reload the page if it remains unavailable.');
    if(!/^data:image\/(?:jpeg|png);base64,/.test(image))throw new Error('Choose a local PNG or JPEG image before reading.');
    const base=new URL(baseUrl());
    if(typeof location!=='undefined'&&base.origin!==location.origin)throw new Error('OCR assets must come from this app.');
    const token={};busy=token;let stopped=false,worker:OcrWorker|undefined,timer:ReturnType<typeof setTimeout>|undefined,termination:Promise<unknown>|undefined;
    const release=()=>{if(busy===token)busy=null;};
    const terminate=()=>{if(!worker)return Promise.resolve();termination??=worker.terminate().catch(()=>{});return termination;};
    let rejectStop:(reason:unknown)=>void=()=>{};
    const stopPromise=new Promise<never>((_,reject)=>{rejectStop=reject;});
    const stop=(reason:unknown)=>{if(stopped)return;stopped=true;rejectStop(reason);if(worker)void terminate().finally(release);};
    const abort=()=>stop(cancelled());
    signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>stop(new Error('Local image reading timed out. Try a clearer image or paste the question.')),timeoutMs);
    const lifecycle=(async()=>{
      try {
        const factory=await loadFactory();if(stopped)throw cancelled();
        worker=await factory('eng',1,{workerPath:new URL('ocr/worker.min.js',base).href,corePath:new URL('ocr/core',base).href,langPath:new URL('ocr/lang',base).href,workerBlobURL:false,cacheMethod:'none',gzip:true,legacyCore:false,legacyLang:false,
          logger:event=>{if(!stopped&&typeof event.status==='string'&&Number.isFinite(event.progress))onProgress?.({status:event.status,progress:Math.max(0,Math.min(1,event.progress))});},
          errorHandler:()=>stop(new Error('The local OCR reader failed. Reload the page or paste the question.'))});
        if(stopped)throw cancelled();
        const {data}=await worker.recognize(image);if(stopped)throw cancelled();
        if(typeof data?.text!=='string'||!data.text.trim())throw new Error('No readable question text was found. Try a clearer image or paste the question.');
        if(data.text.length>6000)throw new Error('The image contains too much text. Use one question with up to 6,000 characters.');
        return {text:data.text,issues:[warning]}; // Preserve raw OCR text; no correction or normalization.
      } finally {
        if(worker)await terminate();
        release();
      }
    })();
    // The library exposes its worker only after initialization. Cancellation
    // rejects immediately; a late-created worker is terminated by lifecycle.
    // While startup remains unresolved, busy stays true to prevent another worker.
    try{return await Promise.race([lifecycle,stopPromise]);}
    finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  };
}
export const readLocalQuestion=createLocalQuestionReader({
  loadFactory:async()=>{const {createWorker}=await import('tesseract.js');return createWorker as WorkerFactory;},
  baseUrl:()=>new URL(import.meta.env.BASE_URL,location.href).href,
});
