# MTM Explainer Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 75-90 second Remotion + R3F hybrid explainer video for the Many Talents More AI team framework.

**Architecture:** Five-act video with 3D particle silhouette scenes (Acts 1-3, 5) rendered via `@remotion/three` and 2D motion graphics (Act 4) using Remotion's native `spring()` + `interpolate()`. Each act is an isolated React component sequenced in a master composition. Audio is layered VO + music + SFX via `<Audio>` components.

**Tech Stack:** Remotion v4, @remotion/three, @remotion/transitions, react-three-fiber, three.js, TypeScript, React 18

---

## File Map

```
mtm-video/
├── src/
│   ├── Root.tsx                          # Registers composition
│   ├── Video.tsx                         # Master sequence — all 5 acts
│   ├── lib/
│   │   ├── colors.ts                     # Color palette constants
│   │   ├── timing.ts                     # FPS, act durations, frame helpers
│   │   └── animations.ts                 # Shared spring configs
│   ├── components/
│   │   ├── three/
│   │   │   ├── HumanoidParticles.tsx     # Particle silhouette (shared by 10T + members)
│   │   │   ├── ConnectionLine.tsx        # Animated light line between two points
│   │   │   ├── ParticleField.tsx         # Ambient floating background particles
│   │   │   └── GoldLight.tsx             # Point light + bloom config
│   │   ├── motion/
│   │   │   ├── TextReveal.tsx            # Animated text (fade, word-by-word, scale)
│   │   │   ├── FeaturePanel.tsx          # 2D feature card with icon
│   │   │   ├── FlowPipeline.tsx          # Golden workflow animation
│   │   │   └── Logo.tsx                  # MTM logo animation
│   │   └── audio/
│   │       └── AudioLayer.tsx            # Layered audio with volume interpolation
│   └── acts/
│       ├── Act1Problem.tsx               # The Problem (0-15s)
│       ├── Act2Revelation.tsx            # The Revelation (15-30s)
│       ├── Act3Team.tsx                  # The Team (30-50s)
│       ├── Act4System.tsx                # The System (50-70s)
│       └── Act5Call.tsx                  # The Call (70-85s)
├── public/
│   ├── audio/                            # VO, music, SFX (added manually)
│   └── fonts/                            # PlayfairDisplay, Inter
├── remotion.config.ts
├── tsconfig.json
└── package.json
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `mtm-video/package.json`
- Create: `mtm-video/tsconfig.json`
- Create: `mtm-video/remotion.config.ts`
- Create: `mtm-video/src/Root.tsx`
- Create: `mtm-video/src/Video.tsx`
- Create: `mtm-video/src/lib/colors.ts`
- Create: `mtm-video/src/lib/timing.ts`
- Create: `mtm-video/src/lib/animations.ts`

- [ ] **Step 1: Create the Remotion project**

Run from `C:\Users\chris\OneDrive\Documentos\`:
```bash
npx create-video@latest mtm-video --template blank
```

Select TypeScript when prompted. This creates the base Remotion project.

- [ ] **Step 2: Install dependencies**

```bash
cd mtm-video
npm install @remotion/three @remotion/transitions @remotion/noise three @react-three/fiber @react-three/drei
npm install -D @types/three
```

- [ ] **Step 3: Verify the dev server launches**

```bash
npx remotion studio
```

Expected: Browser opens with Remotion Studio. A blank composition renders. Close the studio.

- [ ] **Step 4: Create the color palette**

Create `src/lib/colors.ts`:

```typescript
export const COLORS = {
  bg: '#0a0a08',
  gold: '#c9a84c',
  goldLight: '#e2c873',
  textPrimary: '#f0ebe0',
  textSecondary: '#8a8578',
  green: '#5db56e',

  // Team member colors
  researcher: '#4a9eff',
  hr: '#5db56e',
  developer: '#4ecdc4',
  designer: '#a78bfa',
  newHire: '#f59e0b',

  // Ambient
  particleDim: 'rgba(201,168,76,0.15)',
} as const;

// Three.js needs hex numbers
export const COLORS_HEX = {
  bg: 0x0a0a08,
  gold: 0xc9a84c,
  goldLight: 0xe2c873,
  researcher: 0x4a9eff,
  hr: 0x5db56e,
  developer: 0x4ecdc4,
  designer: 0xa78bfa,
  newHire: 0xf59e0b,
} as const;
```

- [ ] **Step 5: Create the timing constants**

Create `src/lib/timing.ts`:

```typescript
export const FPS = 30;
export const TOTAL_DURATION_FRAMES = 2700; // 90 seconds

export const ACTS = {
  act1: { start: 0, duration: 450 },       // 0-15s: The Problem
  act2: { start: 450, duration: 450 },      // 15-30s: The Revelation
  act3: { start: 900, duration: 600 },      // 30-50s: The Team
  act4: { start: 1500, duration: 600 },     // 50-70s: The System
  act5: { start: 2100, duration: 600 },     // 70-90s: The Call
} as const;

/** Convert seconds to frames */
export const s = (seconds: number) => Math.round(seconds * FPS);

/** Convert frames to seconds */
export const toSeconds = (frames: number) => frames / FPS;
```

- [ ] **Step 6: Create shared animation configs**

Create `src/lib/animations.ts`:

```typescript
import { spring, SpringConfig } from 'remotion';

export const SPRING_GENTLE: SpringConfig = {
  damping: 15,
  mass: 0.8,
  stiffness: 80,
};

export const SPRING_SNAPPY: SpringConfig = {
  damping: 12,
  mass: 0.5,
  stiffness: 200,
};

export const SPRING_DRAMATIC: SpringConfig = {
  damping: 10,
  mass: 1.2,
  stiffness: 60,
};
```

- [ ] **Step 7: Create stub act components**

Create `src/acts/Act1Problem.tsx`:
```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../lib/colors';

export const Act1Problem: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ color: COLORS.textPrimary, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        Act 1: The Problem
      </div>
    </AbsoluteFill>
  );
};
```

Create `src/acts/Act2Revelation.tsx`:
```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../lib/colors';

export const Act2Revelation: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ color: COLORS.gold, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        Act 2: The Revelation
      </div>
    </AbsoluteFill>
  );
};
```

Create `src/acts/Act3Team.tsx`:
```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../lib/colors';

export const Act3Team: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ color: COLORS.developer, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        Act 3: The Team
      </div>
    </AbsoluteFill>
  );
};
```

Create `src/acts/Act4System.tsx`:
```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../lib/colors';

export const Act4System: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ color: COLORS.textPrimary, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        Act 4: The System
      </div>
    </AbsoluteFill>
  );
};
```

Create `src/acts/Act5Call.tsx`:
```tsx
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../lib/colors';

export const Act5Call: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ color: COLORS.gold, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        Act 5: The Call
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 8: Create the master Video composition**

Create `src/Video.tsx`:
```tsx
import { Series } from 'remotion';
import { ACTS } from './lib/timing';
import { Act1Problem } from './acts/Act1Problem';
import { Act2Revelation } from './acts/Act2Revelation';
import { Act3Team } from './acts/Act3Team';
import { Act4System } from './acts/Act4System';
import { Act5Call } from './acts/Act5Call';

export const Video: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={ACTS.act1.duration}>
        <Act1Problem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACTS.act2.duration}>
        <Act2Revelation />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACTS.act3.duration}>
        <Act3Team />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACTS.act4.duration}>
        <Act4System />
      </Series.Sequence>
      <Series.Sequence durationInFrames={ACTS.act5.duration}>
        <Act5Call />
      </Series.Sequence>
    </Series>
  );
};
```

- [ ] **Step 9: Wire up Root.tsx**

Replace `src/Root.tsx` with:
```tsx
import { Composition } from 'remotion';
import { Video } from './Video';
import { FPS, TOTAL_DURATION_FRAMES } from './lib/timing';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ManyTalentsMore"
      component={Video}
      durationInFrames={TOTAL_DURATION_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
```

- [ ] **Step 10: Verify all five acts render in sequence**

```bash
npx remotion studio
```

Expected: Remotion Studio opens. Scrubbing the timeline shows all 5 act placeholders in sequence — each filling 1920x1080 with its label and colored text on dark background. Total duration shows 90 seconds.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Remotion project with 5 act stubs and shared lib"
```

---

### Task 2: Shared 3D Components — Particle Silhouette

**Files:**
- Create: `src/components/three/HumanoidParticles.tsx`
- Create: `src/components/three/ParticleField.tsx`
- Create: `src/components/three/GoldLight.tsx`

- [ ] **Step 1: Create the humanoid particle silhouette component**

Create `src/components/three/HumanoidParticles.tsx`:

```tsx
import React, { useMemo, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { COLORS_HEX } from '../../lib/colors';

interface HumanoidParticlesProps {
  color?: number;
  particleCount?: number;
  scale?: number;
  opacity?: number;
  /** 0 = dispersed, 1 = fully formed */
  formProgress?: number;
  position?: [number, number, number];
}

/**
 * Generates points roughly shaped like a standing human silhouette.
 * Uses simple ellipsoid sections: head, torso, arms, legs.
 */
function generateHumanoidPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  // Body part proportions (centered at origin, standing upright on Y axis)
  // Total height ~3 units: legs (-1.5 to -0.3), torso (-0.3 to 0.8), arms, head (0.8 to 1.5)
  const parts = [
    { yMin: 1.0, yMax: 1.5, radiusX: 0.25, radiusZ: 0.25, weight: 0.12 },   // Head
    { yMin: 0.3, yMax: 1.0, radiusX: 0.4, radiusZ: 0.22, weight: 0.28 },    // Torso
    { yMin: 0.0, yMax: 0.9, radiusX: 0.85, radiusZ: 0.15, weight: 0.15 },   // Arms
    { yMin: -1.5, yMax: -0.0, radiusX: 0.35, radiusZ: 0.2, weight: 0.25 },  // Legs (wider)
    { yMin: -0.3, yMax: 0.3, radiusX: 0.45, radiusZ: 0.25, weight: 0.10 },  // Hips
    { yMin: 0.85, yMax: 1.05, radiusX: 0.5, radiusZ: 0.2, weight: 0.10 },   // Shoulders
  ];

  let idx = 0;
  for (let i = 0; i < count; i++) {
    // Pick a body part based on weight
    let r = Math.random();
    let part = parts[0];
    let cumulative = 0;
    for (const p of parts) {
      cumulative += p.weight;
      if (r <= cumulative) {
        part = p;
        break;
      }
    }

    const y = part.yMin + Math.random() * (part.yMax - part.yMin);
    const angle = Math.random() * Math.PI * 2;
    const radiusJitter = 0.7 + Math.random() * 0.3;
    const x = Math.cos(angle) * part.radiusX * radiusJitter;
    const z = Math.sin(angle) * part.radiusZ * radiusJitter;

    positions[idx++] = x;
    positions[idx++] = y;
    positions[idx++] = z;
  }

  return positions;
}

export const HumanoidParticles: React.FC<HumanoidParticlesProps> = ({
  color = COLORS_HEX.gold,
  particleCount = 2500,
  scale = 1,
  opacity = 1,
  formProgress = 1,
  position = [0, 0, 0],
}) => {
  const frame = useCurrentFrame();
  const pointsRef = useRef<THREE.Points>(null);

  const { targetPositions, randomPositions } = useMemo(() => {
    const target = generateHumanoidPositions(particleCount);
    const random = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      random[i] = (Math.random() - 0.5) * 20; // Scattered in a 20-unit cube
    }
    return { targetPositions: target, randomPositions: random };
  }, [particleCount]);

  const currentPositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const t = Math.max(0, Math.min(1, formProgress));

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = randomPositions[i] * (1 - t) + targetPositions[i] * t;
    }

    // Add gentle drift based on frame
    const time = frame / 30;
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const seed = i * 0.01;
      positions[idx] += Math.sin(time * 0.5 + seed) * 0.02 * t;
      positions[idx + 1] += Math.cos(time * 0.3 + seed * 2) * 0.015 * t;
      positions[idx + 2] += Math.sin(time * 0.4 + seed * 3) * 0.02 * t;
    }

    return positions;
  }, [frame, formProgress, particleCount, randomPositions, targetPositions]);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[currentPositions, 3]}
            count={particleCount}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color={color}
          transparent
          opacity={opacity}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};
```

- [ ] **Step 2: Create the ambient particle field**

Create `src/components/three/ParticleField.tsx`:

```tsx
import React, { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { COLORS_HEX } from '../../lib/colors';

interface ParticleFieldProps {
  count?: number;
  spread?: number;
  opacity?: number;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 500,
  spread = 15,
  opacity = 0.3,
}) => {
  const frame = useCurrentFrame();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return pos;
  }, [count, spread]);

  const animatedPositions = useMemo(() => {
    const pos = new Float32Array(positions);
    const time = frame / 30;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const seed = i * 0.1;
      pos[idx] += Math.sin(time * 0.2 + seed) * 0.1;
      pos[idx + 1] += Math.cos(time * 0.15 + seed) * 0.1;
    }
    return pos;
  }, [frame, positions, count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[animatedPositions, 3]}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={COLORS_HEX.gold}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
```

- [ ] **Step 3: Create the gold light component**

Create `src/components/three/GoldLight.tsx`:

```tsx
import React from 'react';
import { COLORS_HEX } from '../../lib/colors';

interface GoldLightProps {
  intensity?: number;
  position?: [number, number, number];
}

export const GoldLight: React.FC<GoldLightProps> = ({
  intensity = 2,
  position = [0, 2, 4],
}) => {
  return (
    <>
      <ambientLight intensity={0.1} color={COLORS_HEX.goldLight} />
      <pointLight
        position={position}
        intensity={intensity}
        color={COLORS_HEX.gold}
        distance={20}
        decay={2}
      />
    </>
  );
};
```

- [ ] **Step 4: Verify — create a quick test scene**

Temporarily update `src/acts/Act2Revelation.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { COLORS } from '../lib/colors';
import { HumanoidParticles } from '../components/three/HumanoidParticles';
import { ParticleField } from '../components/three/ParticleField';
import { GoldLight } from '../components/three/GoldLight';

export const Act2Revelation: React.FC = () => {
  const frame = useCurrentFrame();
  const formProgress = interpolate(frame, [0, 120], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{ position: [0, 0.5, 5], fov: 50 }}
      >
        <GoldLight />
        <HumanoidParticles formProgress={formProgress} />
        <ParticleField />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Preview in Remotion Studio**

```bash
npx remotion studio
```

Expected: Navigate to Act 2 in the timeline. Scrubbing from frame 0 to 120 shows particles converging from random positions into a humanoid silhouette. Gold color, dark background, ambient particles floating. The silhouette should be recognizably human-shaped (head, torso, arms, legs).

- [ ] **Step 6: Commit**

```bash
git add src/components/three/ src/acts/Act2Revelation.tsx
git commit -m "feat: add HumanoidParticles, ParticleField, GoldLight 3D components"
```

---

### Task 3: Shared 2D Components — TextReveal, FeaturePanel, Logo

**Files:**
- Create: `src/components/motion/TextReveal.tsx`
- Create: `src/components/motion/FeaturePanel.tsx`
- Create: `src/components/motion/FlowPipeline.tsx`
- Create: `src/components/motion/Logo.tsx`

- [ ] **Step 1: Create the TextReveal component**

Create `src/components/motion/TextReveal.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface TextRevealProps {
  text: string;
  startFrame?: number;
  style?: React.CSSProperties;
  mode?: 'fade' | 'word-by-word' | 'scale';
  /** Duration in frames for the reveal animation */
  duration?: number;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  startFrame = 0,
  style = {},
  mode = 'fade',
  duration = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  if (mode === 'fade') {
    const opacity = interpolate(relativeFrame, [0, duration], [0, 1], {
      extrapolateRight: 'clamp',
    });
    return <div style={{ ...style, opacity }}>{text}</div>;
  }

  if (mode === 'word-by-word') {
    const words = text.split(' ');
    const framesPerWord = Math.max(1, Math.floor(duration / words.length));

    return (
      <div style={{ ...style, display: 'flex', flexWrap: 'wrap', gap: '0.3em' }}>
        {words.map((word, i) => {
          const wordStart = i * framesPerWord;
          const opacity = interpolate(
            relativeFrame,
            [wordStart, wordStart + framesPerWord],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          return (
            <span key={i} style={{ opacity }}>
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  if (mode === 'scale') {
    const progress = spring({
      frame: relativeFrame,
      fps,
      config: { damping: 12, mass: 0.5, stiffness: 200 },
    });
    return (
      <div
        style={{
          ...style,
          transform: `scale(${progress})`,
          opacity: progress,
        }}
      >
        {text}
      </div>
    );
  }

  return <div style={style}>{text}</div>;
};
```

- [ ] **Step 2: Create the FeaturePanel component**

Create `src/components/motion/FeaturePanel.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../lib/colors';

interface FeaturePanelProps {
  title: string;
  description: string;
  startFrame?: number;
  icon?: string; // emoji or unicode symbol
}

export const FeaturePanel: React.FC<FeaturePanelProps> = ({
  title,
  description,
  startFrame = 0,
  icon,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  const slideIn = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 180 },
  });

  const opacity = interpolate(relativeFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '2rem 2.5rem',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        border: `1px solid rgba(201,168,76,0.2)`,
        borderLeft: `3px solid ${COLORS.gold}`,
        borderRadius: '12px',
        transform: `translateX(${(1 - slideIn) * 80}px)`,
        opacity,
        maxWidth: '700px',
      }}
    >
      {icon && (
        <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>{icon}</div>
      )}
      <div>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '2rem',
            fontWeight: 800,
            color: COLORS.textPrimary,
            marginBottom: '0.3rem',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.1rem',
            color: COLORS.textSecondary,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create the FlowPipeline component**

Create `src/components/motion/FlowPipeline.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../../lib/colors';

const STEPS = [
  'Brainstorm',
  'Design Spec',
  'Plan',
  'Build (TDD)',
  'Review',
  'Verify',
  'Deliver',
];

interface FlowPipelineProps {
  startFrame?: number;
  /** Frames between each step lighting up */
  stagger?: number;
}

export const FlowPipeline: React.FC<FlowPipelineProps> = ({
  startFrame = 0,
  stagger = 20,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0 4rem',
      }}
    >
      {STEPS.map((step, i) => {
        const stepStart = i * stagger;
        const progress = interpolate(
          relativeFrame,
          [stepStart, stepStart + 15],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        const isLit = progress > 0;
        const textColor = isLit ? COLORS.textPrimary : COLORS.textSecondary;
        const bgColor = isLit
          ? `rgba(201,168,76,${0.15 * progress})`
          : 'rgba(255,255,255,0.02)';
        const borderColor = isLit
          ? `rgba(201,168,76,${0.4 * progress})`
          : 'rgba(255,255,255,0.05)';

        return (
          <React.Fragment key={i}>
            <div
              style={{
                padding: '0.8rem 1.2rem',
                borderRadius: '8px',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.95rem',
                fontWeight: 600,
                color: textColor,
                whiteSpace: 'nowrap',
                transform: `scale(${0.9 + progress * 0.1})`,
                transition: 'none',
              }}
            >
              {step}
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  color: isLit ? COLORS.gold : COLORS.textSecondary,
                  fontSize: '1.2rem',
                  opacity: progress,
                }}
              >
                {'\u2192'}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Create the Logo component**

Create `src/components/motion/Logo.tsx`:

```tsx
import React from 'react';
import { useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { COLORS } from '../../lib/colors';

interface LogoProps {
  startFrame?: number;
}

export const Logo: React.FC<LogoProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) return null;

  const scale = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 12, mass: 0.8, stiffness: 100 },
  });

  return (
    <div
      style={{
        textAlign: 'center',
        transform: `scale(${scale})`,
        opacity: scale,
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '4rem',
          fontWeight: 800,
          color: COLORS.textPrimary,
          lineHeight: 1.1,
        }}
      >
        Many
        <span
          style={{
            background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.goldLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Talents
        </span>{' '}
        More
        <sup
          style={{
            color: COLORS.green,
            fontSize: '1.5rem',
            WebkitTextFillColor: COLORS.green,
          }}
        >
          {'\u2122'}
        </sup>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Preview — temporarily wire FeaturePanel and FlowPipeline into Act4**

Update `src/acts/Act4System.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS } from '../lib/colors';
import { FeaturePanel } from '../components/motion/FeaturePanel';
import { FlowPipeline } from '../components/motion/FlowPipeline';

export const Act4System: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '4rem',
      }}
    >
      <FeaturePanel title="95% Rule" description="Ask until you understand." icon={'\u2753'} startFrame={0} />
      <FeaturePanel title="TDD" description="Test first. Always." icon={'\u2705'} startFrame={90} />
      <FeaturePanel title="Standards" description="Every rule exists because something went wrong." icon={'\U0001F6E1'} startFrame={180} />
      <FeaturePanel title="Progress" description="No session starts from zero." icon={'\U0001F516'} startFrame={270} />
      <FlowPipeline startFrame={360} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 6: Preview in Remotion Studio**

```bash
npx remotion studio
```

Expected: Act 4 shows feature panels sliding in one by one with gold left border, then the flow pipeline lights up step by step. Clean 2D motion graphics on dark background.

- [ ] **Step 7: Commit**

```bash
git add src/components/motion/ src/acts/Act4System.tsx
git commit -m "feat: add TextReveal, FeaturePanel, FlowPipeline, Logo 2D components"
```

---

### Task 4: Connection Line Component

**Files:**
- Create: `src/components/three/ConnectionLine.tsx`

- [ ] **Step 1: Create the animated connection line**

Create `src/components/three/ConnectionLine.tsx`:

```tsx
import React, { useMemo } from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import * as THREE from 'three';

interface ConnectionLineProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: number;
  opacity?: number;
  /** Frame at which the line starts drawing */
  startFrame?: number;
  /** Frames to fully draw the line */
  drawDuration?: number;
}

export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  from,
  to,
  color = 0xc9a84c,
  opacity = 0.4,
  startFrame = 0,
  drawDuration = 30,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const progress = interpolate(relativeFrame, [0, drawDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const current = start.clone().lerp(end, progress);
    return [start, current];
  }, [from, to, progress]);

  if (progress <= 0) return null;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity * progress}
        linewidth={1}
      />
    </line>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/three/ConnectionLine.tsx
git commit -m "feat: add ConnectionLine animated 3D component"
```

---

### Task 5: Audio Layer Component

**Files:**
- Create: `src/components/audio/AudioLayer.tsx`
- Create: `public/audio/.gitkeep`

- [ ] **Step 1: Create the AudioLayer wrapper**

Create `src/components/audio/AudioLayer.tsx`:

```tsx
import React from 'react';
import { Audio, interpolate, Sequence, useCurrentFrame } from 'remotion';

interface AudioLayerProps {
  src: string;
  /** Start frame for this audio */
  startFrame?: number;
  /** Volume 0-1 */
  volume?: number;
  /** Fade in duration in frames */
  fadeIn?: number;
  /** Fade out start (frames before end of composition) */
  fadeOutFramesBeforeEnd?: number;
}

export const AudioLayer: React.FC<AudioLayerProps> = ({
  src,
  startFrame = 0,
  volume = 1,
  fadeIn = 0,
  fadeOutFramesBeforeEnd = 0,
}) => {
  return (
    <Sequence from={startFrame}>
      <Audio
        src={src}
        volume={(f) => {
          let vol = volume;

          // Fade in
          if (fadeIn > 0) {
            vol *= interpolate(f, [0, fadeIn], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
          }

          return vol;
        }}
      />
    </Sequence>
  );
};
```

- [ ] **Step 2: Create placeholder audio directory**

```bash
mkdir -p public/audio
touch public/audio/.gitkeep
mkdir -p public/fonts
touch public/fonts/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add src/components/audio/ public/audio/ public/fonts/
git commit -m "feat: add AudioLayer component and asset directories"
```

---

### Task 6: Act 1 — The Problem

**Files:**
- Modify: `src/acts/Act1Problem.tsx`

- [ ] **Step 1: Implement Act 1 — scattered text fragments in 3D void**

Replace `src/acts/Act1Problem.tsx`:

```tsx
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';

const FRAGMENTS = [
  'fix the bug',
  'where was I?',
  'start over',
  'lost context',
  'one conversation',
  'no memory',
  'forgot the decision',
  'which file was it?',
  'what did we try?',
  'session expired',
];

interface FragmentProps {
  text: string;
  x: number;
  y: number;
  appearFrame: number;
  duration: number;
}

const Fragment: React.FC<FragmentProps> = ({ text, x, y, appearFrame, duration }) => {
  const frame = useCurrentFrame();
  const relFrame = frame - appearFrame;

  if (relFrame < 0 || relFrame > duration) return null;

  const opacity = interpolate(
    relFrame,
    [0, 15, duration - 20, duration],
    [0, 0.6, 0.6, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const drift = relFrame * 0.15;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `translateY(${-drift}px)`,
        color: COLORS.textSecondary,
        fontFamily: "'Inter', monospace",
        fontSize: '1.4rem',
        opacity,
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
      }}
    >
      {text}
    </div>
  );
};

export const Act1Problem: React.FC = () => {
  const frame = useCurrentFrame();

  // Cursor blink
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;

  // Fragments appear staggered
  const fragments = useMemo(
    () =>
      FRAGMENTS.map((text, i) => ({
        text,
        x: 15 + ((i * 37) % 65), // pseudo-random spread
        y: 10 + ((i * 23) % 70),
        appearFrame: 30 + i * 25,
        duration: 90,
      })),
    []
  );

  // All fragments dissolve at frame ~380
  const finalFadeOut = interpolate(frame, [380, 430], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', opacity: finalFadeOut }}>
        {/* Blinking cursor at center */}
        {frame < 380 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '32px',
              backgroundColor: COLORS.textPrimary,
              opacity: cursorVisible ? 0.7 : 0,
            }}
          />
        )}

        {/* Scattered text fragments */}
        {fragments.map((frag, i) => (
          <Fragment key={i} {...frag} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Remotion Studio**

```bash
npx remotion studio
```

Expected: Act 1 shows a blinking cursor, then text fragments ("fix the bug", "where was I?", "start over", etc.) appear and drift one by one, creating a sense of chaos. At ~frame 380, everything fades to black.

- [ ] **Step 3: Commit**

```bash
git add src/acts/Act1Problem.tsx
git commit -m "feat: implement Act 1 — scattered text fragments in void"
```

---

### Task 7: Act 2 — The Revelation (10T Appears)

**Files:**
- Modify: `src/acts/Act2Revelation.tsx`

- [ ] **Step 1: Implement Act 2 — gold crack, 10T coalescence, parable quote**

Replace `src/acts/Act2Revelation.tsx`:

```tsx
import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { COLORS } from '../lib/colors';
import { HumanoidParticles } from '../components/three/HumanoidParticles';
import { ParticleField } from '../components/three/ParticleField';
import { GoldLight } from '../components/three/GoldLight';
import { TextReveal } from '../components/motion/TextReveal';

export const Act2Revelation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Gold crack (frames 0-90)
  const crackProgress = interpolate(frame, [30, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase 2: 10T forms (frames 90-240)
  const formProgress = interpolate(frame, [90, 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Phase 3: Camera settles, quote appears (frames 240+)
  const quoteOpacity = interpolate(frame, [240, 280], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Light intensity ramps with the crack
  const lightIntensity = interpolate(frame, [0, 30, 90, 150], [0, 0, 2, 3], {
    extrapolateRight: 'clamp',
  });

  // Camera slowly orbits after 10T forms
  const orbitAngle = interpolate(frame, [240, 450], [0, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const camX = Math.sin(orbitAngle) * 5;
  const camZ = Math.cos(orbitAngle) * 5;

  // Flash on crack
  const flashOpacity = interpolate(frame, [85, 95, 110], [0, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* 3D Scene */}
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{ position: [camX, 0.5, camZ], fov: 50 }}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <GoldLight intensity={lightIntensity} />
        <HumanoidParticles
          formProgress={formProgress}
          opacity={interpolate(frame, [60, 120], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
        <ParticleField
          opacity={interpolate(frame, [90, 150], [0, 0.3], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
      </ThreeCanvas>

      {/* Gold crack effect (CSS overlay) */}
      {crackProgress > 0 && crackProgress < 1 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${crackProgress * 4}px`,
            height: `${100 + crackProgress * 400}px`,
            background: `linear-gradient(180deg, transparent, ${COLORS.gold}, ${COLORS.goldLight}, ${COLORS.gold}, transparent)`,
            opacity: 1 - formProgress,
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* Flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: COLORS.goldLight,
          opacity: flashOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Parable quote */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          width: '100%',
          textAlign: 'center',
          opacity: quoteOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.6rem',
            fontStyle: 'italic',
            color: COLORS.goldLight,
            marginBottom: '0.5rem',
          }}
        >
          &ldquo;Master, you gave me five talents. Look, I have gained five
          more.&rdquo;
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            color: COLORS.textSecondary,
          }}
        >
          Matthew 25:20
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Remotion Studio**

Expected: Act 2 starts dark, a gold crack of light appears and widens, flashes, then 10T's particle silhouette coalesces from scattered particles into humanoid form. Camera gently orbits. Parable quote fades in at the bottom.

- [ ] **Step 3: Commit**

```bash
git add src/acts/Act2Revelation.tsx
git commit -m "feat: implement Act 2 — gold crack, 10T coalescence, parable quote"
```

---

### Task 8: Act 3 — The Team

**Files:**
- Modify: `src/acts/Act3Team.tsx`

- [ ] **Step 1: Implement Act 3 — team members materializing around 10T**

Replace `src/acts/Act3Team.tsx`:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { COLORS, COLORS_HEX } from '../lib/colors';
import { HumanoidParticles } from '../components/three/HumanoidParticles';
import { ParticleField } from '../components/three/ParticleField';
import { GoldLight } from '../components/three/GoldLight';
import { ConnectionLine } from '../components/three/ConnectionLine';
import { TextReveal } from '../components/motion/TextReveal';

const TEAM_MEMBERS = [
  { name: 'Researcher', color: COLORS_HEX.researcher, angle: 0, appearFrame: 90 },
  { name: 'HR Architect', color: COLORS_HEX.hr, angle: (2 * Math.PI) / 5, appearFrame: 180 },
  { name: 'Developer', color: COLORS_HEX.developer, angle: (4 * Math.PI) / 5, appearFrame: 270 },
  { name: 'Designer', color: COLORS_HEX.designer, angle: (6 * Math.PI) / 5, appearFrame: 270 },
  { name: 'New Hire', color: COLORS_HEX.newHire, angle: (8 * Math.PI) / 5, appearFrame: 450 },
];

const ORBIT_RADIUS = 3;

export const Act3Team: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow constellation rotation
  const rotation = interpolate(frame, [0, 600], [0, Math.PI * 0.15], {
    extrapolateRight: 'clamp',
  });

  // Camera pull-back at frame 360
  const camZ = interpolate(frame, [0, 360, 450], [5, 5, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <ThreeCanvas
        width={1920}
        height={1080}
        camera={{ position: [0, 1, camZ], fov: 50 }}
      >
        <GoldLight intensity={2.5} />

        {/* 10T at center — already formed */}
        <HumanoidParticles formProgress={1} scale={1} />

        {/* Rotating group for team members */}
        <group rotation={[0, rotation, 0]}>
          {TEAM_MEMBERS.map((member, i) => {
            const formProgress = interpolate(
              frame,
              [member.appearFrame, member.appearFrame + 90],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

            if (formProgress <= 0) return null;

            const x = Math.cos(member.angle) * ORBIT_RADIUS;
            const z = Math.sin(member.angle) * ORBIT_RADIUS;

            return (
              <React.Fragment key={i}>
                <HumanoidParticles
                  color={member.color}
                  particleCount={1500}
                  scale={0.6}
                  formProgress={formProgress}
                  opacity={formProgress}
                  position={[x, 0, z]}
                />
                <ConnectionLine
                  from={[0, 0.3, 0]}
                  to={[x, 0.3, z]}
                  color={member.color}
                  startFrame={member.appearFrame + 60}
                  drawDuration={30}
                />
              </React.Fragment>
            );
          })}
        </group>

        <ParticleField opacity={0.2} />
      </ThreeCanvas>

      {/* Team member name labels */}
      {TEAM_MEMBERS.map((member, i) => {
        const labelOpacity = interpolate(
          frame,
          [member.appearFrame + 60, member.appearFrame + 90],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        if (labelOpacity <= 0) return null;

        // Approximate 2D screen positions for labels
        const positions = [
          { left: '72%', top: '35%' },
          { left: '20%', top: '30%' },
          { left: '78%', top: '60%' },
          { left: '18%', top: '62%' },
          { left: '50%', top: '75%' },
        ];
        const pos = positions[i] || { left: '50%', top: '50%' };

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              transform: 'translate(-50%, -50%)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              color: `#${member.color.toString(16).padStart(6, '0')}`,
              opacity: labelOpacity,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {member.name}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Remotion Studio**

Expected: 10T stands at center, already formed. Team members materialize one by one at positions around 10T in their unique colors — blue, green, cyan, purple. Connection lines draw from each member to 10T. Camera pulls back to show the constellation. Finally, the orange "New Hire" materializes, completing the constellation.

- [ ] **Step 3: Commit**

```bash
git add src/acts/Act3Team.tsx
git commit -m "feat: implement Act 3 — team constellation materializes around 10T"
```

---

### Task 9: Act 4 — The System (Final)

**Files:**
- Modify: `src/acts/Act4System.tsx`

- [ ] **Step 1: Implement final Act 4 with proper staggered features and pipeline**

Replace `src/acts/Act4System.tsx`:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { COLORS } from '../lib/colors';
import { FeaturePanel } from '../components/motion/FeaturePanel';
import { FlowPipeline } from '../components/motion/FlowPipeline';
import { TextReveal } from '../components/motion/TextReveal';

const FEATURES = [
  { title: '95% Rule', description: 'Ask until you understand.', startFrame: 30 },
  { title: 'Test-Driven Development', description: 'Test first. Always.', startFrame: 120 },
  { title: 'Standards', description: 'Every rule exists because something went wrong.', startFrame: 210 },
  { title: 'Progress Tracking', description: 'No session starts from zero.', startFrame: 300 },
];

export const Act4System: React.FC = () => {
  const frame = useCurrentFrame();

  // Transition in: subtle scale from the 3D constellation
  const transitionIn = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const transitionOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Features phase out before pipeline
  const featuresOpacity = interpolate(frame, [350, 380], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Pipeline phase
  const pipelineOpacity = interpolate(frame, [370, 400], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        transform: `scale(${transitionIn})`,
        opacity: transitionOpacity,
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Feature panels */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
          opacity: featuresOpacity,
        }}
      >
        {FEATURES.map((feat, i) => (
          <FeaturePanel
            key={i}
            title={feat.title}
            description={feat.description}
            startFrame={feat.startFrame}
          />
        ))}
      </div>

      {/* Flow pipeline */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          opacity: pipelineOpacity,
        }}
      >
        <TextReveal
          text="The Golden Workflow"
          startFrame={380}
          mode="scale"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '2.5rem',
            fontWeight: 800,
            color: COLORS.gold,
            textAlign: 'center',
            marginBottom: '3rem',
          }}
        />
        <FlowPipeline startFrame={410} stagger={18} />
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Remotion Studio**

Expected: Act 4 fades in with a subtle gold grid background. Feature panels slide in one by one with titles and descriptions. They fade out, then "The Golden Workflow" title scales in and the pipeline steps light up left to right: Brainstorm -> Design Spec -> Plan -> Build (TDD) -> Review -> Verify -> Deliver.

- [ ] **Step 3: Commit**

```bash
git add src/acts/Act4System.tsx
git commit -m "feat: implement Act 4 — feature panels and golden workflow pipeline"
```

---

### Task 10: Act 5 — The Call

**Files:**
- Modify: `src/acts/Act5Call.tsx`

- [ ] **Step 1: Implement Act 5 — constellation return, logo, CTA, parable close**

Replace `src/acts/Act5Call.tsx`:

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { COLORS, COLORS_HEX } from '../lib/colors';
import { HumanoidParticles } from '../components/three/HumanoidParticles';
import { ParticleField } from '../components/three/ParticleField';
import { GoldLight } from '../components/three/GoldLight';
import { ConnectionLine } from '../components/three/ConnectionLine';
import { Logo } from '../components/motion/Logo';
import { TextReveal } from '../components/motion/TextReveal';

const MEMBERS = [
  { color: COLORS_HEX.researcher, angle: 0 },
  { color: COLORS_HEX.hr, angle: (2 * Math.PI) / 5 },
  { color: COLORS_HEX.developer, angle: (4 * Math.PI) / 5 },
  { color: COLORS_HEX.designer, angle: (6 * Math.PI) / 5 },
  { color: COLORS_HEX.newHire, angle: (8 * Math.PI) / 5 },
];

const ORBIT_RADIUS = 3;

export const Act5Call: React.FC = () => {
  const frame = useCurrentFrame();

  // Constellation fades in
  const sceneOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slow rotation
  const rotation = interpolate(frame, [0, 600], [0, Math.PI * 0.2], {
    extrapolateRight: 'clamp',
  });

  // Final fade to black
  const finalFade = interpolate(frame, [510, 600], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* 3D constellation */}
      <div style={{ opacity: sceneOpacity * finalFade }}>
        <ThreeCanvas
          width={1920}
          height={1080}
          camera={{ position: [0, 1.5, 9], fov: 50 }}
        >
          <GoldLight intensity={2.5} />
          <HumanoidParticles formProgress={1} scale={0.8} position={[0, -0.5, 0]} />

          <group rotation={[0, rotation, 0]}>
            {MEMBERS.map((m, i) => {
              const x = Math.cos(m.angle) * ORBIT_RADIUS;
              const z = Math.sin(m.angle) * ORBIT_RADIUS;
              return (
                <React.Fragment key={i}>
                  <HumanoidParticles
                    color={m.color}
                    particleCount={1200}
                    scale={0.45}
                    formProgress={1}
                    position={[x, -0.5, z]}
                  />
                  <ConnectionLine
                    from={[0, -0.2, 0]}
                    to={[x, -0.2, z]}
                    color={m.color}
                    startFrame={0}
                    drawDuration={1}
                  />
                </React.Fragment>
              );
            })}
          </group>

          <ParticleField opacity={0.25} />
        </ThreeCanvas>
      </div>

      {/* Overlays — logo, CTA, closing quote */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '6%',
          opacity: finalFade,
        }}
      >
        <Logo startFrame={150} />

        <TextReveal
          text="manytalentsmore.com"
          startFrame={270}
          mode="fade"
          duration={30}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.6rem',
            fontWeight: 600,
            color: COLORS.textPrimary,
            marginTop: '1.5rem',
            letterSpacing: '0.05em',
          }}
        />

        <TextReveal
          text="Open source on GitHub"
          startFrame={300}
          mode="fade"
          duration={30}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            color: COLORS.textSecondary,
            marginTop: '0.5rem',
          }}
        />
      </div>

      {/* Closing parable quote */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          width: '100%',
          textAlign: 'center',
          opacity: interpolate(frame, [330, 370, 510, 600], [0, 1, 1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.8rem',
            fontStyle: 'italic',
            fontWeight: 600,
            color: COLORS.goldLight,
            marginBottom: '0.4rem',
          }}
        >
          &ldquo;Well done, good and faithful servant.&rdquo;
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            color: COLORS.textSecondary,
          }}
        >
          Matthew 25:23
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Preview in Remotion Studio**

Expected: Act 5 fades in showing the full constellation — 10T at center with 5 colored team members orbiting, connected by light lines. The MTM logo animates in above. URL and GitHub text fade in. The closing parable quote appears at the bottom. Everything fades to black in the final 3 seconds.

- [ ] **Step 3: Commit**

```bash
git add src/acts/Act5Call.tsx
git commit -m "feat: implement Act 5 — constellation, logo, CTA, closing quote"
```

---

### Task 11: Full Preview & Polish Pass

**Files:**
- Possibly modify: any act file for timing adjustments

- [ ] **Step 1: Run full preview end-to-end**

```bash
npx remotion studio
```

Scrub through the entire 90-second timeline. Check:
- Act transitions are smooth (no jarring cuts)
- Text is readable at 1080p
- 3D scenes render without flickering
- Timing feels right for each act

- [ ] **Step 2: Add font loading**

Update `src/Root.tsx` to include font imports. Add to the top of `src/Video.tsx`:

```tsx
import { staticFile, Img } from 'remotion';

// Font loading — add <link> tags in the HTML or use @font-face in a style component
// For Remotion, add a global style component at the top of Video:
const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
  `}</style>
);
```

Add `<GlobalStyles />` as the first child in `Video.tsx`'s `<Series>` wrapper (wrap everything in a fragment).

- [ ] **Step 3: Test render a short segment**

```bash
npx remotion render ManyTalentsMore --frames=450-900 --output=test-act2.mp4
```

Expected: Renders Act 2 (frames 450-900) to an MP4 file. Open the file — 10T should appear as a gold particle silhouette forming from scattered particles. No flickering, clean render.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add font loading, full preview polish pass"
```

---

### Task 12: Audio Integration (After VO/Music Assets Exist)

**Files:**
- Modify: `src/Video.tsx`

This task is executed AFTER Chris provides:
- Voiceover audio files (one per act)
- Background music track
- Sound effects

- [ ] **Step 1: Add audio layers to Video.tsx**

Update `src/Video.tsx` to add audio after the `<Series>`:

```tsx
import { Series, Sequence, Audio, interpolate, useCurrentFrame } from 'remotion';
import { ACTS, TOTAL_DURATION_FRAMES, FPS } from './lib/timing';
import { Act1Problem } from './acts/Act1Problem';
import { Act2Revelation } from './acts/Act2Revelation';
import { Act3Team } from './acts/Act3Team';
import { Act4System } from './acts/Act4System';
import { Act5Call } from './acts/Act5Call';
import { staticFile } from 'remotion';

const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
  `}</style>
);

const MusicTrack: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 60, TOTAL_DURATION_FRAMES - 90, TOTAL_DURATION_FRAMES],
    [0, 0.3, 0.3, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return <Audio src={staticFile('audio/music.mp3')} volume={volume} />;
};

export const Video: React.FC = () => {
  return (
    <>
      <GlobalStyles />

      <Series>
        <Series.Sequence durationInFrames={ACTS.act1.duration}>
          <Act1Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ACTS.act2.duration}>
          <Act2Revelation />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ACTS.act3.duration}>
          <Act3Team />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ACTS.act4.duration}>
          <Act4System />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ACTS.act5.duration}>
          <Act5Call />
        </Series.Sequence>
      </Series>

      {/* Background music — spans entire video */}
      <MusicTrack />

      {/* Voiceover tracks — one per act */}
      <Sequence from={ACTS.act1.start}>
        <Audio src={staticFile('audio/vo-act1.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={ACTS.act2.start}>
        <Audio src={staticFile('audio/vo-act2.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={ACTS.act3.start}>
        <Audio src={staticFile('audio/vo-act3.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={ACTS.act4.start}>
        <Audio src={staticFile('audio/vo-act4.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={ACTS.act5.start}>
        <Audio src={staticFile('audio/vo-act5.mp3')} volume={0.9} />
      </Sequence>

      {/* SFX — add as needed with specific frame offsets */}
    </>
  );
};
```

- [ ] **Step 2: Place audio files in public/audio/**

Chris places the following files:
- `public/audio/music.mp3` — background music
- `public/audio/vo-act1.mp3` through `vo-act5.mp3` — voiceover per act

- [ ] **Step 3: Preview with audio**

```bash
npx remotion studio
```

Expected: Full video plays with synced voiceover and background music. Music fades in over the first 2 seconds and fades out over the last 3 seconds.

- [ ] **Step 4: Commit**

```bash
git add src/Video.tsx public/audio/
git commit -m "feat: integrate voiceover and background music audio layers"
```

---

### Task 13: Final Render

- [ ] **Step 1: Render the full video**

```bash
npx remotion render ManyTalentsMore --output=mtm-explainer.mp4 --codec=h264
```

Expected: Renders all 2700 frames to `mtm-explainer.mp4`. File should be ~85-90 seconds, 1920x1080, playable in any video player.

- [ ] **Step 2: Watch the full render**

Open `mtm-explainer.mp4` and verify:
- All 5 acts play in sequence with smooth transitions
- 10T particle silhouette forms correctly in Act 2
- Team members materialize with distinct colors in Act 3
- Feature panels and pipeline animate cleanly in Act 4
- Logo, CTA, and closing quote appear correctly in Act 5
- Audio (VO + music) is properly synced and balanced
- No visual glitches, flickering, or rendering artifacts

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete MTM explainer video — ready for YouTube"
```
