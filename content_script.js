const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = 'true'
const FALSE = 'false'
const BASE_URL = 'http://localhost:3000'

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.event === 'sync-files') {
//     (async () => {
//       await syncWithCloud();
//       sendResponse({status: 'ok'});
//     })();
//     return true
//   }
// });

// const getFileNames = async () => {
//   (await getCloudFiles()).map((file) => file.name)
// }

// const getCloudFiles = async () => {
//   const storage = await chrome.storage.local.get('cloud_files')
//   const cloudFiles = storage.cloud_files
//   if (!cloudFiles || !cloudFiles.length) {
//     if (!cloudFiles) {
//       alert('No cloud files detected. Please sync with the cloud.')
//     }
//     return []
//   }
//   return JSON.parse(cloudFiles)
// }

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
  debugger
  const input = event.target;
  const dT = new DataTransfer();
  for (let i = 0; i < input.files.length; i++) {
    let file = input.files[i];
    dT.items.add(file);
  }
  // const queuedCloudIds = await retrieveQueuedCloudIds();
  // for (const cloudId of queuedCloudIds) {
  //   const { status, url, name, fileType } = await chrome.runtime.sendMessage({event: 'cloud-file-detected', fileId: cloudId});
  //   if (status === 'ok') {
  //     const res = await fetch(url)
  //     const blob = await res.blob()
  //     const fileFromS3 = new File([blob], name, { type: fileType });
  //     dT.items.add(fileFromS3);
  //   }
  // }
  const fileFromS3 = new File([], 'name', { type: 'application/pdf' });
  dT.items.add(fileFromS3);
  input.files = dT.files;
};

// const retrieveQueuedCloudIds = async () => {
//   const hostname = getHostname()
//   const storage = await chrome.storage.local.get(hostname)
//   const contextMenuIds = storage[hostname] || []
//   return contextMenuIds.map((contextMenuId) => contextMenuId.split('-')[2])
// }

// const getHostname = () => {
//   return window.location.href.match(/\:\/\/([^\/?#]+)(?:[\/?#]|$)/i)[1];
// }

const onChange = async (event) => {
  const input = event.target;
  if (isFileInput(input) && hasFiles(input)) {
    console.log("File input detected.");
    if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
      event.stopImmediatePropagation();
      // Don't intercept when we refire the event
      input.setAttribute(SHOULD_INTERCEPT, FALSE);
      input.dispatchEvent(new Event('change', event));
    } else if(input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
      // Reset for next time
      input.setAttribute(SHOULD_INTERCEPT, TRUE);
    }
  } else if (isFileInput(input)) {
    debugger
    // await scanAndReplaceFiles(event);
  }
};

const checkIfCancelled = (event, input) => {
  if (input.value.length) {
    alert('Files Loaded');
  } else {
    alert('Cancel clicked');
  }
  document.body.onfocus = null;
  const dT = new DataTransfer();
  const fileFromS3 = new File([0], 'name', { type: 'application/pdf' });
  dT.items.add(fileFromS3);
  input.files = dT.files
  onChange(event);
}

const onClick = async (event) => {
  const input = event.target
  debugger
  if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
    event.stopImmediatePropagation();
    // document.body.onfocus = () => checkIfCancelled(event, input);
    event.preventDefault();

    const body = document.body
    const img = document.createElement('img')
    img.src = "https://upload.wikimedia.org/wikipedia/commons/9/9d/Circle-icons-download.svg"
    img.style = "position: absolute; top: 15px; right: 140px; width: 25px; cursor:pointer;z-index:9999"
    img.addEventListener('click', async () => {
      const res = await chrome.runtime.sendMessage({
        event: "get-file-list"
      });
      const fileSelection = []
      res.files.forEach((file) => {
        const useThisFile = confirm(`Use ${file.name}?`)
        if (useThisFile) {
          fileSelection.push(file)
        }
      })
      await chrome.storage.local.set({'fileSelection': JSON.stringify(fileSelection)})
      const button = document.createElement('button')
      button.innerText = 'Move on'
      button.style = "position: absolute; top: 15px; right: 140px; width: 25px; cursor:pointer;z-index:9999"
      button.addEventListener('click', (event) => {
        event.preventDefault()
        input.dispatchEvent(new PointerEvent('click', event));
      })
      body.insertBefore(button, document.body.firstChild);
      img.remove()
    })
    body.insertBefore(img, document.body.firstChild);
    input.setAttribute(SHOULD_INTERCEPT, FALSE);
    
  } else if(input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
    // Reset for next time
    input.setAttribute(SHOULD_INTERCEPT, TRUE);
  }
}

const isFileInput = (elem) => {
  return elem.nodeName === "INPUT" && elem.type === "file";
}

const hasFiles = (input) => {
  return input.files.length > 0
}

const isChromePDFViewer = () => {
  const embed = document.querySelector("[type='application/pdf'][src='about:blank']")
  return !!embed
}

const addDownloadButton = (customStyle) => {
  const body = document.body
  const img = document.createElement('img')
  img.style = customStyle
  img.src = "https://upload.wikimedia.org/wikipedia/commons/9/9d/Circle-icons-download.svg"
  img.addEventListener('click', async () => {
    chrome.runtime.sendMessage({
      event: "upload-to-kangaroo-from-url",
      name: null,
      url: window.location.href,
      type: "application/pdf",
    });
  })
  body.appendChild(img)
}

// Keep track of listeners and then remove and reapply once HTML changes (MutationObserver)
window.onload = async () => {
  const targetNode = document.querySelector("html");
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Add listeners to new input[type=file] buttons
  const addListeners = () => {
    inputButtons = document.querySelectorAll("input[type='file']")

    inputButtons.forEach((inputElem) => {
      if (inputElem.getAttribute(SHOULD_INTERCEPT) === null) {
        setupToolset(inputElem)
        inputElem.addEventListener("click", (event) => onClick(event), true);
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

  if (isChromePDFViewer()) {
    // Add a download button to the PDF viewer
    addDownloadButton("position: absolute; top: 15px; right: 140px; width: 25px; cursor:pointer;")
  }
};

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}