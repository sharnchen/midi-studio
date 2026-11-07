window.MidiMeter=(()=>{
 const empty=[],cache=new WeakMap();
 function normalize(rows=[]){const map=new Map([[0,{s:0,numerator:4,denominator:4,clocks:24,thirtyseconds:8}]]);for(const row of rows)map.set(row.s,{...row});return [...map.values()].sort((a,b)=>a.s-b.s)}
 function compile(rows){rows=rows||empty;if(cache.has(rows))return cache.get(rows);const list=normalize(rows);let index=0;list.forEach((row,i)=>{if(i){const prev=list[i-1];index+=Math.ceil((row.s-prev.s)/prev.length-1e-9)}row.index=index;row.length=row.numerator*4/row.denominator});cache.set(rows,list);return list}
 function barAt(rows,beat){const list=compile(rows);let i=0;while(i+1<list.length&&list[i+1].s<=beat+1e-9)i++;const meter=list[i],offset=Math.max(0,Math.floor((beat-meter.s)/meter.length+1e-9)),start=meter.s+offset*meter.length;return{index:meter.index+offset,start,end:Math.min(start+meter.length,list[i+1]?.s??Infinity),meter}}
 function barStart(rows,index){const list=compile(rows);let i=0;while(i+1<list.length&&list[i+1].index<=index)i++;return list[i].s+Math.max(0,index-list[i].index)*list[i].length}
 function roundEnd(rows,beat){const bar=barAt(rows,Math.max(0,beat-1e-7));return bar.end}
 function group(rows,beat){const bar=barAt(rows,beat),m=bar.meter,unit=4/m.denominator,size=m.denominator===8&&m.numerator>3&&m.numerator%3===0?unit*3:unit;return bar.index+':'+Math.floor((beat-bar.start+1e-7)/size)}
 return{normalize,barAt,barStart,roundEnd,group};
})();
