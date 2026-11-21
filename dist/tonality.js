// Pitch-class key estimation (Krumhansl-Schmuckler profiles).
// MIDI's key signature and the most readable accidental spelling are distinct concepts.
(()=>{
 const major=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
 const minor=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
 const majorRoots=[11,6,1,8,3,10,5,0,7,2,9,4,11,6,1];
 const minorRoots=[8,3,10,5,0,7,2,9,4,11,6,1,8,3,10];
 function weights(tracks){
  const bins=Array(12).fill(0);
  for(const t of tracks||[]){
   if(t.ch%16===9)continue;
   for(const n of t.notes||[]){
    if(!Number.isInteger(n.p)||!Number.isFinite(n.d)||n.d<=0)continue;
    bins[n.p%12]+=Math.min(n.d,16)*Math.max(.1,Math.min(1,(n.v??90)/100));
   }
  }
  return bins;
 }
 function correlation(a,b,root){
  const meanA=a.reduce((s,v)=>s+v,0)/12,meanB=b.reduce((s,v)=>s+v,0)/12;
  let top=0,aa=0,bb=0;
  for(let i=0;i<12;i++){
   const x=a[i]-meanA,y=b[(i-root+12)%12]-meanB;
   top+=x*y;aa+=x*x;bb+=y*y;
  }
  return aa>0&&bb>0?top/Math.sqrt(aa*bb):0;
 }
 function estimate(tracks,preferred={sf:0,minor:0}){
  const bins=weights(tracks),sum=bins.reduce((s,v)=>s+v,0);
  if(sum<=0)return{key:{...preferred},score:0,margin:0,confidence:0,ambiguous:true,alternatives:[],bins};
  const candidates=[];
  for(let sf=-7;sf<=7;sf++)for(let mode=0;mode<2;mode++){
   const root=(mode?minorRoots:majorRoots)[sf+7];
   const value=correlation(bins,mode?minor:major,root);
   candidates.push({sf,minor:mode,root,score:value});
  }
  candidates.sort((a,b)=>b.score-a.score||Math.abs(a.sf)-Math.abs(b.sf)||(a.sf===preferred.sf?-1:b.sf===preferred.sf?1:0));
  // Relative and enharmonic candidates may have identical profiles.
  const distinct=candidates.filter((c,i,all)=>all.findIndex(x=>x.root===c.root&&x.minor===c.minor)===i);
  const best=distinct[0],runner=distinct[1];
  const confidence=Math.max(0,Math.min(1,(best.score+1)/2));
  return{key:{sf:best.sf,minor:best.minor},score:best.score,margin:best.score-(runner?.score??0),confidence,ambiguous:best.score<.45||best.score-(runner?.score??0)<.07,alternatives:distinct.slice(0,3),bins};
 }
 window.StudioTonality={estimate,weights,correlation};
})();
