// MIDI tempo events use microseconds per quarter note, independently of meter.
window.MidiTempo={
 normalize(events){const map=new Map();for(const e of events||[])if(Number.isFinite(e.s)&&e.s>=0&&Number.isFinite(e.bpm)&&e.bpm>0)map.set(e.s,{s:e.s,bpm:e.bpm});return [...map.values()].sort((a,b)=>a.s-b.s)},
 compile(bpm,events){let seconds=0;const rows=[{s:0,bpm,seconds:0}];for(const e of this.normalize(events)){if(e.s===0){rows[0].bpm=e.bpm;continue}const prev=rows.at(-1);seconds=prev.seconds+(e.s-prev.s)*60/prev.bpm;rows.push({...e,seconds})}return rows},
 seconds(rows,beat){let row=rows[0];for(const e of rows){if(e.s>beat)break;row=e}return row.seconds+(beat-row.s)*60/row.bpm},
 beat(rows,seconds){let row=rows[0];for(const e of rows){if(e.seconds>seconds)break;row=e}return row.s+(seconds-row.seconds)*row.bpm/60}
};
