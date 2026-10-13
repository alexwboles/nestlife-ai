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

# 15: second-sweep feature functions are exported
node -e "
const NL = require('./js/logic.js');
['ownedKey','toBuyTotal','toggleOwned','logBillPaid','paidThisMonth','recordServedWeek','recentMealIds'].forEach(f => {
  if (typeof NL[f] !== 'function') throw new Error('missing export: ' + f);
});
console.log('OK');
" || fail "second-sweep exports"
pass "pantry / paid-history / variety-guard functions exported"

# 16: new UI wiring present
for needle in varietyGuard paidHistory renderPaidHistory pantryOwned mealHistory recentMealIds; do
  grep -q "$needle" js/app.js || fail "app.js missing $needle"
done
grep -q 'id="varietyGuard"' index.html || fail "index.html missing varietyGuard"
grep -q 'id="paidHistory"' index.html || fail "index.html missing paidHistory"
pass "variety guard + paid history + pantry UI wired"

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

# calendar feature
for needle in addFamilyEvent removeFamilyEvent upcomingEvents renderCalendar renderGlance evAdd evMember agenda glance; do
  grep -q "$needle" js/app.js js/logic.js index.html || fail "missing $needle"
done
grep -q 'data-tab="calendar"' index.html || fail "index.html missing calendar tab"
grep -q 'glance-grid' css/style.css || fail "glance CSS missing"
grep -q 'agenda-day' css/style.css || fail "agenda CSS missing"
node -e "
const NL = require('./js/logic.js');
let evs = [];
evs = NL.addFamilyEvent(evs, { title: 'Dentist', date: '2026-10-15', member: 'Maya' });
evs = NL.addFamilyEvent(evs, { title: 'Party', date: '2026-10-13' });
evs = NL.addFamilyEvent(evs, { title: 'Old', date: '2026-10-01' });
evs = NL.addFamilyEvent(evs, { title: 'Far', date: '2026-12-01' });
const up = NL.upcomingEvents(evs, 14, '2026-10-13');
if (up.length !== 2) throw new Error('upcoming=' + up.length);
if (up[0].title !== 'Party' || up[0].daysOut !== 0) throw new Error('today event first');
if (up[1].title !== 'Dentist' || up[1].daysOut !== 2 || up[1].member !== 'Maya') throw new Error('dentist wrong');
if (NL.removeFamilyEvent(evs, evs[0].id).length !== 3) throw new Error('remove failed');
let threw = 0;
try { NL.addFamilyEvent([], { title: '', date: '2026-10-15' }); } catch (e) { threw++; }
try { NL.addFamilyEvent([], { title: 'X', date: 'nope' }); } catch (e) { threw++; }
if (threw !== 2) throw new Error('validation missing');
" || fail "calendar logic checks"
pass "calendar feature: tab, agenda, glance, logic"

echo ""
echo "SMOKE: all checks passed"
