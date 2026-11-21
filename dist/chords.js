// Automatic chord labels derived from sounding MIDI notes; no modification to source notes.
(()=>{
 const sharp=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 const flat=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
 const forms=[
  {suffix:'',degrees:[0,4,7],bias:.16},{suffix:'m',degrees:[0,3,7],bias:.16},
  {suffix:'dim',degrees:[0,3,6],bias:0},{suffix:'aug',degrees:[0,4,8],bias:-.05},
  {suffix:'sus2',degrees:[0,2,7],bias:-.12},{suffix:'sus4',degrees:[0,5,7],bias:-.12},
  {suffix:'7',degrees:[0,4,7,10],bias:.04},{suffix:'maj7',degrees:[0,4,7,11],bias:0},
  {suffix:'m7',degrees:[0,3,7,10],bias:.04},{suffix:'m7♭5',degrees:[0,3,6,10],bias:-.04},
  {suffix:'dim7',degrees:[0,3,6,9],bias:-.12}
 ];
 const pc=p=>((p%12)+12)%12;
 function detect(tracks,start,end,preferFlats=false){
  const weights=Array(12).fill(0),bass=new Map(),span=end-start;
  if(!(span>0))return null;
  for(const t of tracks||[]){
   if(t.ch%16===9)continue; // GM channel 10 drums
   for(const n of t.notes||[]){
    if(!Number.isFinite(n.p)||!Number.isFinite(n.s)||!Number.isFinite(n.d))continue;
    const overlap=Math.min(n.s+n.d,end)-Math.max(n.s,start);
    if(overlap<=0)continue;
    // Long held notes receive more weight; short passing tones receive less.
    const weight=Math.min(overlap/span,1)*Math.max(.25,Math.min(1,(n.v||90)/100));
    weights[pc(n.p)]+=weight;
    if(n.p<60)bass.set(n.p,(bass.get(n.p)||0)+weight);
   }
  }
  const total=weights.reduce((a,b)=>a+b,0),active=weights.filter(w=>w>total*.075).length;
  if(total<.35||active<3)return null;
  const bassPitch=[...bass].sort((a,b)=>b[1]-a[1])[0]?.[0];
  let best=null;
  for(let root=0;root<12;root++)for(const form of forms){
   const set=new Set(form.degrees.map(d=>(root+d)%12));
   const inside=weights.reduce((sum,w,p)=>sum+(set.has(p)?w:0),0);
   const coverage=inside/total;
   const support=form.degrees.filter(d=>weights[(root+d)%12]>total*.055).length;
   if(support<form.degrees.length)continue;
   const rootWeight=weights[root]/total;
   const bassMatch=bassPitch!==undefined&&pc(bassPitch)===root;
   const score=coverage*2+rootWeight*.3+(bassMatch?.15:0)+form.bias;
   if(!best||score>best.score)best={root,form,coverage,score};
  }
  if(!best||best.coverage<.69)return null;
  const names=preferFlats?flat:sharp;
  return {name:names[best.root]+best.form.suffix,confidence:best.coverage};
 }
 function analyze(project,startBar,endBar){
  if(!project||!window.MidiMeter)return [];
  const results=[];
  const sf=project.key?.sf||0,flats=sf<0;
  for(let bar=startBar;bar<endBar;bar++){
   const start=MidiMeter.barStart(project.timeSignatures,bar),end=MidiMeter.barStart(project.timeSignatures,bar+1);
   const match=detect(project.tracks,start,end,flats);
   if(match)results.push({s:start,end,bar,name:match.name,confidence:match.confidence});
  }
  return results;
 }
 window.StudioChords={detect,analyze};
})();
