import {build} from 'vite';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),outDir=path.join(root,'public','portable');
await build({root,configFile:false,envDir:false,publicDir:false,define:{'process.env.NODE_ENV':JSON.stringify('production')},build:{outDir,emptyOutDir:true,target:'es2022',cssCodeSplit:false,lib:{entry:path.join(root,'src','offline-question.tsx'),name:'LessonlineQuestion',formats:['iife'],fileName:()=> 'question.js',cssFileName:'question'},rolldownOptions:{output:{codeSplitting:false}}}});
await mkdir(outDir,{recursive:true});const notices=['JSXGraph-LICENSE.MIT','React-LICENSE.MIT','ReactDOM-LICENSE.MIT'];
await writeFile(path.join(outDir,'licenses.txt'),(await Promise.all(notices.map(async name=>name+'\n'+await readFile(path.join(root,'public',name),'utf8')))).join('\n\n'),'utf8');
