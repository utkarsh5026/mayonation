import { PropertyManager } from "@/animations";

interface ElementState {
  element: HTMLElement;
  propertyManager: PropertyManager;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
}

export class ElementManager {
  private elementStates: ElementState[] = [];

  /**
   * Creates a new ElementManager for the specified HTML elements.
   *
   * Initializes each element with its own PropertyManager and default state values.
   * All elements start in an inactive, incomplete state with zero progress.
   *
   * @param elements - Array of HTML elements to manage
   */
  constructor(elements: HTMLElement[]) {
    this.initializeElements(elements);
  }

  /**
   * Updates the animation state for a specific element.
   *
   * Modifies the progress, active status, and completion status for the element
   * at the specified index. This method is typically called during animation
   * updates to reflect the current state of each element's animation timeline.
   *
   * @param index - Zero-based index of the element to update
   * @param progress - Animation progress from 0 (start) to 1 (complete)
   * @param isActive - Whether the element is currently being animated
   * @param isComplete - Whether the element has finished its animation
   */
  updateElement(
    index: number,
    progress: number,
    isActive: boolean,
    isComplete: boolean
  ): void {
    if (index < 0 || index >= this.elementStates.length) return;

    const state = this.elementStates[index];
    state.progress = progress;
    state.isActive = isActive;
    state.isComplete = isComplete;
  }

  /**
   * Get all element states
   */
  getAllStates(): ElementState[] {
    return [...this.elementStates];
  }

  /**
   * Get property manager for a specific element
   */
  getPropertyManager(index: number): PropertyManager | null {
    return this.elementStates[index]?.propertyManager || null;
  }

  /**
   * Get element count
   */
  get elementCount(): number {
    return this.elementStates.length;
  }

  /**
   * Resets all elements to their initial animation state.
   *
   * Sets all elements back to zero progress, inactive, and incomplete status.
   * Also calls reset on each element's PropertyManager to restore original
   * CSS property values. This effectively returns all elements to their
   * pre-animation state.
   */
  reset(): void {
    this.elementStates.forEach((state) => {
      state.progress = 0;
      state.isActive = false;
      state.isComplete = false;
      state.propertyManager.reset();
    });
  }

  /**
   * Initializes element states with PropertyManagers for each provided element.
   *
   * Creates an ElementState object for each HTML element, setting up the
   * PropertyManager and initializing state values to their defaults.
   * This method is called during construction to prepare all elements for animation.
   *
   * @param elements - Array of HTML elements to initialize
   *
   * @private
   */
  private initializeElements(elements: HTMLElement[]): void {
    this.elementStates = elements.map((element) => ({
      element,
      propertyManager: new PropertyManager(element),
      progress: 0,
      isActive: false,
      isComplete: false,
    }));
  }

  /**
   * Get element state
   */
  getElementState(index: number): ElementState | null {
    return this.elementStates[index] || null;
  }
}
