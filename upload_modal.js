// window.addEventListener('message', async (event) => {
  // IMPORTANT: check the origin of the data! 
  // debugger
  // if (event.origin.startsWith('https://mail.google.com/')) { 
  //     // The data was sent from your site.
  //     // Data sent with postMessage is stored in event.data:
  //     console.log(event.data); 
  // } else {
  //     // The data was NOT sent from your site! 
  //     // Be careful! Do not use it. This else branch is
  //     // here just for clarity, you usually shouldn't need it.
  //     return; 
  // }
  
// });

window.onload = async () => {
  document.getElementById('js-btn').addEventListener("click", async () => {
    window.top.postMessage('test', '*')
    debugger
  });
}