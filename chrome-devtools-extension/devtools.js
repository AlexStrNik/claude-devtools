// Create the Claude DevTools panel
chrome.devtools.panels.create(
  "Claude",
  "claude.svg",
  "panel.html",
  function (panel) {
    console.log("Claude DevTools panel created");

    // Panel event listeners
    panel.onShown.addListener(function (panelWindow) {
      console.log("Claude DevTools panel shown");
      // Panel is now visible
    });

    panel.onHidden.addListener(function () {
      console.log("Claude DevTools panel hidden");
    });
  },
);
