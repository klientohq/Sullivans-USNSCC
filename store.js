/* ================================================================
   The Sullivans USNSCC — Store page
   Product detail overlay (slideshow + size picker + description)
   Depends on cart-core.js (PRODUCTS, cart, money)
   ================================================================ */

let currentProduct  = null;
let currentImgIndex = 0;
let selectedSize    = null;

function _imgFallback(imgEl, product) {
  imgEl.onerror = product && product.fallback
    ? function () { this.onerror = null; this.src = product.fallback; }
    : null;
}

function openModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  currentProduct  = product;
  currentImgIndex = 0;
  selectedSize    = null;

  const modal = document.getElementById('product-modal');
  if (!modal) return;

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
    `<span class="dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`
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

  // Size picker
  const sizeSection = modal.querySelector('.size-picker');
  const sizeOpts    = modal.querySelector('.size-options');
  if (product.type === 'apparel' && product.sizes) {
    sizeSection.hidden = false;
    sizeOpts.innerHTML = product.sizes.map(s =>
      `<button class="size-btn" data-size="${s}">${s}</button>`
    ).join('');
    sizeOpts.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sizeOpts.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = btn.dataset.size;
      });
    });
  } else {
    sizeSection.hidden = true;
  }

  // Add to cart
  const addBtn = modal.querySelector('#modal-add-cart');
  addBtn.onclick = () => {
    if (product.type === 'apparel' && !selectedSize) {
      sizeOpts.classList.add('shake');
      sizeOpts.style.outline = '2px solid #c62828';
      setTimeout(() => {
        sizeOpts.classList.remove('shake');
        sizeOpts.style.outline = '';
      }, 600);
      return;
    }
    cart.add(product.id, selectedSize);
    closeModal();
  };

  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
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
  modal.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentImgIndex));
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  currentProduct = null;
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
    const pid = card.dataset.product;
    const product = PRODUCTS.find(p => p.id === pid);
    const cardImg = card.querySelector('.product-img-wrap img');
    if (cardImg && product) _imgFallback(cardImg, product);

    // Click anywhere on the card (except the button) opens the detail overlay
    card.querySelector('.product-img-wrap')?.addEventListener('click', () => openModal(pid));
    card.querySelector('.product-info')?.addEventListener('click', () => openModal(pid));

    // Add to Cart button: apparel needs a size (open overlay); simple adds straight away
    card.querySelector('.product-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!product) return;
      if (product.type === 'apparel') {
        openModal(pid);
      } else {
        cart.add(pid, null);
      }
    });
  });

  // Keyboard: Escape closes overlay
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
