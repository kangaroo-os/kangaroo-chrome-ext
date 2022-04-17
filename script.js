document.addEventListener("click", () => {
  console.log("clicked");
});

const substituteImage = (input, event) => {
  debugger
  console.log(input.files)
  const dT = new DataTransfer();
  fetch('https://upload.wikimedia.org/wikipedia/commons/7/77/Delete_key1.jpg')
    .then(res => res.blob()) // Gets the response and returns it as a blob
    .then(blob => {
      const file = new File([blob], "image.png", { type: "image/png" });
      dT.items.add(file);
      input.files = dT.files;
      console.log(input.files)
  })
}

window.addEventListener("load", () => {
  document.querySelectorAll("input[type='file']").forEach((inputElem) => {
    inputElem.addEventListener("change", (event) => substituteImage(inputElem, event), true);
  });
});


