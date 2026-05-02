# Many Talents More — Explainer Video Design Spec

## What Does Done Look Like?

A 75-90 second video rendered from code (Remotion + React-Three-Fiber) that:
- Introduces the Many Talents More AI team framework to a broad audience (developers, business owners, AI-curious)
- Feels epic/inspirational — movie trailer energy, not corporate explainer
- Shows 10T as a gold humanoid particle silhouette orchestrating a team of colored silhouettes
- Uses synthesized voiceover cloned from Chris's and his girlfriend's voices
- Ends with a CTA to manytalentsmore.com + GitHub repo
- Outputs as MP4, 1920x1080, 30fps, ready for YouTube upload

## Who Uses It?

- **Viewers:** Anyone on YouTube, Reddit, X/Twitter who encounters it. Primary targets are developers using AI tools, small business owners, and AI-curious general audience.
- **Chris (Owner):** Reviews and approves the final render, uploads to YouTube, shares on social.
- **Kit (Developer):** Builds the Remotion project, creates all scenes and animations.

## What Breaks If It's Wrong?

- Bad pacing or unclear narrative = viewers click away in 5 seconds, wasted effort
- Poor visual quality = reflects badly on MTM brand, undermines credibility
- Audio sync issues = unwatchable
- Wrong CTA or broken links = lost conversions

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Remotion v4+ |
| 3D Scenes (Acts 1-3, 5) | `@remotion/three` + react-three-fiber |
| 2D Motion Graphics (Act 4) | Remotion native `spring()` + `interpolate()` |
| Transitions | `@remotion/transitions` |
| Audio | `<Audio>` components — VO tracks + background music + SFX |
| Text | Custom components using `useCurrentFrame()` + `interpolate()` |
| Output | MP4, H.264, 1920x1080, 30fps |

### Critical Constraints (from DATA's research)

- **No Framer Motion, React Spring, or GSAP** — they use `requestAnimationFrame` which breaks Remotion's frame-by-frame rendering
- **All animation via** `useCurrentFrame()` + `interpolate()` + `spring()`
- **R3F scenes must use** `<ThreeCanvas>` from `@remotion/three`, NOT regular `<Canvas>`
- **No `useFrame()` from R3F** — use `useCurrentFrame()` from Remotion instead, or frames will flicker
- **Some drei helpers may break** — test each one individually

### Project Structure

```
mtm-video/
|-- src/
|   |-- Root.tsx                    # Registers the main composition
|   |-- Video.tsx                   # Main composition — sequences all acts
|   |-- acts/
|   |   |-- Act1-Problem.tsx        # The Problem (0-15s)
|   |   |-- Act2-Revelation.tsx     # The Revelation (15-30s)
|   |   |-- Act3-Team.tsx           # The Team (30-50s)
|   |   |-- Act4-System.tsx         # The System (50-70s)
|   |   |-- Act5-Call.tsx           # The Call (70-85s)
|   |-- components/
|   |   |-- three/
|   |   |   |-- TenT.tsx           # 10T humanoid particle silhouette (3D)
|   |   |   |-- TeamMember.tsx     # Individual team member silhouette (3D)
|   |   |   |-- Constellation.tsx  # Full team constellation orbiting 10T
|   |   |   |-- ParticleField.tsx  # Ambient floating particles
|   |   |   |-- GoldLight.tsx      # Gold volumetric light/glow effect
|   |   |-- motion/
|   |   |   |-- TextReveal.tsx     # Animated text — word-by-word, fade, scale
|   |   |   |-- FeaturePanel.tsx   # 2D feature card (icon + label + description)
|   |   |   |-- FlowPipeline.tsx   # The golden workflow animation
|   |   |   |-- Logo.tsx           # MTM logo animation
|   |   |-- audio/
|   |   |   |-- AudioLayer.tsx     # Wrapper for layered audio tracks
|   |-- lib/
|   |   |-- colors.ts              # Color palette constants
|   |   |-- timing.ts              # Frame/second helpers, act boundaries
|   |   |-- animations.ts          # Shared spring configs and easing
|-- public/
|   |-- audio/
|   |   |-- vo-act1.mp3            # Voiceover tracks (one per act)
|   |   |-- vo-act2.mp3
|   |   |-- vo-act3.mp3
|   |   |-- vo-act4.mp3
|   |   |-- vo-act5.mp3
|   |   |-- music.mp3              # Background music track
|   |   |-- sfx-crack.mp3          # Gold light breaking through SFX
|   |   |-- sfx-materialize.mp3    # Team member appearing SFX
|   |   |-- sfx-whoosh.mp3         # Transition whooshes
|   |-- fonts/
|   |   |-- PlayfairDisplay.woff2  # MTM brand font
|   |   |-- Inter.woff2            # Body font
|-- remotion.config.ts
|-- package.json
```

---

## Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Near black | #0a0a08 |
| 10T (orchestrator) | Gold | #c9a84c |
| Gold accent/glow | Light gold | #e2c873 |
| Text (primary) | Cream | #f0ebe0 |
| Text (secondary) | Muted | #8a8578 |
| Researcher | Blue | #4a9eff |
| HR Architect | Green | #5db56e |
| Developer | Cyan | #4ecdc4 |
| Designer | Purple | #a78bfa |
| New hire (pipeline) | Orange | #f59e0b |
| Ambient particles | Dim gold | rgba(201,168,76,0.15) |

---

## Detailed Scene Breakdown

### Act 1: The Problem (0:00 - 0:15) — 450 frames at 30fps

**Type:** 3D (R3F) — minimal, mostly void

**Visual sequence:**
1. **Frames 0-30 (0-1s):** Pure black. A single white cursor blinks.
2. **Frames 30-150 (1-5s):** Text fragments fade in and dissolve around the cursor — snippets like "fix the bug", "where was I?", "start over", "lost context". Each appears for ~1.5s, drifts slightly, then dissolves into particles. These represent scattered, ephemeral AI sessions.
3. **Frames 150-300 (5-10s):** More fragments appear faster, overlapping, creating visual chaos. Camera slowly pulls back revealing the fragments are floating in an empty void.
4. **Frames 300-450 (10-15s):** All fragments dissolve simultaneously. Brief moment of total darkness. Silence.

**Audio:**
- VO begins at frame 15 (~0.5s): *"You're using AI like a chatbot. One conversation. One persona. No memory. Every session starts from zero."*
- Music: Very low ambient drone, building tension
- SFX: Soft digital glitch sounds on each text fragment dissolving

---

### Act 2: The Revelation (0:15 - 0:30) — 450 frames

**Type:** 3D (R3F) — the hero scene

**Visual sequence:**
1. **Frames 450-510 (15-17s):** In the darkness, a hairline crack of gold light appears. SFX: deep resonant crack sound.
2. **Frames 510-570 (17-19s):** The crack widens. Gold light pours through. Camera slowly pushes in.
3. **Frames 570-660 (19-22s):** The void shatters outward. Gold particles rush toward camera and coalesce into **10T** — a humanoid silhouette made of thousands of gold particles. 10T stands at center frame, particles gently orbiting its form. Camera settles at medium shot.
4. **Frames 660-750 (22-25s):** The parable quote fades in below 10T in Playfair Display: *"Master, you gave me five talents. Look, I have gained five more."* — Matthew 25:20
5. **Frames 750-900 (25-30s):** Camera slowly orbits 10T as VO explains who 10T is. Ambient gold particles drift in the background.

**Audio:**
- VO at frame 450: *"What if your AI wasn't a tool... it was a team?"*
- VO at frame 600: *"Meet 10T. The faithful steward..."*
- Music: Dramatic swell at the crack, transitions to epic but controlled
- SFX: Glass/void cracking, particle whoosh on coalescence

**10T Visual Detail:**
- ~2000-5000 particles forming a standing human shape
- Particles drift slightly but hold form — alive, not static
- Gold core (#c9a84c) with lighter edges (#e2c873)
- Subtle glow/bloom effect around the silhouette
- Slightly taller and more prominent than team members will be

---

### Act 3: The Team (0:30 - 0:50) — 600 frames

**Type:** 3D (R3F)

**Visual sequence:**
1. **Frames 900-990 (30-33s):** 10T gestures outward (particle arm extends). A pulse of gold energy radiates from 10T's hand.
2. **Frames 990-1080 (33-36s):** First team member materializes — Researcher in **blue** (#4a9eff). Particles swirl in from the void and coalesce into a smaller humanoid silhouette. A line of light connects it to 10T. Name label fades in: "Researcher."
3. **Frames 1080-1170 (36-39s):** HR Architect materializes in **green** (#5db56e). Same particle coalescence animation but from a different direction. Connected to 10T.
4. **Frames 1170-1260 (39-42s):** Developer in **cyan** (#4ecdc4) and Designer in **purple** (#a78bfa) materialize simultaneously on opposite sides.
5. **Frames 1260-1350 (42-45s):** Camera pulls back to reveal the full constellation — 10T at center, 4 members orbiting, connected by light lines. The constellation slowly rotates.
6. **Frames 1350-1500 (45-50s):** The hiring pipeline sequence — a gap glows in the constellation. Particles rush in from the void. A new **orange** (#f59e0b) silhouette materializes. New lines connect. The constellation is now complete with 5 members.

**Audio:**
- VO at frame 900: *"10T delegates to a team of specialists — each with their own name, identity, and expertise."*
- VO at frame 1200: *"A Researcher who investigates. An HR Architect who designs new hires. Developers. Designers."*
- VO at frame 1350: *"No one on the team for the job? The hiring pipeline fires — a new specialist is researched, designed, and onboarded. Your team grows based on what you actually need."*
- Music: Building, layered, each member arrival punctuated
- SFX: Whoosh + crystallize sound on each materialization, soft hum on connection lines

**Team Member Visual Detail:**
- ~1000-2000 particles each (smaller than 10T)
- Each member's unique color
- Subtler glow than 10T
- Connected to 10T by thin animated lines (particles flowing along the line toward 10T)
- The constellation orbits slowly (~1 revolution per 30 seconds)

---

### Act 4: The System (0:50 - 1:10) — 600 frames

**Type:** 2D motion graphics (Remotion native)

**Transition:** The 3D constellation blurs and scales back. 2D panels begin sliding in over a dark background with faint gold grid lines.

**Visual sequence:**

Each feature gets ~3 seconds (90 frames). Features appear as animated panels — a bold title, a one-line description, and a minimal icon or visual:

1. **Frames 1500-1590:** "95% Rule" — *Ask until you understand.* Icon: question mark morphing into a checkmark.
2. **Frames 1590-1680:** "Test-Driven Development" — *Test first. Always.* Icon: red dot turning green.
3. **Frames 1680-1770:** "Standards" — *Every rule exists because something went wrong.* Icon: shield.
4. **Frames 1770-1860:** "Progress Tracking" — *No session starts from zero.* Icon: bookmark with a play button.

5. **Frames 1860-2100 (62-70s):** The golden workflow pipeline animates across the full width:

```
Brainstorm -> Design Spec -> Plan -> Build (TDD) -> Review -> Verify -> Deliver
```

Each step lights up in sequence with a gold pulse traveling left to right. This is the visual climax of the explanatory section.

**Audio:**
- VO at frame 1500: *"But a team without discipline is just noise."*
- VO at frame 1590: Brief callout for each feature (1-2 words each, fast)
- VO at frame 1860: *"Brainstorm. Plan. Build. Review. Verify. Deliver. Every time."*
- Music: Rhythmic, each feature hits on beat
- SFX: Subtle click/snap on each panel appearance

**Panel Visual Style:**
- Dark card with thin gold border, slight frosted glass effect
- Title in Playfair Display, cream (#f0ebe0)
- Description in Inter, muted (#8a8578)
- Cards slide in from right, stack or replace
- Gold accent line on left edge of each card

---

### Act 5: The Call (1:10 - 1:25) — 450 frames

**Type:** 3D (R3F) returning to the constellation + 2D overlay

**Visual sequence:**
1. **Frames 2100-2250 (70-75s):** Transition back to 3D. The constellation fades back in — now all 6 members orbiting 10T, all glowing, lines pulsing with light. Camera pulls back to a wide shot. The constellation is beautiful and complete.
2. **Frames 2250-2370 (75-79s):** The MTM logo animates in above the constellation. "Many" in cream, "Talents" in gold gradient, "More" in cream. Trademark symbol in green.
3. **Frames 2370-2430 (79-81s):** Below the logo, the URL fades in: **manytalentsmore.com** in cream. Below that, smaller: *"Open source on GitHub"* with a GitHub icon.
4. **Frames 2430-2550 (81-85s):** The parable quote fades in below everything: *"Well done, good and faithful servant."* — Matthew 25:23. Hold for impact.
5. **Frames 2550-2700 (85-90s):** Everything gently fades. Music resolves. Black.

**Audio:**
- VO at frame 2100: *"This is Many Talents More. An AI team orchestration framework built on the Parable of the Talents. Open source. Free forever."*
- VO at frame 2430: *"Well done, good and faithful servant."* (delivered with weight — this is the emotional peak)
- Music: Final swell, then gentle resolution
- SFX: None — let the music and voice carry it

---

## Audio Architecture

### Voiceover
- **Source:** Synthesized from Chris's voice samples (ElevenLabs or similar)
- **Format:** MP3 or WAV, one file per act for easy timing adjustment
- **Character voices (stretch goal):** Different synthesized voices for quoted characters. Chris's voice as primary narrator. Girlfriend's voice for the parable quote. Custom voice for 10T's identity.

### Background Music
- **Style:** Epic, inspirational, building. Think Hans Zimmer-lite — not bombastic, but weighty. Strings + synth pads + subtle percussion.
- **Source:** Epidemic Sound, Artlist, or YouTube Audio Library (royalty-free)
- **Structure:** Low drone (Act 1) -> dramatic swell (Act 2) -> building layers (Act 3) -> rhythmic pulse (Act 4) -> final resolution (Act 5)
- **Key requirement:** Music must have a clear beat in Act 4 for the feature panels to hit on rhythm

### Sound Effects
- Digital glitch (Act 1 text dissolving)
- Deep crack/shatter (Act 2 void breaking)
- Particle whoosh (Act 2 coalescence, Act 3 materializations)
- Crystallize/solidify (Act 3 each member forming)
- Connection hum (Act 3 light lines)
- Click/snap (Act 4 panel appearances)
- Gold pulse whoosh (Act 4 pipeline flow)

---

## Rendering

- **Resolution:** 1920x1080 (16:9)
- **Framerate:** 30fps
- **Codec:** H.264 (MP4) for YouTube
- **Total frames:** ~2550-2700 (85-90 seconds)
- **Estimated render time:** 5-15 minutes locally (mix of 3D and 2D scenes)
- **Preview during dev:** `npx remotion studio` for real-time preview

---

## Dependencies

```json
{
  "remotion": "^4.x",
  "@remotion/cli": "^4.x",
  "@remotion/three": "^4.x",
  "@remotion/transitions": "^4.x",
  "@remotion/noise": "^4.x",
  "three": "^0.160.x",
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "react": "^18.x",
  "typescript": "^5.x"
}
```

**Note:** Test each drei helper individually — some rely on `useFrame()` which breaks in Remotion.

---

## What's NOT In Scope

- YouTube channel setup, SEO, thumbnails (separate task)
- Social media cuts (30s versions for X/Reddit — can be done later from same source)
- Subtitles/captions (can be added post-render or as a Remotion component later)
- Multiple language versions
- Interactive web version

---

## Success Criteria

1. Video renders cleanly at 1080p/30fps with no visual glitches
2. 10T particle silhouette is recognizable as humanoid and visually striking
3. Team member materialization sequence feels epic, not cheap
4. Audio (VO + music + SFX) is properly synced and balanced
5. The pacing holds attention for the full 85-90 seconds
6. CTA is clear — viewer knows to visit manytalentsmore.com and star the GitHub repo
7. Chris approves the final render for YouTube upload
