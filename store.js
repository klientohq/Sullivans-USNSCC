/* ================================================================
   The Sullivans USNSCC — Store page
   Product detail overlay (slideshow + size picker + description)
   Depends on cart-core.js (PRODUCTS, cart, money)
   ================================================================ */

let currentProduct  = null;
let currentImgIndex = 0;
let selectedSize    = null;
let modalTrigger    = null;

/* Category color coding (matches the sidebar dots) */
const CAT_COLORS = {
  'Dues': '#2f6fed',      // blue
  'Meals': '#d8362f',     // red
  'Sea Bags': '#e3a72e',  // yellow
  'Apparel': '#8a93a3',   // gray
  'Bundle': '#8a93a3',    // gray (apparel set)
  'Admin': '#e8772e'      // orange
};

function _imgFallback(imgEl, product) {
  imgEl.onerror = product && product.fallback
    ? function () { this.onerror = null; this.src = product.fallback; }
    : null;
}

function openModal(productId, trigger = document.activeElement) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  currentProduct  = product;
  currentImgIndex = 0;
  selectedSize    = null;

  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modalTrigger = trigger;

  // Info
  modal.querySelector('#modal-category').textContent = product.category;
  modal.querySelector('#modal-name').textContent     = product.name;
  modal.querySelector('#modal-price').textContent    = money(product.price);
  const descEl = modal.querySelector('#modal-desc');
  if (descEl) descEl.textContent = product.description || '';

  // Gallery
  _setModalImg();

  // Dots
  const dotsEl = modal.querySelector('.gallery-dots');
  dotsEl.innerHTML = product.images.map((_, i) =>
    `<button type="button" class="dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Show image ${i + 1} of ${product.images.length}" aria-pressed="${i === 0}"></button>`
  ).join('');
  dotsEl.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentImgIndex = parseInt(dot.dataset.i, 10);
      _setModalImg();
    });
  });

  const multi = product.images.length > 1;
  modal.querySelector('.gallery-prev').style.display = multi ? '' : 'none';
  modal.querySelector('.gallery-next').style.display = multi ? '' : 'none';
  dotsEl.style.display = multi ? '' : 'none';

  // Product options are selected on WooCommerce so availability stays authoritative.
  const sizeSection = modal.querySelector('.size-picker');
  const sizeOpts    = modal.querySelector('.size-options');
  sizeSection.hidden = true;
  sizeOpts.innerHTML = '';

  // Hand off to WooCommerce, which owns variants, payment, and fulfillment.
  const addBtn = modal.querySelector('#modal-add-cart');
  addBtn.textContent = product.type === 'apparel' ? 'Choose Options' : 'Add to Secure Cart';
  addBtn.onclick = () => {
    if (product.type === 'apparel') {
      window.location.assign(product.wooUrl || 'https://uss-sullivans-usnscc-store.printify.me/');
      return;
    }
    window.location.assign(`https://thesullivansusnscc.com/store/?add-to-cart=${product.wooId}`);
  };

  modal.removeAttribute('hidden');
  document.querySelectorAll('body > header, body > main, body > footer, body > .sticky-join').forEach(el => {
    el.inert = true;
  });
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close').focus();
}

function _setModalImg() {
  if (!currentProduct) return;
  const modal = document.getElementById('product-modal');
  const img   = modal.querySelector('#modal-img');
  const label = modal.querySelector('#modal-img-label');
  _imgFallback(img, currentProduct);
  img.src = currentProduct.images[currentImgIndex];
  img.alt = (currentProduct.imageLabels || [''])[currentImgIndex] || currentProduct.name;
  if (label) {
    const lbl = (currentProduct.imageLabels || [])[currentImgIndex] || '';
    label.textContent = lbl;
    label.style.display = lbl ? '' : 'none';
  }
  modal.querySelectorAll('.dot').forEach((d, i) => {
    const active = i === currentImgIndex;
    d.classList.toggle('active', active);
    d.setAttribute('aria-pressed', String(active));
  });
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.setAttribute('hidden', '');
  document.querySelectorAll('body > header, body > main, body > footer, body > .sticky-join').forEach(el => {
    el.inert = false;
  });
  document.body.style.overflow = '';
  currentProduct = null;
  modalTrigger?.focus();
  modalTrigger = null;
}

/* ── Init ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Modal wiring
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-back')?.addEventListener('click', closeModal);
    modal.querySelector('.gallery-prev').addEventListener('click', () => {
      if (!currentProduct) return;
      currentImgIndex = (currentImgIndex - 1 + currentProduct.images.length) % currentProduct.images.length;
      _setModalImg();
    });
    modal.querySelector('.gallery-next').addEventListener('click', () => {
      if (!currentProduct) return;
      currentImgIndex = (currentImgIndex + 1) % currentProduct.images.length;
      _setModalImg();
    });
  }

  // Apply image fallback (meal plate -> cartoon) to grid cards
  document.querySelectorAll('.product-card[data-product]').forEach(card => {
    if (card.classList.contains('printify-card')) return;
    const pid = card.dataset.product;
    const product = PRODUCTS.find(p => p.id === pid);
    const cardImg = card.querySelector('.product-img-wrap img');
    if (cardImg && product) _imgFallback(cardImg, product);

    // Color-code the category label + add a matching dot
    const catSpan = card.querySelector('.product-info span');
    if (catSpan && product) {
      const color = CAT_COLORS[product.category] || '#8a93a3';
      catSpan.style.color = color;
      if (!catSpan.querySelector('.cat-dot')) {
        catSpan.insertAdjacentHTML('afterbegin', '<i class="cat-dot" style="background:' + color + '"></i>');
      }
    }

    // Click anywhere on the card (except the button) opens the detail overlay
    [card.querySelector('.product-img-wrap'), card.querySelector('.product-info')].forEach(trigger => {
      if (!trigger) return;
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('aria-label', `View details for ${product.name}`);
      trigger.addEventListener('click', () => openModal(pid, trigger));
      trigger.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal(pid, trigger);
        }
      });
    });

    // WooCommerce remains the order source of truth for every live-site product.
    card.querySelector('.product-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!product) return;
      if (product.type === 'apparel') {
        window.location.assign(product.wooUrl || 'https://uss-sullivans-usnscc-store.printify.me/');
      } else {
        window.location.assign(`https://thesullivansusnscc.com/store/?add-to-cart=${product.wooId}`);
      }
    });
  });

  // Keyboard: Escape closes overlay
  document.addEventListener('keydown', e => {
    const openModalEl = document.getElementById('product-modal');
    if (!openModalEl || openModalEl.hasAttribute('hidden')) return;
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...openModalEl.querySelectorAll('button:not([hidden]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ── Category filtering ──────────────────────────────
  function getCardCategory(card) {
    if (card.classList.contains('printify-card')) return 'merchandise';
    const pid = card.dataset.product || '';
    if (pid.startsWith('dues'))       return 'dues';
    if (pid.startsWith('meal'))       return 'meals';
    if (pid.startsWith('sea-bag'))    return 'sea-bags';
    if (pid === 'replacement-id')     return 'admin';
    return null;
  }

  const selectedCats = new Set();

  function filterProducts() {
    const cards    = document.querySelectorAll('.product-card');
    const clearBtn = document.getElementById('filter-clear');
    const countEl  = document.querySelector('.store-toolbar strong');
    let visible = 0;

    cards.forEach(card => {
      const show = selectedCats.size === 0 || selectedCats.has(getCardCategory(card));
      card.classList.toggle('product-card--hidden', !show);
      if (show) visible++;
    });

    document.querySelectorAll('.store-sidebar a').forEach(a => {
      const cat = a.getAttribute('href').slice(1);
      a.classList.toggle('filter-active', selectedCats.has(cat));
    });

    if (clearBtn) clearBtn.hidden = selectedCats.size === 0;
    if (countEl)  countEl.textContent = visible + ' item' + (visible === 1 ? '' : 's');
  }

  document.querySelectorAll('.store-sidebar a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const cat = a.getAttribute('href').slice(1);
      if (selectedCats.has(cat)) {
        selectedCats.delete(cat);
      } else {
        selectedCats.add(cat);
      }
      filterProducts();
    });
  });

  const clearBtn = document.getElementById('filter-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    selectedCats.clear();
    filterProducts();
  });

});
