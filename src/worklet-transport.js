// Runs inside the audio render thread; independent of page timers / animation.
function studioVolume(self,ch){const base=self.studioBaseVolumes?.[ch]||100/127,level=self.studioLevels?.[ch]??base,file=self.studioFileVolumes?.[ch]??base;return Math.round(Math.max(0,Math.min(1,level*file/base))*127)}
function studioMessage(self,e){const data=[...e.data],ch=e.ch;
 if(data[0]===176&&data[1]===7){self.studioFileVolumes[ch]=data[2]/127;data[2]=studioVolume(self,ch)}
 self.synthesizer.processMessageInternal([data[0]|(ch&15),...data.slice(1)],Math.floor(ch/16)*16);
 if(data[0]===176&&data[1]===121)self.synthesizer.controllerChange(ch,7,studioVolume(self,ch));
}
const studioBaseHandle=_A.prototype.handleMessage;
_A.prototype.handleMessage=function(message){
 if(message.type==='studioMixSnapshot'){
  if(message.generation!==(this.studioGeneration||0)||message.revision<=(this.studioMixRevision||0))return;
  this.studioMixRevision=message.revision;
  this.studioLevels=message.volumes;message.volumes.forEach((value,ch)=>this.synthesizer.controllerChange(ch,7,studioVolume(this,ch)));
  return;
 }
 if(message.type==='studioMixer'){
  if(Number.isFinite(message.master))this.studioMasterGain=Math.max(0,Math.min(1,message.master));
  if(Number.isInteger(message.channel)&&Number.isFinite(message.volume)){this.studioLevels??=[];this.studioLevels[message.channel]=message.volume;this.synthesizer.controllerChange(message.channel,7,studioVolume(this,message.channel))}
  return;
 }
 if(message.type==='studioTransport'){
  if(message.data.generation<=(this.studioGeneration||0))return;
  this.studioGeneration=message.data.generation;this.studioTransport=null;this.synthesizer.stopAll(true);
  this.studioLevels=message.data.volumes||[];this.studioBaseVolumes=message.data.baseVolumes||[...this.studioLevels];this.studioFileVolumes=[...this.studioBaseVolumes];this.studioMixRevision=0;message.data.volumes?.forEach((value,ch)=>this.synthesizer.controllerChange(ch,7,Math.round(Math.max(0,Math.min(1,value))*127)));
  this.studioTransport={...message.data,index:0};return;
 }
 if(message.type==='studioTransportTempo'){
  const t=this.studioTransport,{ratio,pivot}=message;
  if(!t||message.generation!==this.studioGeneration||!Number.isFinite(ratio)||ratio<=0)return;
  const scale=events=>events.map(e=>({...e,at:e.at/ratio,...(e.on?{dur:e.dur/ratio}:{})}));
  t.origin=pivot-(pivot-t.origin)/ratio;t.duration/=ratio;t.events=scale(t.events);t.loopEvents=scale(t.loopEvents||[]);return;
 }
 if(message.type==='studioTransportStop'){
  if(message.generation>=(this.studioGeneration||0)){this.studioGeneration=message.generation;this.studioTransport=null;this.synthesizer.stopAll(true)}
  if(message.ack){message.ack.postMessage(message.generation);message.ack.close()}return;
 }
 if(message.type==='studioTransportLoop'){
  if(this.studioTransport)this.studioTransport.loop=message.data;return;
 }
 return studioBaseHandle.call(this,message);
};
const studioBaseProcess=_A.prototype.process;
_A.prototype.process=function(inputs,outputs){
 const t=this.studioTransport;
 if(t){
  const now=currentTime;
  // Drain the previous cycle (including Note Off at its boundary) before looping.
  const dispatch=()=>{while(t.index<t.events.length&&t.origin+t.events[t.index].at<=now){
   const e=t.events[t.index++];if(e.data)studioMessage(this,e);else if(e.on)this.synthesizer.noteOn(e.ch,e.p,e.v);else this.synthesizer.noteOff(e.ch,e.p);
  }};
  dispatch();
  if(now>=t.origin+t.duration){
   if(t.loop){this.synthesizer.stopAll(true);t.origin+=t.duration;t.events=t.loopEvents||t.events;t.index=0;dispatch()}
   else this.studioTransport=null;
  }
 }
 const result=studioBaseProcess.call(this,inputs,outputs);
 const gain=this.studioMasterGain??1;
 for(const output of outputs)for(const channel of output)for(let i=0;i<channel.length;i++)channel[i]*=gain;
 return result;
};
