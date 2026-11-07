// Channel messages retain their original 14-bit bend bytes and RPN/NRPN ordering.
window.MidiEvents={
 schedule(project,from,seconds){
  const result=[],start=seconds(from),parameters=new Set([0,32,6,38,96,97,98,99,100,101,121]);
  project.tracks.forEach((t,ch)=>{
   const source=t.sourceChannel??t.ch,first=Math.min(Infinity,...t.notes.map(n=>n.s)),prior=[],last=new Map();
   const emit=(data,at,priority)=>result.push({ch,data:[...data],at,priority});
   for(const data of [[176,121,0],[192,t.ch===9?0:t.program],[176,7,Math.round((t.initialVolume??t.vol)*127)],[176,11,127],[176,10,64],[176,101,0],[176,100,0],[176,6,2],[176,38,0],[176,100,1],[176,6,64],[176,38,0],[176,100,2],[176,6,64],[176,38,0],[176,101,127],[176,100,127],[224,0,64]])emit(data,start,-2);
   for(const e of project.channelEvents||[]){if(e.ch!==source)continue;
    if(e.data[0]===192&&e.s<=first)continue; // UI initial patch is authoritative.
    if(e.s>=from){emit(e.data,seconds(e.s),0);continue}
    if(e.data[0]===176&&parameters.has(e.data[1])){if(e.data[1]===121)last.clear();prior.push(e)}
    else last.set(e.data[0]+':'+([160,176].includes(e.data[0])?e.data[1]:0),e);
   }
   for(const e of [...prior,...last.values()].sort((a,b)=>a.s-b.s||a.order-b.order))emit(e.data,start,-1);
  });return result;
 }
};
