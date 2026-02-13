// public/app.js
// AlNaseej Ordering - Frontend (Real Backend + SQLite)

const money = (n) => Number(n || 0).toFixed(3) + " د.ب";

const toastEl = document.getElementById("toast");
const hintEl = document.getElementById("hint");

const menuList = document.getElementById("menuList");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const btnOpenCart = document.getElementById("btnOpenCart");
const btnCloseCart = document.getElementById("btnCloseCart");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalLine = document.getElementById("cartSubtotalLine");
const btnClearCart = document.getElementById("btnClearCart");
const btnCheckout = document.getElementById("btnCheckout");
const btnGoToCheckout = document.getElementById("btnGoToCheckout");
const checkoutModal = document.getElementById("checkoutModal");
const btnCloseCheckout = document.getElementById("btnCloseCheckout");

// Floating Button Elements
const floatingOrderBtn = document.getElementById("floatingOrderBtn");
const btnFloatingCheckout = document.getElementById("btnFloatingCheckout");
const floatingCartCount = document.getElementById("floatingCartCount");

const phoneInput = document.getElementById("phoneInput");
const carInput = document.getElementById("carInput");
const noteInput = document.getElementById("noteInput");

const searchInput = document.getElementById("searchInput");
const categoryTabs = document.getElementById("categoryTabs");
const currentCategoryTitle = document.getElementById("currentCategoryTitle");

// State
let cart = [];
let MENU = [];
let CAFE_OPEN = true;
let currentTab = "all";

// ================= Helpers =================

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function phoneOk(str) {
  return /^[0-9+\s-]{8,}$/.test(String(str || "").trim());
}

function cartSubtotal() {
  return cart.reduce((a, b) => a + b.unit_price * b.qty, 0);
}

function renderCartBadge() {
  const count = cart.reduce((a, b) => a + b.qty, 0);

  // Update Top Bar Cart
  if (cartCount) cartCount.textContent = count;
  if (cartSubtotalLine) cartSubtotalLine.textContent = `المجموع: ${money(cartSubtotal())}`;

  // Update Floating Button
  if (floatingCartCount) floatingCartCount.textContent = count;
  if (floatingOrderBtn) {
    if (count > 0) floatingOrderBtn.classList.add("show");
    else floatingOrderBtn.classList.remove("show");
  }
}

function renderCartDrawer() {
  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<div class="hint">السلة فاضية.</div>`;
    renderCartBadge();
    return;
  }

  cartItemsEl.innerHTML = cart
    .map((row, idx) => {
      const line = row.unit_price * row.qty;
      return `
      <div class="cartRow">
        <div>
          <div class="cartRowTitle">${row.item_name}</div>
          <div class="cartRowMeta">${row.qty} × ${money(row.unit_price)} = <b>${money(line)}</b></div>
        </div>
        <div class="qty">
          <button data-dec="${idx}">−</button>
          <span>${row.qty}</span>
          <button data-inc="${idx}">+</button>
        </div>
      </div>
    `;
    })
    .join("");

  cartItemsEl.querySelectorAll("[data-inc]").forEach((b) => {
    b.addEventListener("click", () => {
      const idx = Number(b.dataset.inc);
      cart[idx].qty += 1;
      renderCartDrawer();
    });
  });

  cartItemsEl.querySelectorAll("[data-dec]").forEach((b) => {
    b.addEventListener("click", () => {
      const idx = Number(b.dataset.dec);
      cart[idx].qty -= 1;
      cart = cart.filter((x) => x.qty > 0);
      renderCartDrawer();
    });
  });

  renderCartBadge();
}

function openCart() {
  cartDrawer?.classList.add("show");
  cartDrawer?.setAttribute("aria-hidden", "false");
  renderCartDrawer();
}

function closeCart() {
  cartDrawer?.classList.remove("show");
  cartDrawer?.setAttribute("aria-hidden", "true");
}

function openCheckout() {
  if (cart.length === 0) {
    toast("أضف أصناف للسلة أولاً 🛒");
    return;
  }
  closeCart();
  checkoutModal?.classList.add("show");
}

function closeCheckout() {
  checkoutModal?.classList.remove("show");
}

// ============== Cart ops ==============

function addToCart(item_name, unit_price, note = null) {
  const name = note ? `${item_name} — ${note}` : item_name;
  const price = Number(unit_price);

  const row = cart.find((x) => x.item_name === name && x.unit_price === price);
  if (row) row.qty += 1;
  else cart.push({ item_name: name, unit_price: price, qty: 1 });

  renderCartBadge();
  toast("تمت الإضافة ✅");
}

// ============== Menu render ==============

function renderTabs() {
  if (!categoryTabs) return;

  // الأقسام بالترتيب الذي طلبه المستخدم
  const tabs = [
    { id: "all", label: "الكل" },
    { id: "الكيك", label: "الكيك" },
    { id: "السينامون", label: "سينامون" },
    { id: "الكرواسون الجامبو", label: "الكرواسون" },
    { id: "الكوكيز", label: "الكوكيز" },
    { id: "المفن", label: "المفن" },
    { id: "المشروبات", label: "المشروبات" },
    { id: "أصناف أخرى", label: "أخرى" }
  ];

  categoryTabs.innerHTML = tabs.map(tab => {
    return `<div class="tab ${currentTab === tab.id ? 'active' : ''}" data-tag="${tab.id}">${tab.label}</div>`;
  }).join("");

  categoryTabs.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      currentTab = tab.dataset.tag;
      renderTabs();
      renderMenu();
    });
  });
}

function renderMenu() {
  const q = (searchInput?.value || "").trim().toLowerCase();

  // تحديث العنوان
  if (currentCategoryTitle) {
    const activeTab = Array.from(categoryTabs.querySelectorAll('.tab')).find(t => t.dataset.tag === currentTab);
    currentCategoryTitle.textContent = activeTab ? activeTab.textContent : "المنيو";
  }

  menuList.innerHTML = MENU.map((cat, catIndex) => {
    // تصفية حسب القسم المختار
    if (currentTab !== "all") {
      if (currentTab === "المشروبات") {
        // إذا اختار المشروبات، نعرض كل ما هو "tag: المشروبات"
        if (cat.tag !== "المشروبات") return "";
      } else {
        // غير ذلك نقارن باسم القسم (category)
        if (cat.name !== currentTab) return "";
      }
    }

    const filtered = cat.items
      .map((it, originalIndex) => ({ ...it, originalIndex }))
      .filter((it) => {
        if (!q) return true;
        const hay = `${it.name} ${it.note || ""} ${cat.name} ${cat.tag}`.toLowerCase();
        return hay.includes(q);
      });

    if (filtered.length === 0) return "";

    const grouped = [];
    const nameMap = new Map();

    filtered.forEach(it => {
      const match = it.name.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        const baseName = match[1].trim();
        const variantName = match[2].trim();
        if (!nameMap.has(baseName)) {
          const prod = { ...it, displayName: baseName, variants: [], isGroup: true };
          nameMap.set(baseName, prod);
          grouped.push(prod);
        }
        nameMap.get(baseName).variants.push({ ...it, variantLabel: variantName });
      } else {
        grouped.push({ ...it, displayName: it.name, variants: [{ ...it, variantLabel: "" }], isGroup: false });
      }
    });

    return `
      <div class="cat">
        <div class="catTop">
          <div>
            <div class="catName">${cat.name}</div>
            <div class="itemSub">${cat.tag}</div>
          </div>
          <div class="catTag">${filtered.length} صنف</div>
        </div>
        <div class="items">
          ${grouped.map((prod, pIdx) => {
      const activeVariant = prod.variants[0];
      const hasVariants = prod.variants.length > 1;

      return `
                <div class="item" id="prod-${catIndex}-${pIdx}">
                  <img class="itemImg" 
                    src="${prod.image_url || `https://placehold.co/600x400/222/FFF?text=${encodeURIComponent(prod.displayName)}`}" 
                    alt="${prod.displayName}"
                    onerror="this.onerror=null; this.src='https://placehold.co/600x400/222/FFF?text=${encodeURIComponent(prod.displayName)}';">
                  <div class="itemInfo">
                    <div class="itemTitle">${prod.displayName}</div>
                    <div class="itemSub">${prod.note ? prod.note : ""}</div>
                    
                    ${hasVariants ? `
                      <div class="variants">
                        ${prod.variants.map((v, vIdx) => `
                          <button class="varBtn ${vIdx === 0 ? 'active' : ''}" 
                            onclick="selectVariant(${catIndex}, ${pIdx}, ${vIdx}, ${v.price}, '${v.id}')">
                            ${v.variantLabel}
                          </button>
                        `).join("")}
                      </div>
                    ` : ""}
                  </div>
                  <div class="itemRight">
                    <div class="price" id="price-${catIndex}-${pIdx}">${money(activeVariant.price)}</div>
                    <button class="addBtn" id="add-${catIndex}-${pIdx}" 
                      onclick="addFromGroup('${prod.displayName}', ${activeVariant.price}, '${prod.variants[0].variantLabel}')">
                      + إضافة
                    </button>
                  </div>
                </div>
              `;
    }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

window.selectVariant = (catIdx, pIdx, vIdx, price, itemId) => {
  const card = document.getElementById(`prod-${catIdx}-${pIdx}`);
  if (!card) return;

  // تحديث الأزرار
  card.querySelectorAll('.varBtn').forEach((btn, i) => {
    btn.classList.toggle('active', i === vIdx);
  });

  // تحديث السعر
  const priceEl = document.getElementById(`price-${catIdx}-${pIdx}`);
  if (priceEl) priceEl.innerText = Number(price).toFixed(3) + " د.ب";

  // تحديث الزر (لإرسال البيانات الصحيحة للسلة)
  const addBtn = document.getElementById(`add-${catIdx}-${pIdx}`);
  const prodTitle = card.querySelector('.itemTitle').innerText;
  const variants = card.querySelectorAll('.varBtn');
  const label = variants[vIdx].innerText.trim();

  addBtn.onclick = () => addFromGroup(prodTitle, price, label);
};

window.addFromGroup = (baseName, price, variantLabel) => {
  const fullName = variantLabel ? `${baseName} (${variantLabel})` : baseName;
  addToCart(fullName, price);
};

// ============== Checkout ==============

async function checkout() {
  if (!CAFE_OPEN) {
    if (hintEl) hintEl.textContent = "الكافيه مغلق حالياً.";
    return;
  }

  if (hintEl) hintEl.textContent = "";

  if (cart.length === 0) {
    if (hintEl) hintEl.textContent = "أضف أصناف أولاً.";
    return;
  }
  if (!phoneOk(phoneInput?.value)) {
    if (hintEl) hintEl.textContent = "يرجى كتابة رقم هاتف صحيح (8 أرقام على الأقل).";
    phoneInput?.focus();
    return;
  }

  const payload = {
    customer_phone: phoneInput.value.trim(),
    car_no: carInput?.value.trim() ? carInput.value.trim() : null,
    note: noteInput?.value.trim() ? noteInput.value.trim() : null,
    vat_rate: 0,
    items: cart.map((x) => ({
      item_name: x.item_name,
      unit_price: x.unit_price,
      qty: x.qty,
    })),
  };

  btnCheckout.disabled = true;
  btnCheckout.textContent = "جاري الإرسال...";

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.ok) {
      if (hintEl) hintEl.textContent = (data.errors && data.errors[0]) ? data.errors[0] : "فشل تسجيل الطلب.";
      btnCheckout.disabled = false;
      btnCheckout.textContent = "تأكيد وإرسال الطلب";
      return;
    }

    cart = [];
    renderCartBadge();
    renderCartDrawer();
    closeCheckout();
    toast("تم تسجيل الطلب بنجاح ✅");

    window.location.href = `/success.html?orderId=${data.order_id}`;
  } catch (e) {
    if (hintEl) hintEl.textContent = "تعذر الاتصال بالسيرفر.";
    btnCheckout.disabled = false;
    btnCheckout.textContent = "تأكيد وإرسال الطلب";
  }
}

// ============== Init ==============

async function loadSettings() {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json();
    CAFE_OPEN = !!data.cafe_open;
  } catch {
    CAFE_OPEN = true;
  }
}

async function loadMenu() {
  try {
    const res = await fetch("/api/menu", { cache: "no-store" });
    const data = await res.json();
    MENU = (data.ok && Array.isArray(data.menu)) ? data.menu : [];
  } catch {
    MENU = [];
  }
}

// ============== Real-time Sync (Socket.io) ==============
const socket = typeof io !== 'undefined' ? io() : null;

async function sync() {
  await loadSettings();
  await loadMenu();

  const closedEl = document.getElementById("closedMessage");
  const mainContentEl = document.getElementById("mainContent");

  if (!CAFE_OPEN) {
    if (closedEl) closedEl.style.display = "block";
    if (mainContentEl) mainContentEl.style.display = "none";
    if (floatingOrderBtn) floatingOrderBtn.style.display = "none";
  } else {
    if (closedEl) closedEl.style.display = "none";
    if (mainContentEl) mainContentEl.style.display = "block";
    if (floatingOrderBtn) floatingOrderBtn.style.display = "flex";
    renderTabs();
    renderMenu();
  }
  renderCartBadge();
}

if (socket) {
  socket.on("settings_updated", (data) => {
    console.log("Settings updated real-time:", data);
    sync();
  });
  socket.on("menu_updated", () => {
    console.log("Menu updated real-time!");
    sync();
  });
}

async function init() {
  btnOpenCart?.addEventListener("click", openCart);
  btnCloseCart?.addEventListener("click", closeCart);
  btnGoToCheckout?.addEventListener("click", openCheckout);
  btnFloatingCheckout?.addEventListener("click", openCheckout);
  btnCloseCheckout?.addEventListener("click", closeCheckout);

  cartDrawer?.addEventListener("click", (e) => {
    if (e.target === cartDrawer) closeCart();
  });
  checkoutModal?.addEventListener("click", (e) => {
    if (e.target === checkoutModal) closeCheckout();
  });

  btnClearCart?.addEventListener("click", () => {
    cart = [];
    renderCartDrawer();
    renderCartBadge();
    toast("تم تفريغ السلة");
  });

  btnCheckout?.addEventListener("click", checkout);

  // Know Us listeners
  const btnKnowUs = document.getElementById("btnKnowUs");
  const btnCloseInfo = document.getElementById("btnCloseInfo");
  const infoModal = document.getElementById("infoModal");

  btnKnowUs?.addEventListener("click", () => {
    infoModal?.classList.add("show");
  });
  btnCloseInfo?.addEventListener("click", () => {
    infoModal?.classList.remove("show");
  });
  infoModal?.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.classList.remove("show");
  });

  if (searchInput) {
    searchInput.addEventListener("input", renderMenu);
  }

  // التحميل الأول
  await sync();
}

init();
