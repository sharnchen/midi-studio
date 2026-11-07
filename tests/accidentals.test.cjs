const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const b={window:{}};vm.createContext(b);vm.runInContext(fs.readFileSync('dist/notation.js','utf8'),b);b.StaffNotation=b.window.StaffNotation;vm.runInContext(fs.readFileSync('dist/staff-editor.js','utf8'),b);const N=b.StaffNotation,E=b.window.StaffEditor;
for(let sf=-7;sf<=7;sf++)for(let p=24;p<=108;p++){const x=N.spell(p,sf),y=E.yFor(p,{sf});assert.equal(E.pitchAt(y,{sf},String(x.accidental)),p)}
const key={sf:0},fSharp={...E.noteAt(94,key,'1'),s:0,d:1,v:90};assert.equal(fSharp.p,65); // E#4, explicit spelling retained
assert.equal(N.layout([fSharp],key)[0].glyph,'♯');assert.equal(N.layout([fSharp],key)[0].letter,2);
assert.equal(E.noteAt(94,key,'key',{s:1,notes:[fSharp]}).p,65);assert.equal(E.noteAt(94,key,'key',{s:4,notes:[fSharp]}).p,64);
assert.equal(E.noteAt(94,key,'0',{s:1,notes:[fSharp]}).p,64);
assert.equal(E.noteAt(94,key,'key',{s:2,notes:[fSharp],changes:[{s:2,sf:0}]}).p,64);
const flat={...E.noteAt(89,key,'-1'),s:0};assert.equal(flat.p,64);assert.equal(N.layout([flat],key)[0].glyph,'♭');assert.equal(N.layout([flat],key)[0].letter,3);
const cb=E.noteAt(104,key,'-1');assert.equal(cb.p,59);assert.equal(E.yFor(cb.p,key,cb.spelling),104);assert.equal(N.layout([{...cb,s:0}],key)[0].upper,true);
console.log('PASS: all 15 keys pitch roundtrip; explicit sharp/flat/natural; same-measure carry, bar and modulation reset; enharmonic staff preservation');
for(let sf=-7;sf<=7;sf++)for(let p=0;p<128;p++)for(const delta of [-1,1]){const n={p},out=E.semitone(n,delta,{sf}),expected=Math.max(0,Math.min(127,p+delta));assert.equal(out.p,expected);const spelled=N.spellNote(out,sf),natural=[0,2,4,5,7,9,11];assert.equal((spelled.octave+1)*12+natural[spelled.letter]+spelled.accidental,expected);assert.equal(E.semitone(out,-delta,{sf}).p,p===0&&delta<0?1:p===127&&delta>0?126:p)}
assert.equal(N.noteName({p:61,spelling:{step:36,accidental:-1}},0),'D♭4');
console.log('PASS: all 128 MIDI pitches × 15 keys × both semitone directions; bounds; spelling equals sounding pitch; flat note name');
