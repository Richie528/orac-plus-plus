chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === "getLS") {
        var value = localStorage.getItem(request.key);
        sendResponse({value: value});
    }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "setLS") {
        localStorage.setItem(request.key, request.value);
        sendResponse({success: true});
    }
});