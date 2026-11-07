(()=>{
 const sharpLetters=[3,0,4,1,5,2,6],flatLetters=[6,2,5,1,4,0,3];
 function normalize(changes=[]){const map=new Map();for(const c of changes)if(c.s>0)map.set(c.s,{s:c.s,sf:c.sf,minor:c.minor||0});return [...map.values()].sort((a,b)=>a.s-b.s)}
 function keyAt(first,changes,beat){let key=first;for(const c of changes){if(c.s>beat)break;key=c}return key}
 function symbols(old,key){const a=StaffNotation.alterations(old.sf),b=StaffNotation.alterations(key.sf),oldOrder=old.sf<0?flatLetters:sharpLetters,cancel=oldOrder.slice(0,Math.abs(old.sf)).map((letter,i)=>({letter,i})).filter(x=>a[x.letter]!==b[x.letter]).map(x=>({kind:'natural',sign:Math.sign(old.sf),i:x.i})),next=Array.from({length:Math.abs(key.sf)},(_,i)=>({kind:key.sf<0?'flat':'sharp',sign:Math.sign(key.sf),i}));return [...cancel,...next]}
 function entries(first,changes){let previous=first;return changes.map(c=>{const glyphs=symbols(previous,c),width=glyphs.length*12+26;previous=c;return{...c,glyphs,width}})}
 function x(beat,base,entries){return base+beat*60+entries.reduce((v,c)=>v+(c.s<=beat?c.width:0),0)}
 function beatAt(px,base,entries){let start=0,shift=0;for(const c of entries){const boundary=base+c.s*60+shift;if(px<boundary)return Math.max(start,(px-base-shift)/60);if(px<boundary+c.width)return c.s;start=c.s;shift+=c.width}return Math.max(start,(px-base-shift)/60)}
 window.ScoreTimeline={normalize,keyAt,symbols,entries,x,beatAt};
})();
