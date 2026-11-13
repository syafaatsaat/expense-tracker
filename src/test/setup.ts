import '@testing-library/jest-dom/vitest';
import { installMatchMedia, setDesktop } from './viewport.ts';

// jsdom has no <dialog> modal support. This stub opens and closes it; the focus trap and
// inert page are the browser's job and are checked by hand, not here.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

installMatchMedia();

afterEach(() => {
  setDesktop(false);
});
