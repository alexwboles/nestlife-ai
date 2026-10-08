# NestLife 🏡 — AI family organizer

**The problem:** Busy families juggle meal planning, grocery runs, bill due dates, and chore arguments across sticky notes, texts, and memory. Things slip — food gets wasted, late fees pile up, and "whose turn is it?" starts fights.

**The solution:** NestLife is one calm, local-first app that plans the week's dinners, builds the grocery list automatically, nudges you about bills in plain language, and rotates chores fairly. No accounts, no cloud, no subscription required for the core — your data never leaves your device.

## Features (MVP)

1. **Weekly meal planner** — pick diet (any / vegetarian / vegan / gluten-free) + budget + family size → a 7-day plan from a bank of 36 real recipes, with a **Swap** button on any day.
2. **Quick-cook filter** — "30-minute weeknights only" limits the plan to fast dinners.
3. **Pinned favorites + "never suggest"** — pin a meal to a weekday so it sticks every week; banish meals you never want to see again (with a clear button).
4. **Auto grocery list** — ingredients aggregated across the week (duplicates merged, quantities summed), with check-off UI and an estimated total (now always visible). **Export CSV** or **print** the list.
5. **Bill reminders** — add bills with due dates and repeat cycles (one-time / weekly / monthly / yearly); get plain-language nudges like *"Electric is due in 3 days ($85.00)"* or *"Internet is 12 days overdue — pay it today to dodge late fees."* Marking a recurring bill paid rolls its due date forward automatically.
6. **Chore rotation** — add family members + chores → a fair weekly rotation that shifts each week so nobody's stuck with the same chore. Log completions with a **Done** button and see a weekly **fairness score** ("Sam has done 3 — Jordan has only 1. Time to rebalance."), also surfaced on the Home tab.
7. **Home insights** — local-heuristic "AI" suggestions: urgent bills, estimated cost-per-night for the week's plan, missing chore assignments, chore fairness.

## How to run

No build step, no dependencies, works offline.

```bash
# Option A: just open it
open index.html        # (or double-click in your file manager)

# Option B: tiny static server
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Tests

```bash
bash test/smoke.sh   # 14 quick checks: files, JS syntax, meal plan, groceries, bills, chores, new features
bash test/e2e.sh     # 10 end-to-end flows through the core logic (node)
```

## Tech

- Pure static HTML/CSS/JS — `js/logic.js` (testable pure functions), `js/recipes.js` (36-meal bank), `js/app.js` (UI)
- Persistence: `localStorage` only. Zero network calls, fully offline.
- "AI" today = local heuristics + templates (works with no API key). A future version may optionally call an LLM via `OPENAI_API_KEY` for natural-language meal ideas — never required.

## Pricing vision

Free forever core (this repo). Planned **NestLife Plus — $8/mo**: shared family sync, photo receipt → bill capture, smarter LLM meal suggestions with your own API key, and printable weekly plans.

## License

MIT — build on it freely.
