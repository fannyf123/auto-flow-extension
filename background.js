// Handle download request dari content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DOWNLOAD') {
    chrome.downloads.download({
      url: msg.url,
      filename: `AutoFlow/${msg.filename}`,
      saveAs: false
    }, downloadId => {
      sendResponse({ downloadId });
    });
    return true;
  }
});
