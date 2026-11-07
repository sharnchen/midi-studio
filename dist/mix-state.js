// The single Solo/Mute policy shared by playback, USB output and highlighting.
window.MidiMix={snapshot(tracks){
 const anySolo=tracks.some(t=>!!t.solo);
 const audible=tracks.map(t=>!t.mute&&(!anySolo||!!t.solo));
 const volumes=tracks.map((t,i)=>audible[i]?Math.max(0,Math.min(1,Number(t.vol)||0)):0);
 return {anySolo,audible,volumes};
}};
