const toggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const header = document.querySelector("[data-header]");

if (toggle && nav) {
  if (!nav.id) nav.id = "primary-navigation";
  toggle.setAttribute("aria-controls", nav.id);

  const closeNav = ({ returnFocus = false } = {}) => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    if (returnFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeNav();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      closeNav({ returnFocus: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 940) closeNav();
  });
}

const announcement = document.querySelector("[data-announcement]");
const announcementClose = document.querySelector("[data-announcement-close]");

function syncAnnouncementOffset() {
  const height = announcement && !announcement.hidden ? announcement.offsetHeight : 0;
  document.documentElement.style.setProperty("--announcement-offset", `${height}px`);
}

if (announcement) {
  if (sessionStorage.getItem("sullivans-announcement-dismissed") === "1") {
    announcement.hidden = true;
  }
  syncAnnouncementOffset();
  window.addEventListener("resize", syncAnnouncementOffset);
  announcementClose?.addEventListener("click", () => {
    announcement.hidden = true;
    sessionStorage.setItem("sullivans-announcement-dismissed", "1");
    syncAnnouncementOffset();
  });
}

if (header) {
  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}
