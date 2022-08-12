const DEVELOPMENT_URL = "http://localhost:3000";
const PRODUCTION_URL = "https://kangarooos.com";
const BASE_URL = DEVELOPMENT_URL;

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.pendingUrl === 'chrome://newtab/') {
    await chrome.tabs.update({url: `${BASE_URL}/desktop`});
  }
})

const uploadFileToKangaroo = async (name, url, type) => {
  const downloadResponse = await fetch(url)
  const blob = await downloadResponse.blob()
  const file = new File([blob], name, { type: type })
  const formData = new FormData()
  formData.append('file', file)
  await fetch(`${BASE_URL}/cloud_files`, {
    headers: await getAuthHeader(),
    method: 'POST',
    body: formData,
  })
}

// Prevents the file dialogue from showing
// Automatically downloads the file to Kangaroo
chrome.downloads.onDeterminingFilename.addListener(async (item, suggest) => {
  suggest({
    filename: item.filename,
    conflict_action: 'prompt',
    conflictAction: 'prompt'
  })
  if (!pressedKeys['ShiftLeft']) {
    chrome.downloads.cancel(item.id)
    await fetchSessionToken()
    uploadFileToKangaroo(item.filename, item.finalUrl, item.mime)
  }
})

const fetchSessionTokenFromKangaroo = () => {
  return localStorage.getItem('user')
}

const fetchSessionToken = async () => {
  const tab = await getKangarooTab()
  try {
    if (tab) {
      const [scriptResponse] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: fetchSessionTokenFromKangaroo,
      })
      const { accessToken, client, email, tokenExpiresAt } = JSON.parse(scriptResponse.result)
      await chrome.storage.local.set({
        auth_header: {
          'access-token': accessToken,
          client: client,
          expiry: tokenExpiresAt,
          uid: email,
          'token-type': 'Bearer',
        },
      })
      return true
    }
  } catch (e) {
    console.error(e || 'Ran into an error finding the access token')
    return false
  }
}

const getKangarooTab = async () => {
  const tabs = await chrome.tabs.query({
    url: `${BASE_URL}/*`,
  })
  for (let i = 0; i < tabs.length; i++) {
    const url = tabs[i].url
    // Double check? Don't want reach into other people's stuff.
    if (url?.startsWith(BASE_URL)) {
      return tabs[i]
    }
  }
  console.error('Could not find Kangaroo tab')
  return null
}

const getFilesFromS3 = async () => {
  const res = await fetch(`${BASE_URL}/cloud_files`, {
    headers: await getAuthHeader(),
  })
  const { files } = await res.json()
  return files
}

const getAuthHeader = async () => {
  const storage = await chrome.storage.local.get('auth_header')
  return storage.auth_header
}

const retrieveFileFromS3 = async (fileId) => {
  const res = await fetch(`${BASE_URL}/cloud_files/${fileId}`, {
    headers: await getAuthHeader(),
  })
  return res.json()
}

const uploadLinkToKangaroo = async (url) => {
  await fetch(`${BASE_URL}/link_files`, {
    headers: {
      ...(await getAuthHeader()),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      path: url,
    }),
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === 'cloud-file-detected') {
    ;(async () => {
      if (await fetchSessionToken()) {
        try {
          const { fileId } = message
          const file = await retrieveFileFromS3(fileId)
          sendResponse({
            status: 'ok',
            url: file.url,
            name: file.name,
            fileType: file.file_type,
          })
        } catch (e) {
          sendResponse({
            status: 'error',
            error: e,
          })
        }
      }
    })()
  } else if (message.event === 'upload-to-kangaroo-from-url') {
    ;(async () => {
      if (await fetchSessionToken()) {
        try {
          let { name, url, type } = message
          if (!name) {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            })
            name = tab.title
          }
          uploadFileToKangaroo(name, url, type)
          sendResponse({ status: 'ok' })
        } catch (e) {
          sendResponse({ status: 'error', error: e })
        }
      }
    })()
  } else if (message.event === 'get-file-list') {
    ;(async () => {
      if (await fetchSessionToken()) {
        try {
          const files = await getFilesFromS3()
          sendResponse({ status: 'ok', files: files })
        } catch (e) {
          sendResponse({ status: 'error', error: e })
        }
      }
    })()
  } else if (message.event === 'key-pressed') {
    pressedKeys[message.key] = true
    handleKeyClicks()
    console.log(pressedKeys)
  } else if (message.event === 'key-released') {
    delete pressedKeys[message.key]
  }
  return true
})

const pressedKeys = {

}

const handleKeyClicks = () => {
  requiredKeys = ['ShiftLeft', 'MetaLeft', 'KeyS']
  if (requiredKeys.every(key => pressedKeys[key])) {
    (async () => {
      if (await fetchSessionToken()) {
        try {
          await uploadLinkToKangaroo(message.url)
          sendResponse({ status: 'ok' })
        } catch (e) {
          sendResponse({ status: 'error', error: e })
        }
      }
    })()
  }
}

function getUserData() {
  return localStorage.getItem('user_data')
}
