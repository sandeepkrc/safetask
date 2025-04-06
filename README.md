# SafeTask - Productivity & Security Suite

A comprehensive Chrome extension that combines productivity tools with cybersecurity features to enhance your browsing experience and protect your online activities.

## Features

### Productivity Tools
- **Task Manager**: Create and manage tasks with local storage
- **Focus Mode**: Block distracting websites with a Pomodoro-style timer
- **Active Tab Tracker**: Monitor time spent on different domains

### Cybersecurity Features
- **Malicious URL Scanner**: Check visited URLs using Google Safe Browsing API
- **Phishing Detection**: Identify suspicious domains (e.g., goog1e.com, paypa1.com)
- **Secure Form Alert**: Warn when entering data on HTTP sites
- **Cookie Monitor**: Alert when sites set excessive tracking cookies

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Setup

### Google Safe Browsing API
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Safe Browsing API
4. Create credentials (API key)
5. Replace `YOUR_API_KEY` in `background.js` with your actual API key

### Icons
The extension requires three icon sizes:
- 16x16 pixels (`icons/icon16.png`)
- 48x48 pixels (`icons/icon48.png`)
- 128x128 pixels (`icons/icon128.png`)

Place these icons in the `icons` directory.

## Usage

### Task Manager
- Click the extension icon to open the popup
- Enter tasks in the input field and click "Add"
- Delete tasks by clicking the "Delete" button

### Focus Mode
- Navigate to the "Focus Mode" tab
- Add websites to block in the input field
- Start a focus session with the timer
- Blocked sites will be inaccessible during the session

### Security Dashboard
- View current URL safety status
- Monitor cookie activity
- Receive notifications for:
  - HTTP form submissions
  - Suspicious domains
  - Excessive cookie usage

## Development

### File Structure
```
safetask/
├── manifest.json
├── popup.html
├── styles.css
├── popup.js
├── background.js
├── content.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Files
- `manifest.json`: Extension configuration and permissions
- `popup.html`: User interface for the extension popup
- `styles.css`: Styling for the popup interface
- `popup.js`: Handles popup interactions and UI logic
- `background.js`: Core functionality and background processes
- `content.js`: In-page monitoring and security checks

## Permissions
The extension requires the following permissions:
- `storage`: For saving tasks and settings
- `tabs`: For tracking active tabs
- `activeTab`: For accessing current tab information
- `webNavigation`: For monitoring page navigation
- `alarms`: For the focus mode timer
- `notifications`: For security alerts
- `cookies`: For monitoring cookie usage

## Contributing
Feel free to submit issues and enhancement requests!

## License
This project is licensed under the MIT License - see the LICENSE file for details. 