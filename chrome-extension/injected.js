(function () {
  "use strict";

  class FrameworkDetector {
    detectFramework(element) {
      const fiberKey = Object.keys(element).find((key) =>
        key.startsWith("__reactFiber")
      );
      if (fiberKey) {
        return "React";
      }
      if (window.__PREACT_DEVTOOLS__?.renderers?.size > 0) {
        return "Preact";
      }
      if (window.ng) {
        return "Angular";
      }
      if (window.__VUE__) {
        return "Vue";
      }
      return null;
    }

    getComponentInfo(element) {
      const framework = this.detectFramework(element);

      if (framework === "React") {
        const reactInfo = this.getReactInfo(element);
        if (reactInfo) return { ...reactInfo, framework: "React" };
      } else if (framework === "Preact") {
        const preactInfo = this.getPreactInfo(element);
        if (preactInfo) return { ...preactInfo, framework: "Preact" };
      } else if (framework === "Angular") {
        const angularInfo = this.getAngularInfo(element);
        if (angularInfo) return { ...angularInfo, framework: "Angular" };
      } else if (framework === "Vue") {
        const vueInfo = this.getVueInfo(element);
        if (vueInfo) return { ...vueInfo, framework: "Vue" };
      }

      return null;
    }

    getReactInfo(element) {
      const fiberKey = Object.keys(element).find((key) =>
        key.startsWith("__reactFiber")
      );

      if (!fiberKey) return null;

      const rootFiber = element[fiberKey];
      if (!rootFiber) return null;

      let fiber = rootFiber;
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
      let currentFiber = rootFiber;

      while (currentFiber) {
        if (currentFiber._debugSource) {
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
        name: name,
        props: fiber.memoizedProps,
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

    getVueInfo(element) {
      let component = element.__vueParentComponent;
      if (!component) return null;

      const files = [];
      let finalName = null;
      let finalProps = null;

      const firstPath = element.__vnode?.props?.__v_inspector;
      if (firstPath) {
        files.push(firstPath);
      }

      while (component) {
        if (!finalName) {
          finalName = component.type?.__name || component.type?.name;
          finalProps = component.props;
        }

        const path = component.vnode?.props?.__v_inspector;
        if (path) {
          files.push(path);
        }

        component = component.parent;
      }

      return {
        name: finalName,
        props: finalProps,
        files: files.length > 0 ? files : null,
        functionsToLocate: [],
        needsSourceDetection: false,
        elementId: element.getAttribute("data-claude-devtools-id"),
      };
    }

    getPreactInfo(element) {
      if (!window.__PREACT_DEVTOOLS__?.renderers) return null;

      const renderer = window.__PREACT_DEVTOOLS__.renderers.get(1);
      if (!renderer) return null;

      const vnodeId = renderer.findVNodeIdForDom(element);
      if (!vnodeId) return null;

      let component = renderer.getVNodeById(vnodeId);
      if (!component) return null;

      const files = [];
      let finalName = null;
      let finalProps = null;

      while (component) {
        if (!finalName) {
          finalName = component.type?.name;
          finalProps = component.props;
        }

        if (component.__source) {
          const path = `${component.__source.fileName}:${component.__source.lineNumber}:${component.__source.columnNumber}`;
          files.push(path);
        }

        component = component.__o;
      }

      return {
        name: finalName,
        props: finalProps,
        files: files.length > 0 ? files : null,
        functionsToLocate: [],
        needsSourceDetection: false,
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
