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
    choresUnassigned: chores.length && !members.length ? chores.length : 0,
    members,
    choreCompletions: NL.store.get("choreCompletions", []),
    choreWeek: NL.store.get("choreWeek", 0)
  });
  const tone = (t) => /bill/i.test(t) ? "urgent" : /chore/i.test(t) ? "warn" : "calm";
  $("#insights").innerHTML = insights.map(i =>
    `<div class="insight ${tone(i)}"><span class="dot" aria-hidden="true"></span><div>${esc(i)}</div></div>`).join("");
}

/* ---------- Meals ---------- */
function renderPrefs() {
  const p = NL.store.get("prefs", { diet: "any", budget: "medium", people: 4, maxTime: 0 });
  $("#diet").value = p.diet || "any";
  $("#budget").value = p.budget || "medium";
  $("#people").value = p.people || 4;
  $("#quickCook").checked = !!p.maxTime;
}

function renderPlan() {
  const plan = NL.store.get("plan", null);
  const box = $("#plan");
  if (!plan || !plan.days || !plan.days.length) {
    box.innerHTML = `<p class="empty">No plan yet — pick your preferences above and hit "Plan my week".</p>`;
    renderDislikeBar();
    return;
  }
  const pinned = NL.store.get("pinnedMeals", {});
  box.innerHTML = plan.days.map((d, i) =>
    `<div class="meal-day" style="animation-delay:${Math.min(i * 40, 280)}ms">
       <div class="day">${d.day}</div>
       <div class="meal">${esc(d.meal.name)}<small>${d.meal.timeMin} min · ~${NL.fmtMoney(d.meal.costPerServing)}/serving</small></div>
       <div class="row btnrow" style="margin:0;gap:.4rem">
         <button class="ghost" data-swap="${i}">Swap</button>
         <button class="ghost" data-pin="${i}" title="Keep this meal on ${d.day} every week">${pinned[i] === d.meal.id ? "Pinned ✓" : "Pin"}</button>
         <button class="ghost danger" data-dislike="${d.meal.id}" title="Never suggest this meal again">Never suggest</button>
       </div>
     </div>`
  ).join("");
  box.querySelectorAll("[data-swap]").forEach(b => b.addEventListener("click", () => {
    const plan = NL.store.get("plan");
    const prefs = currentPrefs();
    const updated = NL.swapMeal(plan, parseInt(b.dataset.swap, 10), prefs, R, Date.now() % 100000);
    NL.store.set("plan", updated);
    renderPlan(); renderGroceries(); renderInsights();
  }));
  box.querySelectorAll("[data-pin]").forEach(b => b.addEventListener("click", () => {
    const i = parseInt(b.dataset.pin, 10);
    const plan = NL.store.get("plan");
    const pinned = NL.store.get("pinnedMeals", {});
    if (pinned[i] === plan.days[i].meal.id) delete pinned[i];
    else pinned[i] = plan.days[i].meal.id;
    NL.store.set("pinnedMeals", pinned);
    renderPlan();
  }));
  box.querySelectorAll("[data-dislike]").forEach(b => b.addEventListener("click", () => {
    const id = parseInt(b.dataset.dislike, 10);
    const disliked = NL.store.get("disliked", []);
    if (!disliked.includes(id)) disliked.push(id);
    NL.store.set("disliked", disliked);
    // immediately swap the disliked meal off the plan
    const plan = NL.store.get("plan");
    const idx = plan.days.findIndex(d => d.meal.id === id);
    const updated = idx >= 0 ? NL.swapMeal(plan, idx, currentPrefs(), R, Date.now() % 100000) : plan;
    NL.store.set("plan", updated);
    renderPlan(); renderGroceries(); renderInsights();
  }));
  renderDislikeBar();
}

function renderDislikeBar() {
  const bar = $("#dislikeBar");
  if (!bar) return;
  const disliked = NL.store.get("disliked", []);
  const pinned = NL.store.get("pinnedMeals", {});
  const nPinned = Object.keys(pinned).length;
  if (!disliked.length && !nPinned) { bar.innerHTML = ""; return; }
  bar.innerHTML = (nPinned ? `<span class="pill ok">${nPinned} pinned</span> ` : "") +
    (disliked.length ? `<span class="pill soon">${disliked.length} meal${disliked.length === 1 ? "" : "s"} never suggested</span> <button class="ghost" id="clearDislikes">clear</button>` : "");
  const c = $("#clearDislikes");
  if (c) c.addEventListener("click", () => { NL.store.set("disliked", []); renderPlan(); });
}

function currentPrefs() {
  const saved = NL.store.get("prefs", {});
  return Object.assign({}, saved, {
    maxTime: $("#quickCook") && $("#quickCook").checked ? 30 : (saved.maxTime || 0),
    excluded: NL.store.get("disliked", [])
  });
}

function applyPins(plan) {
  const pinned = NL.store.get("pinnedMeals", {});
  let out = plan;
  Object.keys(pinned).forEach(k => {
    out = NL.pinMeal(out, parseInt(k, 10), pinned[k], R);
  });
  return out;
}

function planWeek() {
  const prefs = { diet: $("#diet").value, budget: $("#budget").value, people: parseInt($("#people").value, 10) || 4,
                  maxTime: $("#quickCook").checked ? 30 : 0 };
  NL.store.set("prefs", prefs);
  let plan = NL.generateMealPlan(Object.assign({}, prefs, { excluded: NL.store.get("disliked", []) }), R);
  if (plan.error) { $("#plan").innerHTML = `<p class="empty">${esc(plan.error)}</p>`; return; }
  plan = applyPins(plan);
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
  box.innerHTML = list.map((g, i) => {
    const key = (g.name + "|" + g.unit).toLowerCase();
    const isChecked = !!checked[key];
    return `<label class="grocery-item${isChecked ? " checked" : ""}">
      <input type="checkbox" data-g="${esc(key)}"${isChecked ? " checked" : ""}>
      <span class="gname">${esc(g.name)}</span>
      <span class="gqty">${NL.roundQty(g.qty)} ${esc(g.unit)} · ${NL.fmtMoney(g.estCost)}</span>
    </label>`;
  }).join("") +
  `<div class="receipt-total"><span>Estimated total</span><span>${NL.fmtMoney(total)}</span></div>`;
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
    const recur = b.recurring ? `<span class="pill ok">${esc(b.recurring)}</span>` : "";
    return `<div class="bill" style="animation-delay:${Math.min(idx * 40, 240)}ms">
      <div class="nudge">${esc(nudge)}${pill}${recur}</div>
      <div class="meta">${NL.fmtMoney(b.amount)} · due ${esc(b.dueDate)}</div>
      <button class="ghost" data-paidbill="${b.id}">Mark paid</button>
      <button class="ghost danger" data-delbill="${b.id}">remove</button>
    </div>`;
  }).join("");
  box.querySelectorAll("[data-paidbill]").forEach(btn => btn.addEventListener("click", () => {
    let bills = NL.store.get("bills", []);
    const b = bills.find(x => x.id === btn.dataset.paidbill);
    if (!b) return;
    if (b.recurring) {
      const next = NL.advanceBill(b);
      bills = bills.map(x => x.id === b.id ? next : x);
    } else {
      bills = bills.filter(x => x.id !== b.id);
    }
    NL.store.set("bills", bills);
    renderBills(); renderInsights();
  }));
  box.querySelectorAll("[data-delbill]").forEach(btn => btn.addEventListener("click", () => {
    NL.store.set("bills", NL.store.get("bills", []).filter(b => b.id !== btn.dataset.delbill));
    renderBills(); renderInsights();
  }));
}

function addBill() {
  const name = $("#billName").value.trim();
  const amount = parseFloat($("#billAmount").value);
  const dueDate = $("#billDue").value;
  const recurring = $("#billRecur").value || null;
  if (!name || !dueDate || isNaN(amount)) { alert("Please fill in the bill name, amount, and due date."); return; }
  const bills = NL.store.get("bills", []);
  bills.push({ id: "b" + Date.now(), name, amount, dueDate, recurring });
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
  const completions = NL.store.get("choreCompletions", []);
  const scores = NL.choreScores(completions, week);
  const colorFor = (name) => `var(--m${(members.indexOf(name) % 6 + 6) % 6 + 1})`;
  const rows = NL.choreRotation(members, chores, week);
  const scoreLine = members.map(m => `${esc(m)}: ${scores[m] || 0}`).join(" · ");
  box.innerHTML = `<p class="sub">Week ${week + 1} rotation — it shifts automatically so nobody's stuck with the same chore.</p>` +
    `<div class="insight calm" style="margin-bottom:.8rem"><span class="dot" aria-hidden="true"></span><div><strong>Done this week:</strong> ${scoreLine}<br>${esc(NL.fairnessNote(scores, members))}</div></div>` +
    `<div class="chore-board">` + rows.map((r, i) => {
      const col = colorFor(r.member);
      const done = completions.some(c => c.week === week && c.member === r.member && c.chore === r.chore);
      return `<div class="chore-card" style="--mc:${col};animation-delay:${Math.min(i * 40, 240)}ms">
        <div class="chore-name">${esc(r.chore)}${done ? ' <span class="pill ok">done ✓</span>' : ""}</div>
        <div class="who"><span class="member-dot" style="--mc:${col}">${esc(r.member.charAt(0).toUpperCase())}</span>${esc(r.member)}</div>
        ${done ? "" : `<button class="ghost" data-choredone="${i}" style="margin-top:.5rem">Done</button>`}
      </div>`;
    }).join("") + `</div>`;
  box.querySelectorAll("[data-choredone]").forEach(b => b.addEventListener("click", () => {
    const r = rows[parseInt(b.dataset.choredone, 10)];
    const next = NL.logChoreDone(NL.store.get("choreCompletions", []), r.member, r.chore, week);
    NL.store.set("choreCompletions", next);
    renderRotation(); renderInsights();
  }));
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
      ["prefs","plan","groceryChecked","bills","members","chores","choreWeek","disliked","pinnedMeals","choreCompletions"].forEach(k => NL.store.del(k));
      location.reload();
    }
  });
  const downloadCsv = (filename, csv) => {
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  $("#groceryCsv").addEventListener("click", () => {
    const plan = NL.store.get("plan", null);
    if (!plan || !plan.days || !plan.days.length) { alert("Plan a week of meals first."); return; }
    downloadCsv("nestlife-groceries.csv", NL.groceriesToCSV(NL.aggregateGroceries(plan)));
  });
  $("#groceryPrint").addEventListener("click", () => window.print());
  renderPrefs(); renderPlan(); renderGroceries(); renderBills(); renderFamily(); renderChores(); renderRotation(); renderInsights();
  setTab("home");
});
})();
