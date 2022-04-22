const tellContentScriptToSyncFiles = async () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {event: "sync-files" });
  });
};

window.onload = () => {
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
}
