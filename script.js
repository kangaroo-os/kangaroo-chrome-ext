const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = 'true'
const FALSE = 'false'

// Maybe prefetch the item first?
const scanAndReplaceFiles = async (event) => {
  const input = event.target;
  const dT = new DataTransfer();
  for (let i = 0; i < input.files.length; i++) {
    let file = input.files[i];
    if (file.name.endsWith(".cloud")) {
      console.log("cloud file detected");
      const res = await fetch(
        "https://upload.wikimedia.org/wikipedia/commons/7/77/Delete_key1.jpg"
      );
      const blob = await res.blob();
      file = new File([blob], "delete_key.png", { type: "image/png" });
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
