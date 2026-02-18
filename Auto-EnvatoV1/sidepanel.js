// sidepanel.js

const promptsTextarea   = document.getElementById('prompts');
const promptsList       = document.getElementById('prompts-list');
const status            = document.getElementById('status');
const batchStatus       = document.getElementById('batch-status');
const startFileInput    = document.getElementById('startFile');
const endFileInput      = document.getElementById('endFile');
const startFileName     = document.getElementById('startFileName');
const endFileName       = document.getElementById('endFileName');
const startBtn          = document.getElementById('start');
const stopBtn           = document.getElementById('stop');

let currentTabId = null;
let isBatchRunning = false;
let batchStartTime = null;
let currentPromptStartTime = null;
let totalPrompts = 0;
let currentPromptNumber = 0;
let currentPromptText = '';

// Live prompt list
function updatePromptsList() {
  const text = promptsTextarea.value.trim();
  const prompts = text.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);

  promptsList.innerHTML = '';

  if (prompts.length === 0) {
    promptsList.innerHTML = '<li style="color:#666;">No prompts entered yet</li>';
    return;
  }

  prompts.forEach((prompt, i) => {
    const li = document.createElement('li');
    li.textContent = prompt.substring(0, 120) + (prompt.length > 120 ? '...' : '');
    promptsList.appendChild(li);
  });
}

promptsTextarea.addEventListener('input', updatePromptsList);
promptsTextarea.addEventListener('paste', () => setTimeout(updatePromptsList, 50));
updatePromptsList();

// File uploads
document.getElementById('uploadStartBtn').addEventListener('click', () => startFileInput.click());
startFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  startFileName.textContent = file ? file.name : 'No file selected';
});

document.getElementById('uploadEndBtn').addEventListener('click', () => endFileInput.click());
endFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  endFileName.textContent = file ? file.name : 'No file selected';
});

// Start Batch
document.getElementById('start').addEventListener('click', () => {
  status.textContent = '';
  status.className = '';
  batchStatus.textContent = '';
  batchStatus.className = '';

  const aspect  = document.getElementById('aspect').value;
  const sound   = document.getElementById('sound').checked;
  const speech  = document.getElementById('speech').checked;
  const delay   = parseInt(document.getElementById('delay').value) * 1000;

  const promptsText = promptsTextarea.value.trim();
  const prompts = promptsText.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);

  if (prompts.length === 0) {
    status.textContent = 'Please enter at least one prompt.';
    status.className = 'error';
    return;
  }

  const startFile = startFileInput.files[0];
  const endFile   = endFileInput.files[0];

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      status.textContent = 'No active tab found.';
      status.className = 'error';
      return;
    }

    currentTabId = tabs[0].id;

    chrome.tabs.sendMessage(currentTabId, {
      action: 'batchGenerate',
      aspect,
      sound,
      speech,
      delay,
      startFile: startFile ? { name: startFile.name, type: startFile.type } : null,
      endFile:   endFile   ? { name: endFile.name,   type: endFile.type   } : null,
      prompts
    }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        status.className = 'error';
      } else {
        status.textContent = response?.status || 'Batch started';
        status.className = 'success';

        isBatchRunning = true;
        batchStartTime = Date.now();
        currentPromptStartTime = Date.now();
        totalPrompts = prompts.length;
        currentPromptNumber = 0;
        currentPromptText = prompts[0] || '';
        updateBatchStatus();
        updateControls();
      }
    });
  });
});

// Stop Batch
document.getElementById('stop').addEventListener('click', () => {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { action: 'stopBatch' }, () => {
      isBatchRunning = false;
      batchStatus.textContent = 'Batch stopped by user';
      batchStatus.className = '';
      updateControls();
    });
  }
});

function updateBatchStatus() {
  if (!isBatchRunning) {
    batchStatus.textContent = '';
    batchStatus.className = '';
    return;
  }

  const now = Date.now();
  const totalTimeSec = Math.floor((now - batchStartTime) / 1000);
  const currentTimeSec = Math.floor((now - currentPromptStartTime) / 1000);

  const totalMin = Math.floor(totalTimeSec / 60);
  const totalSec = totalTimeSec % 60;
  const currMin = Math.floor(currentTimeSec / 60);
  const currSec = currentTimeSec % 60;

  batchStatus.innerHTML = `
    <strong>Running:</strong> Prompt ${currentPromptNumber + 1} / ${totalPrompts}<br>
    <strong>Current:</strong> ${currentPromptText.substring(0, 80)}${currentPromptText.length > 80 ? '...' : ''}<br>
    <strong>Total time:</strong> ${totalMin}m ${totalSec}s<br>
    <strong>Current prompt time:</strong> ${currMin}m ${currSec}s
  `;
  batchStatus.className = 'running';
}

// Update status every second while running
setInterval(() => {
  if (isBatchRunning) updateBatchStatus();
}, 1000);

function updateControls() {
  startBtn.disabled = isBatchRunning;
  stopBtn.disabled = !isBatchRunning;
}

// Listen for updates from content script (progress)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'batchProgress') {
    currentPromptNumber = msg.index;
    currentPromptText = msg.prompt || '';
    currentPromptStartTime = Date.now();
    updateBatchStatus();
  } else if (msg.action === 'batchComplete' || msg.action === 'batchStopped') {
    isBatchRunning = false;
    batchStatus.textContent = msg.status || 'Batch finished';
    batchStatus.className = 'success';
    updateControls();
  }
});