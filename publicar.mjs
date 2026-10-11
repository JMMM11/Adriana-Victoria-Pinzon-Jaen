import {mkdir,copyFile,cp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const target=path.join(root,'sitio-adriana');
const files=['index.html','confirmar.html','estilos.css','experiencia.css','adriana.css','configuracion.js','datos.js','servicios.js','app.js','experiencia.js','musica.js','confirmar.js','Audio.mp3'];
await mkdir(target,{recursive:true});
for(const name of files)await copyFile(path.join(root,name),path.join(target,name));
await cp(path.join(root,'assets'),path.join(target,'assets'),{recursive:true});
await writeFile(path.join(target,'_headers'),`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/configuracion.js
  Cache-Control: no-cache
`);
console.log('Carpeta lista para publicar: '+target);
