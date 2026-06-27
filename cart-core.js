/* ================================================================
   The Sullivans USNSCC — Shared Cart Core
   Single source of truth for products + cart state.
   Loaded on store.html, cart.html, checkout.html (and any page
   that shows the cart icon/badge).
   ================================================================ */

const MEAL_IMG = './assets/store assets/Meal Store Pic Animation.png';

const PRODUCTS = [
  {
    id: 'dues-sc-lc',
    name: 'Sea Cadet / League Cadet Dues',
    category: 'Dues',
    price: 150,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Sea Cadets',
    description: 'Annual dues for Sea Cadets (NSCC) and League Cadets (NLCC). Covers national registration and unit participation for the program year.'
  },
  {
    id: 'dues-officer-child',
    name: 'Officer Child Dues',
    category: 'Dues',
    price: 125,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Officer Child',
    description: 'Annual dues for the child of a registered officer. Covers national registration and unit participation for the program year.'
  },
  {
    id: 'dues-officer',
    name: 'Officer Dues',
    category: 'Dues',
    price: 50,
    images: ['./assets/store assets/envelope-nobg.png'],
    type: 'simple',
    envelopeLabel: 'Officer',
    description: 'Annual dues for registered officers of The Sullivans Division.'
  },
  {
    id: 'meal-daily',
    name: 'Daily Meals – Day Drills',
    category: 'Meals',
    price: 5,
    images: [MEAL_IMG],
    type: 'simple',
    description: 'Meals for single-day drills. Price reflects the per-drill cost.'
  },
  {
    id: 'meal-overnight',
    name: 'Overnight Meals – Weekend Drills',
    category: 'Meals',
    price: 20,
    images: [MEAL_IMG],
    type: 'simple',
    description: 'Meals for overnight (weekend) drills. Price reflects the per-weekend cost.'
  },
  {
    id: 'sea-bag-lc',
    name: 'League Cadet Sea Bag',
    category: 'Sea Bags',
    price: 75,
    images: ['./assets/store assets/new/sea-bag-lc.png'],
    type: 'simple',
    description: 'The required uniform and gear set for new League Cadets (NLCC).'
  },
  {
    id: 'sea-bag-promotion',
    name: 'League Cadet Promotion Sea Bag',
    category: 'Sea Bags',
    price: 75,
    images: ['./assets/store assets/new/sea-bag-promotion.png'],
    type: 'simple',
    description: 'Additional uniform items for League Cadets advancing to the next level.'
  },
  {
    id: 'sea-bag-sc',
    name: 'Sea Cadet Sea Bag',
    category: 'Sea Bags',
    price: 150,
    images: ['./assets/store assets/new/sea-bag-sc.png'],
    type: 'simple',
    description: 'The required uniform and gear set for Sea Cadets (NSCC).'
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Navy hoodie with the Sullivans Division crest. Comfortable fleece for cadets and parents — in or out of unit activities.'
  },
  {
    id: 'navy-sweats',
    name: 'USNSCC Navy Sweatpants',
    category: 'Apparel',
    price: 35,
    images: ['./assets/store assets/new/navy-sweats-nobg.png'],
    imageLabels: ['Front'],
    type: 'apparel',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Matching USNSCC navy sweatpants. Soft, division-branded fleece to pair with the hoodie.'
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Save with the matching navy hoodie + sweatpants set. Choose your size below.'
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Coyote brown t-shirt with the Sullivans Division logo. Lightweight everyday wear.'
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
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: 'Coyote brown hoodie with the Sullivans Division logo. Warm fleece for field and casual wear.'
  },
  {
    id: 'replacement-id',
    name: 'Replacement ID',
    category: 'Admin',
    price: 10,
    images: ['./assets/store assets/USNSCC store page ID.png'],
    type: 'simple',
    description: 'Replacement USNSCC identification card for cadets who have lost or damaged their ID.'
  }
];

/* Money helper */
function money(n) {
  return '$' + Number(n).toFixed(2);
}

/* ── Cart ──────────────────────────────────────────── */
class Cart {
  constructor() {
    this._items = JSON.parse(localStorage.getItem('sullivans-cart') || '[]');
    this._toastTimer = null;
  }

  get items() { return this._items; }

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
    this.renderBadge();
    this._toast(`${product.name}${size ? ' — ' + size : ''} added to cart`);
  }

  remove(key) {
    this._items = this._items.filter(i => i.key !== key);
    this._save();
    this.renderBadge();
  }

  updateQty(key, qty) {
    if (qty <= 0) { this.remove(key); return; }
    const item = this._items.find(i => i.key === key);
    if (item) { item.qty = qty; this._save(); this.renderBadge(); }
  }

  _save() {
    localStorage.setItem('sullivans-cart', JSON.stringify(this._items));
  }

  renderBadge() {
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
}

const cart = new Cart();
document.addEventListener('DOMContentLoaded', () => cart.renderBadge());
