# The Meadowline Post 1.0

The valley's daily newspaper: a local record of what actually happened, public
rumour, citizen voices, arrivals and departures, and civic reporting.

## Status

**Slice 1 (the daily paper) is production at `1c02801`.** Slice 2
(emergent nicknames, PARTS 16–24 of the brief) is **not built**. See "What is
deliberately not built yet" below — the paper is complete and useful without
it, and nicknames are a Social Fabric change rather than a newspaper one.

This document is canonical for the Post. Where an older document disagrees
with production code, the code wins and the disagreement is noted here.

## The permanent rule

> **THE SIMULATION DECIDES WHAT HAPPENED.**
> **THE MEADOWLINE POST DECIDES HOW THE PUBLIC HEARS ABOUT IT.**

The Post is an observer, not an authority. It may summarise, contextualise,
speculate cautiously and report rumour. It may never create an event because a
template wanted content. If nobody was arrested there is no arrest. There is no
death mechanic in Meadowline, so there are no obituaries and no deaths. If no
family moved, nothing moved.

Two structural facts enforce this rather than good intentions:

1. The paper reads a **ledger of facts** other systems wrote as they happened.
   It never walks the city to reconstruct a day, and it can only print what is
   in the ledger.
2. The generator's source is asserted to contain no write to the grid, the
   families, the organisations, the incidents or the population. The module
   exports no setter. The regression checks both.

## The event ledger

`src/simulation/ledger.js`. Every system that does something worth telling
appends a small structured entry as it happens:

```
record('family_move',{familyId,surname,from,to,tier,generation})
```

Entries are transient and bounded: today's and yesterday's only, never more
than 300, and they are **not saved**. Publishing drains what it printed. What
survives is what the paper decided was worth remembering, in its own archive.

Instrumented today: families (arrival, departure, generation), careers (first
of a trade, standing change), organisations (formation, growth, decline,
collapse, boss named, front opened), enforcement (investigation opened, raid,
case made, case dropped, front closed, questioned), fame (renown rise, full
house, faded), municipal (crime/fire/health incident, arrest, fire out,
recovery, search complete, unanswered call), housing (home upgraded),
buildings (opened, closed, moved), districts (identity change), progression
(stage change) and festivals.

Roads and lamps are not news; the ledger ignores them by building class.

### `hidden` is the knowledge boundary, as data

An entry marked `hidden:true` is something the simulation knows and the public
does not: an organisation forming, a boss being named, a front opening. The
paper reads `publicEvents(day)`, which excludes them, and the regression
asserts that what the criminal system writes while it is secret is all hidden.

## Public knowledge versus hidden truth

This is the part the brief cares most about, and it is worth stating exactly
where the line sits.

The Social Fabric knows an organisation's real membership, its boss, its
fronts and its influence from the day it forms. **None of that reaches the
paper.** What reaches the paper is what the police did in public, and what a
neighbour could observe.

An organisation carries one flag, `exposed`, and **only one thing sets it: a
case actually made** by `enforcement.js`. Before that:

- Police stories say where officers are asking, never who they think is
  behind it. "Police confirmed yesterday that officers have opened an inquiry
  into activity around Fern Hollow. They would not say what prompted it, and
  have not confirmed the existence of any larger organisation."
- A raid on a secret group is "officers searched a café on Fern Hollow", and
  nothing more.
- A person questioned is named — that part is public — and the group they were
  questioned about is not.
- Whispers are anchored in something observable and never name anyone.

After exposure the paper uses the name **investigators use**, attributed to
them: "the group investigators call the Fern Hollow Network".

The words **mafia, mob, crime family, syndicate, boss and front** never appear
in printed prose at any stage. The regression greps every edition for them.

There is deliberately no general "should I name this?" helper. Each police
story asks `exposed` itself, at the point where it would use a name. An early
draft did have such a helper, and the regression could not tell whether it
worked, because nothing ever called it — a safeguard that never runs reads
like protection while protecting nothing. It was removed.

## Rumour, and how sure it is allowed to be

`whispers(day)` produces at most three, each anchored in something real:

| anchor | reliability | how it reads |
|---|---|---|
| an open police investigation | strong | "Several residents report…" |
| a front business that exists | plausible | "People say…" |
| an organisation at crew stage or above | weak | "Some say…" |
| a celebrity with a real venue | plausible | "People say…" |
| police confirmed it | confirmed | "Police confirmed…" |

A town with no organisation and nobody famous produces no whispers at all.
Rumour may be uncertain; it may not be invented.

## Citizen voices

`AROUND TOWN` prints at most three, and each one requires the condition it
complains about to be genuinely present, in a district that genuinely has it:

- a packed school only when demand exceeds 95% of capacity;
- no park only in a district with homes and no recreation reach;
- no work only when unemployment is above a quarter of workers;
- no clinic only when there are patients and no healthcare capacity;
- no police only when crime pressure is high and capacity is zero.

Give a street a green and the complaint about parks stops the same day. The
regression builds each condition, checks the quote appears, removes the
condition and checks it goes.

## Story priority and quiet days

Stories are ranked in the brief's order: citywide event, public safety, social
event, business, district identity, notable citizen, public needs, gossip. One
lead, then sections. A newspaper needs a hierarchy, not ten equal headlines.

A day where nothing ranked happened prints a genuinely short paper: "A QUIET
DAY ACROSS MEADOWLINE — No incidents were reported yesterday." Quiet days are
valid and are never padded. The regression asserts a quiet issue contains no
arrest, no death and no move.

## Presentation

`src/ui/post.js` and the styles at the end of `css/ui-hud-2.css`. Warm paper,
a black serif masthead, a double rule, a dateline, a bold lead, then columns:
one on a phone, two from 700px, three from 1100px. Every headline and body is
HTML-escaped; the regression puts a `<script>` in a district name and checks it
cannot escape the page.

Access is a newspaper chip in the corner with a red dot while an edition is
unread, or the `N` key. The player is **told** an edition is out by a toast and
chooses whether to read it. Nothing blocks the game, and there is no daily
modal. City Hall carries a **The Post** section holding the latest lead and
the archive.

## Save

`post` is a new top-level Save V3 field, and old saves without it load with no
paper and start their own. Persisted: the last issue (clamped and length-capped
in every string), the bounded archive of up to 30 remembered front pages, the
last issue day and the unread flag. The daily ledger is **not** saved — it is
transient by design, and a save mid-day simply loses that day's unprinted
facts rather than carrying them forward as stale news.

A mangled `post` field is cleaned rather than trusted: unknown reliability
classes fall back to weak, missing headlines drop the issue, and the archive is
truncated.

## Performance

The paper is composed once, at the turn of the day, from a bounded list. It is
never composed per frame and never scans the social simulation. Rendering is a
string built on open. The ledger costs one push per real event.

## Testing

`tests/meadowline-post-regression.html`. 72 deterministic checks. The ones
that matter most, and what it took to make them mean anything:

- **The leak check has to read editions that exist.** The first version
  composed each past day's issue after the fact — but the ledger only holds two
  days, so every one of those issues was empty and the check passed against
  nothing. A sabotage that printed the secret name sailed through it. Issues are
  now captured **on the day they are printed**, and the check asserts it found
  at least twenty non-empty editions covering that neighbourhood before it
  claims none of them leaked.
- **The drain check has to have something to drain.** `every()` over an empty
  ledger is true, so "the ledger is drained" passed while a publish that
  drained nothing was in place. It now records three events, publishes, and
  asserts they were there first and are gone after.
- **Leak checks are case-insensitive.** Headlines are upper-cased, so
  `includes('Fern Hollow Network')` misses `FERN HOLLOW NETWORK`. That hole
  hid a real sabotage for two rounds.
- **The dangerous paths are forced, not waited for.** Whether the police act on
  a group before exposing it depends on dice, so a scene builds that ledger by
  hand: a raid, a dropped case and a questioning, all on a secret group, and
  checks the paper reports each without the name.
- **The crime fixture is deterministic.** The dispatcher raises its own
  incidents from an unseeded roll, so "one incident, one arrest" was flaky. The
  fixture drops below the spawn threshold while it drives the dispatcher.

Sabotages confirmed to fail the suite: inventing an arrest on a quiet day;
naming an unexposed group in the inquiry, raid or dropped-case story; a whisper
with nothing behind it; a whisper naming the group; a reader quote with no
matching condition; `exposedName` ignoring exposure; a brief that reports a
number nobody measured; an unbounded archive; a ledger that is never drained;
and an exported setter.

## What is deliberately not built yet

**Emergent nicknames (PARTS 16–24).** Aliases that emerge from a citizen's
history, spread from associates to district to police to press, and are used by
the paper only once publicly known. This is a Social Fabric change — it needs
alias state on the citizen record, an origin category derived from real
history, and a visibility ladder — and it is a bigger piece of work than the
paper itself. The Post is designed to accept it: adding aliases means adding a
`nickname_public` ledger event and one lookup where the paper prints a name.

Also not built, and not required by any current system: obituaries (no death
mechanic exists, and the brief forbids inventing one), a generative-AI prose
layer (PART 26 explicitly makes it optional and presentation-only), and a
newspaper stand building.
