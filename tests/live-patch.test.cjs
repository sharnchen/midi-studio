const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/app.js','utf8');const body=src.slice(src.indexOf('function changeTrackSource('),src.indexOf('function sound('));
for(const external of [false,true]){
 const t={name:'Test',program:0},calls=[];const box={project:{tracks:[t]},playing:true,USBMidi:{active:external,switching:false,patch:()=>calls.push('usb')},GMEngine:{patch:()=>calls.push('gm')},clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),checkpoint:()=>calls.push('undo'),persist:()=>calls.push('save'),applyTrackMix:()=>calls.push('mix'),$:()=>({}),pause(){throw Error('must not pause')},play(){throw Error('must not restart')},render(){throw Error('must not rebuild view')}};
 vm.createContext(box);vm.runInContext(body,box);for(const p of [40,73,0])box.changeTrackSource(t,p);assert.equal(calls.filter(x=>x===(external?'usb':'gm')).length,3);assert(box.playing);assert.equal(t.program,0);const before=calls.length;box.USBMidi.switching=true;box.changeTrackSource(t,50);assert.equal(calls.length,before);
}
console.log('PASS: repeated live patch preserves playback; correct output route; no pause/restart/render; output-switch guard');
