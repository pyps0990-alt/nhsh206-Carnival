// ===================== Firebase 初始化 =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyAk6JPL61gRlRtLP7926iAfbSr05O0AM9s",
  authDomain: "nhshfestival.firebaseapp.com",
  databaseURL: "https://nhshfestival-default-rtdb.firebaseio.com",
  projectId: "nhshfestival",
  storageBucket: "nhshfestival.firebasestorage.app",
  messagingSenderId: "337149505249",
  appId: "1:337149505249:web:4e81a826911c078fd811a0"
};

const app = initializeApp(firebaseConfig);
const dbRealtime = getDatabase(app);
const dbFirestore = getFirestore(app);

// ===================== 工具函式 =====================
function genId() { return 'o_' + Math.random().toString(36).slice(2, 9); }
function readOrders() { return JSON.parse(localStorage.getItem('class206_orders_v2') || '[]'); }
function writeOrders(list){ localStorage.setItem('class206_orders_v2', JSON.stringify(list)); syncCartBadge(); }

// ===================== 商品渲染 =====================
let products = []; // 全域存放商品資料

function renderMenu() {
  const wrap = document.getElementById('menu-list');
  if (!wrap) return;
  wrap.innerHTML = '';

  products.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card product-card';
    card.innerHTML = `
      <div style="position:relative;border-radius:10px;overflow:hidden;margin:-6px -6px 10px;border:1px solid rgba(255,255,255,.06)">
        <img src="${item.img}" alt="${item.name}" style="width:100%;height:140px;object-fit:cover;filter:saturate(1.02)">
        ${item.hot ? '<span class="hot-badge">熱銷</span>' : ''}
        <span class="price-badge">$${item.price}</span>
      </div>
      <h4>${item.name}</h4>
      <p class="muted">${item.desc}</p>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <button class="btn primary" data-add="${item.id}">加入</button>
        <button class="btn" data-detail="${item.id}">詳情</button>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.addEventListener('click', e => {
    const btnAdd = e.target.closest('button[data-add]');
    if (btnAdd) {
      const itemId = btnAdd.getAttribute('data-add');
      const card = btnAdd.closest('.card');
      const img = card.querySelector('img');
      addToCart(itemId);
      animateAddToCart(img);
      showAddedTip();
      return;
    }

    const btnDetail = e.target.closest('button[data-detail]');
    if (btnDetail) {
      const itemId = btnDetail.getAttribute('data-detail');
      showProductDetail(itemId);
    }
  });
}

// ===================== 商品詳情頁 =====================
function showProductDetail(itemId) {
  const item = products.find(p => p.id === itemId);
  if (!item) return;

  const detail = document.getElementById('product-detail');
  if (!detail) return;

  detail.innerHTML = `
    <div class="detail-card">
      <button class="btn" id="back-menu">&lt; 返回</button>
      <img src="${item.img}" alt="${item.name}" style="width:100%;border-radius:12px;object-fit:cover;max-height:300px">
      <h2>${item.name}</h2>
      <p class="muted">${item.desc}</p>
      <p class="price-badge">$${item.price}</p>
      <button class="btn primary" id="detail-add">加入購物車</button>
    </div>
  `;
  detail.style.display = 'block';
  document.getElementById('menu-section').style.display = 'none';

  document.getElementById('back-menu').onclick = () => {
    detail.style.display = 'none';
    document.getElementById('menu-section').style.display = 'block';
  };

  document.getElementById('detail-add').onclick = () => {
    addToCart(item.id);
    const img = detail.querySelector('img');
    animateAddToCart(img);
    showAddedTip();
  };
}

// ===================== 購物車操作 =====================
function addToCart(itemId, qty = 1) {
  const orders = readOrders();
  const existingIndex = orders.findIndex(o => o.items.some(i => i.id === itemId));

  if (existingIndex >= 0) {
    orders[existingIndex].items[0].qty += qty;
  } else {
    orders.push({ id: genId(), createdAt: Date.now(), items: [{ id: itemId, qty }] });
  }

  writeOrders(orders);
  renderCart();
}

function removeFromCart(itemId) {
  let orders = readOrders();
  orders = orders.filter(o => !o.items.some(i => i.id === itemId));
  writeOrders(orders);
  renderCart();
}

function syncCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const orders = readOrders();
  let count = 0;
  orders.forEach(o => o.items.forEach(i => count += i.qty));
  badge.textContent = count;
}

function renderCart() {
  const wrap = document.getElementById('cart-list');
  if (!wrap) return;
  const orders = readOrders();
  wrap.innerHTML = '';
  if (orders.length === 0) { wrap.innerHTML = '<p>購物車是空的</p>'; return; }

  orders.forEach(order => {
    order.items.forEach(itemOrder => {
      const product = products.find(p => p.id === itemOrder.id);
      if (!product) return;

      const row = document.createElement('div');
      row.className = 'cart-item';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px';
      row.style.border = '1px solid rgba(255,255,255,.08)';
      row.style.borderRadius = '8px';
      row.style.marginBottom = '6px';
      row.innerHTML = `
        <span>${product.name} x ${itemOrder.qty}</span>
        <span>
          $${product.price * itemOrder.qty} 
          <button class="btn danger btn-sm" data-remove="${product.id}">刪除</button>
        </span>
      `;
      wrap.appendChild(row);
    });
  });

  const total = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => {
    const p = products.find(pr => pr.id === i.id);
    return s + (p ? p.price * i.qty : 0);
  }, 0), 0);

  const totalEl = document.createElement('div');
  totalEl.style.fontWeight = '700';
  totalEl.style.marginTop = '12px';
  totalEl.textContent = '總金額：$' + total;
  wrap.appendChild(totalEl);

  wrap.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.onclick = () => { const id = btn.getAttribute('data-remove'); removeFromCart(id); };
  });
}

function animateAddToCart(imgEl) {
  const cart = document.getElementById('cart-icon');
  if (!imgEl || !cart) return;

  const flyImg = imgEl.cloneNode(true);
  const rect = imgEl.getBoundingClientRect();
  flyImg.style.position = 'fixed';
  flyImg.style.left = rect.left + 'px';
  flyImg.style.top = rect.top + 'px';
  flyImg.style.width = rect.width + 'px';
  flyImg.style.height = rect.height + 'px';
  flyImg.style.transition = 'all 0.6s cubic-bezier(0.4,0,0.2,1)';
  flyImg.style.zIndex = 9999;
  flyImg.style.borderRadius = '10px';
  document.body.appendChild(flyImg);

  const cartRect = cart.getBoundingClientRect();
  setTimeout(() => {
    flyImg.style.left = cartRect.left + cartRect.width / 2 - rect.width / 4 + 'px';
    flyImg.style.top = cartRect.top + cartRect.height / 2 - rect.height / 4 + 'px';
    flyImg.style.width = rect.width / 2 + 'px';
    flyImg.style.height = rect.height / 2 + 'px';
    flyImg.style.opacity = 0.7;
  }, 50);

  flyImg.addEventListener('transitionend', () => { flyImg.remove(); cart.classList.add('bounce'); setTimeout(() => cart.classList.remove('bounce'), 300); });
}

function showAddedTip() {
  let tip = document.querySelector('.added-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'added-tip';
    tip.textContent = '已加入購物車';
    document.body.appendChild(tip);
  }
  tip.classList.add('show');
  setTimeout(() => tip.classList.remove('show'), 1200);
}

// ===================== 即時訂單摘要 =====================
if (!document.getElementById('live-orders-wrap')) {
  const liveWrap = document.createElement('div');
  liveWrap.id = 'live-orders-wrap';
  liveWrap.style = `
    position: fixed;
    top: 10px;
    right: 10px;
    max-width: 300px;
    z-index: 9999;
    pointer-events: none;
    font-family: sans-serif;
  `;
  document.body.appendChild(liveWrap);
}

onValue(ref(dbRealtime, "orders"), snapshot => {
  const data = snapshot.val() || {};
  renderLiveOrders(data);
});

function renderLiveOrders(data) {
  const wrap = document.getElementById('live-orders-wrap');
  if (!wrap) return;

  const ongoingOrders = Object.entries(data).filter(([id, order]) => order.status && order.status !== '已完成');
  if (ongoingOrders.length === 0) { wrap.innerHTML = ''; return; }

  const byTime = {};
  ongoingOrders.forEach(([id, order]) => {
    const time = order.pickupTime || '未指定';
    if (!byTime[time]) byTime[time] = [];
    byTime[time].push({ id, order });
  });

  wrap.innerHTML = '';
  Object.entries(byTime).forEach(([time, orders]) => {
    const block = document.createElement('div');
    block.style = "background: rgba(255,255,255,0.95); border:1px solid #ddd; border-radius:10px; padding:8px 12px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.15); pointer-events:auto; transition: transform 0.3s, opacity 0.3s;";
    block.innerHTML = `<strong>⏰ ${time}</strong>`;
    orders.forEach(({ id, order }) => {
      const total = order.items?.reduce((sum, i) => sum + (i.price * i.qty || 0), 0) || 0;
      const row = document.createElement('div');
      row.textContent = `訂單 ${order.orderNumber || id} — 總金額 $${total}`;
      block.appendChild(row);
    });
    wrap.appendChild(block);
  });
}

// ===================== 初始化 =====================
document.addEventListener("DOMContentLoaded", () => {
  loadProductsFromFirebase(); // 從 Firestore 讀取商品
  renderCart();
  syncCartBadge();
});

// ===================== Firestore 讀取商品 =====================
async function loadProductsFromFirebase() {
  try {
    const productsCol = collection(dbFirestore, "products");
    const snapshot = await getDocs(productsCol);
    const firebaseProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    products.length = 0;
    firebaseProducts.forEach(p => products.push(p));
    renderMenu();
    syncCartBadge();
  } catch (err) {
    console.error("讀取 Firebase 商品失敗:", err);
  }
}
