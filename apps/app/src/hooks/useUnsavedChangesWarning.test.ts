/**
 * Tests for useUnsavedChangesWarning hook
 */

import { renderHook } from "@testing-library/react";
import { useBeforeUnloadWarning } from "./useUnsavedChangesWarning";

describe("useBeforeUnloadWarning", () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, "addEventListener");
    removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("should add beforeunload listener when hasUnsavedChanges is true", () => {
    renderHook(() => useBeforeUnloadWarning(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("should not add listener when hasUnsavedChanges is false", () => {
    renderHook(() => useBeforeUnloadWarning(false));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("should remove listener on unmount", () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning(true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("should remove and re-add listener when hasUnsavedChanges changes", () => {
    const { rerender } = renderHook(
      ({ hasUnsavedChanges }) => useBeforeUnloadWarning(hasUnsavedChanges),
      { initialProps: { hasUnsavedChanges: false } }
    );

    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    rerender({ hasUnsavedChanges: true });

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("should call preventDefault and set returnValue on beforeunload event", () => {
    renderHook(() => useBeforeUnloadWarning(true));

    // Get the handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "beforeunload"
    )?.[1] as EventListener;

    expect(handler).toBeDefined();

    // Create a mock event
    const mockEvent = {
      preventDefault: jest.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    // Call the handler
    handler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.returnValue).toBeTruthy();
  });
});
