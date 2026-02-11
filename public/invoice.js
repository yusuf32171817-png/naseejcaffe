const money = (n) => Number(n||0).toFixed(3) + " د.ب";

function qs(k){
  return new URLSearchParams(window.location.search).get(k);
}
function fmtDate(iso){
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mo = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mo}/${yy} ${hh}:${mm}`;
}

async function load(){
  const orderId = qs("orderId");
  if(!orderId){
    alert("لا يوجد رقم طلب");
    window.location.href = "/";
    return;
  }

  const res = await fetch(`/api/orders/${orderId}`);
  const data = await res.json();
  if(!data.ok){
    alert("الطلب غير موجود");
    window.location.href = "/";
    return;
  }

  const o = data.order;
  const items = data.items || [];

  document.getElementById("invNo").textContent = o.order_no;
  document.getElementById("invDate").textContent = fmtDate(o.created_at);
  document.getElementById("invPickup").textContent = o.pickup_time;

  document.getElementById("cPhone").textContent = o.customer_phone;
  document.getElementById("cCar").textContent = o.car_no || "—";

  const tbody = document.getElementById("invItems");
  tbody.innerHTML = items.map((it, idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${it.item_name}</td>
      <td>${money(it.unit_price)}</td>
      <td>${it.qty}</td>
      <td><b>${money(it.line_total)}</b></td>
    </tr>
  `).join("");

  document.getElementById("tSub").textContent = money(o.subtotal);
  document.getElementById("tVat").textContent = `${money(o.vat_amount)} (${Math.round(o.vat_rate*100)}%)`;
  document.getElementById("tTotal").textContent = money(o.total);

  document.getElementById("invNote").textContent = o.note ? `ملاحظة: ${o.note}` : "";

  document.getElementById("btnPrint").addEventListener("click", ()=> window.print());
}

load();
