(async function () {

  // Create element with attributes and children
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') {
        Object.assign(el.style, v);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.substring(2), v);
      } else if (k === 'text') {
        el.textContent = v;
      } else {
        el.setAttribute(k, v);
      }
    }
    children.forEach(c => el.appendChild(c));
    return el;
  }

  // Storage keys
  const STORAGE_KEY = 'ytTranscriptSidebarSettings';

  // Default settings
  const defaultSettings = {
    aiPlatform: null, // 'chatgpt' | 'gemini' | 'claude'
    prompt: 'Summarize this YouTube video transcript:\n\n[transcript]',
  };

  // Load or init settings
  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(STORAGE_KEY, data => {
        if (data && data[STORAGE_KEY]) {
          resolve(data[STORAGE_KEY]);
        } else {
          resolve(defaultSettings);
        }
      });
    });
  }

  function saveSettings(settings) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [STORAGE_KEY]: settings }, resolve);
    });
  }



  // Insert sidebar panel
  function insertSidebar() {
    // If already inserted
    if (document.getElementById('ytTranscriptSidebar')) return;

    const sidebar = createEl('div', {
      id: 'ytTranscriptSidebar',
      style: {
        position: 'fixed',
        top: '70px',
        right: '0',
        width: '320px',
        height: 'calc(100vh - 90px)',
        backgroundColor: '#222',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '2px solid #555',
        zIndex: '10000',
        padding: '10px',
        overflow: 'hidden',
      }
    });

    const title = createEl('h2', { text: 'YouTube Transcript', style: { margin: '0 0 10px 0', fontSize: '18px' } });
    sidebar.appendChild(title);

    const errorMsg = createEl('div', { id: 'ytErrorMsg', style: { display: 'none', color: 'red', marginBottom: '10px' } });
    sidebar.appendChild(errorMsg);

    const transcriptContent = createEl('div', {
      id: 'ytTranscriptContent',
      style: { flexGrow: '1', overflowY: 'auto', whiteSpace: 'pre-wrap', marginBottom: '10px' }
    });
    sidebar.appendChild(transcriptContent);

    // Buttons container
    const buttonsDiv = createEl('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
    sidebar.appendChild(buttonsDiv);

    // Copy Transcript button
    const copyBtn = createEl('button', {
      text: 'Copy Transcript',
      style: {
        flexGrow: '1',
        padding: '6px',
        cursor: 'pointer',
        backgroundColor: '#444',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
      },
      onclick: () => {
        const text = getPlainTranscriptText();
        if (!text) {
          alert('Transcript is empty or unavailable.');
          return;
        }
        navigator.clipboard.writeText(text).then(() => {
          alert('Transcript copied to clipboard!');
        }).catch(() => {
          alert('Failed to copy transcript.');
        });
      }
    });
    buttonsDiv.appendChild(copyBtn);

    // Settings button
    const settingsBtn = createEl('button', {
      text: 'Settings',
      style: {
        flexGrow: '1',
        padding: '6px',
        cursor: 'pointer',
        backgroundColor: '#555',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
      },
      onclick: () => {
        openSettingsPanel();
      }
    });
    buttonsDiv.appendChild(settingsBtn);

    // Summarize button
    const summarizeBtn = createEl('button', {
      text: 'Summarize',
      style: {
        flexGrow: '1',
        padding: '6px',
        cursor: 'pointer',
        backgroundColor: '#0078d7',
        color: 'white',
        border: 'none',
        borderRadius: '3px',
      },
      onclick: async () => {
        await onSummarizeClick();
      }
    });
    buttonsDiv.appendChild(summarizeBtn);

    document.body.appendChild(sidebar);
  }
let currentVideoUrl = location.href;

// Check for video URL changes every second
setInterval(() => {
  if (location.href !== currentVideoUrl) {
    currentVideoUrl = location.href;
    onVideoChanged();
  }
}, 1000);

// Function to run when video changes
async function onVideoChanged() {
  console.log('[YT Transcript] Video changed. Refreshing transcript...');

  // Optionally, reset or hide previous transcript
  const contentDiv = document.getElementById('ytTranscriptContent');
  const errorDiv = document.getElementById('ytErrorMsg');
  if (contentDiv) contentDiv.textContent = '';
  if (errorDiv) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Loading new video transcript...';
  }

  // Try to reload transcript after a short delay (give YouTube time to load)
  setTimeout(() => {
    (async () => {
      await openTranscriptPanel();
      displayTranscript();
    })();
  }, 10000); // adjust delay as needed
}



  function insertToggleSidebarButton() {
    if (document.getElementById('ytToggleSidebarBtn')) return;

    const toggleBtn = createEl('button', {
      id: 'ytToggleSidebarBtn',
      text: 'Toggle Sidebar',
      style: {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: '11000',
        padding: '6px 10px',
        backgroundColor: '#1a73e8',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: '13px',
      },
      onclick: () => {
        const sidebar = document.getElementById('ytTranscriptSidebar');
        if (!sidebar) return;
        if (sidebar.style.display === 'none') {
          sidebar.style.display = 'flex';
        } else {
          sidebar.style.display = 'none';
        }
      }
    });

    document.body.appendChild(toggleBtn);
  }

  function extractTranscriptSegments() {
    // The transcript container id might be 'segments-container' or 'segments'
    // We try both for robustness
    const container = document.getElementById('segments-container') || document.querySelector('ytd-transcript-body-renderer #segments');
    if (!container) return [];

    const segments = container.querySelectorAll('ytd-transcript-segment-renderer .segment');
    return Array.from(segments).map(segment => ({
      timestamp: segment.querySelector('.segment-timestamp')?.innerText.trim() || '',
      text: segment.querySelector('.segment-text')?.innerText.trim() || ''
    }));
  }


  function getPlainTranscriptText() {
    const segments = extractTranscriptSegments();
    if (!segments.length) return '';

    return segments.map(s => s.text).join('\n');
  }

  function displayTranscript() {
    const contentDiv = document.getElementById('ytTranscriptContent');
    const errorDiv = document.getElementById('ytErrorMsg');

    const segments = extractTranscriptSegments();
    if (!segments.length) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = 'Transcript not available or not loaded.';
      contentDiv.textContent = '';
      return;
    }
    errorDiv.style.display = 'none';

    // Clear old content
    while (contentDiv.firstChild) contentDiv.removeChild(contentDiv.firstChild);

    // Add segments as paragraphs with timestamp bold
    segments.forEach(({ timestamp, text }) => {
      const p = createEl('p', { style: { margin: '4px 0' } });
      const timeSpan = createEl('strong', { text: timestamp + ' ' });
      p.appendChild(timeSpan);
      p.appendChild(document.createTextNode(text));
      contentDiv.appendChild(p);
    });
  }

  // Open the AI platform URL with prompt and transcript prefilled
  async function openAIPlatformWithPrompt(settings, transcriptText) {
    if (!settings.aiPlatform) {
      alert('AI platform not set. Please configure settings.');
      openSettingsPanel();
      return;
    }
    if (!transcriptText) {
      alert('Transcript is empty or unavailable.');
      return;
    }

    // Replace [transcript] placeholder with actual transcript
    const prompt = settings.prompt.replace('[transcript]', transcriptText);

    // URLs for AI platforms, with how to prefill prompt/query
    // These URLs and query param keys are examples and may need updating if platforms change

    let url;
    switch (settings.aiPlatform) {
      case 'chatgpt':
        url = 'https://chat.openai.com/chat';
        alert('ChatGPT does not support prompt prefill via URL. After the page opens, paste your prompt.\n\nPrompt copied to clipboard.');
        await navigator.clipboard.writeText(prompt);
        break;

      case 'gemini':
        url = 'https://gemini.google.com/';
        alert('Gemini does not support prompt prefill via URL. After page opens, paste your prompt.\n\nPrompt copied to clipboard.');
        await navigator.clipboard.writeText(prompt);
        break;

      case 'claude':
        url = 'https://claude.ai/';
        alert('Claude does not support prompt prefill via URL. After page opens, paste your prompt.\n\nPrompt copied to clipboard.');
        await navigator.clipboard.writeText(prompt);
        break;

      default:
        alert('Unsupported AI platform.');
        return;
    }

    window.open(url, '_blank');
  }

  // Show settings panel modal inside sidebar
  async function openSettingsPanel() {
    // Remove existing panel if any
    const oldPanel = document.getElementById('ytSettingsPanel');
    if (oldPanel) oldPanel.remove();

    const settings = await loadSettings();

    const panel = createEl('div', {
      id: 'ytSettingsPanel',
      style: {
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        backgroundColor: '#333',
        border: '1px solid #666',
        borderRadius: '6px',
        padding: '15px',
        zIndex: '11000',
        maxHeight: '90%',
        overflowY: 'auto',
      }
    });

    const title = createEl('h3', { text: 'Settings', style: { marginTop: '0', marginBottom: '10px' } });
    panel.appendChild(title);

    // AI platform selection
    const labelPlatform = createEl('label', { text: 'Select AI Platform:', style: { display: 'block', marginBottom: '6px' } });
    panel.appendChild(labelPlatform);

    const select = createEl('select', { style: { width: '100%', marginBottom: '12px', padding: '6px', borderRadius: '4px', border: 'none' } });
    [['chatgpt', 'ChatGPT (chat.openai.com)'], ['gemini', 'Gemini (gemini.google.com)'], ['claude', 'Claude (claude.ai)']].forEach(([val, label]) => {
      const option = createEl('option', { value: val, text: label });
      if (val === settings.aiPlatform) option.selected = true;
      select.appendChild(option);
    });
    panel.appendChild(select);

    // Custom prompt textarea
    const labelPrompt = createEl('label', { text: 'Custom Summary Prompt:', style: { display: 'block', marginBottom: '6px' } });
    panel.appendChild(labelPrompt);
    const textarea = createEl('textarea', {
      style: { width: '100%', height: '80px', borderRadius: '4px', padding: '6px', resize: 'vertical', border: 'none' },
      text: settings.prompt
    });
    panel.appendChild(textarea);

    // Save and Cancel buttons container
    const btnContainer = createEl('div', { style: { marginTop: '10px', textAlign: 'right' } });
    panel.appendChild(btnContainer);

    const saveBtn = createEl('button', {
      text: 'Save',
      style: {
        backgroundColor: '#0078d7',
        border: 'none',
        color: 'white',
        padding: '8px 12px',
        marginRight: '8px',
        borderRadius: '4px',
        cursor: 'pointer'
      },
      onclick: async () => {
        const newSettings = {
          aiPlatform: select.value,
          prompt: textarea.value.trim() || defaultSettings.prompt,
        };
        await saveSettings(newSettings);
        alert('Settings saved.');
        panel.remove();
      }
    });
    btnContainer.appendChild(saveBtn);

    const cancelBtn = createEl('button', {
      text: 'Cancel',
      style: {
        backgroundColor: '#666',
        border: 'none',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer'
      },
      onclick: () => panel.remove()
    });
    btnContainer.appendChild(cancelBtn);

    // Append panel inside sidebar
    const sidebar = document.getElementById('ytTranscriptSidebar');
    sidebar.appendChild(panel);
  }

  // On Summarize button clicked
  async function onSummarizeClick() {
    try {
      const settings = await loadSettings();
      const transcriptText = getPlainTranscriptText();
      if (!settings.aiPlatform) {
        alert('Please select an AI platform in settings first.');
        openSettingsPanel();
        return;
      }
      if (!transcriptText) {
        alert('Transcript is empty or unavailable.');
        return;
      }
      openAIPlatformWithPrompt(settings, transcriptText);
    } catch (err) {
      console.error('Summarize error:', err);
      alert('An error occurred while summarizing.');
    }
  }


  // Insert Summarize button near video player
  function insertSummarizeButton() {
    if (document.getElementById('ytSummarizeBtn')) return;

    // Find YouTube player container - try several selectors for robustness
    const videoPrimaryInfo = document.querySelector('#primary #info-contents') || document.querySelector('.ytd-watch-flexy #info-contents');
    if (!videoPrimaryInfo) {
      console.warn('Could not find YouTube video info container for Summarize button.');
      return;
    }

    const btn = createEl('button', {
      id: 'ytSummarizeBtn',
      text: 'Summarize',
      style: {
        marginLeft: '8px',
        padding: '8px 14px',
        fontSize: '14px',
        fontWeight: '600',
        backgroundColor: '#1a73e8',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        cursor: 'pointer',
        userSelect: 'none',
      },
      onclick: async () => {
        await onSummarizeClick();
      }
    });

    // Append summarize button next to the Subscribe or Save buttons, or to #info-contents container
    const buttonBar = videoPrimaryInfo.querySelector('#top-level-buttons-computed');
    if (buttonBar) {
      buttonBar.appendChild(btn);
    } else {
      // Fallback append directly
      videoPrimaryInfo.appendChild(btn);
    }
  }

  // Click "Show transcript" button to load transcript container
  async function openTranscriptPanel() {
    // Description might be collapsed, so click expand description first
    const descExpandBtn = document.querySelector('tp-yt-paper-button#expand');
    if (descExpandBtn && descExpandBtn.offsetParent !== null) {
      descExpandBtn.click();
      await new Promise(r => setTimeout(r, 700)); // wait a bit
    }

    // Now click "Show transcript" button
    const showTranscriptBtn = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.trim().toLowerCase() === 'show transcript'
    );
    if (showTranscriptBtn) {
      showTranscriptBtn.click();
      await new Promise(r => setTimeout(r, 700)); // wait for transcript panel
    } else {
      console.warn('Show transcript button not found');
    }
  }

  async function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const intervalTime = 300;
      let timePassed = 0;

      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else {
          timePassed += intervalTime;
          if (timePassed >= timeout) {
            clearInterval(interval);
            reject(`Timeout: Could not find element ${selector}`);
          }
        }
      }, intervalTime);
    });
  }
  // Initialization: add sidebar, button, open transcript, display transcript
  async function init() {
    try {
      await waitForElement('#primary #info-contents');
      await waitForElement('ytd-watch-flexy'); // Ensure page structure is loaded

      insertSidebar();
      insertToggleSidebarButton();
      insertSummarizeButton();
      await openTranscriptPanel(); // Tries to open transcript panel
      displayTranscript(); // Fills transcript into sidebar

    } catch (e) {
      console.warn('Initialization error:', e);
    }
  }


  // Run init, then observe DOM for transcript changes to update sidebar
  await init();

  // Observe transcript container changes to update sidebar transcript live
  const transcriptObserverTarget = document.getElementById('segments-container') || document.querySelector('ytd-transcript-body-renderer #segments');
  if (transcriptObserverTarget) {
    const observer = new MutationObserver(() => {
      displayTranscript();
    });
    observer.observe(transcriptObserverTarget, { childList: true, subtree: true });
  }




})();

