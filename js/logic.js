// NestLife AI — pure logic layer (browser + node compatible).
// All state lives in localStorage; no network calls.
(function () {
"use strict";

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem("nestlife:" + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("nestlife:" + key, JSON.stringify(value)); } catch (e) {}
  },
  del(key) { try { localStorage.removeItem("nestlife:" + key); } catch (e) {} }
};

const DIETS = ["any", "vegetarian", "vegan", "gluten-free"];
const BUDGETS = ["low", "medium", "high"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function fitsDiet(meal, diet) {
  if (!diet || diet === "any") return true;
  return meal.diets.indexOf(diet) !== -1;
}

function fitsBudget(meal, budget) {
  if (!budget || budget === "medium") return true;
  if (budget === "low") return meal.costPerServing <= 2.5;
  if (budget === "high") return true;
  return true;
}

// Quick-cook filter: only meals within maxTime minutes (0 = no limit).
function fitsTime(meal, maxTime) {
  if (!maxTime || maxTime <= 0) return true;
  return (meal.timeMin || 0) <= maxTime;
}

function isoDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function seededRng(seed) {
  // mulberry32
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick 7 distinct meals matching prefs (allows repeats only if bank exhausted).
function generateMealPlan(prefs, recipeBank, seed) {
  prefs = prefs || {};
  const diet = prefs.diet || "any";
  const budget = prefs.budget || "medium";
  const maxTime = prefs.maxTime || 0;
  const excluded = new Set(prefs.excluded || []);
  const rng = seededRng(seed == null ? Date.now() % 100000 : seed);
  const pool = recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget) && fitsTime(m, maxTime) && !excluded.has(m.id));
  if (pool.length === 0) return { days: [], error: "No meals match those preferences. Try widening the diet, budget, or cook-time filter." };
  const chosen = [];
  const used = new Set();
  for (let i = 0; i < 7; i++) {
    let cand;
    if (used.size < pool.length) {
      do { cand = pool[Math.floor(rng() * pool.length)]; } while (used.has(cand.id));
    } else {
      cand = pool[Math.floor(rng() * pool.length)];
    }
    used.add(cand.id);
    chosen.push(cand);
  }
  return { days: DAYS.map((d, i) => ({ day: d, meal: chosen[i] })), error: null };
}

// Replace one day's meal with another matching prefs that isn't already on the plan.
function swapMeal(plan, dayIndex, prefs, recipeBank, seed) {
  const diet = (prefs || {}).diet || "any";
  const budget = (prefs || {}).budget || "medium";
  const maxTime = (prefs || {}).maxTime || 0;
  const excluded = new Set((prefs || {}).excluded || []);
  const rng = seededRng((seed == null ? 0 : seed) + dayIndex * 97 + 13);
  const onPlan = new Set(plan.days.map(d => d.meal.id));
  const pool = recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget) && fitsTime(m, maxTime) && !onPlan.has(m.id) && !excluded.has(m.id));
  const source = pool.length ? pool : recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget) && fitsTime(m, maxTime) && !excluded.has(m.id));
  if (!source.length) return plan;
  const next = source[Math.floor(rng() * source.length)];
  const days = plan.days.map((d, i) => i === dayIndex ? { day: d.day, meal: next } : d);
  return { days };
}

// Pin a specific meal to a day of the week (survives re-plans via the app's pinned map).
function pinMeal(plan, dayIndex, mealId, recipeBank) {
  const meal = (recipeBank || []).find(m => m.id === mealId);
  if (!meal || !plan || !plan.days || !plan.days[dayIndex]) return plan;
  return { days: plan.days.map((d, i) => i === dayIndex ? { day: d.day, meal } : d) };
}

// Combine ingredient lists across the week into a grocery list.
// Days marked `off` (night off / eating out) contribute nothing.
function aggregateGroceries(plan) {
  const map = new Map();
  (plan.days || []).forEach(d => {
    if (d.off) return;
    (d.meal.ingredients || []).forEach(ing => {
      const key = (ing.name + "|" + ing.unit).toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: ing.name, unit: ing.unit, qty: 0, estCost: 0, checked: false, aisle: aisleFor(ing.name) });
      }
      const e = map.get(key);
      e.qty += ing.qty;
      e.estCost += ing.qty * (ing.pricePerUnit || 0);
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function roundQty(q) { return Math.round(q * 10) / 10; }

// ---------- Grocery aisles ----------
// Store-section grouping so the list is shoppable in aisle order.
const AISLES = ["Produce", "Dairy & eggs", "Meat & seafood", "Bakery", "Frozen", "Pantry", "Household", "Other"];

const AISLE_KEYWORDS = [
  ["Produce", ["apple", "banana", "orange", "lemon", "lime", "tomato", "lettuce", "salad", "onion", "garlic",
    "potato", "carrot", "pepper", "cucumber", "spinach", "kale", "broccoli", "cauliflower", "mushroom", "avocado",
    "berry", "berries", "strawberry", "blueberry", "grape", "melon", "peach", "pear", "plum", "cherry",
    "herb", "basil", "cilantro", "parsley", "ginger", "cabbage", "celery", "zucchini", "squash", "corn",
    "asparagus", "green bean", "pea ", "bean sprout", "lime juice", "lemon juice"]],
  ["Dairy & eggs", ["milk", "cheese", "butter", "yogurt", "cream", "sour cream", "cottage cheese", "parmesan",
    "mozzarella", "cheddar", "feta", "ricotta", "egg", "kefir", "buttermilk", "half-and-half", "whipped"]],
  ["Meat & seafood", ["chicken", "beef", "pork", "turkey", "bacon", "sausage", "salmon", "tuna", "shrimp", "fish",
    "cod", "tilapia", "steak", "ham", "ground meat", "ground turkey", "ground beef", "pork chop", "meatball",
    "pepperoni", "tofu", "tempeh", "duck", "lamb"]],
  ["Bakery", ["bread", "bun", "roll", "tortilla", "bagel", "pita", "croissant", "muffin", "english muffin",
    "pizza dough", "pie crust", "baguette", "ciabatta"]],
  ["Frozen", ["frozen", "ice cream", "popsicle"]],
  ["Household", ["paper towel", "napkin", "tissue", "soap", "detergent", "cleaner", "sponge", "trash bag",
    "foil", "plastic wrap", "parchment", "ziploc", "bag"]]
];

function aisleFor(name) {
  const n = String(name || "").toLowerCase();
  for (const [aisle, words] of AISLE_KEYWORDS) {
    for (const w of words) {
      if (n.indexOf(w) !== -1) return aisle;
    }
  }
  // pantry staples default to Pantry; anything truly unknown goes to Other
  if (/rice|pasta|flour|sugar|salt|oil|vinegar|sauce|spice|seasoning|canned|can of|bean|lentil|oat|cereal|honey|syrup|stock|broth|noodle|quinoa|couscous|nut|seed|chocolate|cocoa|coffee|tea|jam|peanut butter|ketchup|mustard|mayo|salsa/.test(n)) return "Pantry";
  return "Other";
}

// Group a grocery list (from aggregateGroceries) into aisle sections, in store order.
function groupGroceriesByAisle(list) {
  const buckets = {};
  AISLES.forEach(a => { buckets[a] = []; });
  (list || []).forEach(g => {
    const a = aisleFor(g.name);
    buckets[a].push(g);
  });
  return AISLES.filter(a => buckets[a].length).map(a => ({ aisle: a, items: buckets[a] }));
}

// ---------- Bill spending forecast ----------
// Total due within `days` from `now` (includes overdue bills — they're due now too).
function upcomingBillTotal(bills, days, now) {
  now = now || new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let total = 0, count = 0;
  (bills || []).forEach(b => {
    const due = new Date(b.dueDate + "T12:00:00");
    if (isNaN(due.getTime())) return;
    const diff = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - today) / 86400000);
    if (diff <= days) { total += Number(b.amount) || 0; count++; }
  });
  return { total: Math.round(total * 100) / 100, count, days };
}

// Rough monthly burn of recurring bills (weekly -> *52/12, yearly -> /12). One-time bills ignored.
function monthlyRecurringTotal(bills) {
  let total = 0;
  (bills || []).forEach(b => {
    const a = Number(b.amount) || 0;
    if (b.recurring === "weekly") total += a * 52 / 12;
    else if (b.recurring === "yearly") total += a / 12;
    else if (b.recurring === "monthly") total += a;
  });
  return Math.round(total * 100) / 100;
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Grocery list -> CSV for sharing / importing elsewhere.
function groceriesToCSV(list) {
  const rows = [["Item", "Quantity", "Unit", "Est. cost ($)", "Aisle"]];
  (list || []).forEach(g => {
    rows.push([g.name, roundQty(g.qty), g.unit, Number(g.estCost).toFixed(2), g.aisle || aisleFor(g.name)]);
  });
  return rows.map(r => r.map(csvCell).join(",")).join("\n");
}

// Plain-language nudge for a bill. now is a Date; bill has {name, dueDate: 'YYYY-MM-DD', amount}.
function billNudge(bill, now) {
  now = now || new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(bill.dueDate + "T12:00:00");
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((dueDay - today) / 86400000);
  if (diff < 0) return bill.name + " is " + Math.abs(diff) + " day" + (Math.abs(diff) === 1 ? "" : "s") + " overdue — pay it today to dodge late fees.";
  if (diff === 0) return bill.name + " is due TODAY (" + fmtMoney(bill.amount) + ").";
  if (diff === 1) return bill.name + " is due tomorrow (" + fmtMoney(bill.amount) + ").";
  if (diff <= 7) return bill.name + " is due in " + diff + " days (" + fmtMoney(bill.amount) + ").";
  return bill.name + " is due on " + bill.dueDate + " — " + diff + " days away.";
}

function fmtMoney(n) { return "$" + Number(n).toFixed(2); }

// Advance a recurring bill's due date by one cycle. Returns the updated bill.
function advanceBill(bill, cycle) {
  const c = cycle || bill.recurring || "monthly";
  const d = new Date(bill.dueDate + "T12:00:00");
  if (isNaN(d.getTime())) return bill;
  if (c === "weekly") d.setDate(d.getDate() + 7);
  else if (c === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // monthly default
  return Object.assign({}, bill, { dueDate: isoDate(d) });
}

function billCycleLabel(bill) {
  return bill.recurring ? "every " + bill.recurring.replace("ly", "") + (bill.recurring === "monthly" ? " month" : bill.recurring === "weekly" ? " week" : " year") : "one-time";
}

// Fair weekly rotation: chores dealt round-robin to members, offset shifts each week.
function choreRotation(members, chores, weekNumber) {
  if (!members.length || !chores.length) return [];
  const week = Math.max(0, weekNumber || 0);
  const result = chores.map((chore, i) => ({
    chore: chore,
    member: members[(i + week) % members.length]
  }));
  return result;
}

// Chore completion tracking: who actually did what this week.
function logChoreDone(completions, member, chore, week) {
  const next = (completions || []).slice();
  next.push({ member, chore, week: Math.max(0, week || 0), at: new Date().toISOString() });
  return next;
}

// Per-member completion counts for a given week.
function choreScores(completions, week) {
  const scores = {};
  (completions || []).forEach(c => {
    if (c.week === week) scores[c.member] = (scores[c.member] || 0) + 1;
  });
  return scores;
}

// Plain-language fairness note from this week's completion counts.
function fairnessNote(scores, members) {
  const names = (members || []).filter(Boolean);
  if (!names.length) return "";
  const counts = names.map(n => (scores || {})[n] || 0);
  const max = Math.max.apply(null, counts), min = Math.min.apply(null, counts);
  if (max === 0) return "Nobody's logged a chore yet this week — first one in sets the bar.";
  if (max === min) return "Perfectly balanced so far — " + names.join(", ") + " " + (names.length === 1 ? "has" : "have each") + " logged " + max + ".";
  const low = names.filter(n => ((scores || {})[n] || 0) === min);
  const high = names.filter(n => ((scores || {})[n] || 0) === max);
  return high.join(", ") + " " + (high.length === 1 ? "has" : "have") + " done " + max + " — " + low.join(", ") + " " + (low.length === 1 ? "has" : "have") + " only " + min + ". Time to rebalance.";
}

// ---------- Pantry: "already have it" ----------
// owned is a map of lowercase item name -> true (things already in the pantry).
// Owned items stay visible but drop out of the "to buy" estimated total.
function ownedKey(name) { return String(name || "").trim().toLowerCase(); }

function toBuyTotal(list, owned) {
  let total = 0;
  (list || []).forEach(g => {
    if (owned && owned[ownedKey(g.name)]) return;
    total += Number(g.estCost) || 0;
  });
  return Math.round(total * 100) / 100;
}

function toggleOwned(owned, name) {
  const next = Object.assign({}, owned || {});
  const k = ownedKey(name);
  if (next[k]) delete next[k];
  else next[k] = true;
  return next;
}

// ---------- Paid-bill history ----------
// When a bill is marked paid, log it so the family can see money already out.
function logBillPaid(history, bill, now) {
  const next = (history || []).slice();
  next.push({
    name: bill.name,
    amount: Number(bill.amount) || 0,
    recurring: bill.recurring || null,
    paidAt: (now || new Date()).toISOString().slice(0, 10)
  });
  return next.slice(-100); // keep the log bounded
}

// Total + count of bills paid in the calendar month containing `now`.
function paidThisMonth(history, now) {
  now = now || new Date();
  const ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  let total = 0, count = 0;
  (history || []).forEach(h => {
    if (String(h.paidAt || "").slice(0, 7) === ym) { total += Number(h.amount) || 0; count++; }
  });
  return { total: Math.round(total * 100) / 100, count };
}

// ---------- Meal variety guard ----------
// Remember which meals were served each week so re-plans can skip last week's.
// history: [{ at: 'YYYY-MM-DD', mealIds: [...] }], newest last.
function recordServedWeek(history, mealIds, now) {
  const next = (history || []).slice();
  const at = isoDate(now || new Date());
  const ids = (mealIds || []).filter(Boolean);
  const last = next[next.length - 1];
  if (last && last.at === at) last.mealIds = ids;
  else next.push({ at, mealIds: ids });
  return next.slice(-12); // keep ~3 months
}

// Ids served in the most recent `weeksBack` recorded weeks.
function recentMealIds(history, weeksBack) {
  const n = Math.max(0, weeksBack || 0);
  if (!n) return [];
  const ids = new Set();
  (history || []).slice(-n).forEach(h => (h.mealIds || []).forEach(id => ids.add(id)));
  return Array.from(ids);
}

// AI-ish suggestions: local heuristics + template library.
function suggestInsights(ctx) {
  const out = [];
  if (ctx && ctx.bills) {
    const urgent = ctx.bills.filter(b => {
      const today = new Date();
      const due = new Date(b.dueDate + "T12:00:00");
      return (due - today) / 86400000 <= 3;
    });
    if (urgent.length) out.push("Heads up: " + urgent.length + " bill" + (urgent.length === 1 ? " is" : "s are") + " due within 3 days. Knock those out before the weekend.");
  }
  if (ctx && ctx.plan && ctx.plan.days && ctx.plan.days.length === 7) {
    const onDays = ctx.plan.days.filter(d => !d.off);
    if (onDays.length) {
      const est = onDays.reduce((s, d) => s + (d.meal.costPerServing || 0) * (ctx.people || 4), 0);
      const offN = 7 - onDays.length;
      out.push("This week's dinners should run about " + fmtMoney(est) + " for a family of " + (ctx.people || 4) +
        " — roughly " + fmtMoney(est / 7) + " a night" + (offN ? " (" + offN + " night" + (offN === 1 ? "" : "s") + " off)" : "") + ".");
    }
  }
  if (ctx && ctx.bills && ctx.bills.length) {
    const upcoming = upcomingBillTotal(ctx.bills, 7, ctx.now);
    if (upcoming.count) {
      out.push("Money out the door: " + fmtMoney(upcoming.total) + " due in the next 7 days across " +
        upcoming.count + " bill" + (upcoming.count === 1 ? "" : "s") + " — make sure it's covered.");
    }
    const monthly = monthlyRecurringTotal(ctx.bills);
    if (monthly > 0) out.push("Your recurring bills run about " + fmtMoney(monthly) + " a month.");
  }
  if (ctx && ctx.paidMonth && ctx.paidMonth.count) {
    out.push("Paid " + fmtMoney(ctx.paidMonth.total) + " in bills so far this month (" +
      ctx.paidMonth.count + " bill" + (ctx.paidMonth.count === 1 ? "" : "s") + ") — money already out the door.");
  }
  if (ctx && ctx.choresUnassigned > 0) {
    out.push("You've got " + ctx.choresUnassigned + " chore" + (ctx.choresUnassigned === 1 ? "" : "s") + " with nobody assigned. Fair rotations keep the peace — add them on the Chores tab.");
  }
  if (ctx && ctx.members && ctx.members.length && ctx.choreCompletions) {
    const note = fairnessNote(choreScores(ctx.choreCompletions, ctx.choreWeek || 0), ctx.members);
    if (note && !/Nobody's logged/.test(note)) out.push("Chore check: " + note);
  }
  if (!out.length) out.push("All quiet. Add a bill or plan a week of meals and I'll keep an eye on things.");
  return out;
}

/* ---------- Family calendar ---------- */
function addFamilyEvent(events, e) {
  const title = String((e && e.title) || "").trim();
  const date = String((e && e.date) || "");
  if (!title) throw new Error("Give the event a title.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + "T12:00:00").getTime()))
    throw new Error("Pick a valid date.");
  const out = (events || []).slice();
  out.push({ id: "e" + Date.now().toString(36) + out.length.toString(36),
             title, date, member: String((e && e.member) || "").trim() });
  return out;
}
function removeFamilyEvent(events, id) { return (events || []).filter(e => e.id !== id); }
function addDaysISO(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function upcomingEvents(events, days, todayStr) {
  const n = Math.max(1, parseInt(days, 10) || 14);
  const end = addDaysISO(todayStr, n);
  const now = new Date(todayStr + "T12:00:00").getTime();
  return (events || [])
    .filter(e => e.date >= todayStr && e.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
    .map(e => Object.assign({}, e, {
      daysOut: Math.round((new Date(e.date + "T12:00:00").getTime() - now) / 86400000)
    }));
}

const api = { store, DIETS, BUDGETS, DAYS, generateMealPlan, swapMeal, pinMeal, aggregateGroceries,
              roundQty, billNudge, fmtMoney, advanceBill, billCycleLabel, groceriesToCSV,
              choreRotation, logChoreDone, choreScores, fairnessNote,
              suggestInsights, fitsDiet, fitsBudget, fitsTime, seededRng,
              AISLES, aisleFor, groupGroceriesByAisle,
              upcomingBillTotal, monthlyRecurringTotal,
              ownedKey, toBuyTotal, toggleOwned,
              logBillPaid, paidThisMonth,
              recordServedWeek, recentMealIds,
              addFamilyEvent, removeFamilyEvent, upcomingEvents };

// browser global
if (typeof window !== "undefined") window.NestLife = api;
// node
if (typeof module !== "undefined" && module.exports) module.exports = api;

})();
