function deleteCookies(domain) {
    chrome.cookies.getAll({
        domain: domain
    }, cookies => {
        for (const cookie of cookies) {
            chrome.cookies.remove({
                url: 'http://' + cookie.domain + cookie.path,
                name: cookie.name,
                storeId: cookie.storeId
            });
            chrome.cookies.remove({
                url: 'https://' + cookie.domain + cookie.path,
                name: cookie.name,
                storeId: cookie.storeId
            });
        }
    });
}

function onDeleteCookiesClicked(info, tab) {
    if (!tab.active) {
        return;
    }
    if (info.menuItemId == 'delete') {
        const url = tab.url;
        const domain = new URL(url).hostname;
        try {
            deleteCookies(domain);
            alert('Deleted cookies for ' + domain + '!');
        } catch (e) {
            alert('Could not delete cookies for ' + domain + ': ' + e.message);
        }
    }
}

chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
        id: 'delete',
        title: 'Delete cookies for this site',
        contexts: ['browser_action', 'page_action', 'action']
    });
    chrome.contextMenus.onClicked.addListener(onDeleteCookiesClicked);
});
