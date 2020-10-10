let activeTabId = null;

function getDomain(url) {
    if (url instanceof URL) {
        return url.hostname;
    } else {
        return new URL(url.toString()).hostname;
    }
}

function clearCookies(cookies, callback) {
    let deleteCount = 0;

    function removeCallback() {
        if (++deleteCount >= cookies.length) {
            if (callback) {
                callback(deleteCount);
            }
        }
    }

    if (!cookies || cookies.length == 0) {
        callback(0);
    } else {
        for (const cookie of cookies) {
            chrome.cookies.remove({
                url: 'http://' + cookie.domain + cookie.path,
                name: cookie.name,
                storeId: cookie.storeId
            }, removeCallback);
        }
    }
}

function clearCookiesForDomain(domain, callback) {
    chrome.cookies.getAll({
        domain: domain
    }, cookies => {
        clearCookies(cookies, callback);
    });
}

function clearLocalStorage(tab, callback) {
    chrome.tabs.executeScript(tab.id, {
        code: 'localStorage.clear()'
    }, callback);
}

function updateMenusInternal(activeTab) {
    if (!activeTab.url) {
        // Can happen if user switched to a chrome:// tab or something like this.
        return;
    }
    chrome.contextMenus.update('clearCookies', {
        title: 'Clear cookies for ' + getDomain(activeTab.url)
    });
}

function updateMenus(tab) {
    if (tab != null && tab.id == activeTabId) {
        updateMenusInternal(tab);
    } else if (activeTabId != null) {
        chrome.tabs.get(activeTabId, tab => {
            updateMenusInternal(tab);
        });
    }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab.active) {
        return;
    }
    switch (info.menuItemId) {
        case 'clearCookies': {
            try {
                const domain = getDomain(tab.url);
                clearCookiesForDomain(domain, deletedCount => {
                    if (chrome.runtime.lastError) {
                        alert('Error deleting cookies for ' + domain + ': ' + e.message);
                    } else {
                        if (deletedCount > 0) {
                            chrome.tabs.reload(tab.id);
                        }
                    }
                });
            } catch (e) {
                alert('Error deleting cookies for ' + domain + ': ' + e.message);
            }
            break;
        }
        case 'clearLocalStorage':
            try {
                clearLocalStorage(tab, () => {
                    if (chrome.runtime.lastError) {
                        alert('Error clearing local storage: ' + e.message);
                    } else {
                        chrome.tabs.reload(tab.id);
                    }
                });
            } catch (e) {
                alert('Error clearing local storage: ' + e.message);
            }
            break;
    }
});

chrome.contextMenus.removeAll();
chrome.contextMenus.create({
    id: 'clearCookies',
    title: 'Clear all cookies for this site',
    contexts: ['browser_action', 'page_action', 'action']
});
chrome.contextMenus.create({
    id: 'clearLocalStorage',
    title: 'Clear local storage',
    contexts: ['browser_action', 'page_action', 'action']
});

chrome.tabs.onActivated.addListener(activeInfo => {
    activeTabId = activeInfo.tabId;
    updateMenus();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    updateMenus(tab);
});
