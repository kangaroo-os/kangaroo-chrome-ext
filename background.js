const BASE_URL = 'http://localhost:3000'
const CHROME_PDF_VIEWER = 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai'

// const downloadPDF = async (info, tab) => {
//   const currentTab = await getCurrentTab()
//   await chrome.tabs.sendMessage(currentTab.id, {event: "download-pdf", info: info, tab: tab });
// };

const downloadPDF = async (info, tab) => {
  if (info.srcUrl.startsWith(CHROME_PDF_VIEWER)) {
      const downloadResponse = await fetch(info.frameUrl)
      const blob = await downloadResponse.blob()
      const file = new File([blob], tab.title, { type: 'application/pdf' });
      const formData = new FormData()
      formData.append('file', file)
      const postResponse =  await fetch(`${BASE_URL}/cloud_files/upload`, {
        method: 'POST',
        body: formData
      })
  }
}


const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({ currentWindow: true, active: true })
  return tab
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === "cloud-file-detected") {
    (async () => {
        const { fileName } = message;
        const presignUrl = await retrievePresignUrlFromS3(fileName);
        sendResponse({ status: "ok", url: presignUrl });
      }
    )()
    return true;
  }
});

const retrievePresignUrlFromS3 = async (fileName) => {
  const res = await fetch(`${BASE_URL}/get_object?key=${fileName}`);
  const { url } = await res.json();
  return url;
};

chrome.contextMenus.create(
  {
    id: "kangaroo",
    title: "Download to Kangaroo",
    contexts: ["all"],
  }
)

chrome.contextMenus.onClicked.addListener(downloadPDF)