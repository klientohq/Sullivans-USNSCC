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


  /* --- Contact form -------------------------------------------------------
     The form's own copy promises it "opens your email app with everything
     filled in", and no handler existed, so it silently did nothing. A form
     that lies about what it does is worse than no form at all.

     It composes a mailto: draft. Nothing is transmitted, nothing is stored,
     and no third party sees the message. Phase 4 replaces this with a
     Cloudflare Worker plus Turnstile that posts server-side and still stores
     nothing; the markup and validation below carry over unchanged. */
  const contactForm = document.querySelector("#contact-form");
  let turnstileWidgetId = null;

  if (contactForm) {
    /* Turnstile renders explicitly, not automatically, so the form works the
       instant it is parsed and the challenge attaches when its script lands.
       An auto-rendered widget would have made the submit button depend on a
       third-party script loading first. */
    const turnstileMount = contactForm.querySelector("[data-turnstile]");
    window.onTurnstileReady = () => {
      if (!turnstileMount || !window.turnstile) return;
      turnstileWidgetId = window.turnstile.render(turnstileMount, {
        sitekey: turnstileMount.dataset.sitekey,
        action: "contact",
        theme: "light",
      });
    };
    if (window.turnstile) window.onTurnstileReady();

    const status = contactForm.querySelector("#contact-msg");
    const inbox = contactForm.dataset.inbox || "info@thesullivansusnscc.com";

    const showError = (field, message) => {
      const label = field.closest(".field") || field.parentElement;
      let error = label.querySelector(".field-error");
      if (!error) {
        error = document.createElement("span");
        error.className = "field-error";
        error.id = `${field.name}-error`;
        label.appendChild(error);
      }
      error.textContent = message;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", error.id);
    };

    const clearError = (field) => {
      const label = field.closest(".field") || field.parentElement;
      label.querySelector(".field-error")?.remove();
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    };

    contactForm.addEventListener("input", (event) => {
      if (event.target.hasAttribute("aria-invalid")) clearError(event.target);
    });

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitLabel = submitBtn ? submitBtn.textContent : "";

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(contactForm);
      const value = (name) => String(data.get(name) || "").trim();

      const problems = [];
      for (const field of contactForm.querySelectorAll("[required]")) {
        clearError(field);
        const entered = String(data.get(field.name) || "").trim();
        if (!entered) {
          showError(field, "This one is needed before we can reply.");
          problems.push(field);
        } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(entered)) {
          showError(field, "Check this address; we could not read it.");
          problems.push(field);
        }
      }

      if (problems.length) {
        status.hidden = false;
        status.textContent = `Add the missing ${problems.length === 1 ? "field" : "fields"} above and send again.`;
        status.dataset.state = "error";
        problems[0].focus();
        return;
      }

      const name = [value("firstName"), value("lastName")].filter(Boolean).join(" ");
      const lines = [
        `From: ${name}`,
        `Email: ${value("email")}`,
        value("phone") && `Phone: ${value("phone")}`,
        value("reason") && `Reason: ${value("reason")}`,
        "",
        value("message"),
      ].filter(Boolean);

      const href =
        `mailto:${inbox}` +
        `?subject=${encodeURIComponent(value("subject"))}` +
        `&body=${encodeURIComponent(lines.join("\n"))}`;

      const openDraft = () => {
        status.hidden = false;
        status.dataset.state = "ok";
        status.textContent =
          `Your email app should now be open with the message ready to send to ${inbox}. ` +
          "It is not sent until you send it. If nothing opened, email us directly.";
        window.location.href = href;
      };

      /* The challenge only exists where it is configured. On any other host,
         and if the widget script was blocked, fall straight through to the mail
         draft rather than trapping someone behind a check that cannot run. */
      const token = window.turnstile && turnstileWidgetId !== null
        ? window.turnstile.getResponse(turnstileWidgetId)
        : null;

      if (!token) {
        openDraft();
        return;
      }

      status.hidden = false;
      status.dataset.state = "";
      status.textContent = "Checking, one moment.";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Checking..."; }

      let result = null;
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token,
            firstName: value("firstName"),
            email: value("email"),
            subject: value("subject"),
            message: value("message"),
          }),
        });
        result = await res.json();
      } catch {
        /* Network trouble is not the visitor's problem to solve. */
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitLabel; }
        window.turnstile.reset(turnstileWidgetId);
      }

      if (result && result.ok === false && result.error === "challenge_failed") {
        status.dataset.state = "error";
        status.textContent =
          "The security check did not pass. Try once more, or email us directly at " + inbox + ".";
        return;
      }

      /* delivered:true arrives only once Email Routing is live (ADR-017). Until
         then the server verifies and the draft still does the delivering. */
      if (result && result.ok && result.delivered) {
        status.dataset.state = "ok";
        status.textContent =
          "Thank you, your message is on its way to the division. We usually reply within two days.";
        contactForm.reset();
        return;
      }

      openDraft();
    });
  }

  /* --- Hero video: decide which file, or none ------------------------------
     Pausing an already-downloading video saves nothing, so the decision has to
     happen before the src is set. The markup ships the sources as data
     attributes and we promote one of them:

       reduced motion or Save-Data   nothing, the poster carries the hero
       narrow viewport               data-src-narrow, a 20 second 2.1 MB loop
       wide viewport                 data-src, the full 20 MB montage

     While there is no src, `.hero-video:not([src])` keeps the element hidden
     and the poster image stands in, so the hero always has a background. */
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideEnough = window.matchMedia("(min-width: 900px)");

  const cheapConnection = () => {
    const c = navigator.connection;
    if (!c) return false;
    return Boolean(c.saveData) || /^([23]g|slow-2g)$/.test(c.effectiveType || "");
  };

  const applyMotionPreference = () => {
    const allowed = !reduceMotion.matches && !cheapConnection();
    for (const video of document.querySelectorAll("video[data-src]")) {
      const wanted = wideEnough.matches
        ? video.dataset.src
        : video.dataset.srcNarrow || video.dataset.src;

      if (allowed && wanted) {
        // Reassigning on a breakpoint change would restart the download for no
        // visible gain, so only touch src when it is actually wrong.
        if (video.getAttribute("src") !== wanted) {
          video.setAttribute("src", wanted);
          video.load();
        }
        if (video.paused) video.play().catch(() => {});
      } else {
        video.pause();
        // Removing the src also cancels an in-flight download.
        video.removeAttribute("src");
        video.load();
      }
    }
  };
  applyMotionPreference();
  reduceMotion.addEventListener("change", applyMotionPreference);
  wideEnough.addEventListener("change", applyMotionPreference);
})();
