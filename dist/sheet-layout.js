// Printed-style systems retain the original song coordinates inside each SVG viewport.
function sheetSystems(source,t,index,available){
 const ns='http://www.w3.org/2000/svg',fragment=document.createDocumentFragment(),barsPerLine=available<620?2:4;
 const range=ScoreWindow.range(project,length()),total=range.total;
 for(let bar=range.first;bar<range.last;bar+=barsPerLine){
  const start=MidiMeter.barStart(project.timeSignatures,bar),end=MidiMeter.barStart(project.timeSignatures,Math.min(range.last,bar+barsPerLine)),meter=MidiMeter.barAt(project.timeSignatures,start).meter,key=ScoreTimeline.keyAt(scoreKey(),scoreChanges(),start);
  const prefix=100+Math.abs(key.sf)*12,left=scoreX(start)-30,right=scoreX(end)-20,span=right-left;
  const line=document.createElementNS(ns,'svg');line.classList.add('sheetSystem');if($('allScoreTracks').checked)line.setAttribute('preserveAspectRatio','none');line.setAttribute('viewBox',`0 0 ${prefix+span+12} 248`);line.setAttribute('width',prefix+span+12);line.setAttribute('height','248');line.dataset.start=start;line.dataset.end=end;line.dataset.track=index;
  const header=document.createElementNS(ns,'g');header.setAttribute('class','sheetPrefix');
  let prefixParts=[];for(const bottom of [94,204])for(let i=0;i<5;i++)prefixParts.push(`<line x1="18" x2="${prefix}" y1="${bottom-i*10}" y2="${bottom-i*10}"/>`);
  prefixParts.push('<path d="M16 51 C2 56 18 112 7 129 C18 143 2 198 16 207" fill="none" stroke-width="2.4"/><line x1="18" x2="18" y1="54" y2="204"/><text x="22" y="88" font-size="49">𝄞</text><text x="25" y="195" font-size="43">𝄢</text>');
  const positions=key.sf>0?[[54,69,49,64,79,59,74],[174,189,169,184,199,179,194]]:[[74,59,79,64,84,69,89],[194,179,199,184,204,189,174]];
  for(let staff=0;staff<2;staff++)for(let i=0;i<Math.abs(key.sf);i++)prefixParts.push(`<text class="systemKeySignature" data-staff="${staff}" x="${52+i*12}" y="${positions[staff][i]+6}" font-size="22">${key.sf>0?'♯':'♭'}</text>`);
  for(const bottom of [94,204])prefixParts.push(`<text class="systemTimeSignature" x="${62+Math.abs(key.sf)*12}" y="${bottom-25}" font-size="18">${meter.numerator}</text><text class="systemTimeSignature" x="${62+Math.abs(key.sf)*12}" y="${bottom-5}" font-size="18">${meter.denominator}</text>`);
  header.innerHTML=prefixParts.join('');line.append(header);
  const music=document.createElementNS(ns,'svg');music.classList.add('systemMusic');music.dataset.trackIndex=index;music.dataset.start=start;music.dataset.end=end;
  music.setAttribute('x',prefix);music.setAttribute('width',span+1);music.setAttribute('height','248');music.setAttribute('viewBox',`${left} 0 ${span+1} 248`);music.setAttribute('preserveAspectRatio','none');music.setAttribute('overflow','hidden');
  for(const child of source.children){
   if(child.classList.contains('scoreLyric')){const lyric=project.lyrics?.[Number(child.dataset.lyricIndex)];if(!lyric||lyric.s<start||lyric.s>=end)continue}
   if(child.classList.contains('staffNoteGroup')){const n=t.notes[Number(child.dataset.noteIndex)];if(n.s<start||n.s>=end)continue}
   if(child.tagName==='line'&&child.getAttribute('x1')===child.getAttribute('x2')){const x=Number(child.getAttribute('x1'));if(x<left||x>right)continue}
   if(child.tagName==='text'){const x=Number(child.getAttribute('x'));if(x<left||x>right)continue}
   // Original clefs, meter and initial signatures belong to the repeated prefix.
   if(child.tagName==='text'&&!child.classList.contains('accidental')&&!child.classList.contains('keyChangeSignature')&&Number(child.getAttribute('x'))<staffOffset()-30)continue;
   if(['keySignature','scoreClef','timeSignature'].some(c=>child.classList.contains(c)))continue;
   music.append(child.cloneNode(true));
  }
  StaffBeams.apply(music,t.notes,start,end,project.timeSignatures);
  // Empty measures use a whole-measure rest on each staff.
  for(let b=bar;b<Math.min(range.last,bar+barsPerLine);b++)for(const upper of [true,false]){
   const measureStart=MidiMeter.barStart(project.timeSignatures,b),measureEnd=MidiMeter.barStart(project.timeSignatures,b+1);if(t.notes.some(n=>n.s<measureEnd&&n.s+n.d>measureStart&&(n.p>=60)===upper))continue;
   const rest=document.createElementNS(ns,'rect');rest.setAttribute('x',scoreX((measureStart+measureEnd)/2)-5);rest.setAttribute('y',upper?64:174);rest.setAttribute('width','10');rest.setAttribute('height','4');rest.setAttribute('class','measureRest');music.append(rest);
  }
  if(end===length()){const closing=document.createElementNS(ns,'line');closing.setAttribute('x1',right-2);closing.setAttribute('x2',right-2);closing.setAttribute('y1','54');closing.setAttribute('y2','204');closing.setAttribute('stroke-width','2.5');music.append(closing)}
  line.append(music);fragment.append(line);
 }
 return fragment;
}
