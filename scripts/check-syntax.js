const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function walk(directory){
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const name=path.join(directory,entry.name);
  if(entry.isDirectory()) walk(name);
  else if(name.endsWith('.js')){
   const result=spawnSync(process.execPath,['--check',name],{stdio:'inherit'});
   if(result.status!==0) process.exit(result.status||1);
  }
 }
}
for(const directory of ['src','public','test','scripts']) walk(directory);
console.log('All JavaScript syntax checks passed.');
