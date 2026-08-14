import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

interface ModalEntry {
  id: string;
  order: number;
  close: () => void;
  trapFocus: (event: KeyboardEvent) => void;
}

interface BackgroundState {
  ariaHidden: string | null;
  inert: boolean;
}

const modalStack: ModalEntry[] = [];
const backgroundState = new Map<HTMLElement, BackgroundState>();
let nextModalOpenOrder = 0;
const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isVisibleFocusable(element: HTMLElement, dialog: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current && current !== dialog.parentElement) {
    const style = window.getComputedStyle(current);
    if (current.hidden || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    if (current === dialog) break;
    current = current.parentElement;
  }
  return true;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

function updateBackgroundInertness() {
  if (modalStack.length === 0) {
    backgroundState.forEach((state, element) => {
      if (state.ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', state.ariaHidden);
      if (state.inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    });
    backgroundState.clear();
    return;
  }

  Array.from(document.body.children).forEach((element) => {
    if (!(element instanceof HTMLElement) || element.dataset.modalRoot === 'true') return;
    if (!backgroundState.has(element)) {
      backgroundState.set(element, {
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.hasAttribute('inert'),
      });
    }
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
  });
}

function handleDocumentKeyDown(event: KeyboardEvent) {
  const topModal = modalStack.at(-1);
  if (!topModal) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    topModal.close();
  } else if (event.key === 'Tab') {
    topModal.trapFocus(event);
  }
}

function registerModal(entry: ModalEntry) {
  modalStack.push(entry);
  modalStack.sort((first, second) => first.order - second.order);
  if (modalStack.length === 1) document.addEventListener('keydown', handleDocumentKeyDown);
  document.body.classList.add('app-scroll-lock');
  updateBackgroundInertness();
}

function unregisterModal(id: string) {
  const index = modalStack.findIndex((entry) => entry.id === id);
  if (index !== -1) modalStack.splice(index, 1);
  if (modalStack.length === 0) {
    document.removeEventListener('keydown', handleDocumentKeyDown);
    document.body.classList.remove('app-scroll-lock');
  }
  updateBackgroundInertness();
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'lg',
  closeOnBackdrop = true,
  children,
  footer,
}: ModalProps) {
  const modalId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const modalOpenOrderRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) modalOpenOrderRef.current = nextModalOpenOrder++;
  wasOpenRef.current = open;
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => onCloseRef.current(), []);
  const trapFocus = useCallback((event: KeyboardEvent) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.tabIndex >= 0 && isVisibleFocusable(element, dialog));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);
    if (!firstElement || !lastElement) return;

    const activeElement = document.activeElement;
    if (!dialog.contains(activeElement)) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
    } else if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    registerModal({ id: modalId, order: modalOpenOrderRef.current!, close: requestClose, trapFocus });
    closeButtonRef.current?.focus();

    return () => {
      unregisterModal(modalId);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [modalId, open, requestClose, trapFocus]);

  if (!open) return null;

  return createPortal(
    <div data-modal-root="true">
      <div
        className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:p-6"
        data-testid="modal-backdrop"
        onClick={closeOnBackdrop ? requestClose : undefined}
      >
        <div
          aria-describedby={description ? descriptionId : undefined}
          aria-labelledby={titleId}
          aria-modal="true"
          className={`app-modal-panel relative flex w-full max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-gold-400/30 bg-white shadow-modal dark:bg-slate-800 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl ${sizeClasses[size]}`}
          onClick={(event) => event.stopPropagation()}
          ref={dialogRef}
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-brand-900 dark:text-white">{title}</h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Close dialog"
              className="-mr-1 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              onClick={requestClose}
              ref={closeButtonRef}
              type="button"
            >
              <span aria-hidden="true" className="text-2xl leading-none">×</span>
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 dark:border-slate-700">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
