let activeTabId = null;

function getDomain(url) {
    if (url instanceof URL) {
        return url.hostname;
    } else {
        return new URL(url.toString()).hostname;
    }
}

function deleteCookies(cookies, callback) {
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

function deleteCookiesForDomain(domain, callback) {
    chrome.cookies.getAll({
        domain: domain
    }, cookies => {
        deleteCookies(cookies, callback);
    });
}

function updateMenusInternal(activeTab) {
    if (!activeTab.url) {
        // Can happen if user switched to a chrome:// tab or something like this.
        return;
    }
    chrome.contextMenus.update('delete', {
        title: 'Delete cookies for ' + getDomain(activeTab.url)
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
    if (info.menuItemId == 'delete') {
        try {
            const domain = getDomain(tab.url);
            deleteCookiesForDomain(domain, deletedCount => {
                if (deletedCount == 0) {
                    alert('No cookies found for ' + domain + '!');
                } else {
                    alert('Deleted ' + deletedCount + ' ' (deleteCount == 1 ? 'cookie' : 'cookies') + ' for ' + domain + '!');
                    chrome.tabs.reload(tab.id);
                }
            });
        } catch (e) {
            alert('Error deleting cookies for ' + domain + ': ' + e.message);
        }
    }
});

chrome.contextMenus.removeAll();
chrome.contextMenus.create({
    id: 'delete',
    title: 'Delete cookies for this site',
    contexts: ['browser_action', 'page_action', 'action']
});

chrome.tabs.onActivated.addListener(activeInfo => {
    activeTabId = activeInfo.tabId;
    updateMenus();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    updateMenus(tab);
});
