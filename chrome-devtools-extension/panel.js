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
  const selectedInfo = document.getElementById("selectedInfo");
  const status = document.getElementById("status");
  const pickingIndicator = document.getElementById("pickingIndicator");
  const includeImageCheckbox = document.getElementById("includeImage");
  const includeStylesCheckbox = document.getElementById("includeStyles");
  const includeDomCheckbox = document.getElementById("includeDom");
  const includePropsCheckbox = document.getElementById("includeProps");

  // Clear all old data - start fresh each time
  chrome.storage.local.remove(["selectedElement", "promptText"]);
  updateUI();

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
          image: includeImageCheckbox.checked
            ? selectedElement.screenshot
            : null,
        }),
      });

      if (response.ok) {
        showStatus("Sent to Claude successfully!", "success");
        // Clear the prompt
        promptText.value = "";
        updateUI();
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
      pickingIndicator.classList.add("active");
    } else {
      pickElementBtn.textContent = "Pick Element";
      pickElementBtn.classList.add("primary");
      pickingIndicator.classList.remove("active");
    }
  }

  function updateSelectedInfo() {
    if (!selectedElement) {
      selectedInfo.classList.add("hidden");
      return;
    }

    selectedInfo.classList.remove("hidden");

    document.getElementById("componentName").textContent =
      selectedElement.component?.name || "Not detected";
    document.getElementById("componentFile").textContent =
      selectedElement.component?.file || "Not available";
    document.getElementById("elementTag").textContent =
      `<${selectedElement.tagName}>`;
    document.getElementById("framework").textContent =
      selectedElement.component?.framework || "None detected";

    // Show component props if available
    const propsDetails = document.getElementById("componentPropsDetails");
    const propsElement = document.getElementById("componentProps");
    if (selectedElement.component?.props) {
      propsElement.textContent = JSON.stringify(
        selectedElement.component.props,
        null,
        2,
      );
      propsDetails.style.display = "block";
    } else {
      propsDetails.style.display = "none";
    }

    // Show screenshot if available
    const preview = document.getElementById("elementPreview");
    const screenshot = document.getElementById("elementScreenshot");
    if (selectedElement.screenshot) {
      screenshot.src = selectedElement.screenshot;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }

    // Show HTML and styles
    document.getElementById("elementHTML").textContent =
      selectedElement.html || "Not available";
    document.getElementById("elementStyles").textContent =
      selectedElement.styles || "Not available";
  }

  function updateUI() {
    sendToClaudeBtn.disabled = !selectedElement || !promptText.value.trim();
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
      if (includePropsCheckbox.checked && selectedElement.component.props) {
        prompt += `\n- Props: ${JSON.stringify(
          selectedElement.component.props,
          null,
          2,
        )}`;
      }
    }

    if (includeDomCheckbox.checked && selectedElement.html) {
      prompt += `\n\nHTML Structure:\n\`\`\`html\n${selectedElement.html}\n\`\`\``;
    }

    if (includeStylesCheckbox.checked && selectedElement.styles) {
      prompt += `\n\nComputed Styles:\n\`\`\`css\n${selectedElement.styles}\n\`\`\``;
    }

    return prompt;
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 5000);
  }

  async function getServerPort() {
    const result = await chrome.storage.local.get(["serverPort"]);
    return result.serverPort || 47923;
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
