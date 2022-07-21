const browser = typeof chrome != 'undefined' ? chrome : browser;
const browserNamespace = typeof chrome != 'undefined' ? 'chrome' : 'browser';
const contextMenus = browser.contextMenus;

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
    browser.tabs.executeScript(tab.id, {code: 'localStorage.clear()'}, callback);
}

function clearSessionStorage(tab, callback) {
    browser.tabs.executeScript(tab.id, {code: 'sessionStorage.clear()'}, callback);
}

function updateMenusInternal(activeTab) {
    // URL may be blank if user switched to a chrome:// tab or something like that.
    const hasUrl = !!activeTab && !!activeTab.url;
    const siteName = hasUrl ? getDomain(activeTab.url) : 'this site';
    const isMenuEnabled = hasUrl;
    contextMenus.update('clearCookies', {
        title: 'Clear cookies for ' + siteName,
        enabled: isMenuEnabled
    });
    contextMenus.update('clearCookiesAndReload', {enabled: isMenuEnabled});
    contextMenus.update('clearLocalStorage', {
        title: 'Clear local storage for ' + siteName,
        enabled: isMenuEnabled
    });
    contextMenus.update('clearLocalStorageAndReload', {enabled: isMenuEnabled});
    contextMenus.update('clearSessionStorage', {
        title: 'Clear session storage for ' + siteName,
        enabled: isMenuEnabled
    });
    contextMenus.update('clearSessionStorageAndReload', {enabled: isMenuEnabled});
}

function updateMenus(tab) {
    console.log('Updating menus for tab:', tab);

    if (tab != null && tab.active) {
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

    let reload = false;

    switch (info.menuItemId) {
        case 'clearCookiesAndReload':
            reload = true;
        case 'clearCookies':
            try {
                clearCookiesWithUrl(tab.url, deletedCount => {
                    if (browser.runtime.lastError) {
                        console.error('Error deleting cookies for ' + tab.url + ': ' + e.message);
                    } else if (reload) {
                        if (deletedCount > 0) {
                            browser.tabs.reload(tab.id);
                        }
                    }
                });
            } catch (e) {
                console.error('Error deleting cookies for ' + tab.url + ': ' + e.message);
            }
            break;
        case 'clearLocalStorageAndReload':
            reload = true;
        case 'clearLocalStorage':
            try {
                clearLocalStorage(tab, () => {
                    if (browser.runtime.lastError) {
                        console.error('Error clearing local storage: ' + e.message);
                    } else if (reload) {
                        browser.tabs.reload(tab.id);
                    }
                });
            } catch (e) {
                console.error('Error clearing local storage: ' + e.message);
            }
            break;
        case 'clearSessionStorageAndReload':
            reload = true;
        case 'clearSessionStorage':
            try {
                clearSessionStorage(tab, () => {
                    if (browser.runtime.lastError) {
                        console.error('Error clearing session storage: ' + e.message);
                    } else if (reload) {
                        browser.tabs.reload(tab.id);
                    }
                });
            } catch (e) {
                console.error('Error clearing session storage: ' + e.message);
            }
            break;
    }
});

contextMenus.removeAll();
contextMenus.create({
    id: 'clearCookies',
    title: 'Clear cookies for this site',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearCookiesAndReload',
    title: 'Clear cookies and reload',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearLocalStorage',
    title: 'Clear local storage',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearLocalStorageAndReload',
    title: 'Clear local storage and reload',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearSessionStorage',
    title: 'Clear session storage',
    contexts: ['browser_action', 'page', 'page_action']
});
contextMenus.create({
    id: 'clearSessionStorageAndReload',
    title: 'Clear session storage and reload',
    contexts: ['browser_action', 'page', 'page_action']
});

browser.tabs.onActivated.addListener(activeInfo => {
    activeTabId = activeInfo.tabId;
    updateMenus();
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    updateMenus(tab);
});
