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
  } else if (message.event === 'download-pdf') {
    (async () => {
      await downloadPDF(message.info, message.tab);
      sendResponse({status: 'ok'});
    })();
    return true
  }
});

const downloadPDF = async (info, tab) => {
  // if (info.srcUrl.startsWith(CHROME_PDF_VIEWER)) {
  //     const downloadResponse = await fetch(info.frameUrl)
  //     const blob = await downloadResponse.blob()
  //     const file = new File([blob], tab.title, { type: 'application/pdf' });
  //     const formData = new FormData()
  //     formData.append('file', file)
  //     const postResponse =  await fetch(`${BASE_URL}/cloud_files/upload`, {
  //       method: 'POST',
  //       body: formData
  //     })
  // }
}

const getFileNames = async () => {
  (await getCloudFiles()).map((file) => file.name)
}

const getCloudFiles = async () => {
  const storage = await chrome.storage.local.get('cloud_files')
  const cloudFiles = storage['cloud_files']
  if (!cloudFiles) {
    alert("failed to get name of files from S3")
  }
  return JSON.parse(cloudFiles)
}

// Maybe prefetch the item first?
const scanAndReplaceFiles = async (event) => {
  const input = event.target;
  const dT = new DataTransfer();
  for (let i = 0; i < input.files.length; i++) {
    let file = input.files[i];
    const fileNamesFromS3 = await getFileNames();
    if (fileNamesFromS3?.some((key) => key === file.name)) {
      console.log("cloud file detected");
      const response = await chrome.runtime.sendMessage({event: 'cloud-file-detected', fileName: file.name});
      if (response.status === 'ok') {
        const res = await fetch(response.url)
        const blob = await res.blob()
        const fileFromS3 = new File([blob], file.name, { type: file.type});
        file = fileFromS3
      }
    }
    dT.items.add(file);
  }
  input.files = dT.files;
};

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

    // Accept our hack to use .cloud files
    const type_of_files = inputElem.getAttribute("accept")
    if (!!type_of_files) {
      inputElem.setAttribute('accept', type_of_files.concat(',.cloud'))
    }
  }

  const callback = function (mutationsList, observer) {
    addListeners();
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);
};
