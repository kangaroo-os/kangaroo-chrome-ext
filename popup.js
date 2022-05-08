const BASE_URL = "http://localhost:3000";

const tellContentScriptToSyncFiles = async () => {
  const tab = await getCurrentTab()
  await chrome.tabs.sendMessage(tab.id, {event: "sync-files" });
};

const fetchSessionTokenFromKangaroo = () => {
  return sessionStorage.getItem('user')
}

const fetchSessionToken = async () => {
  const tab = await getKangarooTab()
  if (tab) {
    const [scriptResponse] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fetchSessionTokenFromKangaroo
    })
    const { accessToken, client, email, tokenExpiresAt } = JSON.parse(scriptResponse.result)
    await chrome.storage.local.set({'auth_header': {
      'access-token': accessToken,
      'client': client,
      'expiry': tokenExpiresAt,
      'uid': email,
      'token-type': 'Bearer',
    }})
  }
}

const getFileNamesFromS3 = async () => {
  const res = await fetch(`${BASE_URL}/cloud_files`);
  const { files } = await res.json();
  return files
}

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })
  return tab
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

window.onload = () => {
  document.getElementById('test-btn').addEventListener("click", async () => {
    await fetch(`${BASE_URL}/logout`, {
      method: "DELETE"
    })
  })
  // document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
  document.getElementById('sync-session-btn').addEventListener("click", fetchSessionToken);
}
