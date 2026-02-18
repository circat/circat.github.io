// content.js

let nextProcessTimer = null; // to track and clear timeouts

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'batchGenerate') {
    const {
      aspect,
      sound,
      speech,
      delay,
      startFile,   // { name, type } — metadata only
      endFile,     // { name, type } — metadata only
      prompts
    } = message;

    console.log('[EnvatoBatch] Starting batch with', prompts.length, 'prompts');
    console.log('[EnvatoBatch] Config:', { aspect, sound, speech, delay: delay / 1000 + 's' });

    setGlobalSettings(aspect, sound, speech, startFile, endFile);

    let currentIndex = 0;

    function processNext() {
      if (currentIndex >= prompts.length) {
        console.log('[EnvatoBatch] Batch finished — all', prompts.length, 'generations triggered');
        sendResponse({ status: `Batch completed (${prompts.length} prompts processed)` });
        return;
      }

      const prompt = prompts[currentIndex];
      console.log(`[EnvatoBatch] Prompt ${currentIndex + 1}/${prompts.length}:`, prompt.substring(0, 70) + (prompt.length > 70 ? '…' : ''));

      // ────────────────────────────────────────────────
      // Insert prompt
      // ────────────────────────────────────────────────
      const promptField = 
        document.querySelector('textarea') ||
        document.querySelector('textarea[placeholder*="prompt" i]') ||
        document.querySelector('textarea[placeholder*="describe" i]') ||
        document.querySelector('textarea[placeholder*="video" i]') ||
        document.querySelector('div[contenteditable="true"]') ||
        document.querySelector('input[type="text"][placeholder*="prompt" i]');

      if (promptField) {
        if (promptField.tagName === 'DIV') {
          promptField.innerText = prompt;
        } else {
          promptField.value = prompt;
        }

        promptField.dispatchEvent(new InputEvent('input',  { bubbles: true, composed: true }));
        promptField.dispatchEvent(new Event('change',     { bubbles: true }));
        promptField.dispatchEvent(new Event('blur',       { bubbles: true }));

        console.log('[EnvatoBatch] → Prompt inserted');
      } else {
        console.warn('[EnvatoBatch] Prompt input field not found');
      }

      // ────────────────────────────────────────────────
      // Click Generate / Create button
      // ────────────────────────────────────────────────
      const generateButton = Array.from(document.querySelectorAll('button, [role="button"], div[role="button"]'))
        .find(el => {
          const text = el.textContent.trim().toLowerCase();
          return text.includes('generate') || 
                 text.includes('create') || 
                 text.includes('make') || 
                 text.includes('render') ||
                 text.includes('video') ||
                 el.getAttribute('aria-label')?.toLowerCase().includes('generate');
        });

      if (generateButton && !generateButton.disabled) {
        console.log('[EnvatoBatch] → Clicking generate/create button');
        generateButton.click();
      } else {
        console.warn('[EnvatoBatch] Generate button not found or is disabled');
      }

      currentIndex++;
      nextProcessTimer = setTimeout(processNext, delay);
    }

    // Start the sequence
    processNext();

    return true; // keep channel open
  }

  if (message.action === 'stopBatch') {
    if (nextProcessTimer) {
      clearTimeout(nextProcessTimer);
      nextProcessTimer = null;
    }
    console.log('[EnvatoBatch] Batch stopped by user');
    sendResponse({ status: 'Batch stopped' });
    return true;
  }

  return false;
});

function setGlobalSettings(aspectRatio, enableSound, enableSpeech, startFileMeta, endFileMeta) {
  const allButtons = document.querySelectorAll('button, [role="button"]');

  // Aspect ratio selection
  const ratioTrigger = Array.from(allButtons).find(btn => 
    btn.textContent.toLowerCase().includes('preset') ||
    btn.textContent.toLowerCase().includes('ratio') ||
    btn.textContent.toLowerCase().includes('aspect') ||
    btn.textContent.toLowerCase().includes('format')
  );

  if (ratioTrigger) {
    console.log('[EnvatoBatch] Opening aspect ratio menu');
    ratioTrigger.click();

    setTimeout(() => {
      const targetRatioBtn = Array.from(document.querySelectorAll('button, [role="button"]'))
        .find(btn => 
          btn.textContent.trim() === aspectRatio ||
          btn.textContent.includes(aspectRatio) ||
          btn.getAttribute('aria-label')?.includes(aspectRatio)
        );

      if (targetRatioBtn) {
        console.log('[EnvatoBatch] Selecting aspect ratio →', aspectRatio);
        targetRatioBtn.click();
      } else {
        console.warn('[EnvatoBatch] Aspect ratio option not found:', aspectRatio);
      }
    }, 700);
  } else {
    console.warn('[EnvatoBatch] No aspect ratio / presets trigger found');
  }

  // Sound toggle
  if (enableSound) {
    const soundControl = Array.from(allButtons).find(btn =>
      btn.textContent.toLowerCase().includes('sound') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('sound')
    );
    if (soundControl) {
      console.log('[EnvatoBatch] Enabling Sound');
      soundControl.click();
    }
  }

  // Speech / voice toggle
  if (enableSpeech) {
    const speechControl = Array.from(allButtons).find(btn =>
      btn.textContent.toLowerCase().includes('speech') ||
      btn.textContent.toLowerCase().includes('voice') ||
      btn.textContent.toLowerCase().includes('narration') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('speech')
    );
    if (speechControl) {
      console.log('[EnvatoBatch] Enabling Speech');
      speechControl.click();
    }
  }

  // Start / End frame upload triggers
  if (startFileMeta || endFileMeta) {
    console.log('[EnvatoBatch] Attempting to trigger frame upload dialogs');

    const fileInputs = document.querySelectorAll('input[type="file"]');

    let startInput = null;
    let endInput   = null;

    if (fileInputs.length >= 1) {
      startInput = fileInputs[0];
      if (fileInputs.length >= 2) endInput = fileInputs[1];
    }

    const uploadTriggers = Array.from(allButtons).filter(btn =>
      btn.textContent.toLowerCase().match(/upload|add|choose|select|image|frame|start|end/i)
    );

    if (startFileMeta) {
      if (startInput) {
        console.log('[EnvatoBatch] Clicking start frame file input');
        startInput.click();
      } else if (uploadTriggers.length > 0) {
        console.log('[EnvatoBatch] Clicking first upload trigger (start frame)');
        uploadTriggers[0].click();
      }
    }

    if (endFileMeta) {
      if (endInput) {
        console.log('[EnvatoBatch] Clicking end frame file input');
        endInput.click();
      } else if (uploadTriggers.length > 1) {
        console.log('[EnvatoBatch] Clicking second upload trigger (end frame)');
        uploadTriggers[1].click();
      } else if (uploadTriggers.length > 0) {
        console.log('[EnvatoBatch] Clicking first upload trigger (fallback for end frame)');
        uploadTriggers[0].click();
      }
    }

    if (startFileMeta || endFileMeta) {
      console.warn('[EnvatoBatch] File dialogs opened — select the same images you chose in the sidebar');
    }
  }
}

console.log('[EnvatoBatch] Content script loaded on', location.href);