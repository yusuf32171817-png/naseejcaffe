async function api(url, opts = {}) {
  const headers = opts.headers || {};
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return fetch(url, { ...opts, headers });
}

const rowsEl = document.getElementById("rows");
const detailsEl = document.getElementById("details");
const btnRefresh = document.getElementById("btnRefresh");
const searchEl = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
const toastEl = document.getElementById("toast");

const money = (n) => Number(n || 0).toFixed(3) + " د.ب";

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function fmtTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mo} ${hh}:${mm}`;
}

function badge(status) {
  const map = {
    new: ["جديد", "bNew"],
    preparing: ["قيد التحضير", "bPrep"],
    ready: ["جاهز", "bReady"],
    done: ["مكتمل", "bDone"]
  };
  const x = map[status] || ["غير معروف", ""];
  return `<span class="badge ${x[1]}">${x[0]}</span>`;
}

async function fetchOrders() {
  const q = (searchEl?.value || "").trim();
  const st = statusFilter?.value || "all";
  const url = new URL("/api/orders", window.location.origin);
  url.searchParams.set("q", q);
  url.searchParams.set("status", st);
  const res = await fetch(url);
  const data = await res.json();
  return data.orders || [];
}

async function render() {
  const orders = await fetchOrders();
  if (!rowsEl) return;

  if (orders.length === 0) {
    rowsEl.innerHTML = `<tr><td colspan="9" class="muted">لا توجد طلبات…</td></tr>`;
    return;
  }

  rowsEl.innerHTML = orders.map(o => `
    <tr>
      <td><b>${o.order_no}</b><div class="muted">#${o.id}</div></td>
      <td>${fmtTime(o.created_at)}</td>
      <td>${o.customer_phone}</td>
      <td>${o.car_no ? o.car_no : `<span class="muted">—</span>`}</td>
      <td>${o.pickup_time}</td>
      <td><b>${money(o.total)}</b></td>
      <td>${badge(o.status)}</td>
      <td>
        <button class="rowBtn" data-open="${o.id}">عرض</button>
        <a class="rowBtn" style="margin-right:6px" href="/invoice.html?orderId=${o.id}" target="_blank">فاتورة</a>
      </td>
      <td>
        <button class="smallBtn" data-set="${o.id}:new">جديد</button>
        <button class="smallBtn" data-set="${o.id}:preparing">تحضير</button>
        <button class="smallBtn" data-set="${o.id}:ready">جاهز</button>
        <button class="smallBtn" data-set="${o.id}:done">تم</button>
        <button class="smallBtn" data-del="${o.id}">حذف</button>
      </td>
    </tr>
  `).join("");

  rowsEl.querySelectorAll("[data-open]").forEach(b => {
    b.addEventListener("click", () => openDetails(b.dataset.open));
  });
  rowsEl.querySelectorAll("[data-set]").forEach(b => {
    b.addEventListener("click", () => {
      const [id, st] = b.dataset.set.split(":");
      setStatus(id, st);
    });
  });
  rowsEl.querySelectorAll("[data-del]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.dataset.del;
      if (confirm("حذف الطلب؟")) delOrder(id);
    });
  });
}

async function openDetails(id) {
  const res = await fetch(`/api/orders/${id}`);
  const data = await res.json();
  if (!data.ok) return;

  const o = data.order;
  const items = data.items || [];

  const itemsHtml = items.map(it => `
    <li><b>${it.item_name}</b> — ${it.qty} × ${money(it.unit_price)} = <b>${money(it.line_total)}</b></li>
  `).join("");

  detailsEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div>
        <div><b>رقم الطلب:</b> ${o.order_no}</div>
        <div><b>الوقت:</b> ${fmtTime(o.created_at)}</div>
        <div><b>الهاتف:</b> ${o.customer_phone}</div>
        <div><b>السيارة:</b> ${o.car_no || "—"}</div>
        <div><b>الاستلام:</b> ${o.pickup_time}</div>
        <div><b>الحالة:</b> ${badge(o.status)}</div>
      </div>
      <div>
        <div><b>Subtotal:</b> ${money(o.subtotal)}</div>
        <div><b>VAT:</b> ${money(o.vat_amount)} (${Math.round(o.vat_rate * 100)}%)</div>
        <div><b>Total:</b> ${money(o.total)}</div>
      </div>
    </div>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.10);margin:12px 0;">
    <div><b>الأصناف:</b></div>
    <ol style="margin:10px 18px 0; color: rgba(255,255,255,.88)">
      ${itemsHtml || `<li class="muted">لا توجد أصناف</li>`}
    </ol>
    <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn btnPrimary" href="/invoice.html?orderId=${o.id}" target="_blank">فتح الفاتورة</a>
    </div>
  `;
}

async function setStatus(id, status) {
  const res = await fetch(`/api/orders/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!data.ok) { toast("فشل تحديث الحالة"); return; }
  toast("تم التحديث");
  render();
}

async function delOrder(id) {
  const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!data.ok) { toast("فشل الحذف"); return; }
  detailsEl.textContent = "اختر طلب لعرض التفاصيل…";
  toast("تم الحذف");
  render();
}

btnRefresh?.addEventListener("click", render);
searchEl?.addEventListener("input", render);
statusFilter?.addEventListener("change", render);

render();

// ===== Cafe toggle + Menu management =====
const btnCafeToggle = document.getElementById("btnCafeToggle");
const cafeStateHint = document.getElementById("cafeStateHint");

const mCat = document.getElementById("mCat");
const mName = document.getElementById("mName");
const mPrice = document.getElementById("mPrice");
const btnAddMenuItem = document.getElementById("btnAddItem");
const menuAdminHint = document.getElementById("menuAdminHint");
const menuAdminList = document.getElementById("menuAdminList");

let cafeOpen = true;

async function loadCafeState() {
  try {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json();
    cafeOpen = !!data.cafe_open;
    if (btnCafeToggle) {
      btnCafeToggle.textContent = cafeOpen ? "الكافيه مفتوح (اضغط للإغلاق)" : "الكافيه مغلق (اضغط للفتح)";
    }
  } catch (e) { }
}

async function toggleCafe() {
  if (!cafeStateHint) return;
  cafeStateHint.textContent = "";
  try {
    const res = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ cafe_open: !cafeOpen })
    });
    const data = await res.json();
    if (!data.ok) {
      cafeStateHint.textContent = "فشل تغيير الحالة";
      return;
    }
    await loadCafeState();
    cafeStateHint.textContent = "تم ✅";
    setTimeout(() => cafeStateHint.textContent = "", 1500);
  } catch (e) {
    cafeStateHint.textContent = "خطأ في الاتصال";
  }
}

async function loadMenuAdmin() {
  if (!menuAdminList) return;
  menuAdminList.innerHTML = "جاري التحميل...";
  try {
    const res = await api("/api/admin/menu/items");
    const data = await res.json();
    if (!data.ok) {
      menuAdminList.innerHTML = `<div class="hint">فشل تحميل المنيو</div>`;
      return;
    }
    const items = data.items || [];
    menuAdminList.innerHTML = `
      <div style="display:grid; gap:10px;">
        ${items.map(it => `
          <div style="border:1px solid rgba(255,255,255,.10); border-radius:16px; padding:10px; background: rgba(10,12,15,.35);">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; align-items:center;">
              <div style="font-weight:900;">
                <span style="color:var(--teal)">${it.tag}</span> / ${it.category} — ${it.name}
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                <label style="display:flex; gap:8px; align-items:center;">
                  <input type="checkbox" data-av="${it.id}" ${Number(it.is_active) === 1 ? "checked" : ""}>
                  متوفر
                </label>
                <input class="input" style="width:140px;" data-price="${it.id}" value="${Number(it.price || 0).toFixed(3)}" placeholder="السعر">
                <input class="input" style="width:200px;" data-img="${it.id}" value="${it.image_url || ""}" placeholder="رابط الصورة">
                <button class="btn btnPrimary" data-save="${it.id}">حفظ</button>
                <button class="btn" style="background:rgba(255,107,107,0.1); border-color:rgba(255,107,107,0.2); color:#ff6b6b;" data-delete="${it.id}">حذف</button>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;

    menuAdminList.querySelectorAll("[data-save]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-save");
        const priceInput = menuAdminList.querySelector(`[data-price="${id}"]`);
        const avInput = menuAdminList.querySelector(`[data-av="${id}"]`);
        const imgInput = menuAdminList.querySelector(`[data-img="${id}"]`);
        const price = Number(priceInput.value);
        const is_active = !!avInput.checked;
        const image_url = imgInput.value.trim() || null;

        const res2 = await api(`/api/admin/menu/items/${id}`, {
          method: "PUT",
          body: JSON.stringify({ price, is_active, image_url })
        });
        if (res2.ok) {
          menuAdminHint.textContent = "تم حفظ التعديل ✅";
          setTimeout(() => menuAdminHint.textContent = "", 1500);
        }
      });
    });

    menuAdminList.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-delete");
        if (!confirm("هل أنت متأكد من حذف هذا الصنف نهائياً؟")) return;
        const res2 = await api(`/api/admin/menu/items/${id}`, { method: "DELETE" });
        if (res2.ok) {
          menuAdminHint.textContent = "تم الحذف بنجاح ✅";
          setTimeout(() => menuAdminHint.textContent = "", 1500);
          loadMenuAdmin();
        }
      });
    });
  } catch (e) {
    menuAdminList.innerHTML = `<div class="hint">تعذر الاتصال بالسيرفر.</div>`;
  }
}

async function addMenuItem() {
  menuAdminHint.textContent = "";
  const category = (mCat?.value || "").trim();
  const name = (mName?.value || "").trim();
  const price = Number(mPrice?.value);

  if (!category || !name) {
    menuAdminHint.textContent = "أدخل التصنيف + اسم المنتج";
    return;
  }
  if (!(price > 0)) {
    menuAdminHint.textContent = "أدخل سعر صحيح";
    return;
  }

  // تحديد القسم تلقائياً بناءً على التصنيف لتبسيط العملية
  const drinksCategories = ["مشروبات", "Drinks", "عصائر", "قهوة", "شاي", "بارد", "حار"];
  const tag = drinksCategories.some(c => category.includes(c)) ? "المشروبات" : "الحلويات";
  const image_url = (document.getElementById("mImg")?.value || "").trim();

  try {
    const res = await api("/api/admin/menu/items", {
      method: "POST",
      body: JSON.stringify({ tag, category, name, price, sort_order: 0, image_url: image_url || null })
    });
    const data = await res.json();
    if (!data.ok) {
      menuAdminHint.textContent = "فشل إضافة المنتج";
      return;
    }

    mName.value = "";
    mPrice.value = "";
    mCat.value = "";
    const mImgInput = document.getElementById("mImg");
    if (mImgInput) mImgInput.value = "";
    menuAdminHint.textContent = "تمت الإضافة ✅";
    setTimeout(() => menuAdminHint.textContent = "", 1500);
    await loadMenuAdmin();
  } catch (e) {
    menuAdminHint.textContent = "خطأ في الاتصال";
  }
}

btnCafeToggle?.addEventListener("click", toggleCafe);
btnAddMenuItem?.addEventListener("click", addMenuItem);

if (btnCafeToggle && menuAdminList) {
  loadCafeState();
  loadMenuAdmin();
}
// ===== Real-time Updates (Socket.io) =====
const socket = typeof io !== 'undefined' ? io() : null;
const orderSound = document.getElementById("orderSound");
const btnTestSound = document.getElementById("btnTestSound");
const orderPopup = document.getElementById("orderPopup");
const btnStopSound = document.getElementById("btnStopSound");

let soundTimer = null;

function playOrderSound() {
  if (orderSound) {
    orderSound.currentTime = 0;
    orderSound.play().then(() => {
      console.log("Sound playing...");
      if (soundTimer) clearTimeout(soundTimer);
      // التوقف بعد 20 ثانية إذا لم يتم إيقافه يدوياً
      soundTimer = setTimeout(() => {
        stopOrderSound();
      }, 20000);
    }).catch(e => {
      console.log("Sound play blocked by browser. Click anywhere to enable.", e);
      toast("يرجى الضغط على أي مكان في الصفحة لتفعيل الصوت 🔇");
    });
  }
}

function stopOrderSound() {
  if (orderSound) {
    orderSound.pause();
    orderSound.currentTime = 0;
  }
  if (soundTimer) clearTimeout(soundTimer);
  orderPopup?.classList.remove("show");
}

if (btnStopSound) {
  btnStopSound.addEventListener("click", stopOrderSound);
}

if (btnTestSound) {
  btnTestSound.addEventListener("click", () => {
    toast("جاري تجربة الجرس... 🔔");
    playOrderSound();
    orderPopup?.classList.add("show");
  });
}

if (socket) {
  console.log("Socket.io connected");
  socket.on("new_order", () => {
    console.log("New order event received via socket!");
    render();
    playOrderSound();
    orderPopup?.classList.add("show");
    toast("وصل طلب جديد! 🔔");
  });
} else {
  console.log("Socket.io not supported or not loaded");
}
