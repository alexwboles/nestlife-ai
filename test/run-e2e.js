// E2E flows for NestLife AI. Run with: node test/run-e2e.js
"use strict";
const assert = require("assert");
const NL = require("../js/logic.js");
const R = require("../js/recipes.js");

let passed = 0;
function flow(name, fn) {
  try { fn(); passed++; console.log("PASS: " + name); }
  catch (e) { console.error("FAIL: " + name + " — " + e.message); process.exitCode = 1; }
}

// Flow 1: vegetarian family plans a week, swaps a meal they dislike
flow("meal plan + swap flow", () => {
  const plan = NL.generateMealPlan({ diet: "vegetarian", budget: "medium", people: 4 }, R, 123);
  assert.strictEqual(plan.days.length, 7, "7 days expected");
  assert.strictEqual(plan.error, null, "no error expected");
  plan.days.forEach(d => assert.ok(d.meal.diets.includes("vegetarian"), d.meal.name + " not vegetarian"));
  const before = plan.days[2].meal.id;
  const swapped = NL.swapMeal(plan, 2, { diet: "vegetarian" }, R, 123);
  assert.notStrictEqual(swapped.days[2].meal.id, before, "swap should change Wednesday's meal");
  assert.strictEqual(new Set(swapped.days.map(d => d.meal.id)).size, 7, "no duplicate after swap");
});

// Flow 2: grocery list built from plan, items checked off (simulating store run)
flow("grocery list + check-off flow", () => {
  const plan = NL.generateMealPlan({ diet: "any" }, R, 9);
  const list = NL.aggregateGroceries(plan);
  assert.ok(list.length > 10, "list should be substantial, got " + list.length);
  const total = list.reduce((s, i) => s + i.estCost, 0);
  assert.ok(total > 20 && total < 400, "weekly estimate " + total + " out of sane range");
  // simulate checking off half the list (like the UI does with groceryChecked)
  const checked = {};
  list.slice(0, Math.floor(list.length / 2)).forEach(g => { checked[(g.name + "|" + g.unit).toLowerCase()] = true; });
  const remaining = list.filter(g => !checked[(g.name + "|" + g.unit).toLowerCase()]);
  assert.strictEqual(remaining.length, list.length - Object.keys(checked).length, "checked items excluded");
});

// Flow 3: bills added and nudges escalate as due dates approach
flow("bill reminders escalation flow", () => {
  const now = new Date("2026-09-27T12:00:00");
  const bills = [
    { name: "Rent", dueDate: "2026-10-01", amount: 1500 },
    { name: "Electric", dueDate: "2026-09-27", amount: 85.5 },
    { name: "Internet", dueDate: "2026-09-15", amount: 60 }
  ];
  const nudges = bills.map(b => NL.billNudge(b, now));
  assert.ok(/due in 4 days/.test(nudges[0]), "rent nudge: " + nudges[0]);
  assert.ok(/due TODAY/.test(nudges[1]), "electric nudge: " + nudges[1]);
  assert.ok(/12 days overdue/.test(nudges[2]), "internet nudge: " + nudges[2]);
});

// Flow 4: chore rotation over 4 weeks — every member gets every chore eventually, counts stay balanced
flow("chore rotation fairness over 4 weeks", () => {
  const members = ["Sam", "Jordan", "Riley"];
  const chores = ["dishes", "trash", "vacuum"];
  const counts = {};
  for (let w = 0; w < 6; w++) {
    NL.choreRotation(members, chores, w).forEach(r => {
      counts[r.member + ":" + r.chore] = (counts[r.member + ":" + r.chore] || 0) + 1;
    });
  }
  // with 3 members / 3 chores / 6 weeks, each pair should occur exactly twice
  Object.entries(counts).forEach(([k, v]) => assert.strictEqual(v, 2, k + " assigned " + v + "x, expected 2x"));
});

// Flow 5: home insights combine bills + plan into plain-language guidance
flow("home insights flow", () => {
  const plan = NL.generateMealPlan({ diet: "any", people: 4 }, R, 55);
  const insights = NL.suggestInsights({
    bills: [{ name: "Electric", dueDate: "2026-09-29", amount: 85 }],
    plan,
    people: 4,
    choresUnassigned: 0
  });
  assert.ok(insights.length >= 2, "expected bill + cost insights");
  assert.ok(insights.some(i => /due within 3 days/.test(i)), "urgent-bill insight missing: " + insights.join(" | "));
  assert.ok(insights.some(i => /a night/.test(i)), "cost-per-night insight missing: " + insights.join(" | "));
  const empty = NL.suggestInsights({ bills: [], plan: null, people: 4, choresUnassigned: 0 });
  assert.ok(empty.length >= 1, "should always return at least one insight");
});

// Flow 6: empty states never crash
flow("empty-state resilience", () => {
  assert.deepStrictEqual(NL.choreRotation([], ["dishes"], 0), [], "no members -> no rotation");
  assert.deepStrictEqual(NL.choreRotation(["Sam"], [], 0), [], "no chores -> no rotation");
  const bad = NL.generateMealPlan({ diet: "no-such-diet" }, R, 1);
  assert.ok(bad.error, "impossible diet should return an error message, not crash");
  const emptyList = NL.aggregateGroceries({ days: [] });
  assert.deepStrictEqual(emptyList, [], "empty plan -> empty grocery list");
});

console.log("\nE2E: " + passed + " flows passed" + (process.exitCode ? " (with failures)" : ""));
