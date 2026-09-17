/**
 * Universal Modal & Drawer Background Scroll Lock Manager
 * 
 * Prevents background scrolling when any modal, drawer, dialog, or bottom sheet is open.
 * Clean, lightweight, React-hook-driven with zero forced reflows and zero DOM-scanning loops.
 */

import { useEffect } from 'react';

class ModalLockManager {
  private activeLocks = new Set<string>();
  private savedMainScrollTop = 0;
  private isCurrentlyLocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bindBackdropEvents();
    }
  }

  public isLocked(): boolean {
    return this.isCurrentlyLocked;
  }

  /**
   * Acquire a lock by identifier
   */
  public lock(id: string = 'default'): void {
    if (!id) return;
    this.activeLocks.add(id);
    this.sync();
  }

  /**
   * Release a lock by identifier
   */
  public unlock(id: string = 'default'): void {
    if (!id) return;
    this.activeLocks.delete(id);
    this.sync();
  }

  /**
   * Force release all locks (e.g., on route navigation)
   */
  public clearAll(): void {
    this.activeLocks.clear();
    this.sync();
  }

  /**
   * Sync active lock state with the DOM
   */
  private sync(): void {
    const shouldLock = this.activeLocks.size > 0;

    if (shouldLock && !this.isCurrentlyLocked) {
      this.applyLock();
    } else if (!shouldLock && this.isCurrentlyLocked) {
      this.removeLock();
    }
  }

  private applyLock(): void {
    this.isCurrentlyLocked = true;

    const body = document.body;
    const docEl = document.documentElement;
    const mainViewport = document.getElementById('app-main-viewport');

    // Save current scroll position of main viewport
    if (mainViewport) {
      this.savedMainScrollTop = mainViewport.scrollTop;
      mainViewport.setAttribute('data-locked-scroll', String(this.savedMainScrollTop));
      mainViewport.style.overflow = 'hidden';
      mainViewport.style.overscrollBehavior = 'none';
    }

    // Lock html and body scroll
    body.classList.add('modal-open');
    docEl.classList.add('modal-open');
    body.setAttribute('data-modal-open', 'true');
  }

  private removeLock(): void {
    this.isCurrentlyLocked = false;

    const body = document.body;
    const docEl = document.documentElement;
    const mainViewport = document.getElementById('app-main-viewport');

    body.classList.remove('modal-open');
    docEl.classList.remove('modal-open');
    body.removeAttribute('data-modal-open');

    // Restore main viewport
    if (mainViewport) {
      mainViewport.style.overflow = '';
      mainViewport.style.overscrollBehavior = '';
      const saved = mainViewport.getAttribute('data-locked-scroll');
      if (saved !== null) {
        mainViewport.scrollTop = parseInt(saved, 10) || this.savedMainScrollTop;
        mainViewport.removeAttribute('data-locked-scroll');
      }
    }
  }

  /**
   * Prevents touch drags directly originating on the dark backdrop overlay from scrolling the page
   */
  private bindBackdropEvents(): void {
    const handleTouchMove = (e: TouchEvent) => {
      if (!this.isCurrentlyLocked) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Only cancel touchmove if directly touching the backdrop overlay
      if (target.hasAttribute('data-modal-backdrop') || target.classList.contains('modal-backdrop')) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
  }
}

export const modalLockManager = new ModalLockManager();

/**
 * React hook to bind a component's open state to the universal modal lock manager
 */
export function useModalScrollLock(isOpen: boolean, lockId?: string) {
  useEffect(() => {
    if (!isOpen) return;
    const id = lockId || `modal-lock-${Math.random().toString(36).substring(2, 9)}`;
    modalLockManager.lock(id);

    return () => {
      modalLockManager.unlock(id);
    };
  }, [isOpen, lockId]);
}
