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

  injectPickerStyles() {
    this.pickerStyle = document.createElement("style");
    this.pickerStyle.id = "claude-devtools-picker-style";
    this.pickerStyle.textContent = `
      *[disabled] {
        pointer-events: all !important;
      }
      button[disabled],
      input[disabled],
      select[disabled],
      textarea[disabled] {
        pointer-events: all !important;
      }
    `;
    document.head.appendChild(this.pickerStyle);
  }

  removePickerStyles() {
    if (this.pickerStyle) {
      this.pickerStyle.remove();
      this.pickerStyle = null;
    }
  }

  startPicking() {
    if (this.isPicking) return;

    this.isPicking = true;
    this.createOverlay();
    this.injectPickerStyles();
    this.bindEvents();
  }

  stopPicking() {
    if (!this.isPicking) return;

    this.isPicking = false;
    this.removeOverlay();
    this.removePickerStyles();
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
    document.addEventListener("mousemove", this.handleMouseMove, {
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
  }

  unbindEvents() {
    document.removeEventListener("mousemove", this.handleMouseMove, {
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

  handleMouseMove = async (e) => {
    if (!this.isPicking) return;

    e.stopPropagation();
    e.preventDefault();

    const instructionsRect = this.instructions.getBoundingClientRect();
    const isNearInstructions =
      e.clientY >= instructionsRect.top - 50 &&
      e.clientY <= instructionsRect.bottom + 20 &&
      e.clientX >= instructionsRect.left - 50 &&
      e.clientX <= instructionsRect.right + 50;

    if (isNearInstructions) {
      this.instructions.style.opacity = "0.2";
    } else {
      this.instructions.style.opacity = "1";
    }

    const element = this.getElementFromPoint(e.clientX, e.clientY);
    if (!element) return;

    if (element !== this.currentElement) {
      await this.highlightElement(element);
    }
  };

  handleClick = async (e) => {
    if (!this.isPicking) return;

    e.stopPropagation();
    e.preventDefault();

    const element = this.getElementFromPoint(e.clientX, e.clientY);
    if (!element) return;

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
    e.stopPropagation();
    e.preventDefault();
  };

  getElementFromPoint(x, y) {
    const elements = document.elementsFromPoint(x, y);
    for (const element of elements) {
      if (
        element !== this.overlay &&
        element !== this.instructions &&
        element !== this.highlighter &&
        element !== this.label
      ) {
        return element;
      }
    }
    return null;
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
        resolve(null);
      }, 500);
    });
  }

  generateElementId() {
    return (
      "claude-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11)
    );
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

}

// Initialize
const claudeDevTools = new ClaudeDevTools();
