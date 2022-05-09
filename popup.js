const BASE_URL = "http://localhost:3000";

// chrome.runtime.onMessage.addListener(
//   function(request, sender, sendResponse) {
//     if (request.event === "check-auth") {
//       (async () => {
//         const foundSessionToken = !!(await fetchSessionToken())
//         sendResponse({ result: foundSessionToken })
//       })();
//     }
//     debugger
//     return true
//   }
// );

// const fetchSessionTokenFromKangaroo = () => {
//   return sessionStorage.getItem('user')
// }

// const fetchSessionToken = async () => {
//   const tab = await getKangarooTab()
//   try {
//     if (tab) {
//       const [scriptResponse] = await chrome.scripting.executeScript({
//         target: { tabId: tab.id },
//         function: fetchSessionTokenFromKangaroo
//       })
//       const { accessToken, client, email, tokenExpiresAt } = JSON.parse(scriptResponse.result)
//       await chrome.storage.local.set({'auth_header': {
//         'access-token': accessToken,
//         'client': client,
//         'expiry': tokenExpiresAt,
//         'uid': email,
//         'token-type': 'Bearer',
//       }})
//       return true
//     }
//   } catch (e) {
//     console.log(e || "Ran into an error finding the access token")
//     return false
//   }
// }

// const getAuthHeader = async () => {
//   const storage = await chrome.storage.local.get('auth_header')
//   return storage.auth_header
// }

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })
  return tab
}

// const getKangarooTab = async () => {
//   const tabs = await chrome.tabs.query({ currentWindow: true})
//   for (let i = 0; i < tabs.length; i++) {
//     const url = tabs[i].url
//     if (url?.startsWith(BASE_URL)) {
//       return tabs[i]
//     }
//   }
//   return null
// }

const tellContentScriptToSyncFiles = async () => {
  const tab = await getCurrentTab()
  await chrome.tabs.sendMessage(tab.id, {event: "sync-files" });
};

window.onload = () => {
  document.getElementById('test-btn').addEventListener("click", async () => {
    await fetch(`${BASE_URL}/logout`, {
      method: "DELETE"
    })
  })
  document.getElementById('sync-btn').addEventListener("click", tellContentScriptToSyncFiles);
  // document.getElementById('sync-session-btn').addEventListener("click", fetchSessionToken);
}
