/* ================================================================
   The Sullivans USNSCC — Store
   Cart system + product modal with size picker + image slideshow
   ================================================================ */

const PRODUCTS = [
  {
    id: 'dues-sc-lc',
    name: 'Sea Cadet / League Cadet Dues',
    category: 'Dues',
    price: 150,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Sea Cadets'
  },
  {
    id: 'dues-officer-child',
    name: 'Officer Child Dues',
    category: 'Dues',
    price: 125,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Officer Child'
  },
  {
    id: 'dues-officer',
    name: 'Officer Dues',
    category: 'Dues',
    price: 50,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Officer'
  },
  {
    id: 'meal-daily',
    name: 'Daily Meals – Day Drills',
    category: 'Meals',
    price: 5,
    images: ['./assets/store assets/meal-cartoon.svg'],
    type: 'simple'
  },
  {
    id: 'meal-overnight',
    name: 'Overnight Meals – Weekend Drills',
    category: 'Meals',
    price: 20,
    images: ['./assets/store assets/meal-cartoon.svg'],
    type: 'simple'
  },
  {
    id: 'sea-bag-lc',
    name: 'League Cadet Sea Bag',
    category: 'Sea Bags',
    price: 75,
    images: ['./assets/store assets/new/sea-bag-lc.png'],
    type: 'simple'
  },
  {
    id: 'sea-bag-promotion',
    name: 'League Cadet Promotion Sea Bag',
    category: 'Sea Bags',
    price: 75,
    images: ['./assets/store assets/new/sea-bag-promotion.png'],
    type: 'simple'
  },
  {
    id: 'sea-bag-sc',
    name: 'Sea Cadet Sea Bag',
    category: 'Sea Bags',
    price: 150,
    images: ['./assets/store assets/new/sea-bag-sc.png'],
    type: 'simple'
  },
  {
    id: 'navy-hoodie',
    name: 'Sullivans Navy Hoodie',
    category: 'Apparel',
    price: 45,
    images: [
      './assets/store assets/new/navy-hoodie-nobg.png',
      './assets/store assets/new/navy-hoodie-back-nobg.png'
    ],
    imageLabels: ['Front', 'Back'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'navy-sweats',
    name: 'USNSCC Navy Sweatpants',
    category: 'Apparel',
    price: 35,
    images: ['./assets/store assets/new/navy-sweats-nobg.png'],
    imageLabels: ['Front'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'bundle',
    name: 'Sullivans Hoodie & Sweatpants Bundle',
    category: 'Bundle',
    price: 75,
    images: [
      './assets/store assets/new/navy-hoodie-nobg.png',
      './assets/store assets/new/navy-sweats-nobg.png'
    ],
    imageLabels: ['Hoodie', 'Sweatpants'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'coyote-tee',
    name: 'Sullivans Coyote Brown T-Shirt',
    category: 'Apparel',
    price: 20,
    images: [
      './assets/store assets/new/coyote-tee-nobg.png',
      './assets/store assets/new/coyote-tee-back-nobg.png'
    ],
    imageLabels: ['Front', 'Back'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'coyote-hoodie',
    name: 'Sullivans Coyote Brown Hoodie',
    category: 'Apparel',
    price: 40,
    images: [
      './assets/store assets/new/coyote-hoodie-nobg.png',
      './assets/store assets/new/coyote-hoodie-back-nobg.png'
    ],
    imageLabels: ['Front', 'Back'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL']
  },
  {
    id: 'replacement-id',
    name: 'Replacement ID',
    category: 'Admin',
    price: 10,
    images: ['./assets/store assets/new/usnscc-id-nobg.png'],
    type: 'simple'
  }
];

/* ── Cart ──────────────────────────────────────────── */
class Cart {
  constructor() {
    this._items = JSON.parse(localStorage.getItem('sullivans-cart') || '[]');
    this._toastTimer = null;
  }

  get count() {
    return this._items.reduce((s, i) => s + i.qty, 0);
  }

  get total() {
    return this._items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  add(productId, size = null, qty = 1) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const key = size ? `${productId}::${size}` : productId;
    const existing = this._items.find(i => i.key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      this._items.push({
        key,
        id: productId,
        name: product.name,
        price: product.price,
        size: size || null,
        qty,
        img: product.images[0],
        category: product.category
      });
    }
    this._save();
    this._renderBadge();
    this._renderDrawer();
    this._toast(`${product.name}${size ? ' — ' + size : ''} added to cart`);
  }

  remove(key) {
    this._items = this._items.filter(i => i.key !== key);
    this._save();
    this._renderBadge();
    this._renderDrawer();
  }

  updateQty(key, qty) {
    if (qty <= 0) { this.remove(key); return; }
    const item = this._items.find(i => i.key === key);
    if (item) { item.qty = qty; this._save(); this._renderBadge(); this._renderDrawer(); }
  }

  _save() {
    localStorage.setItem('sullivans-cart', JSON.stringify(this._items));
  }

  _renderBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const n = this.count;
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  _toast(msg) {
    const el = document.getElementById('cart-toast');
    if (!el) return;
    el.textContent = '✓ ' + msg;
    el.classList.add('visible');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
  }

  _renderDrawer() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total');
    if (!container) return;

    if (this._items.length === 0) {
      container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    } else {
      container.innerHTML = this._items.map(item => `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}" />
          <div class="cart-item-info">
            <p class="cart-item-name">${item.name}</p>
            ${item.size ? `<p class="cart-item-meta">Size: <strong>${item.size}</strong></p>` : ''}
            <p class="cart-item-meta">$${item.price.toFixed(2)} each</p>
            <div class="cart-qty">
              <button onclick="cart.updateQty('${item.key}',${item.qty-1})">−</button>
              <span>${item.qty}</span>
              <button onclick="cart.updateQty('${item.key}',${item.qty+1})">+</button>
            </div>
          </div>
          <button class="cart-remove" onclick="cart.remove('${item.key}')" aria-label="Remove">&times;</button>
        </div>
      `).join('');
    }

    if (totalEl) totalEl.textContent = '$' + this.total.toFixed(2);
  }
}

/* ── Modal ─────────────────────────────────────────── */
let currentProduct  = null;
let currentImgIndex = 0;
let selectedSize    = null;

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
  modal.querySelector('#modal-name').textContent      = product.name;
  modal.querySelector('#modal-price').textContent     = '$' + product.price.toFixed(2);

  // Gallery
  _setModalImg();

  // Dots
  const dotsEl = modal.querySelector('.gallery-dots');
  dotsEl.innerHTML = product.images.map((_, i) =>
    `<span class="dot${i===0?' active':''}" data-i="${i}"></span>`
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
      const sizeOpts = modal.querySelector('.size-options');
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
  img.src = currentProduct.images[currentImgIndex];
  img.alt = (currentProduct.imageLabels || [''])[currentImgIndex] || '';
  if (label) label.textContent = img.alt;
  modal.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentImgIndex));
}

function closeModal() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  currentProduct = null;
}

/* ── Cart Drawer ───────────────────────────────────── */
function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  cart._renderDrawer();
  drawer.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

/* ── Init ──────────────────────────────────────────── */
let cart;

document.addEventListener('DOMContentLoaded', () => {
  cart = new Cart();
  cart._renderBadge();

  // Modal wiring
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
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

  // Cart drawer wiring
  const drawer = document.getElementById('cart-drawer');
  if (drawer) {
    drawer.querySelector('.cart-overlay').addEventListener('click', closeCartDrawer);
    drawer.querySelector('.cart-close').addEventListener('click', closeCartDrawer);
  }

  // Cart icon
  document.getElementById('cart-icon-btn')?.addEventListener('click', openCartDrawer);

  // Product cards
  document.querySelectorAll('.product-card[data-product]').forEach(card => {
    const pid = card.dataset.product;

    // Click image → open modal
    card.querySelector('.product-img-wrap')?.addEventListener('click', () => openModal(pid));

    // Add to Cart button
    card.querySelector('.product-btn')?.addEventListener('click', () => {
      const product = PRODUCTS.find(p => p.id === pid);
      if (!product) return;
      if (product.type === 'apparel') {
        openModal(pid);
      } else {
        cart.add(pid, null);
      }
    });
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCartDrawer(); }
  });
});
