# The Siege

What comes out of the woods, what the valley does about it, and why a rich town
finally has somewhere to put its money.

## Status

**Production.** The calendar, the horde, the Garrison and Watchtower, the
militia who go out, deaths, and the Post reporting them.

## The problem it solves

At forty thousand coins Meadowline had nothing left to want. Every building
paid for itself, upkeep never caught up with income, and the treasury only went
one way. The most expensive thing in the game was a wonder at 3,600 — a single
purchase, after which the money piled up again.

So this is a **sink, not a purchase**. A Garrison costs 4,200 and **45 a day**,
more than anything else standing. Each Watchtower is 380 and 7 a day. And the
horde is sized by how big the town has grown:

```
attackers = clamp(3 + population/7, 3, 26)
```

Double the city and you have doubled the problem. Defence is a running cost
against a growing bill, which is the shape a late-game economy needs.

## The calendar

Nothing comes for a young town: the first dark night is **day 18**, and then
roughly every 9 days with a seeded wobble so it is not a metronome. It is on
the **calendar, not a dice roll**, and `nextNight()` is public — the Look card
on any tower tells you how many days you have and how many are coming. That is
deliberate: a player cannot decide to spend money on a threat they cannot see
approaching.

## The night

They come in from outside the built-up area, preferring the treeline and the
dark. A ring of lamps on the outskirts does not stop a night, but it moves
where it arrives — which is the first time street lighting has been worth
anything tactical.

They walk to the nearest home that has somebody in it, preferring one nobody
else is already at. **Anything that reaches a door gets one hit and is spent.**

That last rule is the whole balance, and it was not in the first draft. A
walker that reached a door struck every four seconds until dawn, so a single
gap in the line cost a household everyone in it — the first undefended night
killed fifteen people out of three homes. Spent after one strike, the
arithmetic is something a player can reason about: *this many are coming, my
towers stop that many, the rest get one hit each.*

A hit is a home knocked back a housing tier, a resident gone and the street's
mood with it. **About a third of the time it is a person instead.**

## Two things to buy, and they do different jobs

**A Watchtower shoots.** One kill per volley within 5 tiles, from where it
stands, reloading every 1.9 seconds. Static reach.

**A Garrison sends people.** Up to four militia muster there at nightfall, walk
out at 0.95 tiles a second, and settle it at arm's length — a duel takes 2
seconds and about one in five goes badly enough that the guard is out of the
night. How many go out is **how many guards the town actually employs**, capped
at four and floored at two: the building is the licence, the people are the
strength. There is a `guard` trade now, held at either building.

The Garrison **does not shoot**, and that was a real bug rather than a design
choice at first. It had a longer reach and a faster reload than a tower, so it
killed everything before its own militia could walk to it — every guard on the
map was ornamental and not one ever landed a blow. The regression now checks
that a garrison with nobody out of it kills nothing at all.

### The leash is what makes a Garrison a *place*

Militia will not go more than 10 tiles from their garrison. Without that they
follow the fighting wherever it goes, and one garrison covers a whole valley —
which makes towers pointless. With it, a garrison holds its own quarter and the
far end of a long town is somebody else's problem. **A garrison parked away
from the homes defends nothing**, so where you put it is a real decision.

Getting a test for that to mean anything took two goes. The first version
watched militia during an ordinary night and asserted none strayed — which
passed with the leash deleted, because in that fixture nothing ever strayed far
enough to tempt anybody. It now parks a garrison out in the fields and checks it
kills nothing while the town is overrun.

### What that buys, measured

A 38-home town, 26 attackers, on a real ~35-second night:

| | brought down | lives lost | homes damaged |
|---|---:|---:|---:|
| nothing | 0 | 4 | 21 |
| Garrison only | 8 | 1 | 17 |
| Garrison + 8 towers | 26 | 0 | 0 |

A watch roughly halves what a night costs. It does not hold a town. That gap is
what the towers are for, and it is why the bill keeps growing as the city does.

## What a death costs, in code

This is the part that needed care. A person in Meadowline is `(homeSeed,
index)` — nothing anywhere stores a list of people. Their trade is filed under
that index, so is their renown, so is the nickname the street gave them, so is
their seat in anything that formed around them.

So there is exactly one way to die — `mortality.js takeLife()` — and it closes
every one of those books in the same breath: the career seat, the fame record,
the alias, and a named boss who is gone. The regression holds a person who is
all four things at once and checks that nothing anywhere still refers to them.

**The dead keep their index for ever.** They are recorded as `family.lost`, and
`familyMembers()` deals the roster the home has *ever* held and takes them out
of it. A death never renumbers the living — the survivor at index 3 stays a
farmer rather than inheriting the dead musician's job. Two consequences the
regression pins down:

- The roster is dealt to `ROSTER_CAP` (ten) and the **living** list is capped at
  five *after* the dead are removed. Capping the deal instead meant every death
  permanently lowered how many people a household could ever have again, and a
  home of five showed four.
- A home that grows again gains **somebody new at the next index**, not the dead
  person back.

## The paper

The Post's permanent rule used to include *"there is no death mechanic so there
are no deaths"*. The siege made that false, and the rule has been rewritten
rather than quietly dropped. What it was protecting has not changed: a death is
printed when `mortality.js` recorded one and **never otherwise**, the name is
the person's own, and no number is inflated because a front page wanted a
bigger one.

Obituaries sit directly after the front page. A night is the lead the morning
after, with the night's own numbers. A night nobody was hurt in says so rather
than reaching for drama. And an obituary uses a nickname **only if the street
had already made it public** — the same rule every other story follows. Without
that flag the obituary was the one place a private nickname went public, which
the regression now catches.

## Testing

`tests/siege-regression.html`, 88 checks. Sabotages confirmed to fail: a walker
that strikes for ever; a death that renumbers the survivors; the dead keeping
their trade; the paper printing a nickname the street never used; towers
ignoring their range; a tower that needs no Garrison; the Garrison shooting as
well as sending people; the militia leash removed; and guards who are never
hurt.

## Still to come

Not built: walls or gates, and any way for the player to fight directly. The
player funds a watch, places towers and decides where the garrison stands; what
they are really deciding is which streets they were willing to leave dark.

Militia are also not named people — they are the watch, and a guard who comes
off badly is out of the night rather than dead. Naming them would mean a death
every time a fight went wrong, and that is a bigger decision than this slice
should make on its own.
