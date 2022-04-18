document.addEventListener("click", () => {
  console.log("clicked");
});

// Maybe prefetch the item first?
const substituteImage = (input, event) => {
  if (event.target.nodeName === 'INPUT' && event.target.attributes['type']?.['nodeValue'] === 'file' && event.target?.files[0]?.name != "delete_key.png") {
    event.stopImmediatePropagation()
    const dT = new DataTransfer();
    fetch('https://upload.wikimedia.org/wikipedia/commons/7/77/Delete_key1.jpg')
      .then(res => res.blob()) // Gets the response and returns it as a blob
      .then(blob => {
        const file = new File([blob], "delete_key.png", { type: "image/png" });
        dT.items.add(file);
        input.files = dT.files;
        event.target.dispatchEvent(event);
    })
  }
}

// Keep track of listeners and then remove and reapply once HTML changes (MutationObserver)
window.onload = () => {
  document.querySelectorAll("input[type='file']").forEach((inputElem) => {
    console.log("added event listeners")
    document.addEventListener("change", (event) => substituteImage(inputElem, event), true);
  });
};


