// Internal audio only; MIDI controller values and master mute remain unchanged.
window.StudioOutput={
 gain:2,
 curve(){const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.8?a:.8+.18*Math.tanh((a-.8)/.18))}return curve},
 connect(context,input,meter){const boost=context.createGain(),ceiling=context.createWaveShaper();boost.gain.value=this.gain;ceiling.curve=this.curve();ceiling.oversample='4x';input.connect(boost);boost.connect(ceiling);ceiling.connect(meter);return{boost,ceiling}}
};
