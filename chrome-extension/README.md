# Claude DevTools Chrome Extension

A Chrome extension that allows you to pick elements on web pages and send them to Claude with React/Angular/Vue component detection.

## Features

- **Element Picker**: Click any element on a web page to select it
- **Framework Detection**: Automatically detects React, Angular, and Vue components
- **Component Information**: Extracts component names, props, and file paths (when available)
- **DOM Capture**: Limited depth HTML structure with styling information
- **Claude Integration**: Sends selected elements directly to Claude via the host server

## Installation

1. Install the host server:
   ```bash
   npm install -g @alexstrnik/claude-devtools
   claude-devtools
   ```

2. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

## Usage

1. Make sure the host server is running
2. Click the Claude DevTools extension icon
3. Click "Pick Element"
4. Click any element on the web page
5. Enter your prompt in the textbox
6. Click "Send to Claude"

The extension will:
- Detect if the element is part of a React/Angular/Vue component
- Extract component information and file paths
- Capture the HTML structure (limited depth)
- Send everything to Claude through the host server

## Framework Support

- **React**: Detects components via React DevTools or Fiber
- **Angular**: Detects components via Angular debugging utilities
- **Vue**: Detects Vue 2 and Vue 3 components

## Configuration

The extension uses port 47923 by default. You can change this by:
- Setting the `PORT` environment variable for the host server
- The extension will automatically detect the correct port

## Development

The extension consists of:
- `manifest.json`: Extension configuration
- `popup.html/js`: Main UI and controls
- `content.js`: Element picking and DOM manipulation
- `injected.js`: Framework detection in page context
- `content.css`: Styling for element highlighting