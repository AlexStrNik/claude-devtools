# Claude DevTools

![Claude DevTools](screenshots/demo.png)

**Fix your frontend code right from DevTools.**

Pick a component, write your prompt, and send it directly to Claude Code—without leaving the page.

---

## Quick Start

### 1. Install the host server

```bash
npm install -g @alexstrnik/claude-devtools
```

### 2. Install the Chrome extension

**Option A: Download latest release** (Easiest)
1. Go to [Releases](https://github.com/AlexStrNik/claude-devtools/releases/latest)
2. Download `claude-devtools-chrome-vX.X.X.zip`
3. Open Chrome → Extensions → Enable **Developer mode**
4. **Drag and drop** the zip file directly onto the Extensions page

**Option B: Clone from source**
1. Clone this repo: `git clone https://github.com/AlexStrNik/claude-devtools`
2. Open Chrome → Extensions → Enable **Developer mode**
3. Click **Load unpacked** → select `chrome-extension` folder

### 3. Start the host server

In your project directory:

```bash
claude-devtools
```

The `claude-devtools` command works just like the regular `claude` CLI. It starts an interactive Claude Code session and accepts all the same arguments (except `--version`), which are passed directly to the underlying Claude process.

---

## Usage

1. Open DevTools → **Claude DevTools** tab
2. Click **Pick Element** → select a component on the page
3. Write your prompt or question
4. Hit **Send to Claude** (or Cmd/Ctrl+Enter)

Your element's context is sent directly to Claude, including:

- Component name, props, and hierarchy paths
- DOM structure and computed styles
- Screenshot (macOS only)

---

## Features

- **React support**: Full component detection with props and source locations (React <19 and React 19+)
- **Preact support**: Component hierarchy detection via Preact DevTools (requires [Preact DevTools extension](https://preactjs.github.io/preact-devtools/))
- **Angular support**: Complete component hierarchy (tested on Angular 17)
- **Vue support**: Component detection for Vue 2 and Vue 3
- **Screenshots**: Automatic element capture for visual context (macOS only)
- **Customizable context**: Toggle what data to include before sending

---

## Development

```bash
# Clone repository
git clone https://github.com/AlexStrNik/claude-devtools

# Install host dependencies
cd claude-devtools
pnpm install

# Start server
pnpm start
```

Load the extension from the `chrome-extension` folder in Chrome DevTools.

---

## Roadmap

- Screenshot support for Linux/Windows
- Additional framework support

---

## License

MIT
