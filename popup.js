const save = async (handle, text) => {
  // creates a writable, used to write data to the file.
  const writable = await handle.createWritable();
  // write a string to the writable.
  await writable.write(text);
  // close the writable and save all changes to disk. this will prompt the user for write permission to the file, if it's the first time.
  await writable.close();
}

const tellContentScriptToSyncFiles = async () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {event: "sync-files" }, () => {});
  });
};

window.onload = () => {
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
}
