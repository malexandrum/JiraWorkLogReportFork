let w;

chrome.browserAction.onClicked.addListener(function () {
   if (!w) {
      chrome.windows.create({ url: 'index.html', type: 'popup', focused: true }, function (window) {
         w = window      });
   } else {      
      chrome.windows.update(w.id, { focused: true }, function () { })
   }
});

chrome.windows.onRemoved.addListener(function () {   
   w = undefined;
})
