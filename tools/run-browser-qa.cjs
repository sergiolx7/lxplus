// Keep the preview and browser child in the same execution/network namespace.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=process.cwd(),mime={'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end();}
 if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}
   // Existing contract fixtures run with the site open. The maintenance scenario has its own test.
   if(path.basename(file)==='index.html'&&path.basename(process.argv[2]||'')!=='qa-automation-browser.cjs')data=Buffer.from(data.toString().replace('<head>','<head><script>window.__LX_QA_MAINTENANCE_DISABLED=true;</script>'));
   res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data);});
});
server.listen(8765,'127.0.0.1',()=>{const child=spawn(process.execPath,[process.argv[2]||'qa-universal-browser.cjs'],{stdio:'inherit',env:process.env});child.on('exit',code=>server.close(()=>process.exit(code||0)));});
server.on('error',error=>{console.error(error.message);process.exit(1)});
