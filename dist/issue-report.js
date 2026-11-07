(()=>{
 const $=id=>document.getElementById(id),dialog=$('issueDialog');
 function report(){return ['問題標題：'+$('issueSummary').value.trim(),'問題描述：\n'+$('issueDescription').value.trim(),'重現步驟：\n'+$('issueSteps').value.trim(),'預期結果：\n'+$('issueExpected').value.trim(),'實際結果：\n'+$('issueActual').value.trim(),'音源／MIDI 設備：'+$('issueSource').value.trim(),'環境資訊：\n'+$('issueEnvironment').textContent].join('\n\n')}
 $('issueOpen').onclick=()=>{const filename=$('currentFileName').textContent;$('issueEnvironment').textContent='MIDI 檔名：'+filename+'\n瀏覽器：'+navigator.userAgent;$('issueStatus').textContent='';dialog.showModal();$('issueSummary').focus()};
 $('issueClose').onclick=()=>dialog.close();
 $('issueForm').onsubmit=e=>{e.preventDefault();if(!$('issueForm').reportValidity())return;const subject='MIDI Studio 問題回報：'+$('issueSummary').value.trim();const link=document.createElement('a');link.href='mailto:liesharn@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(report());link.click();$('issueStatus').textContent='已要求開啟郵件程式，請在郵件程式確認後寄出。若未開啟，請使用「複製回報內容」。'};
 $('issueCopy').onclick=async()=>{try{await navigator.clipboard.writeText(report());$('issueStatus').textContent='已複製，可貼到郵件中寄出。'}catch{$('issueStatus').textContent='無法自動複製，請從下方文字框手動選取複製。';let fallback=$('issueCopyFallback');if(!fallback){fallback=document.createElement('textarea');fallback.id='issueCopyFallback';fallback.setAttribute('aria-label','可手動複製的回報內容');$('issueForm').append(fallback)}fallback.value=report();fallback.focus();fallback.select()}};
})();
