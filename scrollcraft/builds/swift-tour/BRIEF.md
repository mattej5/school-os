# BRIEF · A Swift Tour (paced reading)

Interviewed in-thread (targeted questions, not the full 8-question pass, given
the subject is a study reading rather than a brand). Recorded verbatim below.

## Interview answers

1. **Vibe / references:** playful throughout, not calm-with-one-peak. Code-native,
   no photographic imagery ("if something really justifies a photo, use the
   ChatGPT website via Claude in Chrome" — not needed here, unused).
2. **Journey:** the 9 sections of the official Swift Tour, in the docs' own
   order: Simple Values, Control Flow, Functions and Closures, Objects and
   Classes, Enumerations and Structures, Concurrency, Protocols and Extensions,
   Error Handling, Generics. Plus a Hello World open.
3. **Energy curve:** playful/high throughout; not asked to modulate loud/quiet.
4. **Feeling, mid-build correction (the one that actually shaped the page):**
   "I get easily overwhelmed and it's hard for me to not skip ahead, nor do I
   easily identify what's important." This overrides the default flowing-page
   assumption: the page must show **one idea at a time**, gated by scroll
   distance, with no way to see ahead and no competing content on screen.
5. **Signature move:** code literally types itself and its real output prints,
   driven by scroll position (not autoplay).
6. **Aesthetic family:** playful, code-native (editor/terminal chrome, not
   marketing chrome).
7. **Structure:** distinct scenes/chapters, not one continuous world. Each
   Swift topic is its own "file" with a hard cut between chapters.
8. **Assets:** none generated. All content is real Swift code and real printed
   output transcribed from docs.swift.org's guided tour (verified against the
   live page, not from training memory — several gaps were found and corrected
   versus the repo's existing condensed reference: Hello World intro, the
   boolean-only `if` rule, `hasAnyMatches` closure-as-parameter, the raw-value-
   free `Suit` enum, `SimpleClass` adopting a protocol without `mutating`, the
   full `TriangleAndSquare` `willSet` interaction, the first plain do-catch, and
   the `try?` success case).

## Grammar

**Live surface** (uniqueness.md §2.3). The page IS a code editor: a file tree
sidebar, one file open at a time, code that runs. Chosen over filmic one-shot
(wrong medium for reference material), chaptered editorial (too static, no room
for the typing/output mechanic), continuous world (nothing physical is
travelled), typographic poster (there's real code, not a slogan), gallery
(these aren't parallel objects, they're a sequence), split stage (no two-sided
argument), rhythmic cutlist (the opposite of what was asked for: cuts are fast,
this needs to be slow and singular).

**Deliberate deviation from the 8-14vh page-length budget** (feel.md §5,
SKILL.md Step 2): this is a paced study reading with ~50 individually-gated
concepts, not a marketing page. Compressing it to 14vh would defeat the actual
brief (one idea at a time, no skipping ahead). Length is intentional; pacing
per-idea is the design, not a page that grew by accident.

## Signature move

Scroll is the typing hand. Each concept's code sample fills in character by
character as you scroll through its span; once fully typed, the real terminal
output prints beneath it. Scroll back and it un-types. This is the only
mechanic on the page and it repeats on purpose (matching "the sequence is
useful gating", not filler) because it *is* the pacing device the human asked
for, not decoration on top of it.

## Feeling curve

Because the brief was "playful throughout" *and* "help me not get overwhelmed",
the curve is mostly one register (curiosity, low-key delight at each concept
resolving) rather than a rising-and-falling arc. One real peak still exists:

```
Hello World          curiosity     first line just runs, no ceremony
Simple Values..Fns   curiosity     each concept types, resolves, moves on
Optionals (in         delight/peak  a box that may or may not hold a value,
  Control Flow)                     opens on scroll, empty vs. full state
                                     rendered literally — the one moment
                                     bigger than the rest, extra scroll room
...remaining chapters curiosity     same register resumes, deliberately calm
                                     after the peak per feel.md (don't stack
                                     two peaks)
Generics close        resolve       a real input: type a call, get real output
```

**Tell-someone sentence:** "it's the site where the code you're reading types
itself out while you scroll, and the box that might be empty actually opens or
doesn't."

**Peak:** the Optionals beat inside Control Flow. Gets the longest span on the
page and an authored beat of quiet (a blank "before" state) immediately ahead
of it.

## Fingerprint gate

Registry (`scrollcraft/FINGERPRINTS.md`) is empty — first build, gate passes
trivially. Row appended after ship.
