const BASE_URL = 'http://localhost:3000'

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
