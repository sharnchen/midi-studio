window.StudioLoading={
 run(task,{timeoutMs=30000,label='載入',onCancel=()=>{}}={}){
  const controller=new AbortController();let timer;
  const guard=()=>{if(controller.signal.aborted)throw controller.signal.reason};
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error(label+'逾時（'+Math.round(timeoutMs/1000)+' 秒），請重試');controller.abort(error);try{onCancel()}catch{}reject(error)},timeoutMs)});
  return Promise.race([Promise.resolve().then(()=>task(controller.signal,guard)),timeout]).catch(error=>{if(!controller.signal.aborted){controller.abort(error);try{onCancel()}catch{}}throw error}).finally(()=>clearTimeout(timer));
 },
 read(file,kind){return this.run(signal=>new Promise((resolve,reject)=>{
  const reader=new FileReader(),abort=()=>{reader.abort();reject(signal.reason)};
  signal.addEventListener('abort',abort,{once:true});const clean=()=>signal.removeEventListener('abort',abort);
  reader.onload=()=>{clean();resolve(reader.result)};reader.onerror=()=>{clean();reject(reader.error||new Error('讀取檔案失敗'))};reader.onabort=()=>{clean();reject(signal.reason||new Error('已取消讀取'))};
  if(kind==='arrayBuffer')reader.readAsArrayBuffer(file);else reader.readAsText(file);
 }),{timeoutMs:30000,label:'檔案讀取'})}
};
