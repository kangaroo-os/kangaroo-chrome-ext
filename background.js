const BASE_URL = "http://localhost:3000";
const CHROME_PDF_VIEWER = "chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai";
const CHROME_PDF_VIEWER_NO_PROTOCOL = "mhjfbmdgcfjbbpaeojofohoefgiehjai";

const uploadFileToKangaroo = async (name, url, type) => {
  const downloadResponse = await fetch(url);
  const blob = await downloadResponse.blob();
  const file = new File([blob], name, { type: type });
  const formData = new FormData();
  formData.append("file", file);
  const postResponse = await fetch(`${BASE_URL}/cloud_files/upload`, {
    headers: await getAuthHeader(),
    method: "POST",
    body: formData,
  });
};

// Prevents the file dialogue from showing
// Automatically downloads the file to Kangaroo
chrome.downloads.onDeterminingFilename.addListener((e) => {
  chrome.downloads.cancel(e.id)
  uploadFileToKangaroo(e.filename, e.finalUrl, e.mime)
})

const fetchSessionTokenFromKangaroo = () => {
  return localStorage.getItem("user");
};

const fetchSessionToken = async () => {
  const tab = await getKangarooTab();
  try {
    if (tab) {
      const [scriptResponse] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: fetchSessionTokenFromKangaroo,
      });
      const { accessToken, client, email, tokenExpiresAt } = JSON.parse(
        scriptResponse.result
      );
      await chrome.storage.local.set({
        auth_header: {
          "access-token": accessToken,
          client: client,
          expiry: tokenExpiresAt,
          uid: email,
          "token-type": "Bearer",
        },
      });
      return true;
    }
  } catch (e) {
    console.log(e || "Ran into an error finding the access token");
    return false;
  }
};

const getKangarooTab = async () => {
  const tabs = await chrome.tabs.query({});
  for (let i = 0; i < tabs.length; i++) {
    const url = tabs[i].url;
    if (url?.startsWith(BASE_URL)) {
      return tabs[i];
    }
  }
  console.error('Could not find Kangaroo tab');
  return null;
};

const fetchAuth = async () => {
  return fetchSessionToken();
};

const getFilesFromS3 = async () => {
  const res = await fetch(`${BASE_URL}/cloud_files`, {
    headers: await getAuthHeader(),
  });
  const { files } = await res.json();
  return files;
};

const getAuthHeader = async () => {
  const storage = await chrome.storage.local.get("auth_header");
  return storage.auth_header;
};

const retrieveFileFromS3 = async (fileId) => {
  const res = await fetch(`${BASE_URL}/cloud_files/${fileId}`, {
    headers: await getAuthHeader(),
  });
  return res.json();
};

const uploadLinkToKangaroo = async (url) => {
  await fetch(`${BASE_URL}/link_files/upload`, {
    headers: {
      ...(await getAuthHeader()),
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      path: url,
    }),
  });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === "cloud-file-detected") {
    (async () => {
      if (await fetchAuth()) {
        const { fileId } = message;
        const file = await retrieveFileFromS3(fileId);
        sendResponse({
          status: "ok",
          url: file.url,
          name: file.name,
          fileType: file.file_type,
        });
      }
    })();
  } else if (message.event === "upload-to-kangaroo-from-url") {
    (async () => {
      if (await fetchAuth()) {
        let { name, url, type } = message;
        if (!name) {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          name = tab.title;
        }
        uploadFileToKangaroo(name, url, type);
        sendResponse({ status: "ok" });
      }
    })();
  } else if (message.event === "get-file-list") {
    (async () => {
      if (await fetchAuth()) {
        const files = await getFilesFromS3();
        sendResponse({ status: "ok", files: files });
      }
    })();
  } else if (message.event === "save-current-website") {
    (async () => {
      // if (await fetchAuth()) {
        await uploadLinkToKangaroo(message.url);
        sendResponse({ status: "ok" });
      // }
    })();
  }
  return true;
});

function getUserData() {
  return localStorage.getItem("user_data");
}

const getAuthFromKangaroo = async () => {
  const tab = await getKangarooTab();
  try {
    if (tab) {
      const [scriptResponse] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getUserData,
      });
      const { id, email } = JSON.parse(
        scriptResponse.result
      );
      const data = await fetch(`${BASE_URL}/auth/chrome_extension/generate_verification_link`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            email: email,
            id: id,
          })
      })
      const json = await data.json()
      debugger
    }
  } catch (e) {
    console.log(e || "Ran into an error finding user data");
    return false;
  }
};

(async () => (await getAuthFromKangaroo()))();