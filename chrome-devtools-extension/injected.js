(function () {
  "use strict";

  class FrameworkDetector {
    getComponentInfo(element) {
      const reactInfo = this.getReactInfo(element);
      if (reactInfo) return { ...reactInfo, framework: "React" };

      const angularInfo = this.getAngularInfo(element);
      if (angularInfo) return { ...angularInfo, framework: "Angular" };

      return null;
    }

    getReactInfo(element) {
      const fiberKey = Object.keys(element).find((key) =>
        key.startsWith("__reactFiber")
      );

      if (!fiberKey) return null;

      const fiber = element[fiberKey];
      if (!fiber?._debugOwner?.elementType) return null;

      const componentType = fiber._debugOwner.elementType;
      const name =
        componentType.name ||
        componentType.displayName ||
        fiber._debugOwner.type?.name;

      if (!name || this.isReactInternal(name)) return null;

      let fileName = "";
      let lineNumber = "";

      if (fiber._debugSource) {
        fileName = this.stripAbsolutePath(fiber._debugSource.fileName);
        lineNumber = fiber._debugSource.lineNumber;
      } else if (fiber._debugOwner._debugSource) {
        fileName = this.stripAbsolutePath(fiber._debugOwner._debugSource.fileName);
        lineNumber = fiber._debugOwner._debugSource.lineNumber;
      } else if (fiber._debugOwner._debugStack) {
        const stack = fiber._debugOwner._debugStack.stack;
        if (stack) {
          const lines = stack.split("\n");
          for (const line of lines) {
            let match = line.match(/at\s+\w+\s+\(([^)]+):(\d+):\d+\)/);
            if (!match) {
              match = line.match(/at\s+(.+):(\d+):(\d+)$/);
            }
            if (
              match &&
              (match[1].includes(".jsx") || match[1].includes(".tsx"))
            ) {
              const fullPath = match[1];
              fileName = fullPath.split("/").pop();
              lineNumber = match[2];
              break;
            }
          }
        }
      } else {
        fileName = "not available";
      }

      return {
        name,
        props: fiber._debugOwner.memoizedProps,
        file:
          fileName && lineNumber
            ? `${fileName}:${lineNumber}`
            : fileName,
        needsSourceDetection: !fileName || !lineNumber,
        elementId: element.getAttribute("data-claude-devtools-id"),
      };
    }

    getAngularInfo(element) {
      if (window.ng?.getOwningComponent) {
        const component = window.ng.getOwningComponent(element);
        if (component) {
          const props = {};

          for (const key in component) {
            if (
              component.hasOwnProperty(key) &&
              !key.startsWith("_") &&
              !key.startsWith("ng")
            ) {
              const value = component[key];
              if (typeof value !== "function" && typeof value !== "undefined") {
                props[key] = value;
              }
            }
          }

          return {
            name: component.constructor.name.startsWith("_")
              ? component.constructor.name.substring(1)
              : component.constructor.name,
            props: Object.keys(props).length > 0 ? props : null,
            file: "not available",
            needsSourceDetection: true,
            elementId: element.getAttribute("data-claude-devtools-id"),
          };
        }
      }

      return null;
    }

    isReactInternal(name) {
      const internals = ["Fragment", "StrictMode", "Profiler", "Suspense"];
      return internals.includes(name) || name.startsWith("React.");
    }

    stripAbsolutePath(path) {
      const index = path.indexOf("/src/");
      if (index !== -1) {
        return path.substring(index + 1);
      }
      return path;
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

      const sanitizedInfo = componentInfo
        ? {
            name: componentInfo.name,
            framework: componentInfo.framework,
            file: componentInfo.file,
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
