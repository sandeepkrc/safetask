// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        tasks: [],
        blockedSites: [],
        focusMode: false,
        timerDuration: 25 * 60, // 25 minutes in seconds
        timerRunning: false,
        timeSpent: {},
        deadlines: {},
        safeBrowsingApiKey: ''
    });
});

// Initialize focus mode if it was active
chrome.storage.sync.get(['focusMode'], (result) => {
    if (result.focusMode) {
        startFocusMode();
    }
});

// Handle URL scanning and security checks
chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) { // Only check main frame
        checkUrlSafety(details.url);
        checkHttpSecurity(details.url);
        checkPhishing(details.url);
        monitorCookies(details.tabId);
        updateTimeSpent(details.url);
        
        // Check if in focus mode and visiting HTTP site
        chrome.storage.sync.get(['focusMode'], (result) => {
            if (result.focusMode && details.url.startsWith('http://')) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Focus Mode Warning',
                    message: 'You are visiting an HTTP site during focus mode!'
                });
            }
        });
    }
});

// Check URL safety using Google Safe Browsing API
async function checkUrlSafety(url) {
    try {
        const result = await chrome.storage.sync.get(['safeBrowsingApiKey']);
        const apiKey = result.safeBrowsingApiKey;
        
        if (!apiKey) {
            console.warn('Safe Browsing API key not set. Please set it in the extension settings.');
            return;
        }

        const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client: {
                    clientId: "SafeTask",
                    clientVersion: "1.0.0"
                },
                threatInfo: {
                    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{"url": url}]
                }
            })
        });
        
        const data = await response.json();
        if (data.matches) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Security Warning',
                message: 'This site may be unsafe!'
            });
        }
    } catch (error) {
        console.error('Error checking URL safety:', error);
    }
}

// Check for phishing attempts
function checkPhishing(url) {
    const domain = new URL(url).hostname;
    const suspiciousPatterns = [
        /goog[1l]e\.com/i,
        /paypa[1l]\.com/i,
        /facebo[o0]k\.com/i,
        /twitt[e3]r\.com/i,
        /amaz[o0]n\.com/i,
        /app[1l]e\.com/i,
        /micr[o0]soft\.com/i
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Phishing Warning',
                message: 'This domain appears to be a phishing attempt!'
            });
            break;
        }
    }
}

// Check for HTTP sites
function checkHttpSecurity(url) {
    if (url.startsWith('http://')) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Security Warning',
            message: 'This site is not using HTTPS!'
        });
    }
}

// Monitor cookies
async function monitorCookies(tabId) {
    try {
        const cookies = await chrome.cookies.getAll({});
        const domainCookies = cookies.filter(cookie => 
            cookie.domain.includes(window.location.hostname)
        );
        
        if (domainCookies.length > 10) { // Arbitrary threshold
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Cookie Warning',
                message: 'This site is setting many tracking cookies!'
            });
        }
    } catch (error) {
        console.error('Error monitoring cookies:', error);
    }
}

// Track time spent on domains
function updateTimeSpent(url) {
    const domain = new URL(url).hostname;
    chrome.storage.sync.get(['timeSpent'], (result) => {
        const timeSpent = result.timeSpent || {};
        timeSpent[domain] = (timeSpent[domain] || 0) + 1;
        chrome.storage.sync.set({ timeSpent });
    });
}

// Handle focus mode
let focusModeListener = null;

chrome.storage.onChanged.addListener((changes) => {
    if (changes.focusMode) {
        if (changes.focusMode.newValue) {
            startFocusMode();
        } else {
            stopFocusMode();
        }
    }
});

function startFocusMode() {
    if (focusModeListener) return; // Already running
    
    chrome.storage.sync.get(['blockedSites', 'timerDuration'], (result) => {
        const blockedSites = result.blockedSites || [];
        const timerDuration = result.timerDuration || 25 * 60;
        
        focusModeListener = (details) => {
            const url = new URL(details.url);
            if (blockedSites.some(site => url.hostname.includes(site))) {
                return { cancel: true };
            }
        };
        
        chrome.webRequest.onBeforeRequest.addListener(
            focusModeListener,
            { urls: ["<all_urls>"] },
            ["blocking"]
        );

        // Create the focus timer alarm
        chrome.alarms.create('focusTimer', { delayInMinutes: timerDuration / 60 });
    });
}

function stopFocusMode() {
    if (focusModeListener) {
        chrome.webRequest.onBeforeRequest.removeListener(focusModeListener);
        focusModeListener = null;
    }
}

// Handle timer
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'focusTimer') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Focus Session Complete',
            message: 'Your focus session has ended!'
        });
        chrome.storage.sync.set({ focusMode: false });
    }
});

// Handle deadlines
function checkDeadlines() {
    chrome.storage.sync.get(['deadlines'], (result) => {
        const now = new Date();
        const deadlines = result.deadlines || {};
        
        Object.entries(deadlines).forEach(([taskId, deadline]) => {
            const deadlineDate = new Date(deadline);
            const timeUntilDeadline = deadlineDate - now;
            
            // Notify if deadline is within 1 hour
            if (timeUntilDeadline > 0 && timeUntilDeadline <= 3600000) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Deadline Approaching',
                    message: `Task deadline is in ${Math.ceil(timeUntilDeadline / 60000)} minutes!`
                });
            }
        });
    });
}

// Check deadlines every minute
chrome.alarms.create('checkDeadlines', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkDeadlines') {
        checkDeadlines();
    }
}); 
