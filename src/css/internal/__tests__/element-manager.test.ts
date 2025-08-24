import { describe, it, expect, beforeEach, vi } from "vitest";
import { ElementManager } from "../element-manager";
import { PropertyManager } from "@/animations";

// Create a proper mock class that mimics PropertyManager
class MockPropertyManager {
  reset = vi.fn();

  // Mock other methods that might be called
  interpolate = vi.fn();
  setProperty = vi.fn();
  getProperty = vi.fn();
}

vi.mock("@/animations", () => ({
  PropertyManager: vi.fn().mockImplementation(() => new MockPropertyManager()),
}));

const MockedPropertyManager = vi.mocked(PropertyManager);

describe("ElementManager", () => {
  let mockElements: HTMLElement[];
  let elementManager: ElementManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockElements = [
      document.createElement("div"),
      document.createElement("span"),
      document.createElement("p"),
    ];

    elementManager = new ElementManager(mockElements);
  });

  describe("Constructor and initialization", () => {
    it("should initialize with correct number of elements", () => {
      expect(elementManager.elementCount).toBe(3);
    });

    it("should create PropertyManager for each element", () => {
      expect(MockedPropertyManager).toHaveBeenCalledTimes(3);
      expect(MockedPropertyManager).toHaveBeenNthCalledWith(1, mockElements[0]);
      expect(MockedPropertyManager).toHaveBeenNthCalledWith(2, mockElements[1]);
      expect(MockedPropertyManager).toHaveBeenNthCalledWith(3, mockElements[2]);
    });

    it("should initialize all elements with default state", () => {
      const states = elementManager.getAllStates();

      states.forEach((state, index) => {
        expect(state.element).toBe(mockElements[index]);
        expect(state.progress).toBe(0);
        expect(state.isActive).toBe(false);
        expect(state.isComplete).toBe(false);
        expect(state.propertyManager).toBeDefined();
        expect(typeof state.propertyManager.reset).toBe("function");
      });
    });

    it("should handle empty array of elements", () => {
      const emptyManager = new ElementManager([]);
      expect(emptyManager.elementCount).toBe(0);
      expect(emptyManager.getAllStates()).toEqual([]);
    });

    it("should handle single element", () => {
      const singleElement = [document.createElement("div")];
      const singleManager = new ElementManager(singleElement);

      expect(singleManager.elementCount).toBe(1);
      expect(singleManager.getAllStates()).toHaveLength(1);
    });
  });

  describe("updateElement", () => {
    it("should update element state with valid index", () => {
      elementManager.updateElement(0, 0.5, true, false);

      const state = elementManager.getElementState(0);
      expect(state?.progress).toBe(0.5);
      expect(state?.isActive).toBe(true);
      expect(state?.isComplete).toBe(false);
    });

    it("should update multiple properties simultaneously", () => {
      elementManager.updateElement(1, 1.0, false, true);

      const state = elementManager.getElementState(1);
      expect(state?.progress).toBe(1.0);
      expect(state?.isActive).toBe(false);
      expect(state?.isComplete).toBe(true);
    });

    it("should handle boundary progress values", () => {
      elementManager.updateElement(0, 0, false, false);
      let state = elementManager.getElementState(0);
      expect(state?.progress).toBe(0);

      elementManager.updateElement(0, 1, true, true);
      state = elementManager.getElementState(0);
      expect(state?.progress).toBe(1);
    });

    it("should handle negative index gracefully", () => {
      const initialState = elementManager.getElementState(0);
      const initialProgress = initialState?.progress;

      elementManager.updateElement(-1, 0.5, true, false);

      const stateAfter = elementManager.getElementState(0);
      expect(stateAfter?.progress).toBe(initialProgress);
    });

    it("should handle index out of bounds gracefully", () => {
      const initialStates = elementManager.getAllStates();

      elementManager.updateElement(10, 0.5, true, false);

      const statesAfter = elementManager.getAllStates();
      expect(statesAfter).toEqual(initialStates);
    });

    it("should handle edge case index (exactly at length)", () => {
      const initialStates = elementManager.getAllStates();

      elementManager.updateElement(3, 0.5, true, false);

      const statesAfter = elementManager.getAllStates();
      expect(statesAfter).toEqual(initialStates);
    });

    it("should update each element independently", () => {
      elementManager.updateElement(0, 0.3, true, false);
      elementManager.updateElement(1, 0.7, false, true);
      elementManager.updateElement(2, 0.9, true, false);

      const state0 = elementManager.getElementState(0);
      const state1 = elementManager.getElementState(1);
      const state2 = elementManager.getElementState(2);

      expect(state0?.progress).toBe(0.3);
      expect(state0?.isActive).toBe(true);
      expect(state0?.isComplete).toBe(false);

      expect(state1?.progress).toBe(0.7);
      expect(state1?.isActive).toBe(false);
      expect(state1?.isComplete).toBe(true);

      expect(state2?.progress).toBe(0.9);
      expect(state2?.isActive).toBe(true);
      expect(state2?.isComplete).toBe(false);
    });
  });

  describe("getAllStates", () => {
    it("should return copy of all element states", () => {
      const states = elementManager.getAllStates();

      expect(states).toHaveLength(3);
      expect(states).not.toBe(elementManager.getAllStates()); // Different array instance
    });

    it("should return states with correct structure", () => {
      const states = elementManager.getAllStates();

      states.forEach((state, index) => {
        expect(state).toHaveProperty("element");
        expect(state).toHaveProperty("propertyManager");
        expect(state).toHaveProperty("progress");
        expect(state).toHaveProperty("isActive");
        expect(state).toHaveProperty("isComplete");
        expect(state.element).toBe(mockElements[index]);
      });
    });

    it("should reflect current state values", () => {
      elementManager.updateElement(0, 0.5, true, false);
      elementManager.updateElement(1, 1.0, false, true);

      const states = elementManager.getAllStates();

      expect(states[0].progress).toBe(0.5);
      expect(states[0].isActive).toBe(true);
      expect(states[0].isComplete).toBe(false);

      expect(states[1].progress).toBe(1.0);
      expect(states[1].isActive).toBe(false);
      expect(states[1].isComplete).toBe(true);

      expect(states[2].progress).toBe(0);
      expect(states[2].isActive).toBe(false);
      expect(states[2].isComplete).toBe(false);
    });

    it("should return empty array for empty manager", () => {
      const emptyManager = new ElementManager([]);
      const states = emptyManager.getAllStates();

      expect(states).toEqual([]);
      expect(Array.isArray(states)).toBe(true);
    });

    it("should return independent array instances but same object references", () => {
      const states1 = elementManager.getAllStates();
      const states2 = elementManager.getAllStates();

      // Array instances should be different
      expect(states1).not.toBe(states2);

      // But the objects inside should be the same references (shallow copy)
      expect(states1[0]).toBe(states2[0]);
      expect(states1[1]).toBe(states2[1]);
      expect(states1[2]).toBe(states2[2]);

      // Modifying the object affects all references since it's the same object
      states1[0].progress = 999;
      expect(states2[0].progress).toBe(999);
      expect(elementManager.getElementState(0)?.progress).toBe(999);
    });
  });

  describe("getPropertyManager", () => {
    it("should return PropertyManager for valid index", () => {
      const propertyManager = elementManager.getPropertyManager(0);

      expect(propertyManager).toBeDefined();
      expect(typeof propertyManager?.reset).toBe("function");
      expect(propertyManager).not.toBeNull();
    });

    it("should return different PropertyManager instances for different elements", () => {
      const pm0 = elementManager.getPropertyManager(0);
      const pm1 = elementManager.getPropertyManager(1);
      const pm2 = elementManager.getPropertyManager(2);

      expect(pm0).not.toBe(pm1);
      expect(pm1).not.toBe(pm2);
      expect(pm0).not.toBe(pm2);
    });

    it("should return null for negative index", () => {
      const propertyManager = elementManager.getPropertyManager(-1);

      expect(propertyManager).toBeNull();
    });

    it("should return null for index out of bounds", () => {
      const propertyManager = elementManager.getPropertyManager(10);

      expect(propertyManager).toBeNull();
    });

    it("should return null for index exactly at length", () => {
      const propertyManager = elementManager.getPropertyManager(3);

      expect(propertyManager).toBeNull();
    });

    it("should return same instance when called multiple times", () => {
      const pm1 = elementManager.getPropertyManager(1);
      const pm2 = elementManager.getPropertyManager(1);

      expect(pm1).toBe(pm2);
    });

    it("should return null for empty manager", () => {
      const emptyManager = new ElementManager([]);
      const propertyManager = emptyManager.getPropertyManager(0);

      expect(propertyManager).toBeNull();
    });
  });

  describe("elementCount", () => {
    it("should return correct count for multiple elements", () => {
      expect(elementManager.elementCount).toBe(3);
    });

    it("should return 0 for empty manager", () => {
      const emptyManager = new ElementManager([]);
      expect(emptyManager.elementCount).toBe(0);
    });

    it("should return 1 for single element manager", () => {
      const singleManager = new ElementManager([document.createElement("div")]);
      expect(singleManager.elementCount).toBe(1);
    });

    it("should be a getter property", () => {
      const initialCount = elementManager.elementCount;

      // elementCount should always return the current array length
      expect(initialCount).toBe(3);
      expect(typeof elementManager.elementCount).toBe("number");
    });
  });

  describe("reset", () => {
    it("should reset all elements to initial state", () => {
      // Modify states first
      elementManager.updateElement(0, 0.5, true, false);
      elementManager.updateElement(1, 0.8, true, true);
      elementManager.updateElement(2, 1.0, false, true);

      // Reset
      elementManager.reset();

      // Check all elements are back to initial state
      const states = elementManager.getAllStates();
      states.forEach((state) => {
        expect(state.progress).toBe(0);
        expect(state.isActive).toBe(false);
        expect(state.isComplete).toBe(false);
      });
    });

    it("should call reset on all PropertyManagers", () => {
      const mockReset = vi.fn();
      MockedPropertyManager.mockImplementation(
        () =>
          ({
            reset: mockReset,
          } as unknown as PropertyManager)
      );

      const testManager = new ElementManager([
        document.createElement("div"),
        document.createElement("span"),
      ]);

      testManager.reset();

      expect(mockReset).toHaveBeenCalledTimes(2);
    });

    it("should work with empty manager", () => {
      const emptyManager = new ElementManager([]);

      expect(() => emptyManager.reset()).not.toThrow();
      expect(emptyManager.getAllStates()).toEqual([]);
    });

    it("should reset elements independently", () => {
      elementManager.updateElement(0, 0.3, true, false);
      elementManager.updateElement(1, 0.7, false, true);

      elementManager.reset();

      const state0 = elementManager.getElementState(0);
      const state1 = elementManager.getElementState(1);
      const state2 = elementManager.getElementState(2);

      expect(state0?.progress).toBe(0);
      expect(state0?.isActive).toBe(false);
      expect(state0?.isComplete).toBe(false);

      expect(state1?.progress).toBe(0);
      expect(state1?.isActive).toBe(false);
      expect(state1?.isComplete).toBe(false);

      expect(state2?.progress).toBe(0);
      expect(state2?.isActive).toBe(false);
      expect(state2?.isComplete).toBe(false);
    });

    it("should reset from any state combination", () => {
      // Set various states
      elementManager.updateElement(0, 0.2, false, false);
      elementManager.updateElement(1, 0.6, true, false);
      elementManager.updateElement(2, 1.0, false, true);

      elementManager.reset();

      const states = elementManager.getAllStates();
      states.forEach((state) => {
        expect(state.progress).toBe(0);
        expect(state.isActive).toBe(false);
        expect(state.isComplete).toBe(false);
      });
    });

    it("should maintain element references after reset", () => {
      const originalStates = elementManager.getAllStates();

      elementManager.updateElement(0, 0.5, true, false);
      elementManager.reset();

      const newStates = elementManager.getAllStates();

      originalStates.forEach((originalState, index) => {
        expect(newStates[index].element).toBe(originalState.element);
        expect(newStates[index].propertyManager).toBe(
          originalState.propertyManager
        );
      });
    });
  });

  describe("getElementState", () => {
    it("should return element state for valid index", () => {
      const state = elementManager.getElementState(0);

      expect(state).not.toBeNull();
      expect(state?.element).toBe(mockElements[0]);
      expect(state?.progress).toBe(0);
      expect(state?.isActive).toBe(false);
      expect(state?.isComplete).toBe(false);
      expect(state?.propertyManager).toBeDefined();
      expect(typeof state?.propertyManager.reset).toBe("function");
    });

    it("should return updated state after modifications", () => {
      elementManager.updateElement(1, 0.7, true, false);

      const state = elementManager.getElementState(1);

      expect(state?.progress).toBe(0.7);
      expect(state?.isActive).toBe(true);
      expect(state?.isComplete).toBe(false);
    });

    it("should return null for negative index", () => {
      const state = elementManager.getElementState(-1);

      expect(state).toBeNull();
    });

    it("should return null for index out of bounds", () => {
      const state = elementManager.getElementState(10);

      expect(state).toBeNull();
    });

    it("should return null for index exactly at length", () => {
      const state = elementManager.getElementState(3);

      expect(state).toBeNull();
    });

    it("should return null for empty manager", () => {
      const emptyManager = new ElementManager([]);
      const state = emptyManager.getElementState(0);

      expect(state).toBeNull();
    });

    it("should return same reference when called multiple times", () => {
      const state1 = elementManager.getElementState(1);
      const state2 = elementManager.getElementState(1);

      expect(state1).toBe(state2);
    });

    it("should return different states for different indices", () => {
      const state0 = elementManager.getElementState(0);
      const state1 = elementManager.getElementState(1);
      const state2 = elementManager.getElementState(2);

      expect(state0).not.toBe(state1);
      expect(state1).not.toBe(state2);
      expect(state0).not.toBe(state2);

      expect(state0?.element).toBe(mockElements[0]);
      expect(state1?.element).toBe(mockElements[1]);
      expect(state2?.element).toBe(mockElements[2]);
    });

    it("should reflect state changes immediately", () => {
      const state = elementManager.getElementState(0);

      expect(state?.progress).toBe(0);

      elementManager.updateElement(0, 0.5, true, false);

      expect(state?.progress).toBe(0.5);
      expect(state?.isActive).toBe(true);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle very large arrays", () => {
      const largeElementArray = Array.from({ length: 1000 }, () =>
        document.createElement("div")
      );
      const largeManager = new ElementManager(largeElementArray);

      expect(largeManager.elementCount).toBe(1000);
      expect(largeManager.getElementState(0)).not.toBeNull();
      expect(largeManager.getElementState(999)).not.toBeNull();
      expect(largeManager.getElementState(1000)).toBeNull();
    });

    it("should handle extreme progress values", () => {
      elementManager.updateElement(0, -100, true, false);
      let state = elementManager.getElementState(0);
      expect(state?.progress).toBe(-100);

      elementManager.updateElement(0, 1000, false, true);
      state = elementManager.getElementState(0);
      expect(state?.progress).toBe(1000);

      elementManager.updateElement(0, Number.POSITIVE_INFINITY, true, false);
      state = elementManager.getElementState(0);
      expect(state?.progress).toBe(Number.POSITIVE_INFINITY);
    });

    it("should handle NaN progress values", () => {
      elementManager.updateElement(0, NaN, true, false);
      const state = elementManager.getElementState(0);
      expect(Number.isNaN(state?.progress)).toBe(true);
    });

    it("should handle floating point precision", () => {
      elementManager.updateElement(0, 0.1 + 0.2, true, false);
      const state = elementManager.getElementState(0);
      expect(state?.progress).toBeCloseTo(0.3);
    });

    it("should work with different HTML element types", () => {
      const mixedElements = [
        document.createElement("div"),
        document.createElement("span"),
        document.createElement("p"),
        document.createElement("button"),
        document.createElement("input"),
      ];

      const mixedManager = new ElementManager(mixedElements);

      expect(mixedManager.elementCount).toBe(5);
      mixedElements.forEach((element, index) => {
        const state = mixedManager.getElementState(index);
        expect(state?.element).toBe(element);
        expect(state?.element.tagName).toBe(element.tagName);
      });
    });

    it("should handle updates after reset cycles", () => {
      // Update, reset, update, reset cycle
      elementManager.updateElement(0, 0.5, true, false);
      elementManager.reset();
      elementManager.updateElement(0, 0.8, false, true);
      elementManager.reset();

      const state = elementManager.getElementState(0);
      expect(state?.progress).toBe(0);
      expect(state?.isActive).toBe(false);
      expect(state?.isComplete).toBe(false);
    });

    it("should maintain consistent behavior with concurrent state access", () => {
      const states1 = elementManager.getAllStates();
      const state1 = elementManager.getElementState(0);

      elementManager.updateElement(0, 0.5, true, false);

      const states2 = elementManager.getAllStates();
      const state2 = elementManager.getElementState(0);

      expect(states1[0]).toBe(state1);
      expect(states2[0]).toBe(state2);
      expect(state1).toBe(state2);
      expect(state1?.progress).toBe(0.5);
    });
  });
});
