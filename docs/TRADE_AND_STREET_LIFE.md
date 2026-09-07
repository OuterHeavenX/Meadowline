# Trade and Street Life

Shops, vendors and the people who turn up where a street is busy enough to be
worth turning up to.

## Status

**Shops are production.** Street vendors and buskers are next and are described
at the end as intent, not as shipped behaviour.

## The shape of it

A town had two ways to make money from its people: the market, and the café.
Everything else was farming and milling. This arc adds the ordinary commerce a
street actually has — somewhere to buy things, somewhere to sit, somewhere to
read — and then the smaller, cheaper life that grows on top of it.

## Shops

| Shop | Cost | Upkeep | Jobs | Takes | Unlocks at | Also |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| General Store | 70 | 3 | 4 | 7 | stage 1 | — |
| Tea House | 95 | 4 | 4 | 9 | stage 2 | — |
| Bookshop | 130 | 5 | 3 | 6 | stage 2 | teaches, radius 4, 12 seats |

None of the three has a keyboard shortcut, and that is now permanent policy
rather than an oversight: the alphabet ran out. The shell owns several letters,
every remaining one is a tool, and a building that takes an occupied letter
silently kills the shortcut that was there — which is exactly how the newspaper
shipped bound to a key that never once worked. New buildings from here get a
Build-menu entry and no key, and `tests/regression.js` no longer asserts that
every tool has one. It asserts the load-bearing thing instead: that no two tools
answer to the same letter.

### One mechanism, not three special cases

A shop is a registry entry carrying `trade:{yield}`. Nothing else knows the
three exist:

- `mood.js` collects any building whose definition has a `trade` block into
  `S.ctx.shops`.
- `economy.js` sums `trade.yield` over that list and lifts the total with the
  markets, the same lift the cafés and bakeries get.
- `housing.js` counts shops within five tiles of a home toward its
  desirability, **capped at six points** so a parade of tea houses cannot buy a
  mansion on its own.

The regression's sharpest check invents a shop at runtime — a registry entry
that exists for four lines and is then deleted — and asserts the day's takings
went up by its yield. If the till ever grows a list of known shop types, that
check fails. Adding a fourth shop later is an entry and some art.

The Bookshop's education is the same trick from the other direction: it
declares `service:{type:'education'}`, and `providerDefinition()` in
`civic-services.js` already picks that up for any building. A street with no
school starts learning from a bookshop — smaller reach and fewer seats than a
school, so it supplements rather than replaces one. That matters more than it
sounds, because the two new housing rungs ask for education a young town has no
other way to supply.

### Everything else came free

Because shops are ordinary buildings with `jobs` and a `trade` block, districts
count them in the trade sector and in the jobs standing in them, opening one
reaches the day's ledger as a business and can be printed by the Post, the Look
card reads them as businesses (the panel asks the registry for a `trade` block
rather than matching a list of type names), and there are two new careers —
shopkeeper and bookseller — for people to hold.

### Testing

`tests/trade-shops-regression.html`, 34 checks. Beyond the invented-shop check
above, two were worth the trouble:

- **The cap check needed enough shops in reach to have anything to cap.** The
  first fixture put five tea houses down but only three within radius five, so
  capped and uncapped both came to six and a sabotage that removed the cap
  passed. The fixture now asserts, as its own check, that more shops are in
  reach than the cap allows before it claims the cap did anything.
- **The education check needed students.** `educationAssignment()` reports
  uncovered for a home with nobody in it, so the fixture gives the home a
  population before asking whether the bookshop taught it.

Sabotages confirmed to fail: the till summing a hard-coded list instead of the
registry; the desirability term uncapped; the bookshop's reach set to a
school's; a shop that keeps taking money after it is pulled down; a duplicate
keyboard shortcut.

## Still to come

**Street vendors** — one building with varieties (a food cart, a flower stall, a
newsstand) rather than a building per snack. Cheap, small, one or two jobs, and
worth putting where people already walk.

**Buskers** — a Busker's Pitch you place, and entertainers who simply turn up on
a lively street or outside a venue where somebody famous is playing. The second
half is the interesting one: it ties street entertainment to the fame system, so
who performs where is something the city decided rather than something the
player placed.
