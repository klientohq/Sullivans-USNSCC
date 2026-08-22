/* ============================================================================
   THE SULLIVANS DIVISION USNSCC
   Progressive enhancement only. Every page works with this file blocked.
   ========================================================================= */
(() => {
  "use strict";

  const header = document.querySelector("[data-header]");
  const announcement = document.querySelector("[data-announcement]");
  const announcementClose = document.querySelector("[data-announcement-close]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const root = document.documentElement;

  /* --- Navigation --------------------------------------------------------- */
  if (toggle && nav) {
    const closeNav = ({ returnFocus = false } = {}) => {
      if (!nav.classList.contains("is-open")) return;
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav({ returnFocus: true });
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
    });

    // The nav collapses to a drawer below 1280px; above it the drawer must never
    // stay latched open.
    window.matchMedia("(min-width: 1280px)").addEventListener("change", (event) => {
      if (event.matches) closeNav();
    });
  }

  /* --- BUG-001: the announcement bar and header are one layout stack -------
     The bar scrolls away with the document (it is drill-date specific and
     dismissible, so it must not eat 43px of every mobile viewport). The header
     is fixed, so it has to reclaim top:0 as the bar leaves, rather than staying
     pinned to a static offset and exposing the page behind it. */
  const barHeight = () =>
    announcement && !announcement.hidden ? Math.round(announcement.getBoundingClientRect().height) : 0;

  let frame = 0;
  const syncHeader = () => {
    frame = 0;
    if (!header) return;
    const offset = Math.max(0, barHeight() - window.scrollY);
    root.style.setProperty("--announcement-offset", `${offset}px`);
    root.style.setProperty("--header-height", `${Math.round(header.getBoundingClientRect().height)}px`);
    header.classList.toggle("is-scrolled", window.scrollY > 12);
    header.classList.toggle("is-pinned", offset === 0);
  };

  // Cancel and reschedule rather than skipping while a frame is pending. A
  // boolean guard latches permanently if the frame never runs, which is exactly
  // what happens when the tab is hidden and rAF is suspended.
  const requestSync = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(syncHeader);
  };

  syncHeader();
  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", requestSync, { passive: true });
  window.addEventListener("orientationchange", requestSync);
  // rAF is suspended while the tab is hidden, so re-sync on the way back in.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncHeader();
  });
  if (document.fonts) document.fonts.ready.then(syncHeader);

  /* --- Announcement dismissal --------------------------------------------- */
  if (announcement) {
    if (sessionStorage.getItem("sullivans-announcement-dismissed") === "1") {
      announcement.hidden = true;
    }
    requestSync();
    announcementClose?.addEventListener("click", () => {
      announcement.hidden = true;
      try {
        sessionStorage.setItem("sullivans-announcement-dismissed", "1");
      } catch {
        /* private browsing: dismissal simply does not persist */
      }
      syncHeader();
    });
  }

  /* --- BUG-002: the floating Join pill must never cover body copy ----------
     It is the recruiting call to action, so it stays, but it only appears once
     the in-page call to action has scrolled out of view. Until then the visible
     button is the real one. */
  const sticky = document.querySelector("[data-sticky-join]");
  const primaryCta = document.querySelector("[data-primary-cta]");

  if (sticky) {
    if (!primaryCta) {
      sticky.classList.add("is-visible");
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => sticky.classList.toggle("is-visible", !entry.isIntersecting),
        { rootMargin: "-80px 0px 0px 0px" }
      ).observe(primaryCta);
    } else {
      sticky.classList.add("is-visible");
    }
  }

  /* --- Respect prefers-reduced-motion for the hero video ------------------ */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const applyMotionPreference = () => {
    for (const video of document.querySelectorAll("video[autoplay]")) {
      if (reduceMotion.matches) {
        video.pause();
        video.removeAttribute("autoplay");
      } else if (video.paused) {
        video.play().catch(() => {});
      }
    }
  };
  applyMotionPreference();
  reduceMotion.addEventListener("change", applyMotionPreference);
})();
