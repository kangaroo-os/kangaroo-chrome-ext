const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = "true";
const FALSE = "false";
const BASE_URL = "http://localhost:3000";
const DEFAULT_ICON_URL = chrome.runtime.getURL("assets/file_icon.png");

const onClick = async (event) => {
  if (window.location.href.startsWith(BASE_URL))
    return
  const input = event.target;
  if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
    event.stopImmediatePropagation();
    event.preventDefault();
    await createCustomUploadDialog(event);
    input.setAttribute(SHOULD_INTERCEPT, FALSE);
  } else if (input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
    // Reset for next time
    input.setAttribute(SHOULD_INTERCEPT, TRUE);
  }
};

const onChange = async (event) => {
  const input = event.target;
  if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
    event.stopImmediatePropagation();
    event.preventDefault();
    await loadKangarooFilesToInput(
      event,
      await retrieveFromLocalStorage("selectedFileIds")
    );
    input.setAttribute(SHOULD_INTERCEPT, FALSE);
    input.dispatchEvent(new Event("change", event));
  } else if (input.getAttribute(SHOULD_INTERCEPT) === FALSE) {
    // Reset for next time
    input.setAttribute(SHOULD_INTERCEPT, TRUE);
  }
};

const createCustomUploadDialog = async (event) => {
  const acceptedExtensions = event.target.getAttribute("accept");
  const qualifyingFileData = await getQualifyingFileData(acceptedExtensions);
  await createFileSelectionModal(event, qualifyingFileData);
};

const loadKangarooFilesToInput = async (event, fileIds) => {
  const input = event.target;
  const dT = new DataTransfer();
  const downloadedFiles = await Promise.all(
    fileIds.map(async (id) => {
      const response = await chrome.runtime.sendMessage({
        event: "cloud-file-detected",
        fileId: id,
      });
      if (response.status === "ok") {
        const res = await fetch(response.url);
        const blob = await res.blob();
        const fileFromS3 = new File([blob], response.name, {
          type: response.fileType,
        });
        return fileFromS3;
      }
    })
  );
  downloadedFiles.forEach((file) => dT.items.add(file));
  for (let i = 0; i < input.files.length; i++) {
    dT.items.add(input.files[i]);
  }
  input.files = dT.files;
};

const getQualifyingFileData = async (listOfExtensions = []) => {
  // TODO retrieve files with qualifying extensions
  const res = await chrome.runtime.sendMessage({
    event: "get-file-list",
  });
  return res.files;
};

const createFileSelectionModal = async (ogClickEvent, files = []) => {
  const uploadModalRes = await fetch(
    chrome.runtime.getURL("upload_modal.html")
  );
  const uploadModalHTML = await uploadModalRes.text();
  // Add stylesheet
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("upload_modal.css");
  document.head.appendChild(link);
  // Add modal
  const div = document.createElement("div");
  div.innerHTML = uploadModalHTML;
  div.id = "modal-background";
  document.body.insertBefore(div, document.body.firstChild);

  const fileDivs = files.map(({ name, id }) => createFileDiv(name, id));
  fileDivs.forEach((div) => {
    div.addEventListener("click", async (clickEvent) => {
      await handleFileClick(ogClickEvent, clickEvent, div)
    });    
  });

  document
    .getElementById("upload-from-computer-btn")
    .addEventListener("click", async () => {
      await saveSelectionAndOpenNativeModal(ogClickEvent);
    });

  document.getElementById("open-files").addEventListener("click", async () => {
    await saveSelectionAndUpload(ogClickEvent);
  });

  document.getElementById("cancel").addEventListener("click", () => {
    document.getElementById("modal-background").remove();
    ogClickEvent.dispatchEvent(new Event("click", ogClickEvent));
  });
};

const handleFileClick = async (ogClickEvent, clickEvent, div) => {
  const clickedTimes = parseInt(div.getAttribute('clicks') ?? 0) + 1
  div.setAttribute('clicks', clickedTimes.toString());
  setTimeout(async () => {
    const currentClicks = parseInt(div.getAttribute('clicks') ?? 0)
    if (currentClicks === 1) {
      if (!clickEvent.shiftKey) {
        document.getElementById("modal-background")
                .querySelectorAll("div .selected")
                .forEach((node) => node.classList.remove("selected"));
      }
      div.classList.toggle("selected");
    } else if (currentClicks >= 2) {
      if (!div.classList.contains("selected")) {
        document.getElementById("modal-background")
                .querySelectorAll("div .selected")
                .forEach((node) => node.classList.remove("selected"));
        div.classList.toggle("selected");
      }
      await saveSelectionAndUpload(ogClickEvent);
    }
    div.setAttribute('clicks', 0)
  }, 250);
}

const saveSelectionAndOpenNativeModal = async (ogClickEvent) => {
  const selectedFileIds = [...document.querySelectorAll("div .selected")].map(
    (node) => node.id
  );
  document.getElementById("modal-background").remove();
  await saveToLocalStorage("selectedFileIds", selectedFileIds);
  ogClickEvent.target.dispatchEvent(new PointerEvent("click", ogClickEvent));
  // Continue onto native file dialog...
};

const saveSelectionAndUpload = async (ogClickEvent) => {
  const selectedFileIds = [...document.querySelectorAll("div .selected")].map(
    (node) => node.id
  );
  document.getElementById("modal-background").remove();
  await saveToLocalStorage("selectedFileIds", selectedFileIds);
  ogClickEvent.target.setAttribute(SHOULD_INTERCEPT, TRUE);
  ogClickEvent.target.dispatchEvent(new Event("change", ogClickEvent));
  // End of the line...
};

const saveJsonToLocalStorage = async (key, json) => {
  const obj = {};
  obj[key] = json;
  return chrome.storage.local.set(obj);
};

const retrieveJsonFromLocalStorage = async (key) => {
  const storage = await chrome.storage.local.get(key);
  return JSON.parse(storage[key]);
};

const saveToLocalStorage = async (key, value) => {
  const obj = {};
  obj[key] = value;
  return chrome.storage.local.set(obj);
};

const retrieveFromLocalStorage = async (key) => {
  const storage = await chrome.storage.local.get(key);
  return storage[key];
};

const isFileInput = (elem) => {
  return elem.nodeName === "INPUT" && elem.type === "file";
};

const hasFiles = (input) => {
  return input.files.length > 0;
};

const createFileDiv = (name, id, iconUrl = DEFAULT_ICON_URL) => {
  const div = document.createElement("div");
  const img = document.createElement("img");
  const p = document.createElement("p");
  div.id = id;
  div.classList.add("file-container");
  div.appendChild(img);
  div.appendChild(p);
  img.classList.add("file-icon");
  img.src = iconUrl;
  img.draggable = false;
  p.classList.add("file-name");

  p.innerText = truncateText(name, 21);

  document.getElementById("file-display").appendChild(div);
  return div;
};

const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "...";
  }
  return text;
};

const pressedKeys = {

}

const handleKeyDown = (e) => {
  pressedKeys[e.code] = true
  chrome.runtime.sendMessage({
    event: 'key-pressed',
    key: e.code
  })
}

const handleKeyUp = (e) => {
  if (pressedKeys[e.code]) {
    delete pressedKeys[e.code]
    chrome.runtime.sendMessage({
      event: 'key-released',
      key: e.code
    })
  }
}

// Keep track of listeners and then remove and reapply once HTML changes (MutationObserver)
window.onload = async () => {
  const targetNode = document.querySelector("html");
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Add listeners to new input[type=file] buttons
  const addListeners = () => {
    inputButtons = document.querySelectorAll("input[type='file']");

    inputButtons.forEach((inputElem) => {
      if (inputElem.getAttribute(SHOULD_INTERCEPT) === null) {
        inputElem.setAttribute(SHOULD_INTERCEPT, TRUE);
        inputElem.addEventListener("click", (event) => onClick(event), true);
        inputElem.addEventListener("change", (event) => onChange(event), true);
        console.log("New input button detected.");
      }
    });
  };

  const callback = function (mutationsList, observer) {
    addListeners();
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);
  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);

  document.addEventListener("keydown", handleKeyDown, true)
  document.addEventListener("keyup", handleKeyUp, true)
};
