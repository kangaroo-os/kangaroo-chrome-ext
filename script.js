document.addEventListener("click", () => {
  console.log("clicked");
});

const LISTENER_ATTRIBUTE = "kangaroo-listener";
const SHOULD_INTERCEPT = "kangaroo-intercept";
const TRUE = 'true'
const FALSE = 'false'

// Maybe prefetch the item first?
const scanAndReplaceFiles = async (event) => {
  event.stopImmediatePropagation();
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
  // Dispatch original event and this time don't intercept.
  input.setAttribute(SHOULD_INTERCEPT, FALSE);
  input.dispatchEvent(event);
};

const processFiles = (event) => {
  const input = event.target;
  if (input.getAttribute(SHOULD_INTERCEPT) === TRUE) {
    scanAndReplaceFiles(event);
  } else {
    input.setAttribute(SHOULD_INTERCEPT, TRUE);
  }
};

// Keep track of listeners and then remove and reapply once HTML changes (MutationObserver)
window.onload = () => {
  const targetNode = document.querySelector("html");
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Add listeners to new input[type=file] buttons
  const addListeners = () => {
    document.querySelectorAll("input[type='file']").forEach((inputElem) => {
      const listener_attr = inputElem.getAttribute(LISTENER_ATTRIBUTE)
      if (listener_attr === null || listener_attr === FALSE) {
        inputElem.setAttribute(LISTENER_ATTRIBUTE, TRUE);
        inputElem.setAttribute(SHOULD_INTERCEPT, TRUE);
        document.addEventListener("change", (event) => processFiles(event), true);
        console.log("Added event listeners");
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
};
