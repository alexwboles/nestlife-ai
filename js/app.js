// NestLife AI — UI layer. Reads/writes logic via window.NestLife (localStorage backed).
(function () {
"use strict";
const NL = window.NestLife;
const R = window.NestLifeRecipes;
const $ = (s) => document.querySelector(s);

function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

function setTab(name) {
  document.querySelectorAll("nav.tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll("section.tab").forEach(s => s.hidden = s.dataset.tab !== name);
}

/* ---------- Insights (home) ---------- */
function renderInsights() {
  const bills = NL.store.get("bills", []);
  const plan = NL.store.get("plan", null);
  const members = NL.store.get("members", []);
  const chores = NL.store.get("chores", []);
  const insights = NL.suggestInsights({
    bills,
    plan,
    people: NL.store.get("prefs", {}).people || 4,
    choresUnassigned: chores.length && !members.length ? chores.length : 0
  });
  const tone = (t) => /bill/i.test(t) ? "urgent" : /chore/i.test(t) ? "warn" : "calm";
  $("#insights").innerHTML = insights.map(i =>
    `<div class="insight ${tone(i)}"><span class="dot" aria-hidden="true"></span><div>${esc(i)}</div></div>`).join("");
}

/* ---------- Meals ---------- */
function renderPrefs() {
  const p = NL.store.get("prefs", { diet: "any", budget: "medium", people: 4 });
  $("#diet").value = p.diet || "any";
  $("#budget").value = p.budget || "medium";
  $("#people").value = p.people || 4;
}

function renderPlan() {
  const plan = NL.store.get("plan", null);
  const box = $("#plan");
  if (!plan || !plan.days || !plan.days.length) {
    box.innerHTML = `<p class="empty">No plan yet — pick your preferences above and hit "Plan my week".</p>`;
    return;
  }
  box.innerHTML = plan.days.map((d, i) =>
    `<div class="meal-day" style="animation-delay:${Math.min(i * 40, 280)}ms">
       <div class="day">${d.day}</div>
       <div class="meal">${esc(d.meal.name)}<small>${d.meal.timeMin} min · ~${NL.fmtMoney(d.meal.costPerServing)}/serving</small></div>
       <button class="ghost" data-swap="${i}">Swap</button>
     </div>`
  ).join("");
  box.querySelectorAll("[data-swap]").forEach(b => b.addEventListener("click", () => {
    const plan = NL.store.get("plan");
    const prefs = NL.store.get("prefs", {});
    const updated = NL.swapMeal(plan, parseInt(b.dataset.swap, 10), prefs, R, Date.now() % 100000);
    NL.store.set("plan", updated);
    renderPlan(); renderGroceries(); renderInsights();
  }));
}

function planWeek() {
  const prefs = { diet: $("#diet").value, budget: $("#budget").value, people: parseInt($("#people").value, 10) || 4 };
  NL.store.set("prefs", prefs);
  const plan = NL.generateMealPlan(prefs, R);
  if (plan.error) { $("#plan").innerHTML = `<p class="empty">${esc(plan.error)}</p>`; return; }
  NL.store.set("plan", plan);
  NL.store.set("groceryChecked", {});
  renderPlan(); renderGroceries(); renderInsights();
}

/* ---------- Groceries ---------- */
function renderGroceries() {
  const plan = NL.store.get("plan", null);
  const checked = NL.store.get("groceryChecked", {});
  const box = $("#groceries");
  if (!plan || !plan.days || !plan.days.length) {
    box.innerHTML = `<p class="empty">Your grocery list appears here once you plan a week of meals.</p>`;
    return;
  }
  const list = NL.aggregateGroceries(plan);
  const total = list.reduce((s, i) => s + i.estCost, 0);
  $("#groceryTotal").textContent = `${list.length} items · built from your meal plan`;
  box.innerHTML = box.innerHTML + `<div class="receipt-total"><span>Estimated total</span><span>${NL.fmtMoney(total)}</span></div>`;
  box.innerHTML = list.map((g, i) => {
    const key = (g.name + "|" + g.unit).toLowerCase();
    const isChecked = !!checked[key];
    return `<label class="grocery-item${isChecked ? " checked" : ""}">
      <input type="checkbox" data-g="${esc(key)}"${isChecked ? " checked" : ""}>
      <span class="gname">${esc(g.name)}</span>
      <span class="gqty">${NL.roundQty(g.qty)} ${esc(g.unit)} · ${NL.fmtMoney(g.estCost)}</span>
    </label>`;
  }).join("");
  box.querySelectorAll("[data-g]").forEach(c => c.addEventListener("change", () => {
    const ck = NL.store.get("groceryChecked", {});
    if (c.checked) ck[c.dataset.g] = true; else delete ck[c.dataset.g];
    NL.store.set("groceryChecked", ck);
    c.closest(".grocery-item").classList.toggle("checked", c.checked);
  }));
}

/* ---------- Bills ---------- */
function renderBills() {
  const bills = NL.store.get("bills", []);
  const box = $("#bills");
  if (!bills.length) { box.innerHTML = `<p class="empty">No bills yet. Add one below and I'll remind you before it's due.</p>`; return; }
  const sorted = bills.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  box.innerHTML = sorted.map((b, idx) => {
    const nudge = NL.billNudge(b);
    const today = new Date(); const due = new Date(b.dueDate + "T12:00:00");
    const diff = Math.round((due - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
    const cls = diff < 0 ? "over" : diff <= 3 ? "soon" : "ok";
    const pill = diff < 0 ? `<span class="pill over">overdue</span>` : diff <= 3 ? `<span class="pill soon">soon</span>` : `<span class="pill ok">ok</span>`;
    return `<div class="bill" style="animation-delay:${Math.min(idx * 40, 240)}ms">
      <div class="nudge">${esc(nudge)}${pill}</div>
      <div class="meta">${NL.fmtMoney(b.amount)} · due ${esc(b.dueDate)}</div>
      <button class="ghost danger" data-delbill="${b.id}">mark paid / remove</button>
    </div>`;
  }).join("");
  box.querySelectorAll("[data-delbill]").forEach(btn => btn.addEventListener("click", () => {
    NL.store.set("bills", NL.store.get("bills", []).filter(b => b.id !== btn.dataset.delbill));
    renderBills(); renderInsights();
  }));
}

function addBill() {
  const name = $("#billName").value.trim();
  const amount = parseFloat($("#billAmount").value);
  const dueDate = $("#billDue").value;
  if (!name || !dueDate || isNaN(amount)) { alert("Please fill in the bill name, amount, and due date."); return; }
  const bills = NL.store.get("bills", []);
  bills.push({ id: "b" + Date.now(), name, amount, dueDate });
  NL.store.set("bills", bills);
  $("#billName").value = ""; $("#billAmount").value = ""; $("#billDue").value = "";
  renderBills(); renderInsights();
}

/* ---------- Chores ---------- */
function renderFamily() {
  const members = NL.store.get("members", []);
  $("#memberList").textContent = members.length ? members.join(", ") : "Nobody yet";
}

function renderChores() {
  const chores = NL.store.get("chores", []);
  const box = $("#choreList");
  if (!chores.length) { box.innerHTML = `<p class="empty">No chores yet — add a few below and I'll rotate them fairly.</p>`; return; }
  box.innerHTML = chores.map(c =>
    `<div class="chore-row"><span>${esc(c)}</span><button class="ghost danger" data-delchore="${esc(c)}">remove</button></div>`
  ).join("");
  box.querySelectorAll("[data-delchore]").forEach(btn => btn.addEventListener("click", () => {
    NL.store.set("chores", NL.store.get("chores", []).filter(c => c !== btn.dataset.delchore));
    renderChores(); renderRotation(); renderInsights();
  }));
}

function renderRotation() {
  const members = NL.store.get("members", []);
  const chores = NL.store.get("chores", []);
  const week = NL.store.get("choreWeek", 0);
  const box = $("#rotation");
  if (!members.length || !chores.length) {
    box.innerHTML = `<p class="empty">Add family members and chores to see this week's fair rotation.</p>`;
    return;
  }
  const colorFor = (name) => `var(--m${(members.indexOf(name) % 6 + 6) % 6 + 1})`;
  const rows = NL.choreRotation(members, chores, week);
  box.innerHTML = `<p class="sub">Week ${week + 1} rotation — it shifts automatically so nobody's stuck with the same chore.</p>` +
    `<div class="chore-board">` + rows.map((r, i) => {
      const col = colorFor(r.member);
      return `<div class="chore-card" style="--mc:${col};animation-delay:${Math.min(i * 40, 240)}ms">
        <div class="chore-name">${esc(r.chore)}</div>
        <div class="who"><span class="member-dot" style="--mc:${col}">${esc(r.member.charAt(0).toUpperCase())}</span>${esc(r.member)}</div>
      </div>`;
    }).join("") + `</div>`;
}

/* ---------- helpers ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("nav.tabs button").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#planBtn").addEventListener("click", planWeek);
  $("#billBtn").addEventListener("click", addBill);
  $("#memberBtn").addEventListener("click", () => {
    const v = $("#memberName").value.trim(); if (!v) return;
    const m = NL.store.get("members", []); m.push(v); NL.store.set("members", m);
    $("#memberName").value = ""; renderFamily(); renderRotation(); renderInsights();
  });
  $("#choreBtn").addEventListener("click", () => {
    const v = $("#choreName").value.trim(); if (!v) return;
    const c = NL.store.get("chores", []); c.push(v); NL.store.set("chores", c);
    $("#choreName").value = ""; renderChores(); renderRotation(); renderInsights();
  });
  $("#nextWeekBtn").addEventListener("click", () => {
    NL.store.set("choreWeek", NL.store.get("choreWeek", 0) + 1);
    renderRotation();
  });
  $("#resetBtn").addEventListener("click", () => {
    if (confirm("Clear all NestLife data on this device?")) {
      ["prefs","plan","groceryChecked","bills","members","chores","choreWeek"].forEach(k => NL.store.del(k));
      location.reload();
    }
  });
  renderPrefs(); renderPlan(); renderGroceries(); renderBills(); renderFamily(); renderChores(); renderRotation(); renderInsights();
  setTab("home");
});
})();
