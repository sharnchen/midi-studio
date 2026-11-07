const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 let now=0,renderLag=0,worker;const sent=[],timers=new Map();let timerId=0;
 class Clock{constructor(){worker=this}postMessage(data){this.last=data;if(data.type==='start')this.generation=data.generation}pulse(generation=this.generation){this.onmessage({data:{generation}})}}
 const elements=Object.fromEntries(['midiOutput','usbEnable','usbStatus','master'].map(id=>[id,{value:id==='master'?'70':'',textContent:'',replaceChildren(){},add(){}}]));
 const port={id:'virtual',name:'VirtualMIDISynth',state:'connected',connection:'open',open:async()=>{},close:async()=>{port.connection='closed'},clear:()=>sent.push({clear:true}),send:(data,at=0)=>sent.push({data,at})};
 const box={window:{addEventListener(){}},navigator:{requestMIDIAccess:async()=>({outputs:new Map([['virtual',port]])})},document:{baseURI:'https://example.test/',getElementById:id=>elements[id]},URL,Worker:Clock,Option:function(){},performance:{now:()=>now*1000},setInterval:()=>0,clearInterval(){},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id)};
 vm.createContext(box);vm.runInContext(fs.readFileSync('dist/mix-state.js','utf8'),box);vm.runInContext(fs.readFileSync('dist/midi-usb.js','utf8'),box);
 const usb=box.window.USBMidi,tracks=[{name:'Test',ch:0,program:0,vol:.8,notes:[{}]}],context={get currentTime(){return now-renderLag}};
 usb.init({pause(){usb.stop()},project:()=>({tracks})});await elements.usbEnable.onclick();await elements.midiOutput.onchange({target:{value:'virtual'}});sent.length=0;
 const events=[{at:0,ch:0,p:60,v:90,dur:.25,on:true},{at:.25,ch:0,p:60,on:false},{at:30,ch:0,p:64,v:90,dur:.25,on:true},{at:30.25,ch:0,p:64,on:false}];
 const ons=()=>sent.filter(e=>e.data&&(e.data[0]&240)===144);
 usb.transport(tracks,events,0,60,false,events,context);assert.equal(ons().length,1);assert(!sent.some(e=>e.at>80));
 const liveGeneration=worker.generation,clears=sent.filter(e=>e.clear).length;
 for(const program of [40,73,0]){tracks[0].program=program;usb.patch(tracks[0])}
 assert.equal(worker.generation,liveGeneration);assert.equal(sent.filter(e=>e.clear).length,clears);assert.equal(ons().length,1);assert(sent.some(e=>e.data&&e.data[0]===192&&e.data[1]===73));
 now=30;renderLag=.5;assert.equal(usb.playbackTime,30);worker.pulse();assert.equal(ons().length,2);const oldGeneration=worker.generation;usb.stop();const stoppedCount=sent.length;now=35;worker.pulse(oldGeneration);assert.equal(sent.length,stoppedCount);
 assert(sent.filter(e=>e.data&&(e.data[0]&240)===128).length>=2048);
 renderLag=0;assert.equal(usb.playbackTime,null);
 for(let cycle=0;cycle<6;cycle++){const before=ons().length;usb.transport(tracks,events,now,60,false,events,context);worker.pulse(oldGeneration);assert.equal(ons().length,before+1);now+=5;worker.pulse();usb.stop();const after=ons().length;now+=5;worker.pulse();assert.equal(ons().length,after)}
 const controls=[{at:0,ch:0,data:[176,101,0]},{at:0,ch:0,data:[176,100,0]},{at:0,ch:0,data:[176,6,12]},{at:0,ch:0,data:[224,127,127]},{at:0,ch:0,data:[176,11,64]}];
 const beforeControls=sent.length;usb.transport(tracks,controls,now,1,false,controls,context);const emitted=sent.slice(beforeControls);assert(emitted.some(e=>e.data&&e.data.join(',')==='224,127,127'));assert(emitted.some(e=>e.data&&e.data.join(',')==='176,6,12'));assert(emitted.some(e=>e.data&&e.data.join(',')==='176,11,45'));usb.stop();
 const future=[{at:.1,ch:0,p:67,v:90,dur:.2,on:true},{at:.3,ch:0,p:67,on:false}];
 usb.transport(tracks,future,now,1,false,future,context);const tempoGeneration=worker.generation,beforeTempo=ons().length;
 usb.retime(2,usb.playbackTime);assert.equal(worker.generation,tempoGeneration);assert.equal(ons().length,beforeTempo+1);assert.equal(ons().at(-1).at,now*1000+50);usb.stop();
 const count=ons().length;for(const fn of [...timers.values()])fn();assert.equal(ons().length,count);
 console.log('PASS: shared monotonic clock despite 500ms render-clock drift; 80ms external queue; play 30s / switch-stop cancellation; all-channel note-off; six 5s play-stop cycles; stale Worker messages rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
// The playhead and note highlight consume this same compensated timestamp.
{
 const source=fs.readFileSync('dist/app.js','utf8');
 const body=source.slice(source.indexOf('function audibleTime(){'),source.indexOf('function highlightPlayingNotes('));
 const box={USBMidi:{active:true,playbackTime:12.5},ctx:{currentTime:99},$(){return {value:'125'}}};
 vm.createContext(box);vm.runInContext(body,box);assert.equal(box.audibleTime(),12.375);
 box.USBMidi.active=false;box.ctx={currentTime:10,getOutputTimestamp:()=>({contextTime:9.9,performanceTime:1000})};box.performance={now:()=>1020};assert.equal(box.audibleTime(),9.92);
 assert(source.includes('updateCursor();highlightPlayingNotes(now);'));
 console.log('PASS: external 125ms compensation; built-in output timestamp; shared frame timestamp');
}
