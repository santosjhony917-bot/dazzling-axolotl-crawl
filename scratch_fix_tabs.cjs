const fs = require('fs');

const retryLogic = `
async function createTabWithRetry(options, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.create(options);
    } catch (e) {
      if (e.message && e.message.includes('Tabs cannot be edited right now')) {
        console.warn('Chrome is locked (user dragging tab). Retrying tab creation...', i);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Timeout: Chrome tabs locked for too long.');
}

async function removeTabWithRetry(tabId, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.remove(tabId);
      return;
    } catch (e) {
      if (e.message && e.message.includes('Tabs cannot be edited right now')) {
        console.warn('Chrome is locked (user dragging tab). Retrying tab remove...', i);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        return; // Ignore other remove errors
      }
    }
  }
}

async function updateTabWithRetry(tabId, options, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chrome.tabs.update(tabId, options);
    } catch (e) {
      if (e.message && e.message.includes('Tabs cannot be edited right now')) {
        console.warn('Chrome is locked (user dragging tab). Retrying tab update...', i);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Timeout: Chrome tabs locked for too long.');
}
`;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('createTabWithRetry')) return;
  content = retryLogic + '\n\n' + content;
  content = content.replace(/await chrome\.tabs\.create/g, 'await createTabWithRetry');
  content = content.replace(/await chrome\.tabs\.remove/g, 'await removeTabWithRetry');
  content = content.replace(/await chrome\.tabs\.update/g, 'await updateTabWithRetry');
  content = content.replace(/chrome\.tabs\.remove\(tabId\)\.catch\(\(\) => \{\}\)/g, 'removeTabWithRetry(tabId)');
  content = content.replace(/chrome\.tabs\.remove\(tabId\)/g, 'removeTabWithRetry(tabId)');
  fs.writeFileSync(filePath, content);
}

processFile('dist/chrome-extension/background.js');
processFile('public/chrome-extension/background.js');
console.log('Retry logic injected into both files!');
