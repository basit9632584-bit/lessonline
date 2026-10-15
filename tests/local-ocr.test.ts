import test from 'node:test';import assert from 'node:assert/strict';
import {createLocalQuestionReader} from '../src/localOcr.ts';
const image='data:image/jpeg;base64,local-fixture';
test('local worker uses same-origin pinned paths and returns raw editable OCR text',async()=>{
 let terminated=0;let options:any;
 const read=createLocalQuestionReader({baseUrl:()=> 'http://localhost:5173/app/',loadFactory:async()=>async(lang,oem,opts)=>{assert.equal(lang,'eng');assert.equal(oem,1);options=opts;return {recognize:async()=>({data:{text:' Solve 2x − 1 = 7.\n'}}),terminate:async()=>{terminated++;}};}});
 const result=await read(image);assert.equal(result.text,' Solve 2x − 1 = 7.\n');assert.equal(result.issues.length,1);assert.equal(terminated,1);
 for(const key of ['workerPath','corePath','langPath'])assert.ok(options[key].startsWith('http://localhost:5173/app/ocr/'));
 assert.equal(options.cacheMethod,'none');assert.equal(options.workerBlobURL,false);assert.equal(options.legacyCore,false);
});
test('cancel during startup rejects immediately, prevents duplicate worker and terminates late creation',async()=>{
 let resolve:any,terminated=0,calls=0;
 const startup=new Promise<any>(done=>{resolve=done;});
 const read=createLocalQuestionReader({baseUrl:()=> 'http://localhost/',loadFactory:async()=>async()=>{calls++;return startup;}});
 const controller=new AbortController(),pending=read(image,{signal:controller.signal});await new Promise(done=>setTimeout(done,0));controller.abort();
 await assert.rejects(pending,{name:'AbortError'});await assert.rejects(read(image),/still stopping or starting/);assert.equal(calls,1);
 resolve({recognize:async()=>assert.fail('obsolete recognition must not run'),terminate:async()=>{terminated++;}});await new Promise(done=>setTimeout(done,0));assert.equal(terminated,1);
});
test('recognition cancellation terminates worker and discards late text',async()=>{
 let resolve:any,terminated=0;
 const read=createLocalQuestionReader({baseUrl:()=> 'http://localhost/',loadFactory:async()=>async()=>({recognize:()=>new Promise<any>(done=>{resolve=done;}),terminate:async()=>{terminated++;}})});
 const controller=new AbortController(),pending=read(image,{signal:controller.signal});await new Promise(done=>setTimeout(done,0));controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.ok(terminated>=1);resolve({data:{text:'obsolete'}});await new Promise(done=>setTimeout(done,0));
});
test('cancelled recognition that never settles permits reuse only after termination',async()=>{
 let calls=0,terminated=0;
 const read=createLocalQuestionReader({baseUrl:()=> 'http://localhost/',loadFactory:async()=>async()=>{calls++;return {recognize:async()=>calls===1?new Promise<any>(()=>{}):{data:{text:'new question'}},terminate:async()=>{terminated++;}};}});
 const controller=new AbortController(),pending=read(image,{signal:controller.signal});await new Promise(done=>setTimeout(done,0));controller.abort();await assert.rejects(pending,{name:'AbortError'});await new Promise(done=>setTimeout(done,0));
 assert.equal((await read(image)).text,'new question');assert.equal(terminated,2);
});
test('timeout is bounded even if initialization ignores cancellation; blank/oversized output fails',async()=>{
 const read=createLocalQuestionReader({baseUrl:()=> 'http://localhost/',timeoutMs:5,loadFactory:async()=>async()=>new Promise(()=>{})});await assert.rejects(read(image),/timed out/);await assert.rejects(read(image),/still stopping or starting/);
 for(const text of [' ','x'.repeat(6001)]) {let stopped=0;const reader=createLocalQuestionReader({baseUrl:()=> 'http://localhost/',loadFactory:async()=>async()=>({recognize:async()=>({data:{text}}),terminate:async()=>{stopped++;}})});await assert.rejects(reader(image));assert.equal(stopped,1);}
 const controller=new AbortController();controller.abort();await assert.rejects(read(image,{signal:controller.signal}),{name:'AbortError'});
});
