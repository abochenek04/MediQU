import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { startJobSchedule } from './jobs.ts';
import { readConfig } from './config.ts';
import { createApplication } from './application.ts';
const config=readConfig();const app=createApplication(config);
const stopJobs=process.env.RUN_JOBS==='true'?startJobSchedule(app.db,config):async()=>{};
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url||'/',config.origin).pathname;
  if(pathname.startsWith('/api/')){
   let length=0;const chunks:Buffer[]=[];
   for await(const chunk of req){length+=chunk.length;if(length>32768){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);
   const body=Buffer.concat(chunks).toString();
   const request=new Request(new URL(req.url||'/',config.origin),{method:req.method,headers,...(!['GET','HEAD'].includes(req.method||'GET')?{body:body||'{}'}:{})});
   const ip=config.trustProxy?String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1)!.trim():req.socket.remoteAddress||'unknown';
   const response=await app.handle(request,ip);
   res.statusCode=response.status;response.headers.forEach((value,name)=>{if(name!=='set-cookie')res.setHeader(name,value);});
   if(response.headers.getSetCookie().length)res.setHeader('set-cookie',response.headers.getSetCookie());
   res.end(await response.text());return;
  }
  if(!config.serveStatic){res.writeHead(404);res.end('Use the Vite development URL.');return;}
  const root=resolve('dist');const file=resolve(root,'.'+decodeURIComponent(pathname));
  if(!file.startsWith(root+'/')&&file!==root){res.writeHead(403);res.end();return;}
  let data:Buffer;let type=extname(file);
  try{data=await readFile(file);}catch{if(type){res.writeHead(404);res.end();return;}data=await readFile(resolve(root,'index.html'));type='.html';}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.md':'text/plain'}as Record<string,string>)[type]||'application/octet-stream');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Cache-Control',type==='.html'?'no-cache':'public, max-age=3600');res.end(data);
 }catch{res.writeHead(500);res.end('Service unavailable');}
});
server.listen(config.port,config.host,()=>console.log(`MediQU ${config.environment} API on ${config.host}:${config.port}`));
const shutdown=()=>server.close(()=>{void stopJobs().finally(()=>{app.close();process.exit(0);});});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
