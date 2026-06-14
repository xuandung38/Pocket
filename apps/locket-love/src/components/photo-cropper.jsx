// photo-cropper.jsx
// Custom gesture-based photo cropper — Instagram/Snapchat style.
// Fixed square viewport; the photo transforms underneath via touch gestures.
//
// Gestures (Pointer Events):
//   1 pointer  → PAN
//   2 pointers → PINCH-ZOOM + TWIST-ROTATE + PAN (anchored at midpoint)
//
// Desktop fallback:
//   Mouse drag  → PAN
//   Wheel       → ZOOM anchored at cursor
//
// Props:
//   src          - object URL of the captured photo
//   cropperRef   - useImperativeHandle target; exposes { exportBlob(size?) }
//   frameOverlay - ReactNode rendered above the photo (pointer-events:none)

import { useRef, useState, useEffect, useCallback, useImperativeHandle } from "react";

// ─── math helpers ────────────────────────────────────────────────────────────

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function PhotoCropper({ src, cropperRef, frameOverlay }) {
  const viewportRef = useRef(null);
  const imgRef = useRef(null);

  // Transform state in natural-size multiplier space.
  // tx/ty: translation from viewport centre (px, display space)
  // rot:   rotation in radians
  // scale: multiplier applied to the natural image size
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [rot, setRot] = useState(0);
  const [scale, setScale] = useState(1);

  // Mutable refs so gesture handlers always see current values without stale closures.
  const stateRef = useRef({ tx: 0, ty: 0, rot: 0, scale: 1, coverScale: 1, vpSize: 300 });

  // Active pointer tracking: pointerId → {x, y}
  const ptrs = useRef(new Map());
  // Previous two-pointer state for delta computation
  const prevGesture = useRef({ dist: null, angle: null, mid: null });

  // ── initial scale: photo covers the square viewport ──────────────────────
  function initTransform() {
    const vp = viewportRef.current;
    const img = imgRef.current;
    if (!vp || !img) return;
    const V = vp.clientWidth || vp.offsetWidth || 300;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return;
    const coverSc = Math.max(V / natW, V / natH);
    stateRef.current = { tx: 0, ty: 0, rot: 0, scale: coverSc, coverScale: coverSc, vpSize: V };
    setTx(0); setTy(0); setRot(0); setScale(coverSc);
  }

  useEffect(() => {
    // Re-init when src changes (new capture).
    stateRef.current = { tx: 0, ty: 0, rot: 0, scale: 1, coverScale: 1, vpSize: 300 };
    setTx(0); setTy(0); setRot(0); setScale(1);
  }, [src]);

  // ── sync state → stateRef ────────────────────────────────────────────────
  // (kept in sync so gesture handlers read the latest without re-subscribing)
  useEffect(() => {
    stateRef.current.tx = tx;
    stateRef.current.ty = ty;
    stateRef.current.rot = rot;
    stateRef.current.scale = scale;
  }, [tx, ty, rot, scale]);

  // ── commit helper: write stateRef → React state (one batch) ─────────────
  const commit = useCallback(() => {
    const s = stateRef.current;
    setTx(s.tx); setTy(s.ty); setRot(s.rot); setScale(s.scale);
  }, []);

  // ── clamp scale so photo always covers the viewport ──────────────────────
  function clampScale(raw) {
    return Math.max(raw, stateRef.current.coverScale);
  }

  // ─── POINTER EVENT HANDLERS ──────────────────────────────────────────────

  function onPointerDown(e) {
    viewportRef.current?.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Reset gesture baseline whenever pointer count changes.
    prevGesture.current = { dist: null, angle: null, mid: null };
  }

  function onPointerMove(e) {
    if (!ptrs.current.has(e.pointerId)) return;

    const prev = ptrs.current.get(e.pointerId);
    const curr = { x: e.clientX, y: e.clientY };
    ptrs.current.set(e.pointerId, curr);

    const count = ptrs.current.size;
    const s = stateRef.current;

    if (count === 1) {
      // ── PAN ──────────────────────────────────────────────────────────────
      s.tx += curr.x - prev.x;
      s.ty += curr.y - prev.y;
      commit();
      return;
    }

    if (count === 2) {
      // ── PINCH-ZOOM + TWIST-ROTATE + PAN ──────────────────────────────────
      const [pA, pB] = [...ptrs.current.values()];

      const curDist = dist(pA, pB);
      const curAngle = angle(pA, pB);
      const curMid = midpoint(pA, pB);

      const pg = prevGesture.current;
      if (pg.dist === null) {
        // First move with 2 pointers — just store baseline, no transform yet.
        prevGesture.current = { dist: curDist, angle: curAngle, mid: curMid };
        return;
      }

      const dScale = curDist / pg.dist;
      const dAngle = curAngle - pg.angle;
      const dMidX  = curMid.x - pg.mid.x;
      const dMidY  = curMid.y - pg.mid.y;

      // Get midpoint relative to the viewport centre (the transform origin).
      const vp = viewportRef.current;
      const rect = vp ? vp.getBoundingClientRect() : { left: 0, top: 0, width: 300, height: 300 };
      const vpCx = rect.left + rect.width / 2;
      const vpCy = rect.top + rect.height / 2;

      // Vector from viewport centre to current midpoint (display space).
      const mx = curMid.x - vpCx;
      const my = curMid.y - vpCy;

      // Apply pinch-around-midpoint:
      // Translate so midpoint is origin, scale+rotate the (tx,ty) vector, translate back.
      const ox = s.tx - mx;
      const oy = s.ty - my;
      const cos = Math.cos(dAngle), sin = Math.sin(dAngle);
      const rotX = ox * cos - oy * sin;
      const rotY = ox * sin + oy * cos;

      s.scale = clampScale(s.scale * dScale);
      s.rot   = s.rot + dAngle;
      s.tx    = mx + rotX * dScale + dMidX;
      s.ty    = my + rotY * dScale + dMidY;

      prevGesture.current = { dist: curDist, angle: curAngle, mid: curMid };
      commit();
    }
  }

  function onPointerUp(e) {
    ptrs.current.delete(e.pointerId);
    prevGesture.current = { dist: null, angle: null, mid: null };
  }

  // ── WHEEL (desktop zoom anchored at cursor) ──────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const s = stateRef.current;
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const vpCx = rect.left + rect.width / 2;
    const vpCy = rect.top + rect.height / 2;

    // Cursor relative to viewport centre.
    const cx = e.clientX - vpCx;
    const cy = e.clientY - vpCy;

    const factor = 1 - e.deltaY * 0.001;
    const newScale = clampScale(s.scale * factor);
    const actualFactor = newScale / s.scale;

    // Keep point under cursor fixed.
    s.tx = cx + (s.tx - cx) * actualFactor;
    s.ty = cy + (s.ty - cy) * actualFactor;
    s.scale = newScale;
    commit();
  }

  // Attach wheel with { passive: false } so preventDefault works.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── EXPORT ───────────────────────────────────────────────────────────────
  useImperativeHandle(cropperRef, () => ({
    exportBlob: async (size = 1080) => {
      const img = imgRef.current;
      if (!img) return null;

      // Ensure image is fully decoded before drawing.
      try { await img.decode(); } catch (_) { /* already decoded */ }

      const { tx: etx, ty: ety, rot: erot, scale: escale, vpSize } = stateRef.current;
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const ratio = size / vpSize;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.save();
      ctx.translate(size / 2 + etx * ratio, size / 2 + ety * ratio);
      ctx.rotate(erot);
      ctx.scale(escale * ratio, escale * ratio);
      ctx.drawImage(img, -natW / 2, -natH / 2, natW, natH);
      ctx.restore();

      return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.92));
    },
  }));

  // ── CSS transform string ─────────────────────────────────────────────────
  // The image is centred in the viewport via left/top 50% + translate(-50%,-50%),
  // then our gesture transform is applied on top.
  const transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rot}rad) scale(${scale})`;

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "none",
        userSelect: "none",
        cursor: "grab",
        background: "#000",
      }}
    >
      {/* Photo — absolutely centred; gesture transform applied */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        onLoad={initTransform}
        draggable={false}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform,
          transformOrigin: "center center",
          maxWidth: "none",       // prevent browser from shrinking the natural size
          maxHeight: "none",
          display: "block",
          pointerEvents: "none",  // gestures go to the viewport div
        }}
      />

      {/* Frame overlay — click-through, above the photo */}
      {frameOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          {frameOverlay}
        </div>
      )}
    </div>
  );
}
