// Bound rendered music to 32 measures without deleting or trimming the song.
window.ScoreWindow=(()=>{
 let page=0,owner=null;const size=32;
 function range(project,end){if(owner!==project){owner=project;page=0}const total=MidiMeter.barAt(project.timeSignatures,Math.max(0,end-1e-7)).index+1,pages=Math.max(1,Math.ceil(total/size));page=Math.max(0,Math.min(pages-1,page));const first=page*size,last=Math.min(total,first+size);return{first,last,total,page,pages,start:MidiMeter.barStart(project.timeSignatures,first),end:MidiMeter.barStart(project.timeSignatures,last)}}
 function select(project,end,next){range(project,end);page=next;return range(project,end)}
 function follow(project,end,beat){const r=range(project,end),next=Math.floor(MidiMeter.barAt(project.timeSignatures,beat).index/size);if(next===r.page)return false;select(project,end,next);return true}
 function warning(project){const ends=project.tracks.map(t=>Math.max(0,...t.notes.map(n=>n.s+n.d))),ordered=[...ends].filter(n=>n>0).sort((a,b)=>a-b),median=ordered[Math.floor(ordered.length/2)]||0;return ends.map((end,i)=>({end,i})).filter(x=>median>0&&x.end>median*4&&x.end-median>256).map(x=>'音軌 '+(x.i+1)+' 延伸至第 '+(MidiMeter.barAt(project.timeSignatures,Math.max(0,x.end-1e-7)).index+1)+' 小節').join('；')}
 return{range,select,follow,warning};
})();
