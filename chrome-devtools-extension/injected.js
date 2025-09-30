(function () {
  "use strict";

  class FrameworkDetector {
    detectFramework() {
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        return "React";
      }
      if (window.ng) {
        return "Angular";
      }
      return null;
    }

    getComponentInfo(element) {
      const framework = this.detectFramework();

      if (framework === "React") {
        const reactInfo = this.getReactInfo(element);
        if (reactInfo) return { ...reactInfo, framework: "React" };
      } else if (framework === "Angular") {
        const angularInfo = this.getAngularInfo(element);
        if (angularInfo) return { ...angularInfo, framework: "Angular" };
      }

      return null;
    }

    getReactInfo(element) {
      const fiberKey = Object.keys(element).find((key) =>
        key.startsWith("__reactFiber")
      );

      if (!fiberKey) return null;

      let fiber = element[fiberKey];
      if (!fiber) return null;

      while (fiber) {
        const name = fiber.type?.name || fiber.type?.displayName;
        if (name && !this.isReactInternal(name)) {
          break;
        }
        fiber = fiber._debugOwner;
        if (!fiber) return null;
      }

      const name = fiber.type?.name || fiber.type?.displayName;
      if (!name) return null;

      const sources = [];
      const functionsToLocate = [];
      let currentFiber = fiber;
      let finalName = name;
      let finalProps = fiber.memoizedProps;

      while (currentFiber) {
        if (currentFiber._debugSource) {
          if (sources.length === 0) {
            finalName =
              currentFiber.type?.name ||
              currentFiber.type?.displayName ||
              finalName;
            finalProps = currentFiber.memoizedProps || finalProps;
          }
          sources.push({
            fileName: currentFiber._debugSource.fileName,
            lineNumber: currentFiber._debugSource.lineNumber,
          });
        } else if (
          currentFiber.type &&
          typeof currentFiber.type === "function"
        ) {
          functionsToLocate.push(currentFiber.type);
        }

        currentFiber = currentFiber._debugOwner;
      }

      const files = sources.map((s) => `${s.fileName}:${s.lineNumber}`);

      return {
        name: finalName,
        props: finalProps,
        files: files.length > 0 ? files : null,
        functionsToLocate: functionsToLocate,
        needsSourceDetection: sources.length === 0,
        elementId: element.getAttribute("data-claude-devtools-id"),
      };
    }

    getAngularInfo(element) {
      if (!window.ng?.getOwningComponent) return null;

      let currentComponent = window.ng.getOwningComponent(element);
      if (!currentComponent) return null;

      const functionsToLocate = [];
      let finalName = null;
      let finalProps = null;

      while (currentComponent) {
        if (!finalName) {
          finalName = currentComponent.constructor.name.startsWith("_")
            ? currentComponent.constructor.name.substring(1)
            : currentComponent.constructor.name;
          finalProps = currentComponent;
        }

        functionsToLocate.push(currentComponent.constructor);

        try {
          currentComponent = window.ng.getOwningComponent(currentComponent);
        } catch {
          break;
        }
      }

      return {
        name: finalName,
        props: finalProps,
        files: null,
        functionsToLocate: functionsToLocate,
        needsSourceDetection: true,
        elementId: element.getAttribute("data-claude-devtools-id"),
      };
    }

    isReactInternal(name) {
      const internals = ["Fragment", "StrictMode", "Profiler", "Suspense"];
      return (
        internals.includes(name) ||
        name.startsWith("React.") ||
        name.startsWith("Primitive.")
      );
    }
  }

  const detector = new FrameworkDetector();

  function sanitizeProps(props) {
    if (!props) return null;
    try {
      return JSON.parse(JSON.stringify(props));
    } catch (error) {
      return null;
    }
  }

  window.addEventListener("message", function (event) {
    if (event.data?.type === "CLAUDE_DEVTOOLS_GET_COMPONENT_INFO") {
      const elementId = event.data.elementId;
      const element = document.querySelector(
        `[data-claude-devtools-id="${elementId}"]`
      );
      const componentInfo = element ? detector.getComponentInfo(element) : null;

      if (componentInfo?.functionsToLocate) {
        window.__claudeDevToolsFunctionsToLocate =
          componentInfo.functionsToLocate;
      }

      const sanitizedInfo = componentInfo
        ? {
            name: componentInfo.name,
            framework: componentInfo.framework,
            files: componentInfo.files,
            props: sanitizeProps(componentInfo.props),
            needsSourceDetection: componentInfo.needsSourceDetection,
          }
        : null;

      window.postMessage(
        {
          type: "CLAUDE_DEVTOOLS_COMPONENT_INFO_RESPONSE",
          id: event.data.id,
          componentInfo: sanitizedInfo,
        },
        "*"
      );
    }
  });
})();
