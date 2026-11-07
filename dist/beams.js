window.StaffBeams={
 levels(duration){return duration>=1?0:duration>=.5?1:duration>=.25?2:3},
 groups(notes,start,end,meters){
  const buckets=new Map();notes.forEach((n,i)=>{if(n.s<start||n.s>=end)return;const key=(n.p>=60?'T':'B')+':'+(window.MidiMeter?window.MidiMeter.group(meters,n.s):Math.floor(n.s+1e-7));if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({n,i})});
  const groups=[];
  for(const entries of buckets.values()){
   entries.sort((a,b)=>a.n.s-b.n.s||a.n.p-b.n.p);let run=[];
   const flush=()=>{if(run.length>1)groups.push(run);run=[]};
   // Simultaneous notes share an onset/stem within a chord.
   const onsets=[];for(const entry of entries){const last=onsets.at(-1);if(last&&Math.abs(last.s-entry.n.s)<1e-6)last.notes.push(entry);else onsets.push({s:entry.n.s,notes:[entry]})}
   for(const onset of onsets){const d=Math.max(...onset.notes.map(e=>e.n.d));if(d>=1){flush();continue}
    const previous=run.at(-1);if(previous&&onset.s-previous.s>previous.d+.15)flush();
    run.push({...onset,d,levels:this.levels(d)});
   }flush();
  }return groups;
 },
 apply(svg,notes,start,end,meters){
  const ns='http://www.w3.org/2000/svg';
  for(const group of this.groups(notes,start,end,meters)){
   const stems=[];
   for(const onset of group){
    const heads=onset.notes.map(({i})=>svg.querySelector(`.staffNoteGroup[data-note-index="${i}"]`)).filter(Boolean);
    if(!heads.length)continue;
    const ellipses=heads.map(g=>g.querySelector('.scoreNote'));
    stems.push({...onset,heads,x:Number(ellipses[0].getAttribute('cx'))+6,y:Math.min(...ellipses.map(e=>Number(e.getAttribute('cy'))))});
   }
   if(stems.length<2)continue;
   const first=stems[0],last=stems.at(-1),slope=Math.max(-.15,Math.min(.15,(last.y-first.y)/(last.x-first.x))),intercept=Math.min(...stems.map(s=>s.y-30-slope*(s.x-first.x)));
   const beamY=x=>intercept+slope*(x-first.x);
   const layer=document.createElementNS(ns,'g');layer.classList.add('noteBeams');layer.setAttribute('pointer-events','none');
   const beam=(x1,x2,level)=>{const y1=beamY(x1)+level*7,y2=beamY(x2)+level*7;const p=document.createElementNS(ns,'path');p.setAttribute('d',`M${x1} ${y1}L${x2} ${y2}L${x2} ${y2+4}L${x1} ${y1+4}Z`);p.setAttribute('fill','#111');p.setAttribute('stroke','none');layer.append(p)};
   for(const stem of stems)for(const head of stem.heads){
    head.querySelectorAll('path').forEach(p=>p.remove());
    head.querySelectorAll('line').forEach(line=>{if(line.getAttribute('x1')===line.getAttribute('x2'))line.setAttribute('y2',beamY(stem.x)+2)});
   }
   beam(first.x,last.x,0);
   for(let level=1;level<=2;level++)for(let i=0;i<stems.length;i++){
    const s=stems[i];if(s.levels<=level)continue;const prev=stems[i-1],next=stems[i+1];
    if(next&&next.levels>level)beam(s.x,next.x,level);
    else if(!prev||prev.levels<=level){const target=next?s.x+Math.min(10,(next.x-s.x)/2):s.x-Math.min(10,(s.x-prev.x)/2);beam(Math.min(s.x,target),Math.max(s.x,target),level)}
   }
   svg.append(layer);
  }
 }
};
