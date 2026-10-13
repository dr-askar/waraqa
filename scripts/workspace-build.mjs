import {build} from 'esbuild';import {mkdir} from 'node:fs/promises';
await mkdir('dist/workspace',{recursive:true});
const {build:viteBuild}=await import('vite');await viteBuild({configFile:false,publicDir:false,define:{'process.env.NODE_ENV':'"production"'},build:{lib:{entry:'src/presentation/workspace.tsx',formats:['es'],fileName:()=> 'shell.js'},outDir:'dist/workspace',emptyOutDir:false,sourcemap:false,minify:true,rollupOptions:{external:id=>id.startsWith('../../dist/'),output:{paths:id=>'../'+id.split('/').pop()}}}});

await build({entryPoints:{actions:'src/application/documents.ts',repository:'src/infrastructure/documents.ts'},outdir:'dist/workspace',entryNames:'[name]',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'legacy-adapters',setup(build){build.onResolve({filter:/^\.\.\/\.\.\/dist\//},args=>({path:'../'+args.path.split('/').pop(),external:true}));}}],define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
await build({entryPoints:['node_modules/pptxgenjs/dist/pptxgen.es.js'],outfile:'dist/vendor/pptxgen.mjs',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked'});

await build({entryPoints:['node_modules/katex/dist/katex.mjs'],outfile:'dist/vendor/katex.mjs',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked'});
const {cp}=await import('node:fs/promises');await cp('node_modules/katex/dist/katex.min.css','dist/vendor/katex.min.css');await cp('node_modules/katex/dist/fonts','dist/vendor/fonts',{recursive:true});
await build({entryPoints:['node_modules/@mlc-ai/web-llm/lib/index.js'],outfile:'dist/vendor/webllm.mjs',bundle:true,format:'esm',platform:'browser',minify:true,legalComments:'linked'});

await cp('node_modules/react/LICENSE','dist/workspace/React-LICENSE.txt');await cp('node_modules/react-dom/LICENSE','dist/workspace/ReactDOM-LICENSE.txt');
