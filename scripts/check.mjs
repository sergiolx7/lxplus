import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const scan=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?scan(directory+'/'+entry.name):entry.name.endsWith('.js')||entry.name.endsWith('.mjs')?[directory+'/'+entry.name]:[]);
for(const file of [...scan('src'),...scan('scripts')]){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(1)}}
console.log('JavaScript: todos os módulos passaram na análise de sintaxe.');
