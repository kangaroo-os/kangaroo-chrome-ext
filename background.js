const BASE_URL = 'http://localhost:3000'
const CHROME_PDF_VIEWER = 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai'
const CHROME_PDF_VIEWER_NO_PROTOCOL = 'mhjfbmdgcfjbbpaeojofohoefgiehjai'

const uploadFileToKangaroo = async (name, url, type) => {
  const downloadResponse = await fetch(url)
  const blob = await downloadResponse.blob()
  const file = new File([blob], name, { type: type });
  const formData = new FormData()
  formData.append('file', file)
  const postResponse =  await fetch(`${BASE_URL}/cloud_files/upload`, {
    headers: await getAuthHeader(),
    method: 'POST',
    body: formData
  })
}

// const reloadUploadOptions = async () => {
  // chrome.contextMenus.removeAll()
  // chrome.contextMenus.create(
  //   {
  //     id: "kangaroo-download",
  //     title: "Download to Kangaroo",
  //     contexts: ["frame"],
  //   }
  // )
  // chrome.contextMenus.create(
  //   {
  //     id: "kangaroo-upload",
  //     title: "Upload from Kangaroo",
  //     contexts: ["all"],
  //   }
  // )
  // const files = await getFilesFromS3()
  // await chrome.storage.local.set({'cloud_files': files})
  // files.map(({name, id}) => {
  //   chrome.contextMenus.create({
  //     title: name,
  //     id: `kangaroo-upload-${id}`,
  //     parentId: 'kangaroo-upload',
  //     contexts: ['all'],
  //     type: 'checkbox'
  //   })
  // })
// }

// const queueUpload = async (info, tab) => {
//   const object = {}
//   const tabUrl = tab.url.match(/\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];
//   const currentlyStored = (await chrome.storage.local.get(tabUrl))[tabUrl] || []
//   if (info.checked) {
//     object[tabUrl] = [...currentlyStored, info.menuItemId]
//   } else {
//     object[tabUrl] = currentlyStored.filter(id => id !== info.menuItemId)
//   }
//   return chrome.storage.local.set(object)
// }

// const downloadFile = async (info, tab) => {
//   if (true) {
//     await downloadAndReuploadPdf(info, tab)
//   } else {
//     // Sent file link to lambda for download
//   }
// }

// const handleMenuClick = async (info, tab) => {
//   if (await fetchAuth()) {
//     switch (info.menuItemId) {
//       case 'kangaroo-download':
//         await downloadFile(info, tab)
//         break;
//       case 'kangaroo-upload':
//         break;
//       default:
//         if (info.menuItemId.startsWith('kangaroo-upload-')) {
//           await queueUpload(info, tab);
//         }
//         break;
//     }
//   } else {
//     console.error("error")
//   }
// }

const fetchSessionTokenFromKangaroo = () => {
  return sessionStorage.getItem('user')
}

const fetchSessionToken = async () => {
  const tab = await getKangarooTab()
  try {
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
      return true
    }
  } catch (e) {
    console.log(e || "Ran into an error finding the access token")
    return false
  }
}

const getKangarooTab = async () => {
  const tabs = await chrome.tabs.query({})
  for (let i = 0; i < tabs.length; i++) {
    const url = tabs[i].url
    if (url?.startsWith(BASE_URL)) {
      return tabs[i]
    }
  }
  return null
}

const fetchAuth = async () => {
  return fetchSessionToken()
}

const getFilesFromS3 = async () => {
  const res = await fetch(`${BASE_URL}/cloud_files`, {
    headers: await getAuthHeader()
  });
  const { files } = await res.json();
  return files
}

const getAuthHeader = async () => {
  const storage = await chrome.storage.local.get('auth_header')
  return storage.auth_header
}

const retrieveFileFromS3 = async (fileId) => {
  const res = await fetch(`${BASE_URL}/cloud_files/${fileId}`, {
    headers: await getAuthHeader()
  });
  return res.json();
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message.event)
  if (message.event === "cloud-file-detected") {
    (async () => {
        const { fileId } = message;
        const file = await retrieveFileFromS3(fileId);
        sendResponse({ status: "ok", url: file.url, name: file.name, fileType: file.file_type });
      }
    )()
  } else if (message.event === 'upload-to-kangaroo-from-url') {
    (async () => {
        let { name, url, type } = message;
        if (!name) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
          name = tab.title
        }
        uploadFileToKangaroo(name, url, type);
        sendResponse({ status: "ok" });
      }
    )()
  } else if (message.event === 'get-file-list') {
    (async () => {
        console.log("test")
        const files = await getFilesFromS3();
        sendResponse({ status: "ok", files: files });
      }
    )()
  }
  return true;
});

// reloadUploadOptions()
// chrome.contextMenus.onClicked.addListener(handleMenuClick)