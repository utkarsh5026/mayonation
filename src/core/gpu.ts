export class GPUAccelerator {
  /**
   * A static set of CSS properties that are considered GPU-friendly.
   * These properties are commonly used to optimize rendering performance
   * by leveraging GPU acceleration. Modifying these properties can help
   * achieve smoother animations and transitions.
   *
   * The set includes properties related to transformations, opacity, and filters:
   * - Transformations: `transform`, `translateX`, `translateY`, `translateZ`,
   *   `rotateX`, `rotateY`, `rotateZ`, `rotate`, `scaleX`, `scaleY`, `scaleZ`,
   *   `scale`, `skewX`, `skewY`
   * - Visual effects: `opacity`, `filter`, `backdrop-filter`
   *
   * Use this set to determine if a CSS property is suitable for GPU optimization.
   */
  static GPU_FRIENDLY_PROPS = new Set([
    "transform",
    "translateX",
    "translateY",
    "translateZ",
    "rotateX",
    "rotateY",
    "rotateZ",
    "rotate",
    "scaleX",
    "scaleY",
    "scaleZ",
    "scale",
    "skewX",
    "skewY",
    "opacity",
    "filter",
    "backdrop-filter",
  ]);

  /**
   * Prepare an element for GPU-accelerated animation
   */
  static prepareElementForAcceleration(
    element: HTMLElement,
    props: string[]
  ): void {
    const gpuProps = props.filter((prop) =>
      GPUAccelerator.GPU_FRIENDLY_PROPS.has(prop)
    );

    if (gpuProps.length === 0) {
      return;
    }

    this.applyWillChange(element, gpuProps);
    this.forceLayerPromotion(element);
    this.optimizeTransformForGPU(element);
  }

  /**
   * Get optimized transform string for GPU
   */
  static optimizeTransformString(transformString: string): string {
    let optimized = transformString;

    optimized = optimized.replace(/translate\(([^)]+)\)/g, (_, values) => {
      const [x, y = "0px"] = values.split(",").map((v: string) => v.trim());
      return `translate3d(${x}, ${y}, 0px)`;
    });

    optimized = optimized.replace(/scale\(([^)]+)\)/g, (_, values) => {
      const [x, y] = values.split(",").map((v: string) => v.trim());
      return `scale3d(${x}, ${y || x}, 1)`;
    });

    optimized = optimized.replace(/rotate\(([^)]+)\)/g, "rotateZ($1)");
    return optimized;
  }

  /**
   * Apply will-change CSS property
   */
  private static applyWillChange(
    element: HTMLElement,
    properties: string[]
  ): void {
    const willChangeValue = properties.join(", ");
    element.style.willChange = willChangeValue;
  }

  /**
   * Force layer promotion using translateZ hack
   */
  private static forceLayerPromotion(element: HTMLElement): void {
    const currentTransform = element.style.transform || "";

    if (!currentTransform.includes("translateZ")) {
      element.style.transform =
        currentTransform + (currentTransform ? " " : "") + "translateZ(0px)";
    }
  }

  /**
   * Optimize element for transform animations
   */
  private static optimizeTransformForGPU(element: HTMLElement): void {
    const computedStyle = getComputedStyle(element);

    if (computedStyle.position === "static") {
      element.style.position = "relative";
    }

    if (computedStyle.transformStyle !== "preserve-3d") {
      element.style.transformStyle = "preserve-3d";
    }
  }
}
