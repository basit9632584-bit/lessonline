import {copyFile,mkdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const coreFiles=['tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js','tesseract-core-relaxedsimd-lstm.wasm.js'];
const core=path.join(root,'node_modules/tesseract.js-core');
for(const file of coreFiles) {
  const text=await readFile(path.join(core,file),'utf8');
  const embedded=text.match(/Ga\("(AGFzb[A-Za-z0-9+/=]+)"\)/);
  if(!embedded || Buffer.from(embedded[1],'base64').subarray(0,4).toString('hex')!=='0061736d')throw new Error(`Expected embedded WASM in ${file}; verify pinned OCR assets.`);
}
const language=path.join(root,'vendor/ocr/eng.traineddata.gz');
await stat(language); // Fail clearly if the separately verified English asset is absent.
const manifest=JSON.parse(await readFile(path.join(root,'vendor/ocr/manifest.json'),'utf8'));
const languageBytes=await readFile(language);
if(manifest.language!=='eng'||manifest.imageTransmission!==false||languageBytes.length!==manifest.gzipBytes||createHash('sha256').update(languageBytes).digest('hex')!==manifest.gzipSha256)throw new Error('The local English OCR asset does not match its verified manifest.');
for(const folder of ['core','lang','licenses'])await mkdir(path.join(root,'public/ocr',folder),{recursive:true});
for(const file of coreFiles)await copyFile(path.join(core,file),path.join(root,'public/ocr/core',file));
await copyFile(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(root,'public/ocr/worker.min.js'));
await copyFile(language,path.join(root,'public/ocr/lang/eng.traineddata.gz'));
await copyFile(path.join(root,'node_modules/tesseract.js/LICENSE.md'),path.join(root,'public/ocr/licenses/tesseract.js.txt'));
await copyFile(path.join(core,'LICENSE'),path.join(root,'public/ocr/licenses/tesseract-core.txt'));
await copyFile(path.join(root,'vendor/ocr/LICENSE-tessdata.txt'),path.join(root,'public/ocr/licenses/tessdata.txt'));
await copyFile(path.join(root,'vendor/ocr/manifest.json'),path.join(root,'public/ocr/manifest.json'));
console.log('Prepared local-only English OCR worker, embedded LSTM cores and language data.');
