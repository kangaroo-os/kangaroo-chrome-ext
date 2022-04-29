const BASE_URL = 'http://localhost:3000'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === "cloud-file-detected") {
    (async () => {
        debugger
        const { fileName, fileType } = message;
        const file = await retrieveFileFromS3(fileName, fileType);
        sendResponse({ status: "ok", file: file });
      }
    )()
    return true;
  }
});

const retrieveFileFromS3 = async (fileName, fileType) => {
  const res = await fetch(`${BASE_URL}/get_object?key=${fileName}`);
  const blob = await res.blob();
  cloudFile = new File([blob], fileName, { type: fileType });
  return cloudFile;
};
