import { PropertyManager } from "@/core/property-manager";

interface ElementState {
  element: HTMLElement;
  propertyManager: PropertyManager;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
}

export class ElementManager {
  private elementStates: ElementState[] = [];

  constructor(elements: HTMLElement[]) {
    this.initializeElements(elements);
  }

  /**
   * Update specific element's animation state
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
   * Reset all elements to initial state
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
   * Initialize all elements with their property managers
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
