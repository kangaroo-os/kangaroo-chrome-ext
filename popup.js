const BASE_URL = "http://localhost:3000";

const tellContentScriptToSyncFiles = async () => {
  await chrome.runtime.sendMessage({event: "sync-files" });
};

const fetchSessionTokenFromWebapp = async () => {
  await handleSessionChange(!!(await getKangarooTab()))
}

const getFileNamesFromS3 = async () => {
  const res = await fetch(`${BASE_URL}/files`);
  const { files } = await res.json();
  return files
}

const getKangarooTab = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true})
  for (let i = 0; i < tabs.length; i++) {
    const url = tabs[i].url
    if (url?.startsWith(BASE_URL)) {
      return tabs[i]
    }
  }
  return null
}

const handleSessionChange = async (successful) => {
  if (!successful) {
    alert('Please open and log in into Kangaroo and retry')
  } else {
    const tab = await getKangarooTab()
    if (tab) {
      const fileNames = await getFileNamesFromS3()
      await chrome.storage.local.set({'file_names_s3': JSON.stringify(fileNames)})
      document.getElementById('test-btn').style.display = 'block';
    }
  }
}

window.onload = () => {
  document.getElementById('test-btn')
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
  document.getElementById('sync-session-btn').addEventListener("click", fetchSessionTokenFromWebapp);
}
