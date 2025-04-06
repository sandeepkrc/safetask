// Monitor form submissions on HTTP sites
document.addEventListener('submit', (event) => {
    if (window.location.protocol === 'http:') {
        const form = event.target;
        const inputs = form.querySelectorAll('input[type="text"], input[type="password"], input[type="email"], textarea');
        
        if (inputs.length > 0) {
            chrome.runtime.sendMessage({
                type: 'httpFormWarning',
                url: window.location.href,
                formData: Array.from(inputs).map(input => ({
                    name: input.name,
                    type: input.type
                }))
            });
        }
    }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'checkSecurity') {
        const securityInfo = {
            isHttp: window.location.protocol === 'http:',
            hasForms: document.querySelectorAll('form').length > 0,
            hasPasswordFields: document.querySelectorAll('input[type="password"]').length > 0
        };
        sendResponse(securityInfo);
    }
});

// Monitor for suspicious elements
function checkForSuspiciousElements() {
    const suspiciousElements = document.querySelectorAll('input[type="password"], input[type="text"][name*="password"], input[type="text"][name*="credit"], input[type="text"][name*="card"]');
    
    if (suspiciousElements.length > 0 && window.location.protocol === 'http:') {
        chrome.runtime.sendMessage({
            type: 'suspiciousFormWarning',
            url: window.location.href,
            elements: Array.from(suspiciousElements).map(el => ({
                type: el.type,
                name: el.name
            }))
        });
    }
}

// Run initial check
checkForSuspiciousElements();

// Monitor for dynamically added elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            checkForSuspiciousElements();
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Monitor for phishing-like domains
function checkForPhishing() {
    const domain = window.location.hostname;
    const suspiciousPatterns = [
        /goog[0-9]e\.com/i,
        /paypa[0-9]\.com/i,
        /facebo[0-9]k\.com/i,
        /twitt[0-9]r\.com/i,
        /amaz[0-9]n\.com/i
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
            chrome.runtime.sendMessage({
                type: 'phishingWarning',
                url: window.location.href
            });
            break;
        }
    }
}

// Monitor cookie changes
function monitorCookies() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                mutation.target.nodeName === 'SCRIPT' &&
                mutation.target.src.includes('cookie')) {
                chrome.runtime.sendMessage({
                    type: 'cookieScriptDetected',
                    url: window.location.href
                });
            }
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

// Initialize monitoring
checkForPhishing();
monitorCookies();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'checkFocusMode') {
        chrome.storage.sync.get(['focusMode', 'blockedSites'], (result) => {
            if (result.focusMode) {
                const currentDomain = window.location.hostname;
                if (result.blockedSites.some(site => currentDomain.includes(site))) {
                    document.body.innerHTML = `
                        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                            <h1>Focus Mode Active</h1>
                            <p>This site is blocked during your focus session.</p>
                            <p>Time remaining: <span id="timer">25:00</span></p>
                        </div>
                    `;
                }
            }
        });
    }
}); 