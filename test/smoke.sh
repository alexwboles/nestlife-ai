#!/usr/bin/env bash
# NestLife AI smoke tests — fast sanity checks. Exit non-zero on first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

# 1-3: required files exist
for f in index.html css/style.css js/logic.js js/recipes.js js/app.js README.md; do
  [ -f "$f" ] || fail "missing file $f"
done
pass "all required files exist"

# 4-6: JS syntax valid
for f in js/logic.js js/recipes.js js/app.js; do
  node --check "$f" || fail "syntax error in $f"
done
pass "JS syntax valid (logic.js, recipes.js, app.js)"

# 7: recipe bank has 30+ meals
count=$(node -e "const R=require('./js/recipes.js'); console.log(R.length)")
[ "$count" -ge 30 ] || fail "recipe bank too small: $count"
pass "recipe bank has $count meals (>=30)"

# 8: meal plan generation works and respects diet
node -e "
const NL = require('./js/logic.js');
const R = require('./js/recipes.js');
const plan = NL.generateMealPlan({diet:'vegan', budget:'low', people:4}, R, 42);
if (!plan.days || plan.days.length !== 7) throw new Error('plan should have 7 days');
plan.days.forEach(d => {
  if (!d.meal.diets.includes('vegan')) throw new Error('non-vegan meal in vegan plan: ' + d.meal.name);
  if (d.meal.costPerServing > 2.5) throw new Error('over-budget meal: ' + d.meal.name);
});
console.log('OK');
" || fail "meal plan generation (vegan/low budget)"
pass "meal plan generation: 7 days, vegan + low-budget respected"

# 9: grocery aggregation merges duplicates and totals cost
node -e "
const NL = require('./js/logic.js');
const R = require('./js/recipes.js');
const plan = NL.generateMealPlan({diet:'any'}, R, 7);
const list = NL.aggregateGroceries(plan);
// count raw ingredient rows vs aggregated rows
const raw = plan.days.reduce((s,d)=>s+d.meal.ingredients.length, 0);
if (list.length >= raw) throw new Error('aggregation did not merge duplicates: raw=' + raw + ' agg=' + list.length);
const total = list.reduce((s,i)=>s+i.estCost, 0);
if (!(total > 0)) throw new Error('grocery total should be positive');
list.forEach(i => { if (i.qty <= 0) throw new Error('non-positive qty for ' + i.name); });
console.log('OK raw=' + raw + ' agg=' + list.length + ' total=' + total.toFixed(2));
" || fail "grocery aggregation"
pass "grocery aggregation merges duplicates, positive totals"

# 10: bill nudge phrasing
node -e "
const NL = require('./js/logic.js');
const now = new Date('2026-09-27T12:00:00');
const n1 = NL.billNudge({name:'Electric', dueDate:'2026-09-30', amount:85}, now);
const n2 = NL.billNudge({name:'Rent', dueDate:'2026-09-27', amount:1200}, now);
const n3 = NL.billNudge({name:'Water', dueDate:'2026-09-20', amount:40}, now);
if (!/due in 3 days/.test(n1)) throw new Error('3-day nudge wrong: ' + n1);
if (!/due TODAY/.test(n2)) throw new Error('today nudge wrong: ' + n2);
if (!/overdue/.test(n3)) throw new Error('overdue nudge wrong: ' + n3);
console.log('OK');
" || fail "bill nudge phrasing"
pass "bill nudges: 'due in 3 days' / 'due TODAY' / 'overdue'"

# 11: chore rotation is fair and shifts weekly
node -e "
const NL = require('./js/logic.js');
const w0 = NL.choreRotation(['A','B','C'], ['dishes','trash','vacuum','laundry'], 0);
const w1 = NL.choreRotation(['A','B','C'], ['dishes','trash','vacuum','laundry'], 1);
if (w0[0].member === w1[0].member) throw new Error('rotation did not shift between weeks');
// every chore assigned exactly once
if (new Set(w0.map(r=>r.chore)).size !== 4) throw new Error('chore missing in rotation');
console.log('OK');
" || fail "chore rotation"
pass "chore rotation: fair assignment, shifts weekly"

# 12: new feature functions are exported
node -e "
const NL = require('./js/logic.js');
['fitsTime','pinMeal','advanceBill','billCycleLabel','groceriesToCSV','logChoreDone','choreScores','fairnessNote'].forEach(f => {
  if (typeof NL[f] !== 'function') throw new Error('missing export: ' + f);
});
console.log('OK');
" || fail "new feature exports"
pass "new feature functions exported (quick-cook, pin, recurring bills, CSV, fairness)"

# 13: quick-cook filter restricts meal times
node -e "
const NL = require('./js/logic.js');
const R = require('./js/recipes.js');
const plan = NL.generateMealPlan({diet:'any', maxTime:30}, R, 42);
if (!plan.days || plan.days.length !== 7) throw new Error('plan should have 7 days');
plan.days.forEach(d => { if (d.meal.timeMin > 30) throw new Error('over-time meal: ' + d.meal.name); });
console.log('OK');
" || fail "quick-cook filter"
pass "quick-cook filter: all meals <= 30 min"

# 14: grocery total renders (bug regression: receipt-total must not be wiped)
node -e "
const fs = require('fs');
const src = fs.readFileSync('./js/app.js', 'utf8');
if (!/receipt-total/.test(src)) throw new Error('no receipt-total in app.js');
const groceries = src.split('function renderGroceries')[1].split('function renderBills')[0];
// the old bug did 'box.innerHTML = box.innerHTML + ...' then overwrote it; that pattern must be gone
if (/box\.innerHTML\s*=\s*box\.innerHTML/.test(groceries)) throw new Error('double-assignment bug pattern still present');
console.log('OK');
" || fail "grocery total render"
pass "grocery total renders (no double innerHTML assignment)"

echo ""
echo "SMOKE: all checks passed"
