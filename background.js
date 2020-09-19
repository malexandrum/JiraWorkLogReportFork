chrome.browserAction.onClicked.addListener(function() {
   chrome.windows.create({'url': 'index.html', 'type': 'popup'}, function(window) {
   });
});
