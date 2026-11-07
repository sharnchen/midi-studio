// Wake the external MIDI scheduler without using the page animation loop.
let timer=null;
onmessage=({data})=>{clearInterval(timer);timer=null;if(data.type==='start'){const generation=data.generation;timer=setInterval(()=>postMessage({generation}),25)}};
