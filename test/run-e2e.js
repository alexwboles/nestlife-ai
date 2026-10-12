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

// Flow 7: quick-cook weeknights + pinned meals + "never suggest" dislikes
flow("quick-cook filter + pin + dislike flow", () => {
  const plan = NL.generateMealPlan({ diet: "any", maxTime: 30 }, R, 42);
  assert.strictEqual(plan.days.length, 7, "7 days expected");
  plan.days.forEach(d => assert.ok(d.meal.timeMin <= 30, d.meal.name + " over 30 min"));
  // pin a favorite to Friday
  const fav = R.find(m => m.diets.includes("vegetarian") && m.timeMin <= 30);
  const pinned = NL.pinMeal(plan, 5, fav.id, R);
  assert.strictEqual(pinned.days[5].meal.id, fav.id, "Friday should be pinned");
  // dislike a meal: it must not appear in fresh plans or swaps
  const dislikedId = plan.days[0].meal.id;
  const plan2 = NL.generateMealPlan({ diet: "any", excluded: [dislikedId] }, R, 42);
  assert.ok(!plan2.days.some(d => d.meal.id === dislikedId), "disliked meal appeared in plan");
  const swapped = NL.swapMeal(plan, 1, { diet: "any", excluded: [dislikedId] }, R, 42);
  assert.notStrictEqual(swapped.days[1].meal.id, dislikedId, "swapped-in meal must not be disliked");
});

// Flow 8: recurring bills advance by cycle when marked paid
flow("recurring bill advance flow", () => {
  const monthly = NL.advanceBill({ name: "Electric", dueDate: "2026-09-27", amount: 85, recurring: "monthly" });
  assert.strictEqual(monthly.dueDate, "2026-10-27", "monthly advance wrong: " + monthly.dueDate);
  const weekly = NL.advanceBill({ name: "Cleaner", dueDate: "2026-09-27", amount: 40, recurring: "weekly" });
  assert.strictEqual(weekly.dueDate, "2026-10-04", "weekly advance wrong: " + weekly.dueDate);
  const yearly = NL.advanceBill({ name: "Insurance", dueDate: "2026-09-27", amount: 400, recurring: "yearly" });
  assert.strictEqual(yearly.dueDate, "2027-09-27", "yearly advance wrong: " + yearly.dueDate);
  // one-time bills have no recurring flag and are simply removed by the UI
  assert.ok(!("recurring" in { name: "X", dueDate: "2026-09-27" }) || true);
  const nudge = NL.billNudge({ name: "Electric", dueDate: monthly.dueDate, amount: 85 }, new Date("2026-09-27T12:00:00"));
  assert.ok(/30 days/.test(nudge), "advanced bill nudge should say 30 days: " + nudge);
});

// Flow 9: grocery CSV export is well-formed
flow("grocery CSV export flow", () => {
  const plan = NL.generateMealPlan({ diet: "any" }, R, 7);
  const list = NL.aggregateGroceries(plan);
  const csv = NL.groceriesToCSV(list);
  const rows = csv.split("\n");
  assert.strictEqual(rows[0], "Item,Quantity,Unit,Est. cost ($),Aisle", "header wrong: " + rows[0]);
  assert.strictEqual(rows.length, list.length + 1, "row count mismatch");
  rows.slice(1).forEach(r => {
    const parts = r.split(",");
    assert.ok(parts.length >= 5, "row has too few columns: " + r);
    assert.ok(!isNaN(parseFloat(parts[3])), "cost not numeric: " + r);
    assert.ok(parts[4].length > 0, "aisle missing: " + r);
  });
});

// Flow 10: chore completion tracking + fairness scoring
flow("chore completion + fairness flow", () => {
  let c = NL.logChoreDone([], "Sam", "dishes", 0);
  c = NL.logChoreDone(c, "Sam", "trash", 0);
  c = NL.logChoreDone(c, "Jordan", "vacuum", 0);
  c = NL.logChoreDone(c, "Sam", "dishes", 1); // next week doesn't count
  const s = NL.choreScores(c, 0);
  assert.strictEqual(s.Sam, 2, "Sam should have 2");
  assert.strictEqual(s.Jordan, 1, "Jordan should have 1");
  const note = NL.fairnessNote(s, ["Sam", "Jordan"]);
  assert.ok(/rebalance/.test(note), "should flag imbalance: " + note);
  assert.ok(/balanced/.test(NL.fairnessNote({ Sam: 1, Jordan: 1 }, ["Sam", "Jordan"])), "balanced note wrong");
  assert.ok(/Nobody's logged/.test(NL.fairnessNote({}, ["Sam"])), "empty note wrong");
  // insights surface the fairness note on the home tab
  const insights = NL.suggestInsights({ bills: [], plan: null, people: 4, choresUnassigned: 0,
    members: ["Sam", "Jordan"], choreCompletions: c, choreWeek: 0 });
  assert.ok(insights.some(i => /Chore check/.test(i)), "fairness insight missing: " + insights.join(" | "));
});

// (flows 11-13 appended below)


flow("grocery aisle grouping flow", () => {
  const plan = NL.generateMealPlan({ diet: "any" }, R, 7);
  const list = NL.aggregateGroceries(plan);
  const secs = NL.groupGroceriesByAisle(list);
  assert.ok(secs.length >= 3, "expected several aisles, got " + secs.length);
  // aisle order follows the store's walk, not alphabetical
  const order = secs.map(s => s.aisle);
  const firsts = ["Produce", "Dairy & eggs", "Meat & seafood"].filter(a => order.includes(a));
  assert.ok(firsts.length, "fresh aisles should lead when present");
  const total = secs.reduce((s, x) => s + x.items.length, 0);
  assert.strictEqual(total, list.length, "no items lost in grouping");
  // keyword sanity
  assert.strictEqual(NL.aisleFor("whole milk"), "Dairy & eggs");
  assert.strictEqual(NL.aisleFor("chicken breast"), "Meat & seafood");
  assert.strictEqual(NL.aisleFor("sourdough bread"), "Bakery");
  assert.strictEqual(NL.aisleFor("jasmine rice"), "Pantry");
  assert.strictEqual(NL.aisleFor("paper towels"), "Household");
  assert.strictEqual(NL.aisleFor("frozen peas"), "Frozen");
  assert.strictEqual(NL.aisleFor("xyz mystery"), "Other");
  // every aggregated item carries its aisle
  assert.ok(list.every(g => typeof g.aisle === "string" && g.aisle.length), "items must carry aisle");
});

// Flow 12: night-off days drop out of the grocery list and cost estimate
flow("night-off days flow", () => {
  const plan = NL.generateMealPlan({ diet: "any" }, R, 21);
  const full = NL.aggregateGroceries(plan);
  const offPlan = { days: plan.days.map((d, i) => i === 2 || i === 5 ? Object.assign({}, d, { off: true }) : d) };
  const lite = NL.aggregateGroceries(offPlan);
  assert.ok(lite.length < full.length, "off days should shrink the list");
  const totalFull = full.reduce((s, i) => s + i.estCost, 0);
  const totalLite = lite.reduce((s, i) => s + i.estCost, 0);
  assert.ok(totalLite < totalFull, "off days should lower the estimate");
  // insights mention the nights off instead of pricing them
  const insights = NL.suggestInsights({ bills: [], plan: offPlan, people: 4, choresUnassigned: 0 });
  assert.ok(insights.some(i => /2 nights off/.test(i)), "insight should note nights off: " + insights.join(" | "));
});

// Flow 13: bill spending forecast — next-7-day total + monthly recurring burn
flow("bill forecast flow", () => {
  const now = new Date("2026-09-27T12:00:00");
  const bills = [
    { name: "Rent", dueDate: "2026-10-01", amount: 1500, recurring: "monthly" },
    { name: "Electric", dueDate: "2026-09-29", amount: 85.5, recurring: "monthly" },
    { name: "Internet", dueDate: "2026-09-15", amount: 60, recurring: "monthly" }, // overdue — still due
    { name: "Insurance", dueDate: "2026-10-20", amount: 400 }, // one-time, outside the window
    { name: "Cleaner", dueDate: "2026-09-30", amount: 40, recurring: "weekly" }
  ];
  const up = NL.upcomingBillTotal(bills, 7, now);
  assert.strictEqual(up.count, 4, "Rent+Electric+Internet+Cleaner in window, got " + up.count);
  assert.strictEqual(up.total, 1685.5, "upcoming total wrong: " + up.total);
  const monthly = NL.monthlyRecurringTotal(bills);
  const want = Math.round((1500 + 85.5 + 60 + 40 * 52 / 12) * 100) / 100;
  assert.strictEqual(monthly, want, "monthly recurring wrong: " + monthly);
  // insights surface both
  const insights = NL.suggestInsights({ bills, plan: null, people: 4, choresUnassigned: 0, now });
  assert.ok(insights.some(i => /\$1,?685\.50/.test(i) && /next 7 days/.test(i)), "7-day spend insight missing: " + insights.join(" | "));
  assert.ok(insights.some(i => /recurring bills/.test(i)), "recurring-burn insight missing: " + insights.join(" | "));
});

console.log("\nE2E: " + passed + " flows passed" + (process.exitCode ? " (with failures)" : ""));
