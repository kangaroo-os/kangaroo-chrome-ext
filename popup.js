const BASE_URL = "http://localhost:3000";

const tellContentScriptToSyncFiles = async () => {
  await chrome.runtime.sendMessage({event: "sync-files" });
};

const fetchSessionTokenFromWebapp = async () => {
  let successful = false
  const tabs = await chrome.tabs.query({ currentWindow: true})
  for (let i = 0; i < tabs.length; i++) {
    const url = tabs[i].url
    if (!successful && url.startsWith(BASE_URL)) {
      const cookie = await chrome.cookies.get({name: 'kangaroo_token', url: url})
      localStorage.setItem('kangaroo_token', cookie.value);
      successful = true
    }
  }
  await handleSessionChange(successful)
}

const handleSessionChange = async (successful) => {
  if (!successful) {
    alert('Please open and log in into Kangaroo and retry')
  } else {
    const res = await fetch(`${BASE_URL}/files`, {
      method: 'GET',
      headers: new Headers({
        'Authorization': `Bearer ${localStorage.getItem('kangaroo_token')}`,
      }),
    });
    const { files } = await res.json();
    await chrome.storage.local.set({'file_names_s3': JSON.stringify(files)})
    document.getElementById('test-btn').style.display = 'block';
  }
}

// Should make wrapper around api calls to server
const test = async () => {
};

window.onload = () => {
  document.getElementById('test-btn').addEventListener("click", test);
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
  document.getElementById('sync-session-btn').addEventListener("click", fetchSessionTokenFromWebapp);
}
