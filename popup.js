const BASE_URL = "http://localhost:3000";

const tellContentScriptToSyncFiles = async () => {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true})
    chrome.tabs.sendMessage(tabs[0].id, {event: "sync-files" });
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
  if (!successful) {
    alert('Please open and log into kangaroo first')
  }
}

const test = async () => {
  const res = await fetch(`${BASE_URL}/files`, {
    method: 'GET',
    headers: new Headers({
      'Authorization': `Bearer ${localStorage.getItem('kangaroo_token')}`,
    }),
  });
  alert(JSON.stringify(await res.json()))
};

window.onload = () => {
  document.getElementById('test-btn').addEventListener("click", test);
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
  document.getElementById('sync-session-btn').addEventListener("click", fetchSessionTokenFromWebapp);
}
