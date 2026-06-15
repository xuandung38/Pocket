// global-reaction-effect.jsx
// Full-screen emoji burst — mounted once at app root, subscribes to
// useReactionStore. Each new `reaction.id` restarts the animation so rapid
// re-triggers feel snappy without stale state. Uses rAF-based particle
// simulation (port of upstream ReactionEffect) without DaisyUI or Tailwind
// class dependencies: all positioning via inline style, z-index via CSS var.
import { useEffect, useRef, useCallback, useState } from "react";
import { useReactionStore } from "@/stores/use-reaction-store";

const rand = (min, max) => Math.random() * (max - min) + min;

// Create one particle starting below the viewport (direction: up)
function spawnParticle({ emojis, stageW, stageH, size, speed }) {
  return {
    id: Math.random().toString(36).slice(2),
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    x: rand(0, Math.max(stageW - size, 0)),
    y: rand(stageH + size, stageH * 1.6),
    rotate: rand(-35, 35),
    speed: speed * rand(0.55, 1.3),
    opacity: rand(0.65, 1),
    size,
    stageH,
  };
}

// Advance particle one frame; return [updated, isDead]
function tickParticle(p) {
  const y = p.y - p.speed; // float upward
  const dead = y < -(p.size * 2);
  return [{ ...p, y, rotate: p.rotate + 0.2 }, dead];
}

const PARTICLE_COUNT = 30;
const PARTICLE_SIZE = 48;
const PARTICLE_SPEED = 8;

// Inner burst renderer — keyed by reaction.id so it remounts on each trigger.
function ReactionBurst({ emojis }) {
  const stageRef = useRef(null);
  const particlesRef = useRef([]);
  const spawnedRef = useRef(0);
  const rafRef = useRef(null);
  const [, forceRender] = useState(0);

  const loop = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // clientWidth/Height are 0 in jsdom — fall back to window dims (also
    // stubbed in tests, but at least non-zero via innerWidth default of 1024).
    const stageW = stage.clientWidth || window.innerWidth || 390;
    const stageH = stage.clientHeight || window.innerHeight || 844;

    // Spawn batches of up to 3 per frame so particles appear quickly even
    // when rAF ticks are coarse (jsdom fake timers at 16 ms).
    const BATCH = 3;
    for (let i = 0; i < BATCH && spawnedRef.current < PARTICLE_COUNT; i++) {
      particlesRef.current = [
        ...particlesRef.current,
        spawnParticle({ emojis, stageW, stageH, size: PARTICLE_SIZE, speed: PARTICLE_SPEED }),
      ];
      spawnedRef.current += 1;
    }

    // Advance existing particles
    const next = [];
    for (const p of particlesRef.current) {
      const [updated, dead] = tickParticle(p);
      if (!dead) next.push(updated);
    }
    particlesRef.current = next;
    forceRender((n) => n + 1);

    // Stop once all spawned particles have exited
    if (spawnedRef.current >= PARTICLE_COUNT && particlesRef.current.length === 0) {
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [emojis]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {particlesRef.current.map((p) => (
        <span
          key={p.id}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            fontSize: p.size,
            lineHeight: 1,
            opacity: p.opacity,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg)`,
            userSelect: "none",
            pointerEvents: "none",
            willChange: "transform",
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// Root-level subscriber — renders a keyed ReactionBurst per trigger so each
// new reaction restarts animation cleanly. Returns null when idle.
export default function GlobalReactionEffect() {
  const reaction = useReactionStore((s) => s.reaction);
  if (!reaction) return null;
  return <ReactionBurst key={reaction.id} emojis={reaction.reactions} />;
}
