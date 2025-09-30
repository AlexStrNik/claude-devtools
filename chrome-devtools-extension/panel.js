let selectedElement = null;
let isPicking = false;

// Initialize source-map library
sourceMap.SourceMapConsumer.initialize({
  "lib/mappings.wasm": "./mappings.wasm",
});

document.addEventListener("DOMContentLoaded", function () {
  const pickElementBtn = document.getElementById("pickElement");
  const sendToClaudeBtn = document.getElementById("sendToClaude");
  const promptText = document.getElementById("promptText");
  const detailsContainer = document.getElementById("detailsContainer");
  const status = document.getElementById("status");
  const statusDot = document.getElementById("statusDot");
  const connectionStatus = document.getElementById("connectionStatus");
  const portInput = document.getElementById("portInput");
  const screenshotOption = document.getElementById("screenshotOption");
  const stylesOption = document.getElementById("stylesOption");
  const domOption = document.getElementById("domOption");
  const propsOption = document.getElementById("propsOption");
  const pickStatus = document.getElementById("pickStatus");

  // Clear all old data - start fresh each time
  chrome.storage.local.remove(["selectedElement", "promptText"]);

  // Load saved port from localStorage
  const savedPort = localStorage.getItem('claude-devtools-port');
  if (savedPort) {
    portInput.value = savedPort;
  }

  // Load saved checkbox preferences
  loadCheckboxPreferences();

  // Detect and apply DevTools theme
  applyDevToolsTheme();

  // Check initial connection status
  checkConnectionStatus();
  updateUI();

  // Set up periodic connection status check every 30 seconds
  setInterval(checkConnectionStatus, 30000);

  // Initialize textarea auto-resize
  autoResizeTextarea(promptText);

  // Update button text with platform-specific shortcut
  updateSendButtonText();

  // Listen for storage changes (when element is selected)
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === "local" && changes.selectedElement) {
      selectedElement = changes.selectedElement.newValue;
      if (selectedElement) {
        updateSelectedInfo();
        updateUI();

        showStatus("Element selected!", "success");
        setPickingState(false);

        // Try to get Angular source location if it's an Angular component
        if (
          selectedElement.component?.framework === "Angular" &&
          selectedElement.elementId
        ) {
          getAngularSourceLocation(selectedElement.elementId);
        }
      }
    }
  });

  pickElementBtn.addEventListener("click", function () {
    if (isPicking) {
      // Cancel picking
      cancelPicking();
    } else {
      // Start element picking
      startPicking();
    }
  });

  promptText.addEventListener("input", function () {
    updateUI();
    autoResizeTextarea(this);
  });

  // Add keyboard shortcut for submit (Cmd+Enter or Ctrl+Enter)
  promptText.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!sendToClaudeBtn.disabled) {
        sendToClaudeBtn.click();
      }
    }
  });

  // Port input blur event for connection checking
  portInput.addEventListener("blur", function () {
    const port = portInput.value.trim();
    if (port) {
      localStorage.setItem('claude-devtools-port', port);
      checkConnectionStatus();
    }
  });

  // Option toggles
  [screenshotOption, stylesOption, domOption, propsOption].forEach(option => {
    option.addEventListener("click", function() {
      this.classList.toggle("enabled");
      saveCheckboxPreferences();
    });
  });

  sendToClaudeBtn.addEventListener("click", async function () {
    if (!selectedElement || !promptText.value.trim()) {
      showStatus("Please select an element and enter a prompt", "error");
      return;
    }

    sendToClaudeBtn.disabled = true;
    showStatus("Sending to Claude...", "success");

    try {
      const port = await getServerPort();
      const response = await fetch(`http://127.0.0.1:${port}/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: buildPrompt(),
          image: screenshotOption.classList.contains("enabled")
            ? selectedElement.screenshot
            : null,
        }),
      });

      if (response.ok) {
        showStatus("Sent to Claude successfully!", "success");
        // Clear the prompt and reset selection
        promptText.value = "";
        selectedElement = null;
        // Clear from storage as well
        chrome.storage.local.remove(["selectedElement"]);
        updateSelectedInfo();
        updateUI();
        autoResizeTextarea(promptText);
      } else {
        showStatus(
          "Failed to send to Claude - is claude-devtools-host running?",
          "error",
        );
      }
    } catch (error) {
      showStatus(`Error connecting to host: ${error.message}`, "error");
    } finally {
      sendToClaudeBtn.disabled = false;
    }
  });

  function startPicking() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "startPicking" },
        function (response) {
          if (chrome.runtime.lastError) {
            showStatus(
              "Failed to connect to page. Try refreshing the page.",
              "error",
            );
            return;
          }

          if (response && response.success) {
            setPickingState(true);
            showStatus(
              "Element picker activated - click any element on the page",
              "success",
            );
          } else {
            showStatus("Failed to start element picker", "error");
          }
        },
      );
    });
  }

  function cancelPicking() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "stopPicking" },
        function () {
          setPickingState(false);
          showStatus("Element picking cancelled", "success");
        },
      );
    });
  }

  function setPickingState(picking) {
    isPicking = picking;
    if (picking) {
      pickElementBtn.textContent = "Cancel Picking";
      pickElementBtn.classList.remove("primary");
    } else {
      pickElementBtn.textContent = "Pick Element";
      pickElementBtn.classList.add("primary");
    }
  }

  function updateSelectedInfo() {
    if (!selectedElement) {
      detailsContainer.innerHTML = '<div class="hint">Select an element to inspect</div>';
      return;
    }

    // Clear container
    detailsContainer.innerHTML = '';

    // Element info
    addDetailsRow("Tag:", `<${selectedElement.tagName}>`);

    // Component info in order: Framework, Component, File
    if (selectedElement.component) {
      if (selectedElement.component.framework) {
        addDetailsRow("Framework:", selectedElement.component.framework);
      }
      if (selectedElement.component.name) {
        addDetailsRow("Component:", selectedElement.component.name);
      }
      if (selectedElement.component.file && selectedElement.component.file !== "detecting...") {
        addDetailsRow("File:", selectedElement.component.file);
      }
    }

    // Props info (if available and enabled)
    if (selectedElement.component?.props) {
      const propsText = JSON.stringify(selectedElement.component.props, null, 2);
      const propsPreview = propsText.length > 200
        ? propsText.substring(0, 200) + "..."
        : propsText;
      addDetailsRow("Props:", propsPreview);
    }

    // HTML
    if (selectedElement.html) {
      const htmlPreview = selectedElement.html.length > 400
        ? selectedElement.html.substring(0, 400) + "..."
        : selectedElement.html;
      addDetailsRow("HTML:", htmlPreview);
    }

    // Styles
    if (selectedElement.styles) {
      const stylesPreview = selectedElement.styles.length > 400
        ? selectedElement.styles.substring(0, 400) + "..."
        : selectedElement.styles;
      addDetailsRow("Styles:", stylesPreview);
    }
  }

  function addDetailsRow(label, value) {
    const row = document.createElement('div');
    row.className = 'details-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'details-label';
    labelSpan.innerText = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'details-value';
    valueSpan.innerText = value;

    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    detailsContainer.appendChild(row);
  }

  function updateUI() {
    const shouldDisable = !selectedElement || !promptText.value.trim();
    console.log('updateUI:', { selectedElement: !!selectedElement, promptValue: promptText.value, shouldDisable });
    sendToClaudeBtn.disabled = shouldDisable;
  }

  function buildPrompt() {
    let prompt = promptText.value.trim();

    if (selectedElement.component) {
      prompt += `\n\nComponent Information:`;
      if (selectedElement.component.name) {
        prompt += `\n- Component: ${selectedElement.component.name}`;
      }
      if (selectedElement.component.framework) {
        prompt += `\n- Framework: ${selectedElement.component.framework}`;
      }
      if (selectedElement.component.file) {
        prompt += `\n- File: ${selectedElement.component.file}`;
      }
      if (propsOption.classList.contains("enabled") && selectedElement.component.props) {
        prompt += `\n- Props: ${JSON.stringify(
          selectedElement.component.props,
          null,
          2,
        )}`;
      }
    }

    if (domOption.classList.contains("enabled") && selectedElement.html) {
      prompt += `\n\nHTML Structure:\n\`\`\`html\n${selectedElement.html}\n\`\`\``;
    }

    if (stylesOption.classList.contains("enabled") && selectedElement.styles) {
      prompt += `\n\nComputed Styles:\n\`\`\`css\n${selectedElement.styles}\n\`\`\``;
    }

    return prompt;
  }

  function showStatus(message, type) {
    pickStatus.textContent = message;
    pickStatus.className = `pick-status ${type}`;
    if (message.trim()) {
      pickStatus.style.display = "inline";
      setTimeout(() => {
        pickStatus.textContent = "";
        pickStatus.className = "pick-status";
        pickStatus.style.display = "none";
      }, 5000);
    } else {
      pickStatus.style.display = "none";
    }
  }

  async function getServerPort() {
    const result = await chrome.storage.local.get(["serverPort"]);
    return result.serverPort || 47923;
  }

  async function checkConnectionStatus() {
    const port = portInput.value.trim() || '47923';
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      if (response.ok) {
        const healthData = await response.json();
        const version = healthData.version ? `v${healthData.version}` : '';
        setConnectionStatus(true, version ? `connected ${version}` : 'connected');
      } else {
        setConnectionStatus(false, 'error');
      }
    } catch (error) {
      setConnectionStatus(false, 'disconnected');
    }
  }

  function setConnectionStatus(connected, statusText) {
    if (connected) {
      statusDot.classList.remove('disconnected');
      connectionStatus.textContent = statusText;
    } else {
      statusDot.classList.add('disconnected');
      connectionStatus.textContent = statusText;
    }
  }

  function autoResizeTextarea(textarea) {
    // Reset height to allow scrollHeight to be calculated correctly
    textarea.style.height = '80px'; // min-height

    // Calculate new height based on content
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, 80), 200); // min: 80px, max: 200px

    textarea.style.height = newHeight + 'px';
  }

  function loadCheckboxPreferences() {
    const preferences = localStorage.getItem('claude-devtools-checkboxes');
    if (preferences) {
      try {
        const prefs = JSON.parse(preferences);

        if (prefs.screenshot !== undefined) {
          screenshotOption.classList.toggle('enabled', prefs.screenshot);
        }
        if (prefs.styles !== undefined) {
          stylesOption.classList.toggle('enabled', prefs.styles);
        }
        if (prefs.dom !== undefined) {
          domOption.classList.toggle('enabled', prefs.dom);
        }
        if (prefs.props !== undefined) {
          propsOption.classList.toggle('enabled', prefs.props);
        }
      } catch (e) {
        // If parsing fails, use default values (all enabled as per HTML)
      }
    }
  }

  function saveCheckboxPreferences() {
    const preferences = {
      screenshot: screenshotOption.classList.contains('enabled'),
      styles: stylesOption.classList.contains('enabled'),
      dom: domOption.classList.contains('enabled'),
      props: propsOption.classList.contains('enabled')
    };
    localStorage.setItem('claude-devtools-checkboxes', JSON.stringify(preferences));
  }

  function applyDevToolsTheme() {
    // DevTools theme detection
    const isDark = chrome.devtools?.panels?.themeName === 'dark' ||
                   window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ||
                   false;

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Listen for theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      });
    }
  }

  function updateSendButtonText() {
    // Detect platform for keyboard shortcut display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
                  navigator.userAgent.indexOf('Mac OS X') !== -1;
    const shortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
    sendToClaudeBtn.textContent = `Send (${shortcut})`;
  }

  chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
      if (request.type === "CAPTURE_ELEMENT") {
        chrome.tabs.captureVisibleTab(
          null,
          { format: "png" },
          function (dataUrl) {
            if (chrome.runtime.lastError) {
              sendResponse(null);
              return;
            }

            const img = new Image();
            img.onload = function () {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              const dpr = request.rect.dpr || 1;
              const scaledX = request.rect.x * dpr;
              const scaledY = request.rect.y * dpr;
              const scaledWidth = request.rect.width * dpr;
              const scaledHeight = request.rect.height * dpr;

              canvas.width = request.rect.width;
              canvas.height = request.rect.height;

              ctx.drawImage(
                img,
                scaledX,
                scaledY,
                scaledWidth,
                scaledHeight,
                0,
                0,
                request.rect.width,
                request.rect.height,
              );

              sendResponse(canvas.toDataURL("image/png"));
            };
            img.src = dataUrl;
          },
        );
        return true;
      }
    },
  );

  async function getAngularSourceLocation(elementId) {
    const debuggee = { tabId: chrome.devtools.inspectedWindow.tabId };

    try {
      await new Promise((resolve, reject) => {
        chrome.debugger.attach(debuggee, "1.3", () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      const evalResult = await new Promise((resolve) => {
        chrome.debugger.sendCommand(
          debuggee,
          "Runtime.evaluate",
          {
            expression: `window.ng.getOwningComponent(document.querySelector('[data-claude-devtools-id="${elementId}"]')).constructor`,
            objectGroup: "console",
          },
          resolve,
        );
      });

      if (evalResult.result?.objectId) {
        const propertiesResult = await new Promise((resolve) => {
          chrome.debugger.sendCommand(
            debuggee,
            "Runtime.getProperties",
            {
              objectId: evalResult.result.objectId,
            },
            resolve,
          );
        });

        const functionLocationProp = propertiesResult.internalProperties?.find(
          (prop) => prop.name === "[[FunctionLocation]]",
        );

        if (functionLocationProp?.value?.value) {
          const location = functionLocationProp.value.value;
          const scriptId = location.scriptId;
          const lineNumber = location.lineNumber;
          const columnNumber = location.columnNumber;

          // Disable debugger first
          await new Promise((resolve) => {
            chrome.debugger.sendCommand(
              debuggee,
              "Debugger.disable",
              {},
              resolve,
            );
          });

          // Set up promise for script event
          const scriptPromise = new Promise((resolveScript) => {
            chrome.debugger.onEvent.addListener((source, method, params) => {
              if (
                source.tabId === debuggee.tabId &&
                method === "Debugger.scriptParsed" &&
                params.scriptId === scriptId
              ) {
                resolveScript({
                  url: params.url,
                  sourceMapURL: params.sourceMapURL,
                });
              }
            });
          });

          // Re-enable debugger to trigger script events
          await new Promise((resolve) => {
            chrome.debugger.sendCommand(
              debuggee,
              "Debugger.enable",
              {},
              resolve,
            );
          });

          // Wait for our specific script
          const scriptInfo = await scriptPromise;

          chrome.debugger.detach(debuggee);

          let fileName = scriptInfo.url || `script-${scriptId}`;
          let finalLineNumber = lineNumber;
          let finalColumnNumber = columnNumber;

          if (
            scriptInfo.sourceMapURL &&
            scriptInfo.sourceMapURL.startsWith("data:application/json;base64,")
          ) {
            try {
              const base64Data = scriptInfo.sourceMapURL.split(",")[1];
              const sourceMapJson = atob(base64Data);
              const sourceMapData = JSON.parse(sourceMapJson);

              const consumer = await new sourceMap.SourceMapConsumer(
                sourceMapData,
              );

              const originalPosition = consumer.originalPositionFor({
                line: lineNumber + 1, // source-map uses 1-based line numbers
                column: columnNumber,
              });

              if (originalPosition.source) {
                fileName = originalPosition.source;
                finalLineNumber = originalPosition.line;
              }

              consumer.destroy();
            } catch (error) {
              // Silently fall back to compiled location
            }
          }

          if (fileName === scriptInfo.url && scriptInfo.url) {
            const urlParts = scriptInfo.url.split("/");
            const fullName = urlParts[urlParts.length - 1];
            fileName = fullName.split("?")[0];
          }

          selectedElement.component.file = `${fileName}:${finalLineNumber}`;
          chrome.storage.local.set({ selectedElement: selectedElement });
        } else {
          chrome.debugger.detach(debuggee);
        }
      } else {
        chrome.debugger.detach(debuggee);
      }
    } catch (error) {
      try {
        chrome.debugger.detach(debuggee);
      } catch (e) {}
    }
  }
});
