const injectScript = () => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('script.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}
injectScript()

const save = async (handle, text) => {
  // creates a writable, used to write data to the file.
  const writable = await handle.createWritable();
  // write a string to the writable.
  await writable.write(text);
  // close the writable and save all changes to disk. this will prompt the user for write permission to the file, if it's the first time.
  await writable.close();
}

const syncWithCloud = async () => {
  const directoryHandle = await window.showDirectoryPicker();
  const res = await fetch(
    "https://0gfitk1wo8.execute-api.us-east-1.amazonaws.com/default/s3-read"
  );
  const json = await res.json();
  json["Contents"].forEach(async (obj) => {
    const fileHandle = await directoryHandle.getFileHandle(obj["Key"], {
      create: true,
    });
    await save(fileHandle, "blank");
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === 'sync-files') {
    syncWithCloud();
    sendResponse({status: 'ok'});
  }
});
