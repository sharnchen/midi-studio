(()=>{
 const natural=[0,2,4,5,7,9,11];
 function noteAt(y,key,accidental='key',context={}){
  const upper=y<145,bottom=upper?94:204,base=upper?37:25,step=base+Math.round((bottom-y)/5),letter=((step%7)+7)%7,octave=Math.floor(step/7);
  let alter=StaffNotation.alterations(key.sf)[letter];
  if(accidental==='key'&&context.notes){const at=context.s||0,changes=context.changes||[],lastChange=changes.filter(c=>c.s<=at).at(-1)?.s||0;
   const previous=context.notes.filter(n=>n!==context.exclude&&n.s<at&&n.s>=Math.max((window.MidiMeter?window.MidiMeter.barAt(context.timeSignatures,at).start:Math.floor(at/4)*4),lastChange)&&(StaffNotation.spellNote(n,key.sf).upper??(n.p>=60))===upper).sort((a,b)=>a.s-b.s);
   for(const n of previous){const spelling=StaffNotation.spellNote(n,key.sf);if(spelling.step===step)alter=spelling.accidental}
  }else if(accidental!=='key')alter=Number(accidental);
  const raw=octave*12+natural[letter]+alter,p=Math.max(0,Math.min(127,raw));return p===raw?{p,spelling:{step,accidental:alter,upper}}:{p};
 }
 function pitchAt(y,key,accidental='key',context){return noteAt(y,key,accidental,context).p}
 function yFor(p,key,spelling){const info=StaffNotation.spellNote({p,spelling},key.sf),upper=info.upper??(p>=60),bottom=upper?94:204,base=upper?37:25;return bottom-(info.step-base)*5}
 function semitone(n,delta,key){const p=Math.max(0,Math.min(127,n.p+Math.round(delta))),info=StaffNotation.spell(p,key.sf),old=StaffNotation.spellNote(n,key.sf);return{p,spelling:{step:info.step,accidental:info.accidental,upper:old.upper??(n.p>=60)}}}
 function snap(value,grid){return Math.max(0,Math.round(value/grid)*grid)}
 window.StaffEditor={pitchAt,noteAt,yFor,semitone,snap};
})();
