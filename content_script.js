const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = 'true'
const FALSE = 'false'
const BASE_URL = 'http://localhost:3000'
const CHROME_PDF_VIEWER = 'chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai'

const save = async (handle, text) => {
  // creates a writable, used to write data to the file.
  const writable = await handle.createWritable();
  // write a string to the writable.
  await writable.write(text);
  // close the writable and save all changes to disk. this will prompt the user for write permission to the file, if it's the first time.
  await writable.close();
}

const syncWithCloud = async () => {
  const directoryHandle = await window.showDirectoryPicker();
  const res = await fetch(
    "https://0gfitk1wo8.execute-api.us-east-1.amazonaws.com/default/s3-read"
  );
  const json = await res.json();
  json["Contents"].forEach(async (obj) => {
    const fileHandle = await directoryHandle.getFileHandle(obj["Key"], {
      create: true,
    });
    await save(fileHandle, "blank");
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.event === 'sync-files') {
    (async () => {
      await syncWithCloud();
      sendResponse({status: 'ok'});
    })();
    return true
  }
});

const getFileNames = async () => {
  (await getCloudFiles()).map((file) => file.name)
}

const getCloudFiles = async () => {
  const storage = await chrome.storage.local.get('cloud_files')
  const cloudFiles = storage.cloud_files
  if (!cloudFiles || !cloudFiles.length) {
    if (!cloudFiles) {
      alert('No cloud files detected. Please sync with the cloud.')
    }
    return []
  }
  return JSON.parse(cloudFiles)
}

// const fileNamesFromS3 = await getFileNames();
// if (fileNamesFromS3?.some((key) => key === file.name)) {
//   console.log("cloud file detected");
//   const response = await chrome.runtime.sendMessage({event: 'cloud-file-detected', fileName: file.name});
//   if (response.status === 'ok') {
//     const res = await fetch(response.url)
//     const blob = await res.blob()
//     const fileFromS3 = new File([blob], file.name, { type: file.type});
//     file = fileFromS3
//   }
// }

// Maybe prefetch the item first?
const scanAndReplaceFiles = async (event) => {
  const input = event.target;
  const dT = new DataTransfer();
  for (let i = 0; i < input.files.length; i++) {
    let file = input.files[i];
    dT.items.add(file);
  }
  const queuedCloudIds = await retrieveQueuedCloudIds();
  for (const cloudId of queuedCloudIds) {
    const { status, url, name, fileType } = await chrome.runtime.sendMessage({event: 'cloud-file-detected', fileId: cloudId});
    if (status === 'ok') {
      const res = await fetch(url)
      const blob = await res.blob()
      const fileFromS3 = new File([blob], name, { type: fileType });
      dT.items.add(fileFromS3);
    }
  }
  input.files = dT.files;
  await chrome.storage.local.remove(getHostname())
};

const retrieveQueuedCloudIds = async () => {
  const hostname = getHostname()
  const storage = await chrome.storage.local.get(hostname)
  const contextMenuIds = storage[hostname]
  return contextMenuIds.map((contextMenuId) => contextMenuId.split('-')[2])
}

const getHostname = () => {
  return window.location.href.match(/\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];
}

const onChange = async (event) => {
  const input = event.target;
  if (isFileInput(input) && hasFiles(input)) {
    console.log("File input detected.");
    if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
      event.stopImmediatePropagation();
      // Don't intercept when we refire the event
      input.setAttribute(SHOULD_INTERCEPT, FALSE);
      await scanAndReplaceFiles(event);
      input.dispatchEvent(new Event('change', event));
    } else if(input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
      // Reset for next time
      input.setAttribute(SHOULD_INTERCEPT, TRUE);
    }
  }
};

const isFileInput = (elem) => {
  return elem.nodeName === "INPUT" && elem.type === "file";
}

const hasFiles = (input) => {
  return input.files.length > 0
}

// Keep track of listeners and then remove and reapply once HTML changes (MutationObserver)
window.onload = () => {
  const targetNode = document.querySelector("html");
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Add listeners to new input[type=file] buttons
  const addListeners = () => {
    inputButtons = document.querySelectorAll("input[type='file']")

    inputButtons.forEach((inputElem) => {
      if (inputElem.getAttribute(SHOULD_INTERCEPT) === null) {
        setupToolset(inputElem)
        inputElem.addEventListener("change", (event) => onChange(event), true);
        console.log("New input button detected.");
      }
    });
  };

  const setupToolset = (inputElem) => {
    inputElem.setAttribute(SHOULD_INTERCEPT, TRUE);
  }

  const callback = function (mutationsList, observer) {
    addListeners();
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);
};
