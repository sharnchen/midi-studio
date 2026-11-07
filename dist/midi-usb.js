(()=>{
 let access=null,output=null,preview=null,callbacks=null,switching=false,switchId=0,switchQueue=Promise.resolve();const owned=new Set(),touched=new Set();
 let transportState=null,transportGeneration=0,clock=null,fallbackTimer=null,panicTimer=null;
 function wake(){if(!clock){try{clock=new Worker(new URL('midi-clock.js?v=virtual-20261031',document.baseURI));clock.onmessage=e=>{if(e.data.generation===transportGeneration)pump()}}catch{}}if(clock)clock.postMessage({type:'start',generation:transportGeneration});else fallbackTimer=setInterval(pump,25)}
 function playbackTime(){return transportState?performance.now()/1000+transportState.clockOffset:null}
 function pump(){
  const t=transportState;if(!t||t.generation!==transportGeneration||output!==t.port)return;
  const now=playbackTime(),horizon=now+.08;
  for(;;){
   if(t.index>=t.events.length){if(!t.loop||t.origin+t.duration>horizon)return;t.origin+=t.duration;t.events=t.loopEvents;t.index=0;if(!t.events.length)return}
   const e=t.events[t.index],when=t.origin+e.at;if(when>horizon)return;t.index++;
   if(e.on&&when+e.dur<=now)continue;
   const ch=t.tracks[e.ch].ch&15,at=performance.now()+Math.max(0,(when-now)*1000);
   if(e.data){const data=[...e.data];if(data[0]===176){if(data[1]===7){t.fileVolumes[ch]=data[2]/127;data[2]=channelVolume(ch,t.tracks)}if(data[1]===11){t.expressions[ch]=data[2]/127;data[2]=Math.round(t.expressions[ch]*Number($('master').value)/100*127)}}send([data[0]|ch,...data.slice(1)],at);if(data[0]===176&&data[1]===121){send([176|ch,7,channelVolume(ch,t.tracks)],at);send([176|ch,11,Math.round((t.expressions[ch]??1)*Number($('master').value)/100*127)],at)}}
   else send([ (e.on?0x90:0x80)|ch,e.p,e.on?e.v:0],at);
  }
 }
 function transport(tracks,events,origin,duration,loop,loopEvents,context){
  stop();const generation=++transportGeneration;
  if(!output)return;
  tracks.forEach(t=>configure(t,0));mix(tracks);
  transportState={tracks,events,index:0,origin,duration,loop,loopEvents,clockOffset:context.currentTime-performance.now()/1000,port:output,generation,fileVolumes:{},expressions:{}};wake();pump();
 }
 function retime(ratio,pivot){
  const t=transportState;if(!t||!Number.isFinite(ratio)||ratio<=0)return;
  // Recover messages in the lookahead window before discarding their timestamps.
  try{t.port.clear()}catch{}
  while(t.index>0&&t.origin+t.events[t.index-1].at>=pivot)t.index--;
  const scale=events=>events.map(e=>({...e,at:e.at/ratio,...(e.on?{dur:e.dur/ratio}:{})}));
  t.origin=pivot-(pivot-t.origin)/ratio;t.duration/=ratio;t.events=scale(t.events);t.loopEvents=scale(t.loopEvents);pump();
 }
 function panic(port){try{port.clear()}catch{}for(let ch=0;ch<16;ch++){
  for(const cc of [64,66,69,123,120,121])try{port.send([0xb0|ch,cc,0])}catch{}
  try{port.send([224|ch,0,64])}catch{}
  for(let pitch=0;pitch<128;pitch++)try{port.send([0x80|ch,pitch,0])}catch{}
 }}
 const $=id=>document.getElementById(id);
 function status(text){$('usbStatus').textContent=text}
 function send(data,time=0){if(!output)return;try{output.send(data,time)}catch(e){status('MIDI 傳送失敗：'+e.message)}}
 function volume(t){if(output)send([0xb0|(t.ch&15),7,Math.round(t.vol*127)])}
 function channelVolume(ch,tracks){const state=window.MidiMix.snapshot(tracks);let level=0;for(const [i,t] of tracks.entries())if((t.ch&15)===ch){const base=t.initialVolume||100/127,file=transportState?.fileVolumes[ch]??base;level=Math.max(level,state.volumes[i]*file/base)}return Math.round(Math.min(1,level)*127)}
 function mix(tracks){if(!output)return;for(const ch of new Set(tracks.map(t=>t.ch&15)))send([176|ch,7,channelVolume(ch,tracks)])}
 function configure(t,time){if(output)touched.add(output);const ch=t.ch&15;owned.add(ch);send([0xb0|ch,0,0],time);send([0xb0|ch,32,0],time);send([0xc0|ch,ch===9?0:t.program],time);send([0xb0|ch,7,Math.round(t.vol*127)],time);send([0xb0|ch,11,Math.round(Number($('master').value)/100*127)],time)}
 function note(t,n,when,dur,ctxTime){if(!output)return;const at=performance.now()+Math.max(0,(when-ctxTime)*1000),ch=t.ch&15;if(!owned.has(ch))configure(t,0);send([0x90|ch,n.p,n.v],at);send([0x80|ch,n.p,0],at+dur*1000)}
 function release(){if(preview){send([0x80|preview.ch,preview.pitch,0]);preview=null}}
 function hold(t,n){release();configure(t,0);preview={ch:t.ch&15,pitch:n.p};send([0x90|preview.ch,n.p,n.v])}
 function stop(){
  transportState=null;const generation=++transportGeneration;
  if(clock)clock.postMessage({type:'stop'});clearInterval(fallbackTimer);fallbackTimer=null;clearTimeout(panicTimer);release();
  const ports=new Set(touched);if(output)ports.add(output);ports.forEach(panic);owned.clear();touched.clear();
  // Catch any short-window events already handed to the operating-system driver.
  panicTimer=setTimeout(()=>{if(generation===transportGeneration&&!transportState)ports.forEach(port=>{if(port.connection!=='closed')panic(port)})},100);
 }
 function patch(t){if(output){configure(t,0);mix(callbacks.project().tracks)}}

 function expression(){for(const ch of owned)send([0xb0|ch,11,Math.round((transportState?.expressions[ch]??1)*Number($('master').value)/100*127)])}
 function describe(){if(!output)return;const groups=new Map();for(const t of callbacks.project().tracks){if(!t.notes.length)continue;const ch=t.ch&15;const old=groups.get(ch);if(old&&(old.program!==t.program||old.vol!==t.vol)){status('USB MIDI 1.0 / GM · 注意：多軌共用通道，音色與音量會互相影響');return}groups.set(ch,t)}status('USB MIDI 1.0 / GM · 通道 1–16 · 鼓組 CH10')}
 function populate(){const select=$('midiOutput'),selected=output?.id;select.replaceChildren(new Option('內建 GeneralUser GM 音源',''));if(access)for(const port of access.outputs.values())if(port.state==='connected')select.add(new Option(port.name||port.manufacturer||'MIDI 輸出',port.id));if(selected&&access.outputs.get(selected)?.state==='connected')select.value=selected;else if(selected){callbacks.pause();output=null;status('MIDI 設備已中斷；已停止播放，切回內建音源')}}
 function init(cb){callbacks=cb;$('usbEnable').onclick=async()=>{if(!navigator.requestMIDIAccess){status('此瀏覽器不支援 Web MIDI；請使用支援的 Chrome／Edge 瀏覽器');return}try{access=await navigator.requestMIDIAccess({sysex:false});access.onstatechange=populate;populate();status([...access.outputs.values()].some(p=>p.state==='connected')?'請在輸出選單選擇 USB MIDI 設備，並將設備設為 GM 模式':'找不到 MIDI 輸出；請連接 USB MIDI 設備後重試')}catch(e){status('無法取得 MIDI 設備權限：'+e.message)}};$('midiOutput').onchange=e=>{
 const requested=e.target.value,id=++switchId;switching=true;callbacks.pause();const previous=output;output=null;
 status('正在切換音源，已停止播放…');
 switchQueue=switchQueue.catch(()=>{}).then(async()=>{
  if(previous)try{previous.clear();await previous.close()}catch{}
  if(id!==switchId)return;
  if(window.GMEngine)await GMEngine.stopped();
  if(id!==switchId)return;
  const port=access?.outputs.get(requested);
  if(port){await port.open();if(id!==switchId){try{port.clear();await port.close()}catch{}return}output=port;describe()}
  else status('內建 GM 音源 · 已停止播放，可重新播放');
 }).catch(err=>{if(id===switchId){output=null;$('midiOutput').value='';status('無法切換音源：'+err.message)}}).finally(()=>{if(id===switchId){switching=false;callbacks.pause()}});
 return switchQueue;
};window.addEventListener('pagehide',stop)}
 window.USBMidi={init,note,transport,retime,hold,release,stop,volume,mix,patch,expression,describe,get playbackTime(){return playbackTime()},get switching(){return switching},get active(){return !!output}};
})();
