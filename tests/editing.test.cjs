const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/app.js','utf8');
const handler=source.slice(source.indexOf('el.onpointerdown=e=>'),source.indexOf(";$('notes').append(el)"));
const elements={snap:{value:'.25'}},n={p:60,s:.125,d:.125,v:90};let saved=0,paused=0;
const el={style:{},getBoundingClientRect:()=>({left:100,width:6}),setPointerCapture(){},hasPointerCapture:()=>false};
const box={document:{querySelectorAll:()=>[]},track:()=>({notes:[n]}),n,el,rollGesture:null,mode:'select',history:[],zoom:48,chosen:null,$:id=>elements[id],focusNoteEditor(){},pause(){paused++},checkpoint(){box.history.push(JSON.stringify(n))},properties(){},audition(){},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),StaffEditor:{snap:(v,g)=>Math.max(0,Math.round(v/g)*g)},changed(){saved++}};
vm.createContext(box);vm.runInContext(source.slice(source.indexOf('let selectedNotes='),source.indexOf('\n',source.indexOf('function moveGroup('))),box);vm.runInContext(handler,box);
vm.runInContext(source.slice(source.indexOf('function finishRollGesture('),source.indexOf("$('grid').onpointerdown=")),box);
const down=(x=101)=>el.onpointerdown({button:0,clientX:x,clientY:100,pointerId:1,preventDefault(){},stopPropagation(){}});
down();assert(!box.rollGesture.resize,'short note body remains movable');el.onpointermove({clientX:101,clientY:82,pointerId:1});assert.equal(n.s,.125);assert.equal(n.p,61);el.onpointercancel();assert.deepEqual(n,{p:60,s:.125,d:.125,v:90});assert.equal(box.history.length,0);
down();el.onpointerup();assert.equal(box.history.length,0,'click does not create undo record');
down(105.5);assert(box.rollGesture.resize);el.onpointermove({clientX:129.5,clientY:100,pointerId:1});el.onpointerup();assert.equal(n.d,.75);assert.equal(box.history.length,1);assert(paused>=3);
// Staff vertical-only move preserves original off-grid start; cancellation restores data and undo.
const staffMove=source.slice(source.indexOf("$('scoreView').onpointermove="),source.indexOf('\nfunction finishStaffGesture'));
const staffFinish=source.slice(source.indexOf('function finishStaffGesture('),source.indexOf("$('scoreView').onpointerup="));
const note={p:65,s:.125,d:.125,v:90};box.staffGesture={items:[{n:note,original:{...note}}],n:note,original:{...note},startPoint:{x:10,y:10},noteY:90,svg:{},group:{setAttribute(){},classList:{toggle(){}},querySelector(){return {}}},originalX:10,grid:.25,base:0,entries:[],key:{sf:0},historyDepth:box.history.length};
Object.assign(box,{staffPoint:()=>({x:10,y:0}),ScoreTimeline:{keyAt:k=>k,x:s=>s,beatAt:x=>x},StaffEditor:{...box.StaffEditor,pitchAt:()=>67,yFor:()=>80},staffInputAt(){return {p:67}},startHeldNote(){},stopHeldNote(){},showStaffSelection(){},nn:()=>'',staffEdit:true});elements.scoreView={};elements.noteInfo={};elements.staffAccidental={value:'key'};vm.runInContext(staffMove+staffFinish,box);elements.scoreView.onpointermove({});assert.equal(note.s,.125);assert.equal(note.p,67);vm.runInContext('finishStaffGesture(true)',box);assert.equal(note.p,65);assert.equal(note.s,.125);assert.equal(box.history.length,1);
console.log('PASS: short-note move/resize; vertical off-grid preservation; click undo; cancel restores data/history; staff cancellation');
