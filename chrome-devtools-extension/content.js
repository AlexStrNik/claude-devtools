class ClaudeDevTools {
  constructor() {
    this.isPicking = false;
    this.currentElement = null;
    this.overlay = null;
    this.instructions = null;
    this.highlighter = null;
    this.label = null;

    this.init();
  }

  init() {
    this.injectScript();
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "startPicking") {
        this.startPicking();
        sendResponse({ success: true });
      } else if (request.action === "stopPicking") {
        this.stopPicking();
        sendResponse({ success: true });
      }
    });
  }

  injectScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    (document.head || document.documentElement).appendChild(script);
  }

  startPicking() {
    if (this.isPicking) return;

    this.isPicking = true;
    this.createOverlay();
    this.bindEvents();
  }

  stopPicking() {
    if (!this.isPicking) return;

    this.isPicking = false;
    this.removeOverlay();
    this.unbindEvents();
    this.clearHighlight();
  }

  createOverlay() {
    // Create dark overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "claude-devtools-overlay";
    document.body.appendChild(this.overlay);

    // Create instructions
    this.instructions = document.createElement("div");
    this.instructions.className = "claude-devtools-instructions";
    this.instructions.innerHTML = `
      Click any element to select • Click "Cancel Picking" to stop
    `;
    document.body.appendChild(this.instructions);

    // Create highlighter elements
    this.highlighter = document.createElement("div");
    this.highlighter.className = "claude-devtools-highlighter";
    document.body.appendChild(this.highlighter);

    this.label = document.createElement("div");
    this.label.className = "claude-devtools-label";
    document.body.appendChild(this.label);
  }

  removeOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.instructions) {
      this.instructions.remove();
      this.instructions = null;
    }
    if (this.highlighter) {
      this.highlighter.remove();
      this.highlighter = null;
    }
    if (this.label) {
      this.label.remove();
      this.label = null;
    }
  }

  bindEvents() {
    document.addEventListener("mouseover", this.handleMouseOver, {
      capture: true,
      passive: false,
    });
    document.addEventListener("mouseout", this.handleMouseOut, {
      capture: true,
      passive: false,
    });
    document.addEventListener("click", this.handleClick, {
      capture: true,
      passive: false,
    });
    document.addEventListener("keydown", this.handleKeyDown, {
      capture: true,
      passive: false,
    });

    // Only block interactions that interfere with element selection
    document.addEventListener("mousedown", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.addEventListener("mouseup", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.addEventListener("dblclick", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.addEventListener("contextmenu", this.blockEvent, {
      capture: true,
      passive: false,
    });
    // Don't block wheel - allow scrolling
    // Don't block touch events - allow mobile interaction
  }

  unbindEvents() {
    document.removeEventListener("mouseover", this.handleMouseOver, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("mouseout", this.handleMouseOut, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("click", this.handleClick, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("keydown", this.handleKeyDown, {
      capture: true,
      passive: false,
    });

    // Remove blocked event listeners
    document.removeEventListener("mousedown", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("mouseup", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("dblclick", this.blockEvent, {
      capture: true,
      passive: false,
    });
    document.removeEventListener("contextmenu", this.blockEvent, {
      capture: true,
      passive: false,
    });
  }

  handleMouseOver = async (e) => {
    if (!this.isPicking) return;

    // Skip our own elements
    if (this.isOurElement(e.target)) return;

    e.stopPropagation();
    e.preventDefault();

    await this.highlightElement(e.target);
  };

  handleMouseOut = (e) => {
    if (!this.isPicking) return;

    // Skip our own elements
    if (this.isOurElement(e.target)) return;

    e.stopPropagation();
    e.preventDefault();
    this.clearHighlight();
  };

  handleClick = async (e) => {
    if (!this.isPicking) return;

    // Skip our own elements
    if (this.isOurElement(e.target)) return;

    e.stopPropagation();
    e.preventDefault();

    const element = e.target;
    await this.selectElement(element);
  };

  handleKeyDown = (e) => {
    if (!this.isPicking) return;

    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      this.stopPicking();
      return;
    }
  };

  blockEvent = (e) => {
    if (!this.isPicking) return;
    if (this.isOurElement(e.target)) return;
    e.stopPropagation();
    e.preventDefault();
  };

  isOurElement(element) {
    return (
      element === this.overlay ||
      element === this.instructions ||
      element === this.highlighter ||
      element === this.label ||
      element.closest(".claude-devtools-overlay") ||
      element.closest(".claude-devtools-instructions") ||
      element.closest(".claude-devtools-highlighter") ||
      element.closest(".claude-devtools-label")
    );
  }

  async highlightElement(element) {
    this.currentElement = element;
    const rect = element.getBoundingClientRect();
    this.highlighter.classList.add("active");
    this.highlighter.style.left = rect.left + "px";
    this.highlighter.style.top = rect.top + "px";
    this.highlighter.style.width = rect.width + "px";
    this.highlighter.style.height = rect.height + "px";

    // Get component info asynchronously
    const componentInfo = await this.getComponentInfo(element);
    const componentLabel = componentInfo
      ? `${componentInfo.name || "Component"}`
      : element.tagName.toLowerCase();

    // Position and show the label
    this.label.textContent = componentLabel;
    this.label.classList.add("active");

    // Position label above the element, but adjust if it goes off screen
    let labelTop = rect.top - 24;
    if (labelTop < 0) {
      labelTop = rect.top + rect.height + 4;
    }

    this.label.style.left = rect.left + "px";
    this.label.style.top = labelTop + "px";
  }

  clearHighlight() {
    this.currentElement = null;
    if (this.highlighter) {
      this.highlighter.classList.remove("active");
    }
    if (this.label) {
      this.label.classList.remove("active");
    }
  }

  async selectElement(element) {
    this.stopPicking();

    // Ensure element has an ID before getting component info
    let elementId = element.getAttribute("data-claude-devtools-id");
    if (!elementId) {
      elementId = this.generateElementId();
      element.setAttribute("data-claude-devtools-id", elementId);
    }

    const elementData = {
      tagName: element.tagName.toLowerCase(),
      component: await this.getComponentInfo(element),
      html: this.getElementHTML(element),
      styles: this.getElementStyles(element),
      screenshot: await this.captureElementScreenshot(element),
      elementId: elementId,
    };
    chrome.storage.local.set({ selectedElement: elementData });
  }

  getComponentInfo(element) {
    return new Promise((resolve) => {
      const messageId = Date.now() + Math.random();

      const handleMessage = (event) => {
        if (
          event.data.type === "CLAUDE_DEVTOOLS_COMPONENT_INFO_RESPONSE" &&
          event.data.id === messageId
        ) {
          window.removeEventListener("message", handleMessage);
          resolve(event.data.componentInfo);
        }
      };

      window.addEventListener("message", handleMessage);
      let elementId = element.getAttribute("data-claude-devtools-id");
      if (!elementId) {
        elementId = this.generateElementId();
        element.setAttribute("data-claude-devtools-id", elementId);
      }

      window.postMessage(
        {
          type: "CLAUDE_DEVTOOLS_GET_COMPONENT_INFO",
          id: messageId,
          elementId: elementId,
        },
        "*",
      );

      setTimeout(() => {
        window.removeEventListener("message", handleMessage);
        // element.removeAttribute('data-claude-devtools-id');
        resolve(this.getFallbackComponentInfo(element));
      }, 500);
    });
  }

  generateElementId() {
    return (
      "claude-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11)
    );
  }

  getFallbackComponentInfo() {
    return null;
  }

  getElementHTML(element) {
    const clone = element.cloneNode(true);
    this.removeUnwantedAttributes(clone);
    this.limitElementDepth(clone, 1);
    this.limitChildrenCount(clone, 10);
    return this.formatHTML(clone.outerHTML);
  }

  removeUnwantedAttributes(element) {
    const unwantedAttrs = [
      "data-reactroot",
      "__reactInternalInstance",
      "__reactFiber",
      "data-react-checksum",
      "data-reactid",
    ];

    unwantedAttrs.forEach((attr) => {
      if (element.hasAttribute && element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // Recursively clean children
    for (const child of element.children || []) {
      this.removeUnwantedAttributes(child);
    }
  }

  limitElementDepth(element, maxDepth) {
    if (maxDepth <= 0) {
      element.innerHTML =
        element.children.length > 0 ? "..." : element.innerHTML;
      return;
    }

    for (const child of [...element.children]) {
      this.limitElementDepth(child, maxDepth - 1);
    }
  }

  limitChildrenCount(element, maxCount) {
    const children = [...element.children];
    if (children.length > maxCount) {
      // Keep first maxCount children and add indicator
      for (let i = maxCount; i < children.length; i++) {
        children[i].remove();
      }

      const indicator = document.createElement("div");
      indicator.textContent = `... ${children.length - maxCount} more children`;
      element.appendChild(indicator);
    }

    // Recursively limit children
    for (const child of element.children) {
      if (
        child.tagName !== "DIV" ||
        child.textContent !== `... ${children.length - maxCount} more children`
      ) {
        this.limitChildrenCount(child, maxCount);
      }
    }
  }

  formatHTML(html) {
    // Basic HTML formatting
    return html
      .replace(/></g, ">\n<")
      .replace(/^\s+|\s+$/gm, "")
      .split("\n")
      .map((line) => {
        const depth = line.match(/^<[^\/]/) ? line.split("<").length - 1 : 0;
        return "  ".repeat(depth) + line.trim();
      })
      .join("\n");
  }

  getElementStyles(element) {
    const computed = window.getComputedStyle(element);
    const importantStyles = [
      "display",
      "position",
      "width",
      "height",
      "margin",
      "padding",
      "color",
      "background-color",
      "font-size",
      "font-family",
      "border",
    ];

    const styles = {};
    importantStyles.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== "initial" && value !== "auto") {
        styles[prop] = value;
      }
    });

    return Object.entries(styles)
      .map(([prop, value]) => `${prop}: ${value};`)
      .join("\n");
  }

  async captureElementScreenshot(element) {
    try {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return null;
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "CAPTURE_ELEMENT",
            rect: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              dpr: window.devicePixelRatio,
            },
          },
          resolve,
        );
      });
    } catch (error) {
      console.warn("Failed to capture screenshot:", error);
      return null;
    }
  }

  async createPlaceholderImage(rect, tagName) {
    return new Promise((resolve) => {
      // Create a simple canvas-based placeholder that won't cause taint issues
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Limit canvas size to reasonable dimensions
      const maxWidth = Math.min(rect.width, 400);
      const maxHeight = Math.min(rect.height, 300);

      canvas.width = maxWidth;
      canvas.height = maxHeight;

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, maxWidth, maxHeight);
      gradient.addColorStop(0, "#f8f9fa");
      gradient.addColorStop(1, "#e9ecef");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, maxWidth, maxHeight);

      // Add border
      ctx.strokeStyle = "#dee2e6";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, maxWidth - 2, maxHeight - 2);

      // Add element info text
      ctx.fillStyle = "#495057";
      ctx.font =
        "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = `<${tagName.toLowerCase()}>`;
      ctx.fillText(text, maxWidth / 2, maxHeight / 2 - 10);

      // Add dimensions text
      ctx.font = "12px monospace";
      ctx.fillStyle = "#6c757d";
      const dimText = `${Math.round(rect.width)}×${Math.round(rect.height)}px`;
      ctx.fillText(dimText, maxWidth / 2, maxHeight / 2 + 15);

      try {
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (error) {
        // If even this fails, return null
        console.warn("Failed to create placeholder image:", error);
        resolve(null);
      }
    });
  }
}

// Initialize
const claudeDevTools = new ClaudeDevTools();
