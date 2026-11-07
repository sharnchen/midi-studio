const $=id=>document.getElementById(id),colors=['#62dec1','#78a9f5','#c49bf5','#f1bc73','#f17d9c','#8fd68a'],patches=[[0,"Acoustic Grand Piano"],[1,"Bright Acoustic Piano"],[2,"Electric Grand Piano"],[3,"Honky-tonk Piano"],[4,"Electric Piano 1"],[5,"Electric Piano 2"],[6,"Harpsichord"],[7,"Clavinet"],[8,"Celesta"],[9,"Glockenspiel"],[10,"Music Box"],[11,"Vibraphone"],[12,"Marimba"],[13,"Xylophone"],[14,"Tubular Bells"],[15,"Dulcimer"],[16,"Drawbar Organ"],[17,"Percussive Organ"],[18,"Rock Organ"],[19,"Church Organ"],[20,"Reed Organ"],[21,"Accordion"],[22,"Harmonica"],[23,"Tango Accordion"],[24,"Acoustic Guitar (nylon)"],[25,"Acoustic Guitar (steel)"],[26,"Electric Guitar (jazz)"],[27,"Electric Guitar (clean)"],[28,"Electric Guitar (muted)"],[29,"Overdriven Guitar"],[30,"Distortion Guitar"],[31,"Guitar Harmonics"],[32,"Acoustic Bass"],[33,"Electric Bass (finger)"],[34,"Electric Bass (pick)"],[35,"Fretless Bass"],[36,"Slap Bass 1"],[37,"Slap Bass 2"],[38,"Synth Bass 1"],[39,"Synth Bass 2"],[40,"Violin"],[41,"Viola"],[42,"Cello"],[43,"Contrabass"],[44,"Tremolo Strings"],[45,"Pizzicato Strings"],[46,"Orchestral Harp"],[47,"Timpani"],[48,"String Ensemble 1"],[49,"String Ensemble 2"],[50,"SynthStrings 1"],[51,"SynthStrings 2"],[52,"Choir Aahs"],[53,"Voice Oohs"],[54,"Synth Voice"],[55,"Orchestra Hit"],[56,"Trumpet"],[57,"Trombone"],[58,"Tuba"],[59,"Muted Trumpet"],[60,"French Horn"],[61,"Brass Section"],[62,"SynthBrass 1"],[63,"SynthBrass 2"],[64,"Soprano Sax"],[65,"Alto Sax"],[66,"Tenor Sax"],[67,"Baritone Sax"],[68,"Oboe"],[69,"English Horn"],[70,"Bassoon"],[71,"Clarinet"],[72,"Piccolo"],[73,"Flute"],[74,"Recorder"],[75,"Pan Flute"],[76,"Blown Bottle"],[77,"Shakuhachi"],[78,"Whistle"],[79,"Ocarina"],[80,"Lead 1 (square)"],[81,"Lead 2 (sawtooth)"],[82,"Lead 3 (calliope)"],[83,"Lead 4 (chiff)"],[84,"Lead 5 (charang)"],[85,"Lead 6 (voice)"],[86,"Lead 7 (fifths)"],[87,"Lead 8 (bass + lead)"],[88,"Pad 1 (new age)"],[89,"Pad 2 (warm)"],[90,"Pad 3 (polysynth)"],[91,"Pad 4 (choir)"],[92,"Pad 5 (bowed)"],[93,"Pad 6 (metallic)"],[94,"Pad 7 (halo)"],[95,"Pad 8 (sweep)"],[96,"FX 1 (rain)"],[97,"FX 2 (soundtrack)"],[98,"FX 3 (crystal)"],[99,"FX 4 (atmosphere)"],[100,"FX 5 (brightness)"],[101,"FX 6 (goblins)"],[102,"FX 7 (echoes)"],[103,"FX 8 (sci-fi)"],[104,"Sitar"],[105,"Banjo"],[106,"Shamisen"],[107,"Koto"],[108,"Kalimba"],[109,"Bag Pipe"],[110,"Fiddle"],[111,"Shanai"],[112,"Tinkle Bell"],[113,"Agogo"],[114,"Steel Drums"],[115,"Woodblock"],[116,"Taiko Drum"],[117,"Melodic Tom"],[118,"Synth Drum"],[119,"Reverse Cymbal"],[120,"Guitar Fret Noise"],[121,"Breath Noise"],[122,"Seashore"],[123,"Bird Tweet"],[124,"Telephone Ring"],[125,"Helicopter"],[126,"Applause"],[127,"Gunshot"]];let project,active=0,chosen=null,mode='draw',zoom=48,history=[],playing=false,beat=0,origin=0,ctx,master,trackBuses=new Map(),nodes=[],scheduled=new Set(),raf,lastSave,heldVoice=null,heldToken=0,playToken=0,autoKeyCache=null,staffEdit=false,staffTool='select',staffGesture=null,rollGesture=null;
function editingScoreView(){return staffEdit||StudioLyrics.isEditing()}
let selectedNotes=new Set();
function selectedGroup(){if(!chosen){selectedNotes.clear();return []}if(!selectedNotes.has(chosen))selectedNotes.clear();const valid=new Set(track().notes);selectedNotes=new Set([...selectedNotes].filter(n=>valid.has(n)));selectedNotes.add(chosen);return [...selectedNotes]}
function chooseNote(n,event){
 if(event.ctrlKey||event.metaKey){if(selectedNotes.has(n)){selectedNotes.delete(n);chosen=[...selectedNotes].at(-1)||null}else{selectedNotes.add(n);chosen=n}showStaffSelection();document.querySelectorAll('#notes .note').forEach((el,i)=>el.classList.toggle('chosen',selectedNotes.has(track().notes[i])));return false}
 if(!selectedNotes.has(n))selectedNotes=new Set([n]);chosen=n;return true;
}
function groupSnapshot(){return selectedGroup().map(n=>({n,original:{...n}}))}
function restoreGroup(items){for(const {n,original} of items){for(const key of Object.keys(n))if(!(key in original))delete n[key];Object.assign(n,original)}}
function moveGroup(items,ds,dp){ds=Math.max(ds,-Math.min(...items.map(x=>x.original.s)));dp=clamp(dp,-Math.min(...items.map(x=>x.original.p)),127-Math.max(...items.map(x=>x.original.p)));for(const {n,original} of items){n.s=original.s+ds;n.p=original.p+dp;if(dp)delete n.spelling}return {ds,dp}}

const nn=p=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][p%12]+(Math.floor(p/12)-1),track=()=>project.tracks[active],length=()=>MidiMeter.roundEnd(project.timeSignatures,Math.max(MidiMeter.barStart(project.timeSignatures,8),0,...(project.keyChanges||[]).map(c=>c.s+4),...(project.lyrics||[]).map(e=>e.s+4),...(project.channelEvents||[]).map(e=>e.s),...project.tracks.flatMap(t=>t.notes.map(n=>n.s+n.d)))),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function makeTrack(name='新音軌',program=0,ch=0){return{name,program,ch,vol:.75,mute:false,solo:false,showInScore:true,notes:[]}}
function demo(){let a=makeTrack('01 · Midnight Keys',0,0),b=makeTrack('02 · Warm Strings',48,1),c=makeTrack('03 · Bassline',32,2),d=makeTrack('04 · Pulse Drums',0,9);for(let bar=0;bar<8;bar++){let root=[60,57,65,67][bar%4];[0,4,7,11].forEach((p,j)=>{a.notes.push({p:root+p,s:bar*4+j*.5,d:1.4,v:83-j*4});b.notes.push({p:root+p-12,s:bar*4,d:3.8,v:55})});for(let j=0;j<4;j++)c.notes.push({p:root-24,s:bar*4+j,d:.65,v:85});for(let j=0;j<8;j++)d.notes.push({p:j%4===2?38:j%4===0?36:42,s:bar*4+j*.5,d:.15,v:j%2?60:95})}return{bpm:110,tracks:[a,b,c,d]}}
function persist(){autoKeyCache=null;tempoCache=null;localStorage.setItem('midi-studio-v1',JSON.stringify(project));$('status').textContent='● 已自動儲存'}function checkpoint(){history.push(JSON.stringify(project));if(history.length>40)history.shift()}function changed(){persist();render()}function render(){StudioLyrics.render(project,beat);autoKeyCache=null;tempoCache=null;const fileName=typeof project.midiFileName==='string'?project.midiFileName:'未命名.mid';$('currentFileName').textContent=fileName;$('currentFileName').title=fileName;document.title=fileName+' — MIDI Studio';for(const [t,bus] of trackBuses){if(!project.tracks.includes(t)){bus.disconnect();trackBuses.delete(t)}}active=clamp(active,0,project.tracks.length-1);$('bpm').value=Math.round(project.bpm);$('count').textContent=String(project.tracks.length).padStart(2,'0');$('tracks').innerHTML='';$('trackPicker').replaceChildren(...project.tracks.map((t,i)=>new Option((i+1)+' · '+t.name,i)));$('trackPicker').value=String(active);project.tracks.forEach((t,i)=>{let el=document.createElement('div');el.className='track'+(i===active?' selected':'');el.innerHTML=`<div class="trackTop"><span class="trackNum">${String(i+1).padStart(2,'0')}</span><span class="trackDot" style="background:${colors[i%6]}"></span><input class="trackName" aria-label="音軌名稱"><button class="remove" title="刪除音軌">×</button></div><div class="trackControls"><button type="button" aria-pressed="${!!t.mute}" class="mute ${t.mute?'active':''}">M</button><button type="button" aria-pressed="${!!t.solo}" class="solo ${t.solo?'active':''}">S</button><input class="volume" aria-label="音軌音量" type="range" min="0" max="100" value="${t.vol*100}"><span style="font-size:9px;color:#8092ad">${t.notes.length} 音符</span></div><select class="program" aria-label="音色">${Array.from({length:128},(_,p)=>`<option value="${p}">${String(p+1).padStart(3,'0')} ${patches[p][1]}</option>`).join('')}</select> <input class="channel" aria-label="MIDI 通道" title="USB MIDI 1.0 通道 1–16；10 為 GM 鼓組" type="number" min="1" max="16" value="${t.ch+1}"><label class="scoreVisibility"><input type="checkbox" class="scoreVisible" ${t.showInScore!==false?'checked':''}> 顯示於多軌譜面</label>`;el.onclick=e=>{if(!e.target.closest('input,select,button,label')){selectTrack(i)}};el.querySelector('.scoreVisible').onchange=e=>{checkpoint();t.showInScore=e.target.checked;persist();renderScore()};el.querySelector('.trackName').value=t.name;el.querySelector('.program').value=t.program;for(let [sel,key,convert] of [['.trackName','name',v=>v],['.program','program',Number],['.channel','ch',v=>clamp(Math.round(Number(v))-1,0,15)]])el.querySelector(sel).onchange=e=>{if(key==='program'){changeTrackSource(t,convert(e.target.value));return}checkpoint();t[key]=convert(e.target.value);changed()};const channelInput=el.querySelector('.channel');let channelEditing=false;channelInput.oninput=e=>{const value=Number(e.target.value);if(e.target.value!==''&&Number.isInteger(value)&&value>=1&&value<=16){if(!channelEditing){checkpoint();channelEditing=true;pause()}t.ch=value-1;persist()}};channelInput.onchange=e=>{if(!channelEditing){checkpoint();pause()}channelEditing=false;t.ch=clamp(Math.round(Number(e.target.value)||1)-1,0,15);changed()};const volume=el.querySelector('.volume');volume.title='即時音量 '+Math.round(t.vol*100)+'%';let volumeEditing=false;volume.oninput=e=>{if(!volumeEditing){checkpoint();volumeEditing=true}t.vol=clamp(Number(e.target.value)/100,0,1);volume.title='即時音量 '+Math.round(t.vol*100)+'%';updateTrackVolume(t);$('status').textContent='● '+t.name+' · 音量 '+Math.round(t.vol*100)+'%'};volume.onchange=()=>{volumeEditing=false;persist()};for(let key of ['mute','solo'])el.querySelector('.'+key).onclick=e=>{e.stopPropagation();toggleTrackMix(t,key)};el.querySelector('.remove').onclick=()=>{if(project.tracks.length===1)return;checkpoint();project.tracks.splice(i,1);chosen=null;changed()};$('tracks').append(el)});$('trackTitle').textContent=track().name;$('arrangement').style.width=length()*48+'px';$('arrangement').innerHTML='<div class="ruler">'+Array.from({length:length()/4},(_,i)=>`<span style="left:${i*192}px">${i+1}</span>`).join('')+'</div>'; $('arrangement').firstChild.onclick=e=>{seekPlayback((e.clientX-$('arrangement').getBoundingClientRect().left)/48)};project.tracks.forEach((t,i)=>{let row=document.createElement('div');row.className='arrRow';row.onclick=()=>{selectTrack(i)};if(t.notes.length){let start=Math.min(...t.notes.map(n=>n.s)),end=Math.max(...t.notes.map(n=>n.s+n.d));row.innerHTML=`<div class="clip" style="left:${start*48}px;width:${(end-start)*48}px;color:${colors[i%6]}">${t.notes.map(n=>`<i style="left:${(n.s-start)*48}px;top:${3+(127-n.p)%18}px;width:${Math.max(2,n.d*48)}px"></i>`).join('')}</div>`}$('arrangement').append(row)});renderRoll()}
function renderRoll(){selectedGroup();let grid=$('grid');grid.style.width=length()*zoom+'px';grid.style.height=128*18+'px';grid.style.setProperty('--beat',zoom+'px');$('keys').innerHTML=Array.from({length:128},(_,i)=>{let p=127-i;return `<div class="key ${[1,3,6,8,10].includes(p%12)?'black':''}" data-p="${p}">${p%12===0?nn(p):''}</div>`}).join('');$('keys').onclick=e=>{if(e.target.dataset.p)audition(+e.target.dataset.p)};$('notes').innerHTML='';track().notes.forEach(n=>{let el=document.createElement('div');el.className='note'+(selectedNotes.has(n)?' chosen':'');el.style.cssText=`left:${n.s*zoom}px;top:${(127-n.p)*18+1}px;width:${n.d*zoom}px;background:${colors[active%6]};opacity:${.45+n.v/230}`;el.textContent=n.d*zoom>30?nn(n.p):'';el.oncontextmenu=e=>{e.preventDefault();deleteEditorNote(n)};el.onpointerdown=e=>{
 if(e.button!==0)return;e.preventDefault();e.stopPropagation();pause();
 if(mode==='erase'){el.oncontextmenu(e);return}
 focusNoteEditor('rollScroll');if(!chooseNote(n,e))return;const rect=el.getBoundingClientRect();
 rollGesture={items:groupSnapshot(),n,el,pointerId:e.pointerId,x:e.clientX,y:e.clientY,original:{...n},snap:Number($('snap').value),resize:e.shiftKey||e.clientX-rect.left>rect.width-Math.min(8,rect.width*.3),moved:false,historyDepth:history.length};
 el.setPointerCapture(e.pointerId);document.querySelectorAll('#notes .note').forEach((el,i)=>el.classList.toggle('chosen',selectedNotes.has(track().notes[i])));properties();audition(n.p,n.v);
 el.onpointermove=ev=>{const g=rollGesture;if(!g||g.el!==el||ev.pointerId!==g.pointerId)return;const dx=ev.clientX-g.x,dy=ev.clientY-g.y;if(!g.moved&&Math.hypot(dx,dy)<4)return;if(!g.moved){checkpoint();g.moved=true}
 if(g.resize)n.d=Math.max(g.snap,StaffEditor.snap(g.original.d+dx/zoom,g.snap));
 else{n.s=Math.abs(dx)<3?g.original.s:StaffEditor.snap(g.original.s+dx/zoom,g.snap);n.p=clamp(g.original.p-Math.round(dy/18),0,127);moveGroup(g.items,n.s-g.original.s,n.p-g.original.p)}
 document.querySelectorAll('#notes .note').forEach((node,i)=>{const item=track().notes[i];node.style.left=item.s*zoom+'px';node.style.top=(127-item.p)*18+1+'px'});el.style.left=n.s*zoom+'px';el.style.top=(127-n.p)*18+1+'px';el.style.width=n.d*zoom+'px';properties()};
 el.onpointerup=()=>finishRollGesture();el.onpointercancel=()=>finishRollGesture(true);el.onlostpointercapture=()=>finishRollGesture(true);
};$('notes').append(el)});properties();updateCursor();renderScore();sizeEventViewport();if(playing)highlightPlayingNotes()}
function finishRollGesture(cancel=false){const g=rollGesture;if(!g)return;rollGesture=null;g.el.onpointermove=null;if(cancel){restoreGroup(g.items);Object.assign(g.n,g.original);if(!Object.prototype.hasOwnProperty.call(g.original,'spelling'))delete g.n.spelling;if(g.moved)history.length=g.historyDepth}if(g.el.hasPointerCapture(g.pointerId))g.el.releasePointerCapture(g.pointerId);if(g.moved)changed();else properties()}
$('grid').onpointerdown=e=>{if(e.target.id!=='grid'&&e.target.id!=='notes')return;chosen=null;if(mode==='draw'){pause();checkpoint();let r=$('grid').getBoundingClientRect(),snap=+$('snap').value;chosen={p:clamp(127-Math.floor((e.clientY-r.top)/18),0,127),s:Math.max(0,Math.floor((e.clientX-r.left)/zoom/snap)*snap),d:snap,v:96};track().notes.push(chosen);audition(chosen.p);changed()}else renderRoll()};
function properties(){for(let [id,key] of [['pitch','p'],['start','s'],['duration','d'],['velocity','v']]){$(id).value=chosen?chosen[key]:'';$(id).disabled=!chosen}$('deleteNote').disabled=!chosen;for(const id of ['semitoneDown','semitoneUp'])$(id).disabled=!chosen;$('noteInfo').textContent=selectedGroup().length>1?'已選取 '+selectedNotes.size+' 個音符 · 拖曳整組移動 / Delete 刪除':chosen?StaffNotation.noteName(chosen,ScoreTimeline.keyAt(scoreKey(),scoreChanges(),chosen.s).sf)+' · MIDI '+chosen.p+' · '+chosen.d+' 拍':track().notes.length+' 個音符'}for(let [id,key,min,max] of [['pitch','p',0,127],['start','s',0,100000],['duration','d',.0625,10000],['velocity','v',1,127]])$(id).onchange=e=>{if(!chosen)return;pause();checkpoint();chosen[key]=clamp(+e.target.value||min,min,max);if(key==='p'||key==='v')chosen[key]=Math.round(chosen[key]);if(key==='p')delete chosen.spelling;changed();if(key==='p')audition(chosen.p,chosen.v)};
function audio(){if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=1;GMEngine.masterVolume(+$('master').value/100);const meter=ctx.createAnalyser();meter.fftSize=256;StudioOutput.connect(ctx,master,meter);meter.connect(ctx.destination);const samples=new Float32Array(256);setInterval(()=>{meter.getFloatTimeDomainData(samples);$('gmVoices').dataset.outputPeak=String(ctx.state==='running'?Math.max(...samples.map(Math.abs)):0);$('gmVoices').dataset.audioState=ctx.state;$('gmVoices').dataset.outputConnected=String(GMEngine.outputConnected)},100)}ctx.resume()}
function trackBus(t){let bus=trackBuses.get(t);if(!bus){bus=ctx.createGain();bus.gain.value=t.vol;bus.connect(master);trackBuses.set(t,bus)}return bus}
function updateTrackVolume(t){applyTrackMix()}
function applyTrackMix(){if(USBMidi.active)USBMidi.mix(project.tracks);else GMEngine.mix(project.tracks)}
function toggleTrackMix(t,key){
 checkpoint();t[key]=!t[key];applyTrackMix();persist();
 document.querySelectorAll('.track').forEach((el,i)=>{for(const k of ['mute','solo']){const button=el.querySelector('.'+k);button.classList.toggle('active',!!project.tracks[i][k]);button.setAttribute('aria-pressed',String(!!project.tracks[i][k]))}});
 highlightPlayingNotes();
}
var sourceChanging=false;
function changeTrackSource(t,program){
 if(!project.tracks.includes(t)||USBMidi.switching)return;
 program=clamp(Math.round(Number(program)||0),0,127);if(t.program===program)return;
 checkpoint();t.program=program;updateTrackPatch(t);persist();
 $('status').textContent='● '+t.name+' · 音色已切換'+(playing?'，持續播放':'');
}
function changePlaybackTempo(value){
 const next=clamp(Math.round(Number(value)||120),4,1000),ratio=next/project.bpm;if(ratio===1)return;
 const pivot=playing?(USBMidi.active?USBMidi.playbackTime:ctx.currentTime):null;
 checkpoint();project.tempoChanges=(project.tempoChanges||[]).map(t=>({...t,bpm:t.bpm*ratio}));project.bpm=next;
 if(playing&&pivot!==null){origin=pivot-(pivot-origin)/ratio;if(USBMidi.active)USBMidi.retime(ratio,pivot);else GMEngine.retime(ratio,pivot)}
 persist();$('bpm').value=next;if(playing)tick();$('status').textContent='● BPM '+next+(playing?' · 持續播放':'');
}
function updateTrackPatch(t){if(USBMidi.active)USBMidi.patch(t);else GMEngine.patch(t,project.tracks.indexOf(t));applyTrackMix()}
function sound(t,n,when,dur){if(USBMidi.active)USBMidi.note(t,n,when,dur,ctx.currentTime);else GMEngine.note(t,project.tracks.indexOf(t),n,when,dur)}
async function prepareGm(){if(USBMidi.switching||sourceChanging)return false;try{audio();await StudioLoading.run(()=>ctx.resume(),{timeoutMs:10000,label:'音訊啟動'});if(USBMidi.active){USBMidi.describe();return true}await GMEngine.load(ctx,master,p=>{$('gmAudio').textContent=p===100?'GM 128 · 已就緒':'GM 音源載入 '+p+'%';$('gmAudio').disabled=p<100});await GMEngine.stopped();$('gmAudio').textContent='GM 128 · 已就緒';$('gmAudio').disabled=true;return true}catch(e){$('gmAudio').textContent='GM 載入失敗 · 重試';$('gmAudio').disabled=false;$('status').textContent='音源載入失敗：'+e.message;return false}}
async function audition(p,v=90){const t=track(),token=playToken;if(await prepareGm()&&token===playToken&&!USBMidi.switching){if(master)master.gain.setValueAtTime(1,ctx.currentTime);sound(t,{p,v},ctx.currentTime,.22)}}
function silence(){if(master)master.gain.setValueAtTime(0,ctx.currentTime);stopHeldNote();USBMidi.stop();GMEngine.stop();nodes.forEach(o=>{try{o.stop()}catch{}});nodes=[]}
function keyAnalysis(){if(!autoKeyCache||autoKeyCache.project!==project)autoKeyCache={project,result:StaffNotation.analyze(project.tracks,project.key,scoreChanges(),project.timeSignatures)};return autoKeyCache.result}
function scoreKey(){return project.keyMode==='manual'?(project.key||{sf:0,minor:0}):keyAnalysis().key}
function scoreChanges(){return project.keyChanges||[]}
function scoreEntries(){return ScoreTimeline.entries(scoreKey(),scoreChanges())}
function scoreX(s){return ScoreTimeline.x(s,staffOffset(),scoreEntries())}
function scoreBeatAt(x){return ScoreTimeline.beatAt(x,staffOffset(),scoreEntries())}
function staffOffset(){return 112+Math.abs(scoreKey().sf)*12}
function followPlayhead(view,x,padding=24){if(!playing||view.hidden||!view.clientWidth)return;const right=view.scrollLeft+view.clientWidth-padding;if(x>right||x<view.scrollLeft+padding)view.scrollLeft=Math.max(0,x-view.clientWidth*.25)}
function updateCursor(){StudioLyrics.update(project,beat);updateScoreProgress();$('cursor').style.left=beat*zoom+'px';document.querySelectorAll('.staffCursor').forEach(cursor=>cursor.setAttribute('transform','translate('+scoreX(beat)+' 0)'));if(!$('scorePanel').hidden)followSheetPlayhead();else followPlayhead($('rollScroll'),64+beat*zoom,80);$('position').textContent=String(MidiMeter.barAt(project.timeSignatures,beat).index+1).padStart(3,'0')+' : '+String(Math.floor((beat-MidiMeter.barAt(project.timeSignatures,beat).start)/(4/MidiMeter.barAt(project.timeSignatures,beat).meter.denominator))+1).padStart(2,'0')+' : '+String(Math.floor(beat%1*480)).padStart(3,'0')}
let schedulerTimer=null,playStartBeat=0,startingPlayback=false;
// Sound scheduling uses the audio clock; visuals follow the samples reaching output.
var tempoCache;
function tempoRows(){return tempoCache||(tempoCache=MidiTempo.compile(project.bpm,project.tempoChanges))}
function beatSeconds(b){return MidiTempo.seconds(tempoRows(),b)}
function secondsBeat(t){return MidiTempo.beat(tempoRows(),t)}
function audibleTime(){
 if(USBMidi.active)return (USBMidi.playbackTime??ctx.currentTime)-Math.max(0,Math.min(2000,Number($('midiLatency').value)||0))/1000;
 const stamp=ctx.getOutputTimestamp?.();
 if(stamp&&stamp.contextTime>0&&stamp.performanceTime>0)return Math.min(ctx.currentTime,stamp.contextTime+Math.max(0,performance.now()-stamp.performanceTime)/1000);
 return Math.max(0,ctx.currentTime-(ctx.outputLatency||0)-(ctx.baseLatency||0));
}
function highlightPlayingNotes(now=playing?audibleTime():0){
 const state=MidiMix.snapshot(project.tracks),started=playing&&(now>=origin+beatSeconds(playStartBeat)||now>=origin+beatSeconds(length()));
 document.querySelectorAll('.scoreNote').forEach(el=>{const i=Number(el.closest('svg').dataset.trackIndex),n=project.tracks[i]?.notes[Number(el.dataset.noteIndex)];el.classList.toggle('playingNote',!!(n&&started&&state.audible[i]&&beat>=n.s&&beat<n.s+n.d))});
 $('notes').querySelectorAll('.note').forEach((el,i)=>{const n=track().notes[i];el.classList.toggle('playingNote',!!(n&&started&&state.audible[active]&&beat>=n.s&&beat<n.s+n.d))});
}
function transportEvents(from=playStartBeat){
 const events=[],start=beatSeconds(from);
 project.tracks.forEach((t,ch)=>{
 for(const n of t.notes){const end=beatSeconds(n.s+n.d);if(end<=start)continue;
 events.push({at:Math.max(start,beatSeconds(n.s)),ch,p:n.p,v:n.v,dur:end-Math.max(start,beatSeconds(n.s)),on:true});
 events.push({at:end,ch,p:n.p,on:false});
 }});
 events.push(...MidiEvents.schedule(project,from,beatSeconds));return events.sort((a,b)=>a.at-b.at||(a.priority??(a.on?2:1))-(b.priority??(b.on?2:1)));
}
function schedulePlayback(){
 if(!playing)return;
 const events=transportEvents(),duration=beatSeconds(length());
 if(!USBMidi.active){GMEngine.transport(project.tracks,events,origin,duration,$('loop').classList.contains('active'),transportEvents(0));return}
 USBMidi.transport(project.tracks,events,origin,duration,$('loop').classList.contains('active'),transportEvents(0),ctx);
}
function tick(){
 if(!playing)return;
 const now=audibleTime(),elapsed=now-origin,duration=beatSeconds(length());beat=Math.max(elapsed<duration?playStartBeat:0,secondsBeat($('loop').classList.contains('active')&&elapsed>=duration?elapsed%duration:elapsed));
 if(beat>=length()){
  if($('loop').classList.contains('active')){beat=0}
  else{pause();beat=0;updateCursor();return}
 }
 updateCursor();highlightPlayingNotes(now);
}
let playbackViewGeneration=0;
function stopPlaybackView(){playbackViewGeneration++;cancelAnimationFrame(raf);raf=null}
function startPlaybackView(){
 stopPlaybackView();const generation=playbackViewGeneration;
 const frame=()=>{if(!playing||generation!==playbackViewGeneration)return;raf=requestAnimationFrame(frame);tick()};
 frame();
}
function seekPlayback(next){pause();beat=clamp(next,0,Math.max(0,length()-.001));if(ScoreWindow.follow(project,length(),beat))renderScore();updateCursor()}
function pause(){finishScrub();if(playing){const elapsed=Math.max(0,audibleTime()-origin),duration=beatSeconds(length());beat=clamp(secondsBeat($('loop').classList.contains('active')?elapsed%duration:elapsed),0,length())}playToken++;playing=false;startingPlayback=false;updateScoreProgress();stopPlaybackView();clearInterval(schedulerTimer);schedulerTimer=null;silence();highlightPlayingNotes();$('play').textContent='▶ 播放';const stoppedToken=playToken;if(ctx)GMEngine.stopped().then(()=>{if(stoppedToken===playToken&&!playing&&!startingPlayback)return ctx.suspend()}).catch(()=>{})}
async function play(){
 finishScrub(); if(USBMidi.switching||sourceChanging){$('status').textContent='● 音源切換中，請稍候';return}if(playing||startingPlayback){pause();return}if(staffEdit)setStaffEditing(false);const token=++playToken;startingPlayback=true;$('play').textContent='載入音源…';
 if(!await prepareGm()){if(token===playToken){startingPlayback=false;$('play').textContent='▶ 播放'}return}if(token!==playToken||USBMidi.switching)return;startingPlayback=false;
 if(master)master.gain.setValueAtTime(1,ctx.currentTime);playing=true;playStartBeat=beat;origin=ctx.currentTime+.12-beatSeconds(beat);scheduled.clear();
 $('play').textContent='Ⅱ 暫停';schedulePlayback();renderScore();startPlaybackView();
}
$('play').onclick=play;$('stop').onclick=()=>{pause();beat=0;updateCursor()};$('home').onclick=$('stop').onclick;$('loop').onclick=()=>{const resume=playing;if(resume)pause();$('loop').classList.toggle('active');if(resume)play()};$('master').oninput=e=>{const value=clamp(Number(e.target.value)/100,0,1);GMEngine.masterVolume(value);USBMidi.expression();$('master').title='主音量 '+Math.round(value*100)+'%';$('status').textContent='● 主音量 '+Math.round(value*100)+'%'};$('bpm').onchange=e=>changePlaybackTempo(e.target.value);$('zoom').oninput=e=>{zoom=+e.target.value;renderRoll()};for(let m of ['draw','select','erase'])$(m).onclick=()=>{mode=m;$('grid').dataset.mode=m;['draw','select','erase'].forEach(x=>$(x).classList.toggle('active',m===x))};$('undo').onclick=()=>{if(history.length){pause();const editPage=editingScoreView()?ScoreWindow.range(project,length()).page:null;project=JSON.parse(history.pop());if(editPage!==null)ScoreWindow.select(project,length(),editPage);chosen=null;changed()}};$('deleteNote').onclick=()=>deleteEditorNote(chosen);document.onkeydown=e=>{if(e.target.closest('input,select,textarea,dialog,[contenteditable=true]'))return;if(e.code==='Space'){if(e.repeat||e.target.closest('button'))return;e.preventDefault();play()}if(e.altKey&&chosen&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();transposeSelected(e.key==='ArrowUp'?1:-1);return}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();selectedNotes=new Set(track().notes);chosen=track().notes[0]||null;renderRoll();return}if(e.key==='Escape'){chosen=null;selectedNotes.clear();renderRoll();return}if(e.key==='Delete'&&chosen){e.preventDefault();deleteEditorNote(chosen)};if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();$('undo').click()}};$('add').onclick=()=>{if(project.tracks.length>=128){alert('最多支援 128 音軌');return}checkpoint();let used=project.tracks.map(t=>t.ch),ch=Array.from({length:16},(_,i)=>i).find(i=>!used.includes(i))??0;project.tracks.push(makeTrack('音軌 '+(project.tracks.length+1),0,ch));active=project.tracks.length-1;chosen=null;changed()};$('demo').onclick=()=>{if(!confirm('載入示範會取代目前專案，是否繼續？'))return;pause();checkpoint();project=demo();active=0;chosen=null;changed()};$('new').onclick=()=>{if(!confirm('清空目前專案？建議先儲存專案備份。'))return;pause();checkpoint();project={bpm:110,tracks:[makeTrack('鋼琴')]};active=0;chosen=null;beat=0;changed()};$('help').onclick=()=>$('helpDialog').showModal();function download(data,name,type){let u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}$('save').onclick=()=>download(JSON.stringify(project,null,2),'MIDI-Studio-Project.json','application/json');
function vlq(v){let a=[v&127];while(v>>=7)a.unshift((v&127)|128);return a}function u32(v){return[v>>>24&255,v>>>16&255,v>>>8&255,v&255]}function chunk(name,bytes){return[...Array.from(name,c=>c.charCodeAt(0)),...u32(bytes.length),...bytes]}function midi(){let tempo=Math.round(60000000/project.bpm),meta=[{s:0,b:[255,81,3,tempo>>16&255,tempo>>8&255,tempo&255]},{s:0,b:[255,89,2,scoreKey().sf&255,scoreKey().minor]},...scoreChanges().map(c=>({s:c.s,b:[255,89,2,c.sf&255,c.minor]}))],conductor=[],lastMeta=0;for(const meter of MidiMeter.normalize(project.timeSignatures)){meta.push({s:meter.s,b:[255,88,4,meter.numerator,Math.log2(meter.denominator),meter.clocks??24,meter.thirtyseconds??8]})}for(const lyric of project.lyrics||[]){const bytes=[...new TextEncoder().encode(lyric.text)];meta.push({s:lyric.s,b:[255,5,...vlq(bytes.length),...bytes]})}for(const t of project.tempoChanges||[]){const us=Math.max(1,Math.min(16777215,Math.round(60000000/t.bpm)));meta.push({s:t.s,b:[255,81,3,us>>16&255,us>>8&255,us&255]})}meta.sort((a,b)=>a.s-b.s);meta.forEach(e=>{const tick=Math.round(e.s*480);conductor.push(...vlq(tick-lastMeta),...e.b);lastMeta=tick});conductor.push(0,255,47,0);let tracks=[chunk('MTrk',conductor)];if(project.channelEvents?.length){let bytes=[],last=0;for(const e of project.channelEvents){const tick=Math.round(e.s*480);bytes.push(...vlq(tick-last),(e.data[0]|e.ch),...e.data.slice(1));last=tick}bytes.push(0,255,47,0);tracks.push(chunk('MTrk',bytes))}project.tracks.forEach(t=>{let ch=t.ch&15,name=[...new TextEncoder().encode(t.name)],ev=[{time:0,b:[255,3,...vlq(name.length),...name]},{time:0,b:[192|ch,t.program]},{time:0,b:[176|ch,7,Math.round(t.vol*127)]}];t.notes.forEach(n=>{ev.push({time:Math.round(n.s*480),b:[144|ch,n.p,n.v]});ev.push({time:Math.round((n.s+n.d)*480),b:[128|ch,n.p,0]})});const rank=e=>e.b[0]>>4===8?1:e.b[0]>>4===9?2:0;ev.sort((a,b)=>a.time-b.time||rank(a)-rank(b));let last=0,bytes=[];ev.forEach(e=>{bytes.push(...vlq(e.time-last),...e.b);last=e.time});bytes.push(0,255,47,0);tracks.push(chunk('MTrk',bytes))});return new Uint8Array([...chunk('MThd',[0,1,0,tracks.length,1,224]),...tracks.flat()])}$('export').onclick=()=>download(midi(),'MIDI-Studio.mid','audio/midi');
function parseMidi(buffer){let a=new Uint8Array(buffer),v=new DataView(buffer),p=0;const read=n=>{if(p+n>a.length)throw Error('MIDI 檔案不完整');let b=a.slice(p,p+n);p+=n;return b},num=n=>{let r=0;for(let b of read(n))r=r*256+b;return r},str=n=>String.fromCharCode(...read(n)),variable=()=>{let r=0,b,c=0;do{b=num(1);r=r*128+(b&127);if(++c>4)throw Error('不正確的 MIDI delta time')}while(b&128);return r};if(str(4)!=='MThd')throw Error('不是標準 MIDI 檔案');let hs=num(4),format=num(2),cnt=num(2),ppq=num(2);if(format>1||ppq&32768)throw Error('目前支援 PPQ 時基的 MIDI 格式 0 / 1');if(!ppq||hs<6)throw Error('無效 MIDI 標頭');read(hs-6);let result={bpm:120,tempoChanges:[],tracks:[],lyrics:[],channelEvents:[],timeSignatures:[],key:{sf:0,minor:0},keyChanges:[]},setups=[],keyEvents=[],gotTempo=false,gotKey=false;for(let k=0;k<cnt;k++){if(str(4)!=='MTrk')throw Error('找不到 MIDI 音軌');let size=num(4),end=p+size,time=0,running=0,port=0,name='音軌 '+(k+1),bych={},held={};if(end>a.length)throw Error('音軌資料不完整');const get=ch=>bych[ch]??(bych[ch]=makeTrack(name,0,ch));while(p<end){time+=variable();let status=num(1);if(status<128){if(!running)throw Error('無效 MIDI running status');p--;status=running}if(status===255){let type=num(1),len=variable(),data=read(len);if(type===88&&len>=4&&data[0]>0&&data[1]<=6)result.timeSignatures.push({s:time/ppq,numerator:data[0],denominator:2**data[1],clocks:data[2],thirtyseconds:data[3]});if(type===5)result.lyrics.push({s:time/ppq,text:StudioLyrics.decode(data)});if(type===33&&len===1){port=data[0];if(port)result.portsMerged=true}if(type===3){name=new TextDecoder().decode(data);Object.values(bych).forEach(t=>t.name=name)}if(type===81&&len===3){const us=data[0]*65536+data[1]*256+data[2];if(us)result.tempoChanges.push({s:time/ppq,bpm:60000000/us})}if(type===89&&len===2){const sf=data[0]>127?data[0]-256:data[0];if(sf>=-7&&sf<=7&&data[1]<=1){keyEvents.push({s:time/ppq,sf,minor:data[1]})}}if(type===47){p=end;break}continue}if(status===240||status===247){read(variable());running=0;continue}if(status>=240)throw Error('不支援的 MIDI 系統事件');running=status;let op=status>>4,ch=status&15,d1=num(1),d2=op===12||op===13?0:num(1),t=get(ch),key=ch+':'+d1;if([10,11,12,13,14].includes(op))result.channelEvents.push({s:time/ppq,ch,data:[op<<4,d1,...(op===12||op===13?[]:[d2])],order:result.channelEvents.length});if(op===12)setups.push({s:time/ppq,ch,program:d1});if(op===11&&d1===7)setups.push({s:time/ppq,ch,vol:d2/127});if(op===9&&d2){(held[key]??=[]).push({p:d1,s:time/ppq,v:d2})}if(op===8||(op===9&&!d2)){let n=held[key]?.shift();if(n){n.d=Math.max(1/ppq,time/ppq-n.s);t.notes.push(n)}}}Object.values(held).flat().forEach(n=>{let ch=+Object.keys(held).find(key=>held[key].includes(n)).split(':')[0];n.d=Math.max(.25,time/ppq-n.s);get(ch).notes.push(n)});result.tracks.push(...Object.values(bych).filter(t=>t.notes.length));p=end}setups.sort((a,b)=>a.s-b.s);for(const t of result.tracks){const first=Math.min(...t.notes.map(n=>n.s));t.program=0;t.vol=100/127;t.mute=false;t.solo=false;for(const setup of setups){if(setup.s>first)break;if(setup.ch===t.ch){if(setup.program!==undefined)t.program=setup.program;if(setup.vol!==undefined)t.vol=setup.vol}}}for(const t of result.tracks){t.sourceChannel=t.ch;t.initialVolume=t.vol}result.timeSignatures=MidiMeter.normalize(result.timeSignatures);result.lyrics=StudioLyrics.normalize(result.lyrics);result.channelEvents.sort((a,b)=>a.s-b.s||a.order-b.order);const firstNote=Math.min(...result.tracks.flatMap(t=>t.notes.map(n=>n.s)));keyEvents.sort((a,b)=>a.s-b.s);for(const event of keyEvents){if(event.s<=firstNote){result.key={sf:event.sf,minor:event.minor};gotKey=true}else result.keyChanges.push(event)}result.keyMode='auto';result.importedKey=gotKey?{...result.key}:null;result.tempoChanges=MidiTempo.normalize(result.tempoChanges);if(result.tempoChanges[0]?.s===0)result.bpm=result.tempoChanges.shift().bpm;result.keyChanges=ScoreTimeline.normalize(result.keyChanges);if(!result.tracks.length)throw Error('檔案中找不到音符');if(result.tracks.length>128)throw Error('檔案超過 128 個音軌，請先縮減音軌');return result}
function confirmImportedKey(x,ask=confirm){
 const original=x.importedKey||x.key||{sf:0,minor:0},analysis=StaffNotation.analyze(x.tracks,original,x.keyChanges||[],x.timeSignatures),before=analysis.scores.find(row=>row.sf===original.sf).count;
 x.key={...original};x.keyMode='manual';
 if(analysis.key.sf===original.sf||analysis.count>=before)return;
 const signature=key=>key.sf===0?'無升降記號':Math.abs(key.sf)+(key.sf>0?' 個升記號 ♯':' 個降記號 ♭');
 const message='此 MIDI 的原始調號可能不是最簡記譜選擇。\n\n'+(x.importedKey?'檔案調號：':'檔案未指定調號，預設：')+signature(original)+'，臨時記號 '+before+' 個\n建議調號：'+signature(analysis.key)+'，臨時記號 '+analysis.count+' 個\n\n是否改用全曲臨時記號最少的調號？\n只改變記譜，不會移調或改變聲音；曲中轉調保留。\n\n確定：使用建議調號\n取消：保留原始調號，繼續載入檔案';
 if(ask(message))x.keyMode='auto';
}
let fileMode='midi';$('import').onclick=()=>{fileMode='midi';$('file').accept='.mid,.midi';$('file').click()};$('load').onclick=()=>{fileMode='json';$('file').accept='.json';$('file').click()};function validate(x){if(!x||!Number.isFinite(x.bpm)||x.bpm<=0||!Array.isArray(x.tracks)||!x.tracks.length||x.tracks.length>128)throw Error('無效專案');if(x.timeSignatures===undefined)x.timeSignatures=[];if(!Array.isArray(x.timeSignatures)||x.timeSignatures.some(m=>!Number.isFinite(m.s)||m.s<0||!Number.isInteger(m.numerator)||m.numerator<1||m.numerator>255||![1,2,4,8,16,32,64].includes(m.denominator)))throw Error('無效拍號資料');x.timeSignatures=MidiMeter.normalize(x.timeSignatures);if(x.lyrics===undefined)x.lyrics=[];if(!Array.isArray(x.lyrics)||x.lyrics.length>100000||x.lyrics.some(l=>!Number.isFinite(l.s)||l.s<0||l.s>100000||typeof l.text!=='string'||l.text.length>4000))throw Error('無效歌詞資料');x.lyrics=StudioLyrics.normalize(x.lyrics);if(x.channelEvents===undefined)x.channelEvents=[];if(!Array.isArray(x.channelEvents)||x.channelEvents.length>1000000||x.channelEvents.some(e=>!Number.isFinite(e.s)||e.s<0||!Number.isInteger(e.ch)||e.ch<0||e.ch>15||!Array.isArray(e.data)||![160,176,192,208,224].includes(e.data[0])||e.data.length!==([192,208].includes(e.data[0])?2:3)||e.data.slice(1).some(v=>!Number.isInteger(v)||v<0||v>127)))throw Error('無效 MIDI 控制事件');x.channelEvents.sort((a,b)=>a.s-b.s||(a.order||0)-(b.order||0));if(x.tempoChanges===undefined)x.tempoChanges=[];if(!Array.isArray(x.tempoChanges)||x.tempoChanges.length>100000||x.tempoChanges.some(t=>!Number.isFinite(t.s)||t.s<0||t.s>100000||!Number.isFinite(t.bpm)||t.bpm<=0))throw Error('無效速度資料');x.tempoChanges=MidiTempo.normalize(x.tempoChanges);if(x.keyMode!==undefined&&!['auto','manual'].includes(x.keyMode))throw Error('無效調號模式');if(x.key===undefined)x.key={sf:0,minor:0};if(!Number.isInteger(x.key?.sf)||x.key.sf< -7||x.key.sf>7||![0,1].includes(x.key.minor))throw Error('無效調號');if(x.keyChanges===undefined)x.keyChanges=[];if(!Array.isArray(x.keyChanges)||x.keyChanges.length>10000||x.keyChanges.some(c=>!Number.isFinite(c.s)||c.s<=0||c.s>100000||!Number.isInteger(c.sf)||c.sf< -7||c.sf>7||![0,1].includes(c.minor)))throw Error('無效轉調資料');x.keyChanges=ScoreTimeline.normalize(x.keyChanges);for(let t of x.tracks){if(Number.isInteger(t.ch)&&t.ch>=16&&t.ch<128){t.previousChannel=t.ch;t.ch%=16}if(typeof t.name!=='string'||!Number.isInteger(t.ch)||t.ch<0||t.ch>15||!Number.isInteger(t.program)||t.program<0||t.program>127||!Number.isFinite(t.vol)||t.vol<0||t.vol>1||!Array.isArray(t.notes))throw Error('音軌資料有誤');for(let n of t.notes)if(!Number.isInteger(n.p)||n.p<0||n.p>127||!Number.isInteger(n.v)||n.v<1||n.v>127||!Number.isFinite(n.s)||n.s<0||!Number.isFinite(n.d)||n.d<=0||n.s+n.d>100000)throw Error('音符資料有誤')}return x}$('file').onchange=async e=>{let f=e.target.files[0];if(!f)return;$('import').disabled=true;$('load').disabled=true;$('status').textContent='● 正在讀取 '+f.name+'…';try{let x=fileMode==='midi'?parseMidi(await StudioLoading.read(f,'arrayBuffer')):validate(JSON.parse(await StudioLoading.read(f,'text')));pause();clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);if(staffEdit)setStaffEditing(false);if(fileMode==='midi'){confirmImportedKey(x);await MeterAdvisor.review(x,true)}checkpoint();if(fileMode==='midi')x.midiFileName=f.name;project=x;active=0;chosen=null;beat=0;if(fileMode==='midi'){await GMEngine.stopped();$('loop').classList.remove('active');$('master').value=70;GMEngine.masterVolume(.7);USBMidi.expression();for(const t of project.tracks)updateTrackPatch(t)}changed();scrollPitch();$('status').textContent='● 已匯入 '+f.name+(x.portsMerged?' · 多 Port 已合併為 MIDI 1.0 通道 1–16':'')+(x.tempoChanges?.length?' · 保留 '+x.tempoChanges.length+' 處速度變化':'')+(x.keyChanges?.length?' · 已讀取 '+x.keyChanges.length+' 處轉調':'')}catch(err){$('status').textContent='● 匯入失敗：'+err.message;alert('匯入失敗：'+err.message)}finally{$('import').disabled=false;$('load').disabled=false;e.target.value=''}};function noteFocus(notes,height,width,scale){if(!notes.length)return{top:Math.max(0,(127-60)*18-height/2),left:0,beat:0};const pitches=notes.map(n=>n.p).sort((a,b)=>a-b),span=Math.max(1,Math.floor(height*.7/18));let first=0,bestFirst=0,bestLast=0;for(let last=0;last<pitches.length;last++){while(pitches[last]-pitches[first]>span)first++;if(last-first>bestLast-bestFirst){bestFirst=first;bestLast=last}}const center=(pitches[bestFirst]+pitches[bestLast])/2,start=Math.min(...notes.map(n=>n.s));return{top:Math.max(0,(127-center)*18+9-height/2),left:Math.max(0,start*scale-Math.max(24,width*.1)),beat:start}}
function sizeEventViewport(){const view=$('rollScroll');if(!view.hidden)view.style.height=(24*18+view.offsetHeight-view.clientHeight)+'px'}
function scrollPitch(){sizeEventViewport();const view=$('rollScroll'),focus=noteFocus(track().notes,view.clientHeight,view.clientWidth-64,zoom);view.scrollTop=focus.top;view.scrollLeft=focus.left;if(!$('scorePanel').hidden)$('scoreView').scrollLeft=0}
function selectTrack(i){clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);stopHeldNote();active=i;chosen=null;render();scrollPitch();centerScoreTrack()}
try{project=validate(JSON.parse(localStorage.getItem('midi-studio-v1')))}catch{project=demo()}render();scrollPitch();window.MidiStudio={midi,parseMidi,getProject:()=>project};

$('scoreToggle').onclick=()=>{clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);stopHeldNote();const panel=$('scorePanel');panel.hidden=!panel.hidden;const staff=!panel.hidden;$('rollScroll').hidden=staff;document.querySelector('article').classList.toggle('staffMode',staff);$('editorMode').textContent=staff?'STAFF':'EVENT · PIANO ROLL';$('scoreToggle').classList.toggle('active',staff);$('scoreToggle').setAttribute('aria-pressed',String(staff));renderScore();$('staffEditToggle').hidden=!staff;if(!staff)scrollPitch()};
function renderScore(){
 $('meterAdviceRestore').hidden=!project.originalTimeSignatures;
 if(playing&&!editingScoreView())ScoreWindow.follow(project,length(),beat);const range=ScoreWindow.range(project,length());$('scorePageInfo').textContent='第 '+(range.first+1)+'–'+range.last+' 小節／共 '+range.total+' 小節';$('scorePage').value=range.page+1;$('scorePage').max=range.pages;$('scorePrev').disabled=range.page===0;$('scoreNext').disabled=range.page===range.pages-1;$('scoreLongNotice').textContent=ScoreWindow.warning(project);$('scoreLongNotice').hidden=!$('scoreLongNotice').textContent;const meter=MidiMeter.barAt(project.timeSignatures,beat).meter;document.querySelector('.meter').textContent=meter.numerator+' / '+meter.denominator;
 stopHeldNote();if($('scorePanel').hidden)return;
 const all=$('allScoreTracks').checked,tracks=all?project.tracks.filter(t=>t.showInScore!==false):[track()];
 const view=$('scoreView');view.classList.toggle('compactTracks',all);const editScroll=editingScoreView()?{top:view.scrollTop,left:view.scrollLeft}:null;view.replaceChildren();
 if(all&&!tracks.length){const empty=document.createElement('p');empty.className='scoreEmpty';empty.textContent='未勾選顯示音軌，請在左側音軌屬性勾選「顯示於多軌譜面」。';view.append(empty)}
 const scores=tracks.map(t=>{const index=project.tracks.indexOf(t),holder=document.createElement('div');holder.innerHTML=renderSingleScore(t);return{t,index,systems:[...sheetSystems(holder.firstElementChild,t,index,view.clientWidth).children]}});
 const appendRow=(parent,score,systems)=>{const row=document.createElement('section');row.className='scoreTrackRow';row.dataset.trackIndex=score.index;
 if(all){const label=document.createElement('div');label.className='scoreTrackName';label.textContent=(score.index+1)+' · '+score.t.name+(score.t.ch===9?' · 鼓音符鍵位譜':'');row.append(label)}
 row.append(...systems);parent.append(row)};
 if(all){for(let i=0;i<(scores[0]?.systems.length||0);i++){
 const first=scores[0].systems[i],group=document.createElement('section');group.className='scoreMeasureGroup';group.dataset.start=first.dataset.start;group.dataset.end=first.dataset.end;
 const heading=document.createElement('div');heading.className='scoreMeasureHeading';heading.textContent='第 '+(MidiMeter.barAt(project.timeSignatures,Number(first.dataset.start)).index+1)+'–'+(MidiMeter.barAt(project.timeSignatures,Number(first.dataset.end)-1e-7).index+1)+' 小節';group.append(heading);
 for(const score of scores)if(score.systems[i])appendRow(group,score,[score.systems[i]]);view.append(group);
 }}else for(const score of scores)appendRow(view,score,score.systems);
 $('scoreTitle').textContent=all?'多軌譜面 · '+tracks.length+'／'+project.tracks.length+' 軌':track().name+' · 五線譜';centerScoreTrack();updateCursor();if(editScroll){view.scrollTop=editScroll.top;view.scrollLeft=editScroll.left}if(playing)highlightPlayingNotes();
}
function scoreSvgAt(e){
 const target=e.target,under=document.elementFromPoint(e.clientX,e.clientY);
 const direct=target?.closest?.('svg[data-track-index]')||under?.closest?.('svg[data-track-index]');if(direct)return direct;
 const system=under?.closest?.('.sheetSystem');const music=system?.querySelector('.systemMusic');if(!music)return null;
 const rect=music.getBoundingClientRect();return e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom?music:null;
}
function centerScoreTrack(){
 const view=$('scoreView'),all=$('allScoreTracks').checked;
 const rows=[...view.querySelectorAll('.scoreTrackRow')];
 rows.forEach(row=>row.classList.toggle('focusedScoreTrack',Number(row.dataset.trackIndex)===active));
 if(editingScoreView())return;
 if(!all||$('scorePanel').hidden){view.style.paddingBlock='0px';return}
 const candidates=rows.filter(row=>Number(row.dataset.trackIndex)===active);const row=candidates.find(row=>[...row.querySelectorAll('.sheetSystem')].some(el=>beat>=Number(el.dataset.start)&&beat<Number(el.dataset.end)))||candidates[0];if(!row)return;
 const system=[...row.querySelectorAll('.sheetSystem')].find(el=>beat>=Number(el.dataset.start)&&beat<Number(el.dataset.end))||row.querySelector('.sheetSystem');const target=system||row;const padding=view.classList.contains('compactTracks')?0:Math.max(0,(view.clientHeight-target.getBoundingClientRect().height)/2);view.style.paddingBlock=padding+'px';
 const rect=target.getBoundingClientRect(),vr=view.getBoundingClientRect();view.scrollTop+=rect.top-vr.top+(rect.height-view.clientHeight)/2;
}
let scoreFocusPending=false;
function activateScoreSvg(svg){if(!svg)return;const index=Number(svg.dataset.trackIndex);if(index===active)return;stopHeldNote();active=index;chosen=null;scoreFocusPending=true;$('trackTitle').textContent=track().name;$('trackPicker').value=String(active);document.querySelectorAll('.track').forEach((el,i)=>el.classList.toggle('selected',i===active))}
function renderSingleScore(t){const key=scoreKey(),count=Math.abs(key.sf),notation=StaffNotation.layout(t.notes,key,scoreChanges(),project.timeSignatures),range=ScoreWindow.range(project,length()),bars=range.last,barWidth=240,left=90+count*12,width=scoreX(range.end)+30;if(!$('scoreKey').options.length){$('scoreKey').add(new Option('自動：全曲最少臨時記號','auto'));for(let minor=0;minor<=1;minor++)for(let sf=-7;sf<=7;sf++)$('scoreKey').add(new Option(StaffNotation.name({sf,minor})+' · '+(sf===0?'無升降':Math.abs(sf)+(sf>0?'♯':'♭')),sf+':'+minor))}$('scoreKey').value=project.keyMode==='manual'?key.sf+':'+key.minor:'auto';const analysis=keyAnalysis(),shownCount=project.keyMode!=='manual'?analysis.count:project.tracks.filter(t=>t.ch%16!==9).reduce((sum,t)=>sum+StaffNotation.layout(t.notes,key,scoreChanges(),project.timeSignatures).filter(x=>x.glyph).length,0),signature=key.sf===0?'無升降':Math.abs(key.sf)+(key.sf>0?'♯':'♭');$('keyAnalysis').textContent=(project.importedKey?'檔案：'+StaffNotation.name(project.importedKey)+' · ':'')+(project.keyMode==='manual'?'手動':'全曲最簡記譜')+' · '+signature+' · 臨時記號 '+shownCount+' 個（C 調 '+analysis.cMajorCount+' 個） · '+analysis.tracks+' 個旋律音軌';renderKeyChanges();let parts=[];const line=(x,y,x2,y2,w=1)=>parts.push(`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#687183" stroke-width="${w}"/>`);for(const bottom of [94,204])for(let i=0;i<5;i++)line(18,bottom-i*10,width-12,bottom-i*10);parts.push('<text class="scoreClef" x="22" y="88" font-size="49" font-family="serif">𝄞</text><text class="scoreClef" x="25" y="195" font-size="43" font-family="serif">𝄢</text>');const positions=key.sf>0?[[54,69,49,64,79,59,74],[174,189,169,184,199,179,194]]:[[74,59,79,64,84,69,89],[194,179,199,184,204,189,174]];for(let staff=0;staff<2;staff++)for(let i=0;i<count;i++)parts.push(`<text class="keySignature" x="${52+i*12}" y="${positions[staff][i]+6}" font-size="22">${key.sf>0?'♯':'♭'}</text>`);const meterX=62+count*12;for(const bottom of [94,204])parts.push(`<text class="timeSignature" x="${meterX}" y="${bottom-25}" font-size="18">4</text><text class="timeSignature" x="${meterX}" y="${bottom-5}" font-size="18">4</text>`);for(let b=range.first;b<=bars;b++){const at=MidiMeter.barStart(project.timeSignatures,b),entry=scoreEntries().find(c=>c.s===at);let x=scoreX(at)-22-(entry?.width||0);line(x,54,x,204);if(b<bars)parts.push(`<text x="${x+6}" y="35" font-size="11" fill="#6c7888">${b+1}</text>`)}for(const [noteIndex,n] of t.notes.entries()){if(n.s<range.start||n.s>=range.end)continue;parts.push(`<g class="staffNoteGroup" data-note-index="${noteIndex}">`);const info=notation[noteIndex],upper=info.upper,bottom=upper?94:204,base=upper?37:25,step=info.step,y=bottom-(step-base)*5,x=scoreX(n.s);for(let ly=bottom+10;ly<=y;ly+=10)line(x-10,ly,x+10,ly);for(let ly=bottom-50;ly>=y;ly-=10)line(x-10,ly,x+10,ly);if(info.glyph)parts.push(`<text class="accidental" x="${x-20}" y="${y+5}" font-size="19">${info.glyph}</text>`);parts.push(`<ellipse class="scoreNote ${selectedNotes.has(n)?'chosen':''}" data-note-index="${noteIndex}" cx="${x}" cy="${y}" rx="7" ry="4.8" transform="rotate(-18 ${x} ${y})" fill="${n.d>=2?'#f4f2eb':'#25334a'}" stroke="#25334a" stroke-width="1.5"><title>${StaffNotation.noteName(n,info.key.sf)} · MIDI ${n.p} · 起點 ${n.s} 拍 · 長度 ${n.d} 拍</title></ellipse>`);if(n.d<4){line(x+6,y,x+6,y-30,1.5);if(n.d<1)parts.push(`<path d="M ${x+6} ${y-30} q 15 7 5 20" fill="none" stroke="#25334a" stroke-width="2"/>`);if(n.d<.25)parts.push(`<path d="M ${x+6} ${y-16} q 15 7 5 20" fill="none" stroke="#25334a" stroke-width="2"/>`);if(n.d<.5)parts.push(`<path d="M ${x+6} ${y-23} q 15 7 5 20" fill="none" stroke="#25334a" stroke-width="2"/>`)}if([.1875,.375,.75,1.5,3,6].some(v=>Math.abs(v-n.d)<.01))parts.push(`<circle cx="${x+13}" cy="${y-2}" r="2"/>`);parts.push('</g>')}for(const change of scoreEntries()){const start=scoreX(change.s)-22-change.width+8;for(let staff=0;staff<2;staff++)change.glyphs.forEach((g,i)=>{const ys=g.sign>0?[[54,69,49,64,79,59,74],[174,189,169,184,199,179,194]]:[[74,59,79,64,84,69,89],[194,179,199,184,204,189,174]];parts.push(`<text class="keyChangeSignature" x="${start+i*12}" y="${ys[staff][g.i]+6}" font-size="22">${g.kind==='natural'?'♮':g.kind==='sharp'?'♯':'♭'}</text>`)});parts.push(`<text x="${start}" y="18" font-size="10" fill="#48685c">轉調</text>`)}if(t===track())parts.push(StudioLyrics.markup(project,scoreX));$('scoreTitle').textContent=t.name+(t.ch%16===9?' · 鼓音符鍵位譜':' · 五線譜');return `<svg data-track-index="${project.tracks.indexOf(t)}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="目前音軌五線譜" width="${width}" height="270" viewBox="0 0 ${width} 270" fill="#25334a">${parts.join('')}<rect class="staffSeekArea" x="0" y="0" width="${width}" height="42" fill="transparent"><title>點擊定位播放位置</title></rect><g class="staffCursor" transform="translate(${scoreX(beat)} 0)" aria-label="播放時間線"><line class="scrubHandle" x1="0" y1="23" x2="0" y2="230" stroke="transparent" stroke-width="18"/><line x1="0" y1="25" x2="0" y2="230"/><path d="M -5 23 L 5 23 L 0 30 Z"/></g></svg>`}

function stopHeldNote(){heldToken++;if(!heldVoice)return;if(USBMidi.active)USBMidi.release();else GMEngine.release();heldVoice.element.classList.remove('sounding');heldVoice=null}
async function startHeldNote(n,element){stopHeldNote();const token=heldToken,t=track();if(!await prepareGm()||token!==heldToken||!element.isConnected)return;if(master)master.gain.setValueAtTime(1,ctx.currentTime);heldVoice={element};if(USBMidi.active)USBMidi.hold(t,n);else GMEngine.hold(t,n);element.classList.add('sounding')}
function staffPoint(e,svg=scoreSvgAt(e)||$('scoreView').querySelector('svg[data-track-index]')){if(!svg)return null;const matrix=svg.getScreenCTM();if(!matrix)return null;return new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse())}
function staffNoteAt(e,svg){
 if(!svg)return null;const point=staffPoint(e,svg);if(!point)return null;
 // Dense passages overlap stems and ledger lines: choose the nearest note head.
 let nearest=null,distance=Infinity;
 for(const head of svg.querySelectorAll('.scoreNote')){const x=Number(head.getAttribute('cx')),y=Number(head.getAttribute('cy')),dx=point.x-x,dy=point.y-y,d=dx*dx+dy*dy;if(Math.abs(dx)<=10&&Math.abs(dy)<=9&&d<distance){nearest=head.closest('.staffNoteGroup');distance=d}}
 return nearest||e.target.closest('.staffNoteGroup');
}
function focusNoteEditor(id){const editor=$(id);editor.tabIndex=-1;editor.focus({preventScroll:true})}
function deleteEditorNote(n){
 if(!n)return false;
 const owner=project.tracks.find(t=>t.notes.includes(n));if(!owner)return false;
 pause();clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);
 if(!$('scorePanel').hidden&&!staffEdit)setStaffEditing(true);
 const targets=selectedNotes.has(n)?selectedGroup():[n];checkpoint();for(const t of project.tracks)t.notes=t.notes.filter(note=>!targets.includes(note));selectedNotes.clear();chosen=null;changed();
 focusNoteEditor($('scorePanel').hidden?'rollScroll':'scoreView');return true;
}
function staffInputAt(y,s,exclude){return StaffEditor.noteAt(y,ScoreTimeline.keyAt(scoreKey(),scoreChanges(),s),$('staffAccidental').value,{notes:track().notes,s,changes:scoreChanges(),timeSignatures:project.timeSignatures,exclude})}
function deleteStaffNote(n){return deleteEditorNote(n)}
function showStaffSelection(){selectedGroup();document.querySelectorAll('.scoreNote').forEach(el=>el.classList.toggle('chosen',selectedNotes.has(project.tracks[Number(el.closest('svg').dataset.trackIndex)].notes[Number(el.dataset.noteIndex)])));properties()}
function setStaffEditing(value){
 finishLyricDrag(true); clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);stopHeldNote();staffEdit=value;
 document.querySelector('article').classList.toggle('staffEditing',value);$('staffEditToggle').classList.toggle('active',value);$('staffEditToggle').setAttribute('aria-pressed',String(value));$('staffEditToggle').textContent=value?'✓ 完成編輯':'✎ 編輯五線譜';$('staffEditToolbar').hidden=!value;$('scoreView').classList.toggle('editing',value);
 properties();renderScore();updateCursor();
}
$('staffEditToggle').onclick=()=>{if(!staffEdit)pause();setStaffEditing(!staffEdit);if(playing)startPlaybackView()};

$('scoreView').onpointerdown=e=>{if(e.button!==0)return;const clickedSvg=scoreSvgAt(e);if(!clickedSvg)return;const hitGroup=staffNoteAt(e,clickedSvg);if(clickedSvg){const point=staffPoint(e);if(!hitGroup&&point.y>=0&&point.y<=42){e.preventDefault();const next=scoreBeatAt(point.x);seekPlayback(next);activateScoreSvg(clickedSvg);$('status').textContent='● 播放位置：第 '+(MidiMeter.barAt(project.timeSignatures,beat).index+1)+' 小節 · '+((beat-MidiMeter.barAt(project.timeSignatures,beat).start)/(4/MidiMeter.barAt(project.timeSignatures,beat).meter.denominator)+1).toFixed(2)+' 拍';return}}activateScoreSvg(clickedSvg);const group=hitGroup,n=group?track().notes[Number(group.dataset.noteIndex)]:null;if(!staffEdit){if(!n)return;if(!chooseNote(n,e))return;showStaffSelection();focusNoteEditor('scoreView');const el=group.querySelector('.scoreNote');e.preventDefault();$('scoreView').setPointerCapture(e.pointerId);startHeldNote(n,el);return}pause();const point=staffPoint(e),key={...scoreKey()},entries=scoreEntries(),base=staffOffset(),grid=Number($('staffSnap').value);if(n){e.preventDefault();focusNoteEditor('scoreView');if(staffTool==='erase'){deleteStaffNote(n);return}if(!chooseNote(n,e))return;showStaffSelection();staffGesture={items:groupSnapshot(),n,group,x:e.clientX,y:e.clientY,original:{...n},noteY:StaffEditor.yFor(n.p,ScoreTimeline.keyAt(key,scoreChanges(),n.s),n.spelling),svg:clickedSvg,startPoint:point,key,entries,base,originalX:scoreX(n.s),originalEndX:scoreX(n.s+n.d),grid,resize:e.shiftKey,moved:false,historyDepth:history.length};startHeldNote(n,group.querySelector('.scoreNote'));$('scoreView').setPointerCapture(e.pointerId);return}if(staffTool!=='draw'){chosen=null;showStaffSelection();return}if(point.x<staffOffset()-15||point.y<25||point.y>235)return;e.preventDefault();checkpoint();const start=StaffEditor.snap(scoreBeatAt(point.x),grid);chosen={...staffInputAt(point.y,start),s:start,d:Number($('staffDuration').value),v:96};track().notes.push(chosen);changed();audition(chosen.p,chosen.v)};
$('scoreView').onpointermove=e=>{const g=staffGesture;if(!g)return;const point=staffPoint(e,g.svg);if(!point)return;const dx=point.x-g.startPoint.x,dy=point.y-g.startPoint.y;if(!g.moved&&Math.hypot(dx,dy)<4)return;if(!g.moved){checkpoint();g.moved=true}if(g.resize)g.n.d=Math.max(g.grid,StaffEditor.snap(ScoreTimeline.beatAt(g.originalEndX+dx,g.base,g.entries)-g.original.s,g.grid));else{g.n.s=Math.abs(dx)<3?g.original.s:StaffEditor.snap(ScoreTimeline.beatAt(g.originalX+dx,g.base,g.entries),g.grid);if(Math.abs(dy)<3){g.n.p=g.original.p;g.n.spelling=g.original.spelling}else Object.assign(g.n,staffInputAt(g.noteY+dy,g.n.s,g.n))}if(!g.resize){moveGroup(g.items,g.n.s-g.original.s,g.n.p-g.original.p);for(const item of g.items){document.querySelectorAll('.scoreNote').forEach(head=>{const svg=head.closest('svg');if(Number(svg.dataset.trackIndex)!==active||track().notes[Number(head.dataset.noteIndex)]!==item.n||item.n===g.n)return;const group=head.closest('.staffNoteGroup');group.setAttribute('transform',`translate(${scoreX(item.n.s)-scoreX(item.original.s)} ${StaffEditor.yFor(item.n.p,ScoreTimeline.keyAt(g.key,scoreChanges(),item.n.s))-StaffEditor.yFor(item.original.p,ScoreTimeline.keyAt(g.key,scoreChanges(),item.original.s),item.original.spelling)})`)})}}if(!g.resize&&g.previewPitch!==g.n.p){g.previewPitch=g.n.p;startHeldNote(g.n,g.group.querySelector('.scoreNote'))}g.group.setAttribute('transform',`translate(${ScoreTimeline.x(g.n.s,g.base,g.entries)-g.originalX} ${StaffEditor.yFor(g.n.p,ScoreTimeline.keyAt(g.key,g.entries,g.n.s),g.n.spelling)-g.noteY})`);g.group.classList.toggle('resizing',g.resize);properties();$('noteInfo').textContent=nn(g.n.p)+' · 起點 '+g.n.s+' · 長度 '+g.n.d+' 拍'};
function finishStaffGesture(cancel=false){const g=staffGesture;if(!g)return;staffGesture=null;stopHeldNote();if(cancel){restoreGroup(g.items);Object.assign(g.n,g.original);if(!Object.prototype.hasOwnProperty.call(g.original,'spelling'))delete g.n.spelling;if(g.moved)history.length=g.historyDepth}if(g.moved){changed();if(!cancel)audition(g.n.p,g.n.v)}else showStaffSelection()}
$('scoreView').onpointerup=()=>finishStaffGesture();$('scoreView').onpointercancel=()=>finishStaffGesture(true);$('scoreView').addEventListener('lostpointercapture',()=>finishStaffGesture(true));window.addEventListener('blur',()=>finishStaffGesture(true));
$('scoreView').oncontextmenu=e=>{activateScoreSvg(scoreSvgAt(e));const group=staffNoteAt(e,scoreSvgAt(e));if(group){e.preventDefault();deleteStaffNote(track().notes[Number(group.dataset.noteIndex)])}};
window.addEventListener('pointerup',stopHeldNote);window.addEventListener('pointercancel',stopHeldNote);window.addEventListener('blur',stopHeldNote);$('scoreView').addEventListener('lostpointercapture',stopHeldNote);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopHeldNote()});

window.addEventListener('resize',sizeEventViewport);

$('gmAudio').onclick=prepareGm;

setInterval(()=>{if(GMEngine.ready)$('gmVoices').textContent='發聲 '+GMEngine.voiceCount},150);

USBMidi.init({pause,project:()=>project});
try{$('midiLatency').value=localStorage.getItem('midi-output-latency-ms')||'0'}catch{}
$('midiLatency').oninput=()=>{const value=clamp(Number($('midiLatency').value)||0,0,2000);try{localStorage.setItem('midi-output-latency-ms',String(value))}catch{}if(playing)tick()};

$('trackPicker').onchange=e=>selectTrack(Number(e.target.value));$('tracksToggle').onclick=()=>{const open=document.querySelector('aside').classList.toggle('tracksOpen');$('tracksToggle').setAttribute('aria-expanded',String(open));$('tracksToggle').textContent=open?'收起音軌 ▴':'音軌設定 ▾'};if(matchMedia('(max-width: 700px)').matches)$('usbSettings').open=false;

$('scoreKey').onchange=e=>{checkpoint();if(e.target.value==='auto')project.keyMode='auto';else{const [sf,minor]=e.target.value.split(':').map(Number);project.key={sf,minor};project.keyMode='manual'}changed()};

function renderKeyChanges(){if(!$('changeKey').options.length)for(let minor=0;minor<=1;minor++)for(let sf=-7;sf<=7;sf++)$('changeKey').add(new Option(StaffNotation.name({sf,minor}),sf+':'+minor));if(!$('changeKey').dataset.initialized){$('changeKey').value='0:0';$('changeKey').dataset.initialized='true'}$('keyChangeList').textContent=scoreChanges().length?scoreChanges().map(c=>'第 '+(MidiMeter.barAt(project.timeSignatures,c.s).index+1)+' 小節'+(c.s-MidiMeter.barAt(project.timeSignatures,c.s).start?' 第 '+(c.s-MidiMeter.barAt(project.timeSignatures,c.s).start+1)+' 拍':'')+'：'+StaffNotation.name(c)).join('；'):'尚無曲中轉調'}
$('applyKeyChange').onclick=()=>{const bar=Math.max(2,Math.floor(Number($('changeBar').value)||2)),s=MidiMeter.barStart(project.timeSignatures,bar-1),[sf,minor]=$('changeKey').value.split(':').map(Number);checkpoint();project.keyChanges=ScoreTimeline.normalize([...scoreChanges().filter(c=>c.s!==s),{s,sf,minor}]);changed()};
$('removeKeyChange').onclick=()=>{const s=MidiMeter.barStart(project.timeSignatures,Math.max(2,Math.floor(Number($('changeBar').value)||2))-1);if(!scoreChanges().some(c=>c.s===s))return;checkpoint();project.keyChanges=scoreChanges().filter(c=>c.s!==s);changed()};

document.querySelectorAll('[data-duration]').forEach(button=>button.onclick=()=>{$('staffDuration').value=button.dataset.duration;document.querySelectorAll('[data-duration]').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});staffTool='draw'});

// Palette pointer capture supports mouse, pen and touch without changing existing notes.
let paletteDrag=null;
function paletteDropPoint(e){
 if(!staffEdit||$('scorePanel').hidden)return null;
 const view=$('scoreView'),rect=view.getBoundingClientRect();
 if(e.clientX<rect.left||e.clientX>=rect.right||e.clientY<rect.top||e.clientY>=rect.bottom)return null;
 const svg=scoreSvgAt(e);if(!svg)return null;activateScoreSvg(svg);const point=staffPoint(e);
 if(point.x<staffOffset()-15||point.y<25||point.y>235)return null;
 const s=StaffEditor.snap(scoreBeatAt(point.x),Number($('staffSnap').value));
 return {s,...staffInputAt(point.y,s)};
}
function clearPaletteDrag(){
 const drag=paletteDrag;if(!drag)return;paletteDrag=null;stopHeldNote();drag.ghost.remove();$('scoreView').classList.remove('paletteDropTarget');
 if(drag.button.hasPointerCapture(drag.pointerId))drag.button.releasePointerCapture(drag.pointerId);
}
document.querySelectorAll('[data-duration]').forEach(button=>{
 button.addEventListener('pointerdown',e=>{
  if(e.button!==0||!staffEdit)return;
  clearPaletteDrag();button.click();pause();
  const ghost=document.createElement('div');ghost.className='paletteNoteGhost';ghost.innerHTML=button.querySelector('svg').outerHTML;ghost.setAttribute('aria-hidden','true');document.body.append(ghost);
  paletteDrag={button,pointerId:e.pointerId,x:e.clientX,y:e.clientY,d:Number(button.dataset.duration),ghost,moved:false};
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';button.setPointerCapture(e.pointerId);e.preventDefault();
 });
 button.addEventListener('pointermove',e=>{
  const drag=paletteDrag;if(!drag||drag.pointerId!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)drag.moved=true;
  drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  const point=paletteDropPoint(e);const previewKey=point?active+':'+point.p:null;if(previewKey!==drag.previewPitch){drag.previewPitch=previewKey;if(point)startHeldNote({p:point.p,v:96},drag.ghost);else stopHeldNote()}drag.ghost.classList.toggle('valid',!!point);$('scoreView').classList.toggle('paletteDropTarget',!!point);
  drag.ghost.title=point?nn(point.p)+' · '+point.s+' 拍':'';
 });
 button.addEventListener('pointerup',e=>{
  const drag=paletteDrag;if(!drag||drag.pointerId!==e.pointerId)return;
  const point=drag.moved?paletteDropPoint(e):null,d=drag.d;clearPaletteDrag();
  if(!point)return;
  checkpoint();chosen={...point,d,v:96};track().notes.push(chosen);changed();audition(chosen.p,chosen.v);
 });
 button.addEventListener('pointercancel',clearPaletteDrag);button.addEventListener('lostpointercapture',clearPaletteDrag);
 button.title+=' · 可拖曳至五線譜';
});
window.addEventListener('blur',clearPaletteDrag);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearPaletteDrag();finishRollGesture(true);finishStaffGesture(true);stopHeldNote()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearPaletteDrag()});

$('allScoreTracks').onchange=()=>{renderScore();centerScoreTrack()};

window.addEventListener('pointerup',()=>{if(scoreFocusPending){scoreFocusPending=false;requestAnimationFrame(centerScoreTrack)}});window.addEventListener('resize',()=>requestAnimationFrame(centerScoreTrack));

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&playing)startPlaybackView()});

function followSheetPlayhead(){
 if(!playing||editingScoreView())return;if(ScoreWindow.follow(project,length(),beat)){renderScore();return}const view=$('scoreView'),system=[...view.querySelectorAll('.sheetSystem')].find(el=>Number(el.dataset.track)===active&&beat>=Number(el.dataset.start)&&beat<Number(el.dataset.end));
 if(!system)return;const r=system.getBoundingClientRect(),v=view.getBoundingClientRect();if(r.top<v.top||r.bottom>v.top+view.clientHeight)view.scrollTop+=r.top-v.top-(view.clientHeight-r.height)/2;
}

let sheetResizeTimer;window.addEventListener('resize',()=>{clearTimeout(sheetResizeTimer);sheetResizeTimer=setTimeout(()=>{if(!staffGesture&&!paletteDrag)renderScore()},120)});

window.addEventListener('blur',()=>finishRollGesture(true));document.addEventListener('visibilitychange',()=>{if(document.hidden){finishRollGesture(true);finishStaffGesture(true)}});

$('staffAccidental').onchange=()=>{if(!staffEdit||!chosen)return;pause();checkpoint();const key=ScoreTimeline.keyAt(scoreKey(),scoreChanges(),chosen.s),y=StaffEditor.yFor(chosen.p,key,chosen.spelling);Object.assign(chosen,staffInputAt(y,chosen.s,chosen));changed();audition(chosen.p,chosen.v)};

function transposeSelected(delta){
 if(!chosen)return;const key=ScoreTimeline.keyAt(scoreKey(),scoreChanges(),chosen.s),next=StaffEditor.semitone(chosen,delta,key);if(next.p===chosen.p)return;
 pause();checkpoint();if(!$('scorePanel').hidden&&!staffEdit)setStaffEditing(true);Object.assign(chosen,next);changed();audition(chosen.p,chosen.v);
}
$('semitoneDown').onclick=()=>transposeSelected(-1);$('semitoneUp').onclick=()=>transposeSelected(1);

StudioLyrics.init({project:()=>project,beat:()=>beat,checkpoint,changed,seek:seekPlayback,pause});

function browseScorePage(page){pause();ScoreWindow.select(project,length(),page);renderScore();$('scoreView').scrollTop=0}
$('scorePrev').onclick=()=>browseScorePage(ScoreWindow.range(project,length()).page-1);$('scoreNext').onclick=()=>browseScorePage(ScoreWindow.range(project,length()).page+1);$('scorePage').onchange=e=>browseScorePage(Math.round(Number(e.target.value)||1)-1);

// Marquee selection uses screen-space bounds so wrapped score systems and zoom stay aligned.
let noteMarquee=null;
for(const id of ['scoreView','grid']){
 const view=$(id);
 view.addEventListener('pointerdown',e=>{
  if(e.button!==0||(id==='scoreView'&&!staffEdit)||e.target.closest('.scoreNote,.staffNoteGroup,.note,.staffSeekArea,.staffCursor,#cursor,.scoreLyric'))return;
  if(id==='scoreView'&&!scoreSvgAt(e))return;
  if(id==='scoreView'){activateScoreSvg(scoreSvgAt(e));const point=staffPoint(e);if(point.y<=42)return}
  e.preventDefault();e.stopImmediatePropagation();pause();focusNoteEditor(id==='grid'?'rollScroll':'scoreView');
  const box=document.createElement('div');box.className='noteMarquee';document.body.append(box);
  noteMarquee={view,id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,box,base:e.ctrlKey||e.metaKey?new Set(selectedGroup()):new Set(),moved:false};
  view.setPointerCapture(e.pointerId);
 },true);
 view.addEventListener('pointermove',e=>{
  const g=noteMarquee;if(!g||g.view!==view||g.pointerId!==e.pointerId)return;
  e.preventDefault();e.stopImmediatePropagation();const left=Math.min(g.x,e.clientX),top=Math.min(g.y,e.clientY),right=Math.max(g.x,e.clientX),bottom=Math.max(g.y,e.clientY);
  g.moved=g.moved||Math.hypot(e.clientX-g.x,e.clientY-g.y)>3;Object.assign(g.box.style,{left:left+'px',top:top+'px',width:right-left+'px',height:bottom-top+'px'});
  selectedNotes=new Set(g.base);
  view.querySelectorAll(g.id==='grid'?'.note':'.scoreNote').forEach((el,i)=>{
   if(g.id==='scoreView'&&Number(el.closest('svg').dataset.trackIndex)!==active)return;
   const rect=el.getBoundingClientRect();if(rect.right>=left&&rect.left<=right&&rect.bottom>=top&&rect.top<=bottom)selectedNotes.add(track().notes[g.id==='grid'?i:Number(el.dataset.noteIndex)]);
  });
  chosen=[...selectedNotes].at(-1)||null;showStaffSelection();document.querySelectorAll('#notes .note').forEach((el,i)=>el.classList.toggle('chosen',selectedNotes.has(track().notes[i])));
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(type,e=>{
  const g=noteMarquee;if(!g||g.view!==view)return;e.stopImmediatePropagation();g.box.remove();noteMarquee=null;
  if(type==='pointercancel'){selectedNotes=g.base;chosen=[...selectedNotes].at(-1)||null}
  else if(!g.moved&&!e.ctrlKey&&!e.metaKey){chosen=null;selectedNotes.clear()}
  if(view.hasPointerCapture(g.pointerId))view.releasePointerCapture(g.pointerId);renderRoll();
 },true);
}
window.addEventListener('blur',()=>{if(noteMarquee){noteMarquee.box.remove();noteMarquee=null}});

var scrubGesture=null;
function scrubNotes(tracks,at,previous){
 const mix=MidiMix.snapshot(tracks),lo=Math.min(at,previous),hi=Math.max(at,previous),voices=[];
 tracks.forEach((t,i)=>{if(!mix.audible[i])return;const pitches=new Set();for(const n of t.notes){if((n.s<=at&&n.s+n.d>at)||(at!==previous&&n.s>=lo&&n.s<=hi)){if(!pitches.has(n.p)){pitches.add(n.p);voices.push({t,n})}}}});return voices;
}
async function previewScrub(g,at){
 const previous=g.at??at;g.at=at;beat=at;updateCursor();
 const voices=scrubNotes(project.tracks,at,previous),signature=voices.map(({t,n})=>project.tracks.indexOf(t)+':'+n.p).join(',');
 document.querySelectorAll('.scoreNote').forEach(el=>{const t=project.tracks[Number(el.closest('svg').dataset.trackIndex)],n=t.notes[Number(el.dataset.noteIndex)];el.classList.toggle('scrubNote',voices.some(v=>v.t===t&&v.n.p===n.p))});
 if(signature===g.signature)return;g.signature=signature;const revision=++g.revision;
 if(!voices.length)return;
 if(!await prepareGm()||scrubGesture!==g||g.revision!==revision||playing||USBMidi.switching)return;
 if(master)master.gain.setValueAtTime(1,ctx.currentTime);applyTrackMix();for(const {t,n} of voices)sound(t,n,ctx.currentTime,.14);
 $('status').textContent='● 拖曳試聽 · 第 '+(MidiMeter.barAt(project.timeSignatures,at).index+1)+' 小節';
}
function finishScrub(){const g=scrubGesture;if(!g)return;scrubGesture=null;g.revision++;if(g.view.hasPointerCapture(g.pointerId))g.view.releasePointerCapture(g.pointerId);silence();document.querySelectorAll('.scrubNote').forEach(el=>el.classList.remove('scrubNote'));$('status').textContent='● 試聽結束 · 從目前位置播放'}
for(const id of ['scoreView','grid']){
 const view=$(id);
 const position=e=>{if(id==='grid'){const r=view.getBoundingClientRect();return clamp((e.clientX-r.left)/zoom,0,length()-.001)}const svg=scoreSvgAt(e)||scrubGesture?.svg;if(!svg)return null;const point=staffPoint(e,svg);return clamp(scoreBeatAt(point.x),Number(svg.dataset.start)||0,Math.min(length()-.001,Number(svg.dataset.end)-.001))};
 view.addEventListener('pointerdown',e=>{
  if(e.button!==0||playing||startingPlayback||USBMidi.switching)return;
  if(!e.target.closest(id==='grid'?'#cursor':'.staffCursor,.staffSeekArea'))return;
  e.preventDefault();e.stopImmediatePropagation();playToken++;stopHeldNote();const g={view,pointerId:e.pointerId,svg:id==='scoreView'?scoreSvgAt(e):null,revision:0,signature:null};scrubGesture=g;view.setPointerCapture(e.pointerId);const at=position(e);if(at!==null)previewScrub(g,at);
 },true);
 view.addEventListener('pointermove',e=>{const g=scrubGesture;if(!g||g.view!==view||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const at=position(e);if(at!==null)previewScrub(g,at)},true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])view.addEventListener(type,e=>{if(scrubGesture?.view!==view)return;e.stopImmediatePropagation();finishScrub()},true);
}
window.addEventListener('blur',finishScrub);document.addEventListener('visibilitychange',()=>{if(document.hidden)finishScrub()});

var lyricDrag=null;
function lyricDragBeat(x,svg,grid){const start=Number(svg.dataset.start)||0,end=Math.min(length(),Number(svg.dataset.end));return clamp(StaffEditor.snap(scoreBeatAt(x),grid),start,Math.max(start,end-grid))}
function finishLyricDrag(cancel=false){
 const g=lyricDrag;if(!g)return;lyricDrag=null;
 if(cancel){g.row.s=g.original;if(g.moved)history.length=g.historyDepth}
 if(g.view.hasPointerCapture(g.pointerId))g.view.releasePointerCapture(g.pointerId);
 if(g.moved){project.lyrics.sort((a,b)=>a.s-b.s);changed()}else g.el.classList.remove('draggingLyric');
}
$('scoreView').addEventListener('pointerdown',e=>{
 const el=e.target.closest('.scoreLyric');if(!el||!staffEdit||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();pause();focusNoteEditor('scoreView');const row=project.lyrics?.[Number(el.dataset.lyricIndex)],svg=el.closest('svg[data-track-index]');if(!row||!svg)return;
 lyricDrag={view:$('scoreView'),row,el,svg,pointerId:e.pointerId,x:e.clientX,original:row.s,offset:staffPoint(e,svg).x-scoreX(row.s),grid:Number($('staffSnap').value),moved:false,historyDepth:history.length};el.classList.add('draggingLyric');$('scoreView').setPointerCapture(e.pointerId);
},true);
$('scoreView').addEventListener('pointermove',e=>{
 const g=lyricDrag;if(!g||g.pointerId!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();if(!g.moved&&Math.abs(e.clientX-g.x)<4)return;
 if(!g.moved){checkpoint();g.moved=true}
 const svg=scoreSvgAt(e)||g.svg,point=staffPoint(e,svg);if(!point)return;g.row.s=lyricDragBeat(point.x-g.offset,svg,g.grid);
 // Move the preview between printed systems while retaining its global beat coordinate.
 if(g.el.parentNode!==svg)svg.append(g.el);g.el.setAttribute('x',scoreX(g.row.s));g.el.setAttribute('y','135');
 const m=MidiMeter.barAt(project.timeSignatures,g.row.s);$('status').textContent='● 歌詞：第 '+(m.index+1)+' 小節 · '+((g.row.s-m.start)/(4/m.meter.denominator)+1).toFixed(2)+' 拍';
},true);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('scoreView').addEventListener(type,e=>{if(!lyricDrag)return;e.stopImmediatePropagation();finishLyricDrag(type!=='pointerup')},true);
window.addEventListener('blur',()=>finishLyricDrag(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)finishLyricDrag(true)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lyricDrag){e.preventDefault();finishLyricDrag(true)}});

function updateScoreProgress(){
 const view=$('scoreView'),all=$('allScoreTracks').checked;
 view.querySelectorAll('.scoreMeasureGroup,.sheetSystem').forEach(el=>{
  const target=all?el.classList.contains('scoreMeasureGroup'):el.classList.contains('sheetSystem');
  const passed=target&&playing&&!editingScoreView()&&beat>=Number(el.dataset.end);
  el.classList.toggle('playbackPassed',passed);
 });
}

$('meterAdviceOpen').onclick=async()=>{pause();const target=project,before=JSON.stringify(project);if(await MeterAdvisor.review(target)){if(project!==target)return;history.push(before);if(history.length>40)history.shift();ScoreWindow.select(project,length(),0);changed()}};

$('meterAdviceRestore').onclick=()=>{if(!project.originalTimeSignatures)return;pause();checkpoint();project.timeSignatures=JSON.parse(JSON.stringify(project.originalTimeSignatures));delete project.originalTimeSignatures;ScoreWindow.select(project,length(),0);changed()};
