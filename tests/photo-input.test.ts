import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectPhotoDimensions, preparePhoto, validatePhotoResponse } from '../src/photo-input.ts';
function png(width:number,height:number) {
  const bytes=new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10]); bytes.set([73,72,68,82],12);
  const view=new DataView(bytes.buffer); view.setUint32(16,width);view.setUint32(20,height); return bytes;
}
test('photo dimensions are inspected before decode for PNG and JPEG',()=>{
  assert.deepEqual(inspectPhotoDimensions(png(800,600)),{width:800,height:600});
  assert.deepEqual(inspectPhotoDimensions(new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,7,8,0,50,0,100])),{width:100,height:50});
  assert.equal(inspectPhotoDimensions(new Uint8Array([255,216,255,192,0,7,8])),null);
});
test('oversized and undersized PNG dimensions fail before browser decoding',async()=>{
  await assert.rejects(preparePhoto(new File([png(9000,100)],'question.png',{type:'image/png'})),/8,192/);
  await assert.rejects(preparePhoto(new File([png(31,100)],'question.png',{type:'image/png'})),/32 pixels/);
});
test('transcription validation accepts only bounded text and uncertainty strings',()=>{
  assert.deepEqual(validatePhotoResponse({text:'Solve 2x + 1 = 7.',issues:['  Check the constant.  ']}),{text:'Solve 2x + 1 = 7.',issues:['Check the constant.']});
  for(const payload of [{text:'x',issues:Array(9).fill('issue')},{text:'x',issues:['x'.repeat(241)]},{text:'x',issues:[1]},{text:'x'.repeat(6001),issues:[]},{text:'x',issues:[],extra:true}]) assert.throws(()=>validatePhotoResponse(payload),/invalid response/);
});

function browserFixture(t:{after:(fn:()=>void)=>void},options:{width?:number;height?:number;output?:string;decodeError?:boolean}={}){
 const originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image'),originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 const state={encodings:[] as unknown[][],revoked:[] as string[],cleared:false,white:false,draws:0};
 const context={fillStyle:'',fillRect:()=>{state.white=context.fillStyle==='#ffffff';},drawImage:()=>{state.draws++;}};
 const canvas={width:0,height:0,getContext:()=>context,toDataURL:(...args:unknown[])=>{state.encodings.push(args);return options.output??'data:image/png;base64,'+'A'.repeat(240000);}};
 class Picture{naturalWidth=options.width??800;naturalHeight=options.height??600;set src(value:string){if(!value)state.cleared=true;}async decode(){if(options.decodeError)throw Error('decode');}}
 Object.defineProperty(globalThis,'Image',{value:Picture,configurable:true});Object.defineProperty(globalThis,'document',{value:{createElement:()=>canvas},configurable:true});
 URL.createObjectURL=()=> 'blob:local-fixture';URL.revokeObjectURL=value=>{state.revoked.push(String(value));};
 t.after(()=>{if(originalImage)Object.defineProperty(globalThis,'Image',originalImage);else Reflect.deleteProperty(globalThis,'Image');if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else Reflect.deleteProperty(globalThis,'document');URL.createObjectURL=create;URL.revokeObjectURL=revoke;});
 return {state,canvas};
}
test('local preparation preserves one large lossless PNG without byte-driven shrinking',async t=>{
 const {state}=browserFixture(t);const result=await preparePhoto(new File([png(800,600)],'question.png',{type:'image/png'}));
 assert.equal(result.width,800);assert.equal(result.height,600);assert.equal(result.resized,false);assert.ok(result.image.length>180000);
 assert.deepEqual(state.encodings,[['image/png']]);assert.equal(state.draws,1);assert.equal(state.white,true);assert.equal(state.cleared,true);assert.deepEqual(state.revoked,['blob:local-fixture']);
});
test('local lossless preparation retains genuine dimension scaling and crop limits',async t=>{
 const {state}=browserFixture(t,{width:3200,height:1600});const result=await preparePhoto(new File([png(3200,1600)],'question.png',{type:'image/png'}));
 assert.equal(result.width,1600);assert.equal(result.height,800);assert.equal(result.resized,true);assert.deepEqual(state.encodings,[['image/png']]);
});
test('unsupported canvas encoding fails safely and releases the local image',async t=>{
 const {state}=browserFixture(t,{output:'data:image/jpeg;base64,AAAA'});
 await assert.rejects(preparePhoto(new File([png(800,600)],'question.png',{type:'image/png'})),/Lossless image preparation.*Paste/);
 assert.equal(state.cleared,true);assert.equal(state.revoked.length,1);assert.deepEqual(state.encodings,[['image/png']]);
});
test('a decoded image exceeding genuine limits is rejected and cleaned up',async t=>{
 const {state}=browserFixture(t,{width:9000,height:100});
 await assert.rejects(preparePhoto(new File([png(800,600)],'question.png',{type:'image/png'})),/8,192/);assert.equal(state.encodings.length,0);assert.equal(state.cleared,true);assert.equal(state.revoked.length,1);
});
