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
  const rng = seededRng(seed == null ? Date.now() % 100000 : seed);
  const pool = recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget));
  if (pool.length === 0) return { days: [], error: "No meals match those preferences. Try widening the diet or budget." };
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
  const rng = seededRng((seed == null ? 0 : seed) + dayIndex * 97 + 13);
  const onPlan = new Set(plan.days.map(d => d.meal.id));
  const pool = recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget) && !onPlan.has(m.id));
  const source = pool.length ? pool : recipeBank.filter(m => fitsDiet(m, diet) && fitsBudget(m, budget));
  if (!source.length) return plan;
  const next = source[Math.floor(rng() * source.length)];
  const days = plan.days.map((d, i) => i === dayIndex ? { day: d.day, meal: next } : d);
  return { days };
}

// Combine ingredient lists across the week into a grocery list.
function aggregateGroceries(plan) {
  const map = new Map();
  plan.days.forEach(d => {
    d.meal.ingredients.forEach(ing => {
      const key = (ing.name + "|" + ing.unit).toLowerCase();
      if (!map.has(key)) {
        map.set(key, { name: ing.name, unit: ing.unit, qty: 0, estCost: 0, checked: false });
      }
      const e = map.get(key);
      e.qty += ing.qty;
      e.estCost += ing.qty * (ing.pricePerUnit || 0);
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function roundQty(q) { return Math.round(q * 10) / 10; }

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
    const est = ctx.plan.days.reduce((s, d) => s + (d.meal.costPerServing || 0) * (ctx.people || 4), 0);
    out.push("This week's dinners should run about " + fmtMoney(est) + " for a family of " + (ctx.people || 4) + " — roughly " + fmtMoney(est / 7) + " a night.");
  }
  if (ctx && ctx.choresUnassigned > 0) {
    out.push("You've got " + ctx.choresUnassigned + " chore" + (ctx.choresUnassigned === 1 ? "" : "s") + " with nobody assigned. Fair rotations keep the peace — add them on the Chores tab.");
  }
  if (!out.length) out.push("All quiet. Add a bill or plan a week of meals and I'll keep an eye on things.");
  return out;
}

const api = { store, DIETS, BUDGETS, DAYS, generateMealPlan, swapMeal, aggregateGroceries,
              roundQty, billNudge, fmtMoney, choreRotation, suggestInsights, fitsDiet, fitsBudget, seededRng };

// browser global
if (typeof window !== "undefined") window.NestLife = api;
// node
if (typeof module !== "undefined" && module.exports) module.exports = api;

})();
