// Focus trap utility for modal dialogs (A11Y requirement)

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface FocusTrap {
  activate: () => void;
  deactivate: () => void;
}

/**
 * Creates a focus trap for a modal element.
 * When activated, Tab/Shift+Tab cycling is restricted to focusable elements within the container.
 */
export function createFocusTrap(container: HTMLElement): FocusTrap {
  let previouslyFocusedElement: HTMLElement | null = null;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS))
      .filter(el => {
        // Ensure element is visible
        return el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0;
      });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: going backwards
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  return {
    activate() {
      // Store currently focused element to restore later
      previouslyFocusedElement = document.activeElement as HTMLElement;

      // Add keydown listener
      keydownHandler = handleKeydown;
      container.addEventListener('keydown', keydownHandler);

      // Focus first focusable element if nothing inside is focused
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0 && !container.contains(document.activeElement)) {
        focusableElements[0].focus();
      }
    },

    deactivate() {
      // Remove keydown listener
      if (keydownHandler) {
        container.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
      }

      // Restore focus to previously focused element
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
      previouslyFocusedElement = null;
    },
  };
}
