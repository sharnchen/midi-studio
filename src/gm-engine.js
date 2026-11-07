import { WorkletSynthesizer } from 'spessasynth_lib';
let synth,context,loading,ready=false,previewTrack=null,previewPitch=null;
let destinationNode,outputConnected=false;let masterLevel=.7;const timers=new Set(),configs=new Map();let transportGeneration=0,stopPending=Promise.resolve();
async function load(ctx,destination,progress){
 if(ready)return;if(loading)return loading;
 context=ctx;let localSynth;
 const cleanup=()=>{if(localSynth){try{localSynth.stopAll(true);localSynth.disconnect(destination)}catch{}}};
 loading=StudioLoading.run(async(signal,guard)=>{
  const mr=await fetch('./soundfonts/manifest.json',{signal});guard();if(!mr.ok)throw Error('找不到音源清單');const manifest=await mr.json();guard();let received=0;
  const parts=await Promise.all(manifest.parts.map(async part=>{const response=await fetch(part.url,{cache:'force-cache',signal});guard();if(!response.ok)throw Error('音源下載失敗 '+response.status);const reader=response.body.getReader(),chunks=[];let size=0;for(;;){const {done,value}=await reader.read();guard();if(done)break;chunks.push(value);size+=value.length;received+=value.length;progress(Math.min(99,Math.floor(received/manifest.bytes*100)))}if(size!==part.bytes)throw Error('音源資料不完整');const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length}return data}));
  guard();const bank=new Uint8Array(manifest.bytes);let offset=0;for(const part of parts){bank.set(part,offset);offset+=part.length}
  await ctx.audioWorklet.addModule('./vendor/spessasynth_processor.min.js?v=20261031-controllers');guard();
  localSynth=new WorkletSynthesizer(ctx,{eventsEnabled:false});localSynth.setLogLevel(false,false,false);
  await localSynth.soundBankManager.addSoundBank(bank.buffer,'GeneralUser GS');guard();await localSynth.isReady;guard();
  for(let i=16;i<129;i++)localSynth.addNewChannel();await new Promise((resolve,reject)=>{let attempts=0;const check=()=>{try{guard();if(localSynth.midiChannels.length>=129)return resolve();if(++attempts>100)return reject(Error('128 音軌初始化失敗'));setTimeout(check,20)}catch(error){reject(error)}};check()});
  guard();synth=localSynth;destinationNode=destination;synth.connect(destination);outputConnected=true;ready=true;masterVolume(masterLevel);progress(100);
 },{timeoutMs:60000,label:'GM 音源載入',onCancel:cleanup}).catch(error=>{cleanup();loading=null;throw error});
 return loading;
}
function connectOutput(){if(ready&&!outputConnected){synth.connect(destinationNode);outputConnected=true}}
function disconnectOutput(){if(synth&&outputConnected){try{synth.disconnect(destinationNode)}finally{outputConnected=false}}}
function configure(channel,t){const key=`${t.program}:${t.ch%16===9}`;if(configs.get(channel)!==key){synth.midiChannels[channel].setDrums(t.ch%16===9);synth.controllerChange(channel,0,0);synth.controllerChange(channel,32,0);synth.programChange(channel,t.ch%16===9?0:t.program);configs.set(channel,key)}synth.worklet.port.postMessage({type:'studioMixer',channel,volume:t.vol});synth.controllerChange(channel,11,127)}
function later(fn,time){const id=setTimeout(()=>{timers.delete(id);fn()},Math.max(0,(time-context.currentTime)*1000));timers.add(id)}
function note(t,channel,n,when,dur){if(!ready||channel<0)return;const generation=transportGeneration,start=()=>{if(generation!==transportGeneration)return;connectOutput();configure(channel,t);synth.noteOn(channel,n.p,n.v)};if(when>context.currentTime+.003)later(start,when);else start();later(()=>synth.noteOff(channel,n.p),when+dur)}
function release(){if(ready&&previewPitch!==null)synth.noteOff(128,previewPitch);previewPitch=null;previewTrack=null}
function hold(t,n){release();connectOutput();configure(128,t);previewTrack=t;previewPitch=n.p;synth.noteOn(128,n.p,n.v)}
function volume(t,channel,enabled=true){if(!ready)return;for(const ch of [channel,...(previewTrack===t?[128]:[])])if(ch>=0)synth.worklet.port.postMessage({type:'studioMixer',channel:ch,volume:enabled?t.vol:0})}
let mixRevision=0;function mix(tracks){if(!ready)return;const state=window.MidiMix.snapshot(tracks);synth.worklet.port.postMessage({type:'studioMixSnapshot',generation:transportGeneration,revision:++mixRevision,volumes:state.volumes})}
function masterVolume(value){masterLevel=Math.max(0,Math.min(1,Number(value)||0));if(ready)synth.worklet.port.postMessage({type:'studioMixer',master:masterLevel})}

function patch(t,index){if(ready&&index>=0)configure(index,t)}
function transport(tracks,events,origin,duration,loop,loopEvents){connectOutput();for(let i=0;i<tracks.length;i++)configure(i,tracks[i]);synth.worklet.port.postMessage({type:'studioTransport',data:{events,origin,duration,loop,loopEvents,baseVolumes:tracks.map(t=>t.initialVolume??t.vol),volumes:window.MidiMix.snapshot(tracks).volumes,generation:++transportGeneration}})}
function retime(ratio,pivot){if(ready)synth.worklet.port.postMessage({type:'studioTransportTempo',generation:transportGeneration,ratio,pivot})}
function setLoop(loop){if(ready)synth.worklet.port.postMessage({type:'studioTransportLoop',data:loop})}
function stop(){disconnectOutput();if(ready){
 const generation=++transportGeneration,channel=new MessageChannel();
 stopPending=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{channel.port1.close();reject(Error('音訊排程停止逾時，請重新整理'))},5000);channel.port1.onmessage=()=>{clearTimeout(timeout);channel.port1.close();resolve()}});stopPending.catch(()=>{});
 synth.worklet.port.postMessage({type:'studioTransportStop',generation,ack:channel.port2},[channel.port2]);
 }for(const id of timers)clearTimeout(id);timers.clear();release();if(ready)synth.stopAll(true)}
window.GMEngine={load,note,transport,retime,stopped:()=>stopPending,setLoop,hold,release,volume,mix,patch,masterVolume,stop,get outputConnected(){return outputConnected},get ready(){return ready},get voiceCount(){return synth?.voiceCount??0},get presets(){return synth?.presetList??[]}};
