# Trade and Street Life

Shops, vendors and the people who turn up where a street is busy enough to be
worth turning up to.

## Status

**All of it is production**: shops, street vendors, and street entertainment.

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

## Street vendors

One building — **Street Vendor**, 28 coins, 1 upkeep, one job, no keyboard
shortcut — and three things it can turn out to be. There is no food-cart tool
and no flower-stall tool. The player puts down a pitch; **the street decides
what sets up on it**, which is the same rule the Social Fabric runs on applied
to something small enough to put on a corner.

| Variety | Takes | Street presence | When |
| --- | ---: | ---: | --- |
| Food cart | 4 | 1 | nothing else nearby |
| Flower stall | 3 | 2 | a green or recreation within 3 |
| Newsstand | 3 | 1 | somewhere people read within 4 |

The rule is in priority order and the order is a decision, not an accident:
where a pitch sits between a green and a school it sells flowers, because the
people passing a green are already out for the walk. "Somewhere people read"
names no building — it is anything declaring an education service, so a
bookshop counts and so will anything added later.

### A pitch is not frozen the day it is laid

`settleVarieties()` runs at the end of every `recompute()`, so a food cart
becomes a flower stall the day a green opens beside it, and goes back to
selling food if the green is pulled down. That is the detail worth having: a
pitch follows its street rather than the moment it was placed.

Two consequences had to be handled rather than assumed:

- **The variety reaches the till.** `tradeYield()` and `tradePresence()` prefer
  the variety's numbers over the building's base ones, which is the whole of
  the special handling vendors need anywhere in the simulation. Both are still
  generic — a definition with no `varieties` block gets its own numbers, as
  the shops do.
- **The variety reaches the picture.** The GPU renderer rebuilds its world from
  a signature over the grid, and that signature only carried type, position and
  tier. A food cart that became a flower stall would have kept its barrow until
  something unrelated changed on the map. The signature now carries the variety
  too, and the regression reads that line to make sure it still does.

### Why a pitch is worth less to a street than a shop

Desirability counts trade by **presence**, not by headcount: a shop is worth 2
and a food cart 1, against the same six-point cap. Without that split, a ring of
28-coin barrows buys exactly the desirability of the buildings they stand
outside, and there is no reason to build a shop. The flower stall is the
exception at 2 — flowers do more for a street than a newspaper does.

### What is deliberately not clamped

`save.js` has no "is this a real variety?" check, and that is on purpose.
`applySave` recomputes before it returns, so the street settles every pitch and
a clamp there could never be observed to work. What does the work is
`varietyOf()`, which every reader goes through and which falls back to the first
variety — reachable, and tested directly with a save naming a funnel-cake truck.

### Testing

`tests/street-vendors-regression.html`, 44 checks. The one that carries the
design is that three identical pitches in three different places settle three
different ways, with nothing differing but where they stand: if the variety ever
came off the building seed instead of the street, that fails.

Sabotages confirmed to fail: the variety taken from the seed; the till reading
the base yield instead of the variety's; a pitch counting for a street as much
as a shop; the GPU signature dropping the variety; `varietyOf()` trusting
whatever the state says; the save whitelist dropping the variety; the
desirability cap removed.

## Buskers

Street entertainment is two halves, and the split is the point.

**The player's half** is a **Busker's Pitch** — 45 coins, 1 upkeep, no keyboard
shortcut. It is a cleared square of pavement with a chalk ring on it, and it
has **no service**, so an empty pitch satisfies no recreation demand and is
worth nothing to anybody. What it buys is that entertainers turn up on it
readily rather than occasionally.

It does carry one job, and that is not a contradiction: somebody makes their
living on it. `careers.js` only offers a trade at a building with a post, so
without it a street performer could never hold a pitch and the fame system
would never see the thing at all.

**The city's half** is who turns up. `src/simulation/buskers.js` decides that,
and the player has no say in it. A spot is worth standing on in proportion to:

| what | worth | reach |
| --- | ---: | ---: |
| homes with people in them | 1 each, max 6 | 4 |
| trade to bring people past | 2 each, max 8 | 3 |
| **somebody famous playing nearby** | 4, or 6 across the valley, max 12 | 4 |
| standing on a pitch | 5 | — |

Past a threshold of 6 a spot rolls, deterministically, on the day and the slot;
a pitch fills readily and bare pavement is a maybe. Never more than ten in a
town. Acts are a juggler, a clown, a fiddler, a puppeteer or a chalk artist.

### The fame tie is the whole feature

A musician the valley has come to know pulls jugglers and puppeteers onto the
pavement outside their venue, and the player does nothing to make that happen —
they built a café street, people became musicians on it, one of them got known,
and now there is a small crowd outside. `liveliness()` reads the **fame list**
for this, not the niceness of the street, and the busker records the name of
whoever drew them so the pitch card can say so. It is the only place a player
ever sees that connection stated.

Getting the check for it to mean anything took a second go. The first version
subtracted the star term from the total and asserted the total was bigger,
which is true of any number and stayed true with the star term deleted. It now
compares against what the street is worth on its own, and checks the same
pavement with the fame list emptied comes to exactly that.

### Transient by design

The list is rebuilt from a seeded roll on its own clock, so the same day in the
same town is the same street, and **none of it is saved**. Tomorrow is its own
day. They go home when it gets dark. Pull the street down and there is nobody
on it, because there was never anything stored to pull down.

A household hears whoever is playing within three tiles: +3 each, **capped at
6**. It is the only mood term that can change between one morning and the next
without anything being built or pulled down, which is the point of it.

### Testing

`tests/buskers-regression.html`, 50 checks. Sabotages confirmed to fail:
entertainers turning up regardless of the street; fame not being read; nobody
going home at night; the mood term uncapped; the pitch given a recreation
service so an empty one counts as a park; and the list being saved.

## Still to come

Nothing in this arc. The next building added anywhere gets a Build-menu entry
and no keyboard shortcut, and `tests/regression.js` enforces only that no two
tools answer to the same letter.
