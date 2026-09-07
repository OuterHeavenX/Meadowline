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
tonight = clamp(3 + population/7, 3, 26) × (dark night ? 1.35 : 0.55), min 6
```

Double the city and you have doubled the problem. Defence is a running cost
against a growing bill, which is the shape a late-game economy needs.

## The calendar

Nothing comes until **day 20**. After that they come **every single night**,
and the scheduled dark nights are no longer the only ones — they are the bad
ones.

| | how many | how often |
|---|---|---|
| an ordinary night | 55% of the town's number, never fewer than **6** | every night |
| a dark night | 135% of it, up to 40 | roughly every 9 days, wobbled |

The floor of six is deliberate. A night with one or two of anything in it is
not a night, it is a stray, and the whole point of the thing walking out of the
woods is that there is a crowd of it.

The first night is late, and it is announced: for five days beforehand the
valley says so, and both the Garrison and the Watchtower unlock a stage earlier
than they used to so it is actually possible to have bought one. An earlier
draft started nightly raids on day 8, before a Garrison could be built at all —
that is not difficulty, it is a game that has not started.

`nextNight()` is public and the Look card on any tower shows what is coming
tonight and when the next bad one falls: a player cannot decide to spend money
on a threat they cannot see approaching.

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

## They walk on ground

Reported from a real game: one of them wading across the middle of the lake.

Two separate holes, both now closed by one `walkable()` that everything asks.
`approaches()` had always offered dry ground, but the jitter that spreads them
along the treeline was applied **afterwards and never re-checked**, so a spawn
could land in the water. And `march()` never looked at the terrain at all.

They step one axis at a time toward their target; if that step is water they
try the other axis, which walks them along the shore until they find a way
round. If both are water they wait at the edge — which at least looks like
something standing at the water deciding, rather than a miracle.

**A bridge is a bridge for anything using it.** Water carrying a road or a rail
is walkable, so they funnel over a crossing the same as anybody else. That is
worth knowing when you decide where to put one.

## They walk with their arms out

In the GPU renderer they were posed through the shared figure and swung their
arms at their sides like any resident out late. At map distance the arms are the
entire silhouette — it is the only thing that tells one of these from a
neighbour — so the figure now carries an `armsOut` flag and the shoulder
rotates forward instead of swinging. The Canvas path already drew them this way;
this was the low-poly path catching up.

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

## The warning

A night is the one thing that happens *to* the player rather than because of
them, and the valley is bigger than the screen — so being told which way to
look is not decoration, it is the whole of the decision about what to do with
the seconds you have.

When a night starts, `bearings()` buckets where they actually came in from into
the eight compass points, and `src/ui/siege-alert.js` puts a red pulse round
the edge of the screen, a band saying how many and from where, and **an arrow
at each edge they are coming from, pointing inward**.

Three decisions worth writing down:

- **It is DOM, not drawn into the scene.** It looks identical whichever
  renderer is running, sits above both, and an arrow pointing off the edge of
  the screen is a fact about the screen rather than about the valley.
- **The pulse stops.** It runs loud for six seconds and then settles to a held
  edge. A red border that never stops flashing stops being a warning inside a
  minute and becomes the colour of the game.
- **The alert decides nothing.** It reads `siegeWarning()` and has no way to
  raise an alarm of its own; the regression greps its source to keep it that
  way. A warning that can be louder than the night is a warning that lies.

It is also `pointer-events:none` throughout. This arrives unannounced in the
middle of whatever the player was doing, and a warning you can accidentally tap
eats the tap you were already making.

Two things the phone forced: the direction words are their own span and are
dropped below 560px — the count is the part the arrows cannot say, and there
are more compass points than there is room for words — and the toast that used
to announce a night is gone, because the band says the same thing, holds it for
the whole night, and on a phone the two of them sat on top of each other.

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

`tests/siege-regression.html`, 111 checks. Sabotages confirmed to fail: a walker
that strikes for ever; a death that renumbers the survivors; the dead keeping
their trade; the paper printing a nickname the street never used; towers
ignoring their range; a tower that needs no Garrison; the Garrison shooting as
well as sending people; the militia leash removed; guards who are never hurt;
falling back to one night in nine; a night of one or two; the warning pointing
the wrong way; the warning naming a direction nothing is coming from; a march
that ignores terrain; a spawn jitter that is not re-checked; and a bridge that
cannot be crossed.

That last one passed at first, because the check compared `bearings()` against
itself — the test now works the compass out from the raw positions so it has an
oracle the code under test cannot move.

## Still to come

Not built: walls or gates, and any way for the player to fight directly. The
player funds a watch, places towers and decides where the garrison stands; what
they are really deciding is which streets they were willing to leave dark.

Militia are also not named people — they are the watch, and a guard who comes
off badly is out of the night rather than dead. Naming them would mean a death
every time a fight went wrong, and that is a bigger decision than this slice
should make on its own.
