const browser = chrome;
const contextMenus = chrome.contextMenus;

let activeTabId = null;

function getDomain(url) {
    if (url instanceof URL) {
        return url.hostname;
    } else {
        return new URL(url.toString()).hostname;
    }
}

function clearCookies(url, cookies, callback) {
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
            console.debug('Removing cookie:', cookie);
            browser.cookies.remove({
                url,
                name: cookie.name,
                storeId: cookie.storeId
            }, removeCallback);
        }
    }
}

function clearCookiesWithUrl(url, callback) {
    browser.cookies.getAll({url}, cookies => {
        clearCookies(url, cookies, callback);
    });
}

function clearLocalStorage(tab, callback) {
    browser.tabs.executeScript(tab.id, {
        code: 'localStorage.clear()'
    }, callback);
}

function updateMenusInternal(activeTab) {
    if (!activeTab || !activeTab.url) {
        // Can happen if user switched to a chrome:// tab or something like this.
        return;
    }
    contextMenus.update('clearCookies', {
        title: 'Delete all cookies for ' + getDomain(activeTab.url)
    });
}

function updateMenus(tab) {
    if (tab != null && tab.id == activeTabId) {
        updateMenusInternal(tab);
    } else if (activeTabId != null) {
        browser.tabs.get(activeTabId, tab => {
            updateMenusInternal(tab);
        });
    }
}

contextMenus.onClicked.addListener((info, tab) => {
    console.debug('Context menu item was clicked:', info.menuItemId);

    if (!tab.active) {
        console.debug('No active tab found, ignoring context menu item click');
        return;
    }

    console.log('Current tab URL:', tab.url);

    switch (info.menuItemId) {
        case 'clearCookies': {
            try {
                clearCookiesWithUrl(tab.url, deletedCount => {
                    if (browser.runtime.lastError) {
                        console.error('Error deleting cookies for ' + tab.url + ': ' + e.message);
                    } else {
                        if (deletedCount > 0) {
                            browser.tabs.reload(tab.id);
                        }
                    }
                });
            } catch (e) {
                console.error('Error deleting cookies for ' + tab.url + ': ' + e.message);
            }
            break;
        }
        case 'clearLocalStorage':
            try {
                clearLocalStorage(tab, () => {
                    if (browser.runtime.lastError) {
                        console.error('Error clearing local storage: ' + e.message);
                    } else {
                        browser.tabs.reload(tab.id);
                    }
                });
            } catch (e) {
                console.error('Error clearing local storage: ' + e.message);
            }
            break;
    }
});

contextMenus.removeAll();
contextMenus.create({
    id: 'clearCookies',
    title: 'Delete all cookies for this site',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearLocalStorage',
    title: 'Clear local storage',
    contexts: ['browser_action', 'page', 'page_action']
});

browser.tabs.onActivated.addListener(activeInfo => {
    activeTabId = activeInfo.tabId;
    updateMenus();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    updateMenus(tab);
});
