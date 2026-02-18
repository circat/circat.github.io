document.getElementById('start').addEventListener('click', () => {
  const aspect = document.getElementById('aspect').value;
  const sound = document.getElementById('sound').checked;
  const speech = document.getElementById('speech').checked;
  const delay = parseInt(document.getElementById('delay').value) * 1000;
  const promptsText = document.getElementById('prompts').value;
  const prompts = promptsText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);

  if (prompts.length === 0) {
    alert('Please enter at least one prompt.');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'batchGenerate',
      aspect,
      sound,
      speech,
      delay,
      prompts
    });
  });
});