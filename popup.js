document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
                content.style.display = content.id === tabId ? 'block' : 'none';
            });
        });
    });

    // Task Manager
    const taskInput = document.getElementById('new-task');
    const taskDeadline = document.getElementById('task-deadline');
    const addTaskButton = document.getElementById('add-task');
    const taskList = document.getElementById('task-list');

    function loadTasks() {
        chrome.storage.sync.get(['tasks', 'deadlines'], (result) => {
            const tasks = result.tasks || [];
            const deadlines = result.deadlines || {};
            taskList.innerHTML = '';
            tasks.forEach((task, index) => {
                const li = document.createElement('li');
                const deadline = deadlines[index] ? new Date(deadlines[index]).toLocaleString() : 'No deadline';
                li.innerHTML = `
                    <div class="task-content">
                        <span>${task}</span>
                        <span class="deadline">Deadline: ${deadline}</span>
                    </div>
                    <button class="delete-task" data-index="${index}">Delete</button>
                `;
                taskList.appendChild(li);
            });
        });
    }

    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value.trim();
        const deadline = taskDeadline.value;
        if (taskText) {
            chrome.storage.sync.get(['tasks', 'deadlines'], (result) => {
                const tasks = result.tasks || [];
                const deadlines = result.deadlines || {};
                const taskId = tasks.length;
                tasks.push(taskText);
                if (deadline) {
                    deadlines[taskId] = deadline;
                }
                chrome.storage.sync.set({ tasks, deadlines }, () => {
                    taskInput.value = '';
                    taskDeadline.value = '';
                    loadTasks();
                });
            });
        }
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-task')) {
            const index = parseInt(e.target.dataset.index);
            chrome.storage.sync.get(['tasks', 'deadlines'], (result) => {
                const tasks = result.tasks || [];
                const deadlines = result.deadlines || {};
                tasks.splice(index, 1);
                delete deadlines[index];
                chrome.storage.sync.set({ tasks, deadlines }, loadTasks);
            });
        }
    });

    // Focus Mode
    const startTimerButton = document.getElementById('start-timer');
    const stopTimerButton = document.getElementById('stop-timer');
    const timerDisplay = document.querySelector('.timer-display');
    const blockedSitesList = document.getElementById('blocked-sites-list');
    const newBlockedSiteInput = document.getElementById('new-blocked-site');
    const addBlockedSiteButton = document.getElementById('add-blocked-site');

    let timerInterval;
    let remainingSeconds;

    // Check focus mode state and restore timer if active
    chrome.storage.sync.get(['focusMode', 'timerRunning', 'timerDuration'], (result) => {
        if (result.focusMode && result.timerRunning) {
            remainingSeconds = result.timerDuration || 25 * 60;
            updateTimerDisplay(remainingSeconds);
            
            // Start the timer
            timerInterval = setInterval(() => {
                remainingSeconds--;
                updateTimerDisplay(remainingSeconds);
                
                if (remainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    chrome.storage.sync.set({ focusMode: false, timerRunning: false });
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'Focus Session Complete',
                        message: 'Your focus session has ended!'
                    });
                }
            }, 1000);
        }
    });

    function startFocusSession() {
        chrome.storage.sync.get(['timerDuration'], (result) => {
            remainingSeconds = result.timerDuration || 25 * 60;
            updateTimerDisplay(remainingSeconds);
            
            // Start the timer
            timerInterval = setInterval(() => {
                remainingSeconds--;
                updateTimerDisplay(remainingSeconds);
                
                if (remainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    chrome.storage.sync.set({ focusMode: false, timerRunning: false });
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: 'Focus Session Complete',
                        message: 'Your focus session has ended!'
                    });
                }
            }, 1000);

            // Set focus mode state
            chrome.storage.sync.set({ 
                focusMode: true, 
                timerRunning: true 
            });
        });
    }

    function stopFocusSession() {
        clearInterval(timerInterval);
        chrome.storage.sync.set({ 
            focusMode: false, 
            timerRunning: false 
        });
        timerDisplay.textContent = '25:00';
    }

    startTimerButton.addEventListener('click', startFocusSession);
    stopTimerButton.addEventListener('click', stopFocusSession);

    function updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function loadBlockedSites() {
        chrome.storage.sync.get(['blockedSites'], (result) => {
            const blockedSites = result.blockedSites || [];
            blockedSitesList.innerHTML = '';
            blockedSites.forEach((site, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${site}</span>
                    <button class="delete-blocked-site" data-index="${index}">Remove</button>
                `;
                blockedSitesList.appendChild(li);
            });
        });
    }

    addBlockedSiteButton.addEventListener('click', () => {
        const site = newBlockedSiteInput.value.trim();
        if (site) {
            chrome.storage.sync.get(['blockedSites'], (result) => {
                const blockedSites = result.blockedSites || [];
                blockedSites.push(site);
                chrome.storage.sync.set({ blockedSites }, () => {
                    newBlockedSiteInput.value = '';
                    loadBlockedSites();
                });
            });
        }
    });

    blockedSitesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-blocked-site')) {
            const index = parseInt(e.target.dataset.index);
            chrome.storage.sync.get(['blockedSites'], (result) => {
                const blockedSites = result.blockedSites || [];
                blockedSites.splice(index, 1);
                chrome.storage.sync.set({ blockedSites }, loadBlockedSites);
            });
        }
    });

    // Security Dashboard
    function updateSecurityStatus() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentUrl = tabs[0].url;
            document.getElementById('current-url').textContent = currentUrl;
            
            // Check if URL is HTTP
            if (currentUrl.startsWith('http://')) {
                document.getElementById('url-safety-status').textContent = '⚠️ This site is not using HTTPS!';
            } else {
                document.getElementById('url-safety-status').textContent = '✅ This site is using HTTPS';
            }

            // Check for suspicious elements
            chrome.tabs.sendMessage(tabs[0].id, { type: 'checkSecurity' }, (response) => {
                if (response) {
                    if (response.hasPasswordFields) {
                        document.getElementById('form-safety-status').textContent = '⚠️ This page contains password fields';
                    } else if (response.hasForms) {
                        document.getElementById('form-safety-status').textContent = '⚠️ This page contains forms';
                    } else {
                        document.getElementById('form-safety-status').textContent = '✅ No sensitive forms detected';
                    }
                }
            });
        });
    }

    // Settings
    function loadSettings() {
        chrome.storage.sync.get(['safeBrowsingApiKey'], (result) => {
            if (result.safeBrowsingApiKey) {
                document.getElementById('apiKey').value = result.safeBrowsingApiKey;
            }
        });
    }

    document.getElementById('saveApiKey').addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (apiKey) {
            chrome.storage.sync.set({ safeBrowsingApiKey: apiKey }, () => {
                alert('API key saved successfully!');
            });
        } else {
            alert('Please enter a valid API key');
        }
    });

    // Initialize
    loadTasks();
    loadBlockedSites();
    updateSecurityStatus();
    loadSettings();
}); 