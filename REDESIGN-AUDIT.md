# NestLife AI — Redesign Audit (2026-10-13)

Competitors researched: **Cozi** (shared family calendar + agenda, to-do lists, shopping lists), **FamCal / FamilyWall** (member-tagged events, agenda view).

## Visual gaps vs competitors
1. No calendar anywhere — Cozi's entire product IS the shared calendar. The Home tab was an insights feed with a static "week at a glance" card that said "tap a tab above to get started" — a dead end.
2. Agenda-style event rows (date chip + member tag) were missing.

## Functional gaps vs competitors
1. **No family events**: birthdays, appointments, school nights — the core Cozi job — couldn't be recorded at all.
2. **No "today" view**: what's for dinner tonight, what's due, what's next — required visiting three tabs.

## Redesign plan
- **Family calendar** (new tab): add events with title/date/optional member; 14-day agenda grouped by date with member tags and remove buttons; pure tested logic (`addFamilyEvent`, `removeFamilyEvent`, `upcomingEvents`) in logic.js.
- **"Today at a glance"** strip on Home: tonight's dinner from the meal plan, bills due within 3 days, next upcoming event, chores done this week — replacing the dead-end card.
- All existing features preserved: meal planner (varietyGuard, pins, dislikes, night-off), groceries (aisles, pantry, CSV, print), bills (recurring, nudges, paidHistory), chores (rotation, fairness), members, insights, reset (now also clears events).

## Concept (1 paragraph)
Keep the warm homestead identity, but make it the family hub Cozi is: a real shared calendar tab with a 14-day agenda and member-tagged events, and a Home tab that answers "what's happening today?" — tonight's dinner, bills due, next event, chores done — instead of telling you to tap a tab. One accent stays; the calendar gets its own calm date-chip treatment.
