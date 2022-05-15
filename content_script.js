const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = 'true'
const FALSE = 'false'
const BASE_URL = 'http://localhost:3000'

const onClick = async (event) => {
  const input = event.target
  if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
    event.stopImmediatePropagation();
    event.preventDefault();
    // document.body.onfocus = () => checkIfCancelled(event, input);
    await createCustomUploadDialog(event)
    input.setAttribute(SHOULD_INTERCEPT, FALSE);
  } else if(input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
    // Reset for next time
    input.setAttribute(SHOULD_INTERCEPT, TRUE);
    input.dispatchEvent(new Event('change', event))
  }
}

const createCustomUploadDialog = async (event) => {
  const body = document.body
  const img = document.createElement('img')
  img.src = "https://upload.wikimedia.org/wikipedia/commons/9/9d/Circle-icons-download.svg"
  img.style = "position: absolute; top: 15px; right: 140px; width: 25px; cursor:pointer;z-index:9999"
  img.addEventListener('click', async (btnEvent) => await handleCustomUploadDialogClick(event, btnEvent))
  body.insertBefore(img, document.body.firstChild);
}

const handleCustomUploadDialogClick = async (ogClickEvent, btnEvent) => {
  btnEvent.target.remove()
  const acceptedExtensions = ogClickEvent.target.getAttribute('accept')
  const qualifyingFileData = await getQualifyingFileData(acceptedExtensions)
  await createDoneWithCloudFilesButton(ogClickEvent)
  const selectedFiles = promptForFileSelection(qualifyingFileData)
  await saveJsonToLocalStorage('selectedFiles', JSON.stringify(selectedFiles))
}

const createDoneWithCloudFilesButton = async (event) => {
  const body = document.body
  const button = document.createElement('button')
  button.innerText = 'Done with cloud files'
  button.style = "position: absolute; top: 15px; right: 140px; width: 30px; cursor:pointer;z-index:9999"
  button.addEventListener('click', async (buttonEvent) => await loadSelectedFilesToInput(event, buttonEvent))
  body.insertBefore(button, document.body.firstChild);
}

const loadSelectedFilesToInput = async (ogClickEvent, btnEvent) => {
  btnEvent.preventDefault()
  btnEvent.target.remove()
  await loadKangarooFilesToInput(ogClickEvent)
  ogClickEvent.target.dispatchEvent(new PointerEvent('click', ogClickEvent));
}

const loadKangarooFilesToInput = async (event) => {
  const input = event.target
  const dT = new DataTransfer();
  const selectedFiles = await retrieveJsonFromLocalStorage('selectedFiles')
  const downloadedFiles = await Promise.all(selectedFiles.map(async ({ id }) => {
    const response = await chrome.runtime.sendMessage({event: 'cloud-file-detected', fileId: id });
    if (response.status === 'ok') {
      const res = await fetch(response.url)
      const blob = await res.blob()
      const fileFromS3 = new File([blob], response.name, { type: response.fileType });
      return fileFromS3
    }
  }))
  downloadedFiles.forEach((file) => dT.items.add(file))
  input.files = dT.files;
}


const getQualifyingFileData = async (listOfExtensions = []) => {
  // TODO retrieve files with qualifying extensions
  const res = await chrome.runtime.sendMessage({
    event: "get-file-list"
  });
  return res.files
}

const promptForFileSelection = (files) => {
  const selectedFiles = []
  files.forEach((file) => {
    if (confirm(`Use ${file.name}?`))
      selectedFiles.push(file)
  })
  return selectedFiles
}

const saveJsonToLocalStorage = async (key, json) => {
  const obj = {}
  obj[key] = json
  return chrome.storage.local.set(obj)
}

const retrieveJsonFromLocalStorage = async (key) => {
  const storage = await chrome.storage.local.get(key)
  return JSON.parse(storage[key])
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
  const div = document.createElement('div')
  div.style = "position:fixed;width:60%;top:20%;left:20%;margin:auto;height:100%;max-height:60vh;background-color:white;z-index:9999;border:1px solid black;display:flex;flex-wrap:wrap"
  const outerDiv = document.createElement('div')
  outerDiv.style = "position:absolute;width:100vw;height:100vh;z-index:10000;background-color:rgba(0,0,0,0.5);"
  outerDiv.appendChild(div)
  document.body.insertBefore(outerDiv, document.body.firstChild)



const files = [
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',       'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg',
  'https://thumbs.dreamstime.com/b/file-icon-vector-isolated-white-background-sign-transparent-134059140.jpg'
  ]
  
  files.forEach((file) => {
    const img = document.createElement('img')
    img.src = file
    img.style = 'max-height:150px;width:auto;height:auto;'
    img.addEventListener('click', (e) => e.target.classList.add('selected'))
    div.appendChild(img)
  })
  
  const cssStyle = document.createElement('style');
  cssStyle.type = 'text/css';
  const rules = document.createTextNode(".selected{display:grey}");
  cssStyle.appendChild(rules);
  document.head.appendChild(cssStyle);

  // const targetNode = document.querySelector("html");
  // // Options for the observer (which mutations to observe)
  // const config = { attributes: false, childList: true, subtree: true };

  // // Add listeners to new input[type=file] buttons
  // const addListeners = () => {
  //   inputButtons = document.querySelectorAll("input[type='file']")

  //   inputButtons.forEach((inputElem) => {
  //     if (inputElem.getAttribute(SHOULD_INTERCEPT) === null) {
  //       inputElem.setAttribute(SHOULD_INTERCEPT, TRUE);
  //       inputElem.addEventListener("click", (event) => onClick(event), true);
  //       // inputElem.addEventListener("change", (event) => onChange(event), true);
  //       console.log("New input button detected.");
  //     }
  //   });
  // };

  // const callback = function (mutationsList, observer) {
  //   addListeners();
  // };

  // // Create an observer instance linked to the callback function
  // const observer = new MutationObserver(callback);
  // // Start observing the target node for configured mutations
  // observer.observe(targetNode, config);

  // if (isChromePDFViewer()) {
  //   // Add a download button to the PDF viewer
  //   addDownloadButton("position: absolute; top: 15px; right: 140px; width: 25px; cursor:pointer;")
  // }
};