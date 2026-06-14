"use strict";
// frame-designs.js
// 20 feminine photo-frame designs as 1080×1080 SVG strings.
// CENTER is fully transparent — decoration stays within ~160px of edges/corners.
// Exported as FEMININE_FRAMES: Array<{ name, order, svg }>

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const P = {
  pink:      "#FFB7C5",
  blush:     "#FFD1DC",
  rose:      "#F7A8B8",
  lavender:  "#E6E6FA",
  lilac:     "#C8A2C8",
  mint:      "#C7F0DB",
  peach:     "#FFDAB9",
  babyblue:  "#BFEFFF",
  cream:     "#FFF6E9",
  softgold:  "#E8C26A",
  coral:     "#FF9AA2",
  white:     "#FFFFFF",
  // extras for strawberry / sunflower
  red:       "#FF6B6B",
  green:     "#90EE90",
  darkgreen: "#5BAD6F",
  yellow:    "#FFF176",
  goldenrod: "#DAA520",
  purple:    "#DDA0DD",
};

const S = 1080; // canvas size

// ---------------------------------------------------------------------------
// SVG primitive helpers
// ---------------------------------------------------------------------------

/** Wrap content in root <svg> tag */
function svg(content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${content}</svg>`;
}

/** Heart path centered at (cx,cy) with given half-size */
function heart(cx, cy, size, color, opacity = 1) {
  const s = size;
  // Classic heart using cubic bezier
  const path = `M ${cx},${cy + s * 0.3}
    C ${cx},${cy + s * 0.1} ${cx - s * 0.5},${cy - s * 0.3} ${cx - s * 0.5},${cy - s * 0.1}
    C ${cx - s * 0.5},${cy - s * 0.5} ${cx},${cy - s * 0.4} ${cx},${cy - s * 0.15}
    C ${cx},${cy - s * 0.4} ${cx + s * 0.5},${cy - s * 0.5} ${cx + s * 0.5},${cy - s * 0.1}
    C ${cx + s * 0.5},${cy - s * 0.3} ${cx},${cy + s * 0.1} ${cx},${cy + s * 0.3} Z`;
  return `<path d="${path}" fill="${color}" opacity="${opacity}"/>`;
}

/** Circle dot */
function dot(cx, cy, r, color, opacity = 1) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
}

/** Simple 5-petal flower */
function flower(cx, cy, size, petalColor, centerColor) {
  const r = size * 0.38;
  const pr = size * 0.22;
  let petals = "";
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    petals += `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${pr}" ry="${pr * 0.55}" transform="rotate(${i * 72 - 90},${px.toFixed(2)},${py.toFixed(2)})" fill="${petalColor}" opacity="0.9"/>`;
  }
  return petals + dot(cx, cy, size * 0.18, centerColor);
}

/** 4-petal sakura blossom */
function sakura(cx, cy, size, color) {
  let petals = "";
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const r = size * 0.35;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    const rx = size * 0.19;
    const ry = size * 0.11;
    petals += `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${rx}" ry="${ry}" transform="rotate(${(i * 72 - 90).toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})" fill="${color}" opacity="0.85"/>`;
  }
  return petals + dot(cx, cy, size * 0.1, P.softgold);
}

/** Simple sparkle / star at (cx,cy) */
function sparkle(cx, cy, size, color, opacity = 1) {
  const s = size;
  const lines = [0, 45, 90, 135].map(deg => {
    const a = deg * Math.PI / 180;
    const x1 = cx + Math.cos(a) * s;
    const y1 = cy + Math.sin(a) * s;
    const x2 = cx - Math.cos(a) * s;
    const y2 = cy - Math.sin(a) * s;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${(s * 0.18).toFixed(1)}" stroke-linecap="round" opacity="${opacity}"/>`;
  });
  return lines.join("");
}

/** Scallop arc border — generates a path of bumps along all 4 edges */
function scallopBorderPath(inset, bumpR, color, fill = "none", strokeW = 0) {
  const n = S - inset * 2;
  const bumps = Math.round(n / (bumpR * 2));
  const step = n / bumps;
  let d = "";
  // top edge left→right
  for (let i = 0; i < bumps; i++) {
    const x1 = inset + i * step;
    const x2 = x1 + step;
    const mx = (x1 + x2) / 2;
    d += `M ${x1},${inset} Q ${mx},${inset - bumpR} ${x2},${inset} `;
  }
  // right edge top→bottom
  for (let i = 0; i < bumps; i++) {
    const y1 = inset + i * step;
    const y2 = y1 + step;
    const my = (y1 + y2) / 2;
    d += `M ${S - inset},${y1} Q ${S - inset + bumpR},${my} ${S - inset},${y2} `;
  }
  // bottom edge right→left
  for (let i = bumps - 1; i >= 0; i--) {
    const x1 = inset + i * step;
    const x2 = x1 + step;
    const mx = (x1 + x2) / 2;
    d += `M ${x2},${S - inset} Q ${mx},${S - inset + bumpR} ${x1},${S - inset} `;
  }
  // left edge bottom→top
  for (let i = bumps - 1; i >= 0; i--) {
    const y1 = inset + i * step;
    const y2 = y1 + step;
    const my = (y1 + y2) / 2;
    d += `M ${inset},${y2} Q ${inset - bumpR},${my} ${inset},${y1} `;
  }
  const strokeAttr = strokeW > 0 ? `stroke="${color}" stroke-width="${strokeW}"` : "";
  const fillAttr = fill !== "none" ? `fill="${fill}"` : `fill="none"`;
  return `<path d="${d}" ${fillAttr} ${strokeAttr}/>`;
}

/** Thin rectangular border (stroke only, no fill) */
function rectBorder(inset, color, width = 4, opacity = 1) {
  const half = width / 2;
  return `<rect x="${inset + half}" y="${inset + half}" width="${S - inset * 2 - width}" height="${S - inset * 2 - width}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" rx="0"/>`;
}

/** Small bow shape at (cx,cy) */
function bow(cx, cy, size, color) {
  const w = size;
  const h = size * 0.6;
  // Two triangles + center knot
  const left  = `M ${cx},${cy} C ${cx - w * 0.1},${cy - h * 0.5} ${cx - w * 0.8},${cy - h * 0.5} ${cx - w * 0.9},${cy} C ${cx - w * 0.8},${cy + h * 0.5} ${cx - w * 0.1},${cy + h * 0.5} ${cx},${cy} Z`;
  const right = `M ${cx},${cy} C ${cx + w * 0.1},${cy - h * 0.5} ${cx + w * 0.8},${cy - h * 0.5} ${cx + w * 0.9},${cy} C ${cx + w * 0.8},${cy + h * 0.5} ${cx + w * 0.1},${cy + h * 0.5} ${cx},${cy} Z`;
  return `<path d="${left}" fill="${color}" opacity="0.9"/>
<path d="${right}" fill="${color}" opacity="0.9"/>
${dot(cx, cy, size * 0.12, color)}`;
}

/** Pearl/circle bead row along a horizontal line */
function pearlRow(y, xStart, xEnd, r, color, gap = 0) {
  const step = r * 2 + gap;
  let out = "";
  for (let x = xStart + r; x <= xEnd - r; x += step) {
    out += dot(x, y, r, color);
  }
  return out;
}

/** Daisy: white petals + gold center */
function daisy(cx, cy, size) {
  let petals = "";
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45) * Math.PI / 180;
    const r = size * 0.32;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    petals += `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${(size * 0.14).toFixed(2)}" ry="${(size * 0.22).toFixed(2)}" transform="rotate(${(i * 45).toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})" fill="${P.white}" opacity="0.95"/>`;
  }
  return petals + dot(cx, cy, size * 0.17, P.softgold);
}

/** Simple butterfly (2 wing ellipses + body) */
function butterfly(cx, cy, size, topColor, bottomColor) {
  const ww = size * 0.55;
  const wh = size * 0.38;
  const lw = size * 0.38;
  const lh = size * 0.24;
  return [
    `<ellipse cx="${(cx - ww * 0.5).toFixed(1)}" cy="${(cy - wh * 0.35).toFixed(1)}" rx="${ww}" ry="${wh}" transform="rotate(-20,${(cx - ww * 0.5).toFixed(1)},${(cy - wh * 0.35).toFixed(1)})" fill="${topColor}" opacity="0.85"/>`,
    `<ellipse cx="${(cx + ww * 0.5).toFixed(1)}" cy="${(cy - wh * 0.35).toFixed(1)}" rx="${ww}" ry="${wh}" transform="rotate(20,${(cx + ww * 0.5).toFixed(1)},${(cy - wh * 0.35).toFixed(1)})" fill="${topColor}" opacity="0.85"/>`,
    `<ellipse cx="${(cx - lw * 0.45).toFixed(1)}" cy="${(cy + lh * 0.5).toFixed(1)}" rx="${lw}" ry="${lh}" transform="rotate(10,${(cx - lw * 0.45).toFixed(1)},${(cy + lh * 0.5).toFixed(1)})" fill="${bottomColor}" opacity="0.75"/>`,
    `<ellipse cx="${(cx + lw * 0.45).toFixed(1)}" cy="${(cy + lh * 0.5).toFixed(1)}" rx="${lw}" ry="${lh}" transform="rotate(-10,${(cx + lw * 0.45).toFixed(1)},${(cy + lh * 0.5).toFixed(1)})" fill="${bottomColor}" opacity="0.75"/>`,
    `<ellipse cx="${cx}" cy="${cy}" rx="${size * 0.06}" ry="${size * 0.25}" fill="#5D4037" opacity="0.7"/>`,
  ].join("");
}

/** Small cloud shape */
function cloud(cx, cy, size, color, opacity = 0.85) {
  const w = size;
  const h = size * 0.55;
  return [
    dot(cx, cy, h * 0.55, color, opacity),
    dot(cx - w * 0.3, cy + h * 0.1, h * 0.42, color, opacity),
    dot(cx + w * 0.3, cy + h * 0.1, h * 0.42, color, opacity),
    dot(cx - w * 0.55, cy + h * 0.28, h * 0.32, color, opacity),
    dot(cx + w * 0.55, cy + h * 0.28, h * 0.32, color, opacity),
    `<rect x="${(cx - w * 0.58).toFixed(1)}" y="${(cy + h * 0.28).toFixed(1)}" width="${(w * 1.16).toFixed(1)}" height="${(h * 0.38).toFixed(1)}" fill="${color}" opacity="${opacity}" rx="4"/>`,
  ].join("");
}

/** Lavender sprig: stem + small oval florets */
function lavenderSprig(cx, cy, size, color) {
  const stemH = size * 0.7;
  let out = `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - stemH}" stroke="${P.darkgreen}" stroke-width="${size * 0.07}" stroke-linecap="round"/>`;
  const florets = 5;
  for (let i = 0; i < florets; i++) {
    const t = i / (florets - 1);
    const fy = cy - stemH * 0.25 - t * stemH * 0.6;
    const side = (i % 2 === 0) ? -1 : 1;
    const fx = cx + side * size * 0.18;
    out += `<ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="${(size * 0.09).toFixed(1)}" ry="${(size * 0.14).toFixed(1)}" fill="${color}" opacity="0.85" transform="rotate(${side * 25},${fx.toFixed(1)},${fy.toFixed(1)})"/>`;
  }
  return out;
}

/** Small strawberry */
function strawberry(cx, cy, size, bodyColor, seedColor) {
  const body = `<ellipse cx="${cx}" cy="${(cy + size * 0.1).toFixed(1)}" rx="${(size * 0.38).toFixed(1)}" ry="${(size * 0.42).toFixed(1)}" fill="${bodyColor}"/>`;
  // little leaves on top
  const leaves = `<ellipse cx="${cx}" cy="${cy}" rx="${(size * 0.2).toFixed(1)}" ry="${(size * 0.1).toFixed(1)}" fill="${P.darkgreen}" transform="rotate(-30,${cx},${cy})"/>
<ellipse cx="${cx}" cy="${cy}" rx="${(size * 0.2).toFixed(1)}" ry="${(size * 0.1).toFixed(1)}" fill="${P.darkgreen}" transform="rotate(30,${cx},${cy})"/>`;
  // 3 small seeds
  const seeds = [[-0.12, 0.08], [0.1, 0.06], [-0.04, 0.22]].map(([dx, dy]) =>
    dot(cx + dx * size, cy + dy * size + size * 0.1, size * 0.05, seedColor)
  ).join("");
  return body + leaves + seeds;
}

/** Simple sunflower */
function sunflower(cx, cy, size, petalColor) {
  let petals = "";
  const np = 12;
  for (let i = 0; i < np; i++) {
    const angle = (i * 360 / np) * Math.PI / 180;
    const r = size * 0.36;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    petals += `<ellipse cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" rx="${(size * 0.11).toFixed(2)}" ry="${(size * 0.22).toFixed(2)}" transform="rotate(${(i * 360 / np).toFixed(1)},${px.toFixed(2)},${py.toFixed(2)})" fill="${petalColor}" opacity="0.9"/>`;
  }
  return petals + dot(cx, cy, size * 0.22, "#795548");
}

/** Confetti sprinkle rectangle at angle */
function sprinkle(cx, cy, w, h, angle, color, opacity = 0.9) {
  return `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w}" height="${h}" fill="${color}" opacity="${opacity}" rx="${Math.min(w, h) * 0.4}" transform="rotate(${angle},${cx},${cy})"/>`;
}

/** Corner cluster: repeat a motif at all 4 corners via a callback fn(cx, cy) */
function allCorners(offset, fn) {
  const pts = [
    [offset, offset],
    [S - offset, offset],
    [offset, S - offset],
    [S - offset, S - offset],
  ];
  return pts.map(([x, y]) => fn(x, y)).join("");
}

/** Dot ring along all 4 edges at given inset */
function edgeDotBorder(inset, r, step, color, opacity = 1) {
  let out = "";
  for (let x = inset; x <= S - inset; x += step) {
    out += dot(x, inset, r, color, opacity);
    out += dot(x, S - inset, r, color, opacity);
  }
  for (let y = inset + step; y <= S - inset - step; y += step) {
    out += dot(inset, y, r, color, opacity);
    out += dot(S - inset, y, r, color, opacity);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 20 frame definitions
// ---------------------------------------------------------------------------

const FEMININE_FRAMES = [
  // ---- 1. Pink Hearts -------------------------------------------------------
  {
    name: "Pink Hearts",
    order: 0,
    svg: svg(
      // thin blush border
      rectBorder(20, P.blush, 6) +
      // corner clusters of 3 hearts each
      allCorners(80, (cx, cy) => [
        heart(cx, cy, 30, P.pink),
        heart(cx - 32, cy - 14, 18, P.rose, 0.8),
        heart(cx + 32, cy - 14, 18, P.blush, 0.8),
        heart(cx, cy - 38, 14, P.pink, 0.7),
      ].join("")) +
      // small scattered hearts mid-edge
      [
        [S / 2, 36], [S / 2, S - 36],
        [36, S / 2], [S - 36, S / 2],
      ].map(([x, y]) => heart(x, y, 16, P.blush, 0.6)).join("")
    ),
  },

  // ---- 2. Rose Garden -------------------------------------------------------
  {
    name: "Rose Garden",
    order: 1,
    svg: svg(
      rectBorder(18, P.rose, 5) +
      allCorners(90, (cx, cy) => [
        flower(cx, cy, 54, P.rose, P.softgold),
        flower(cx - 44, cy - 22, 32, P.pink, P.softgold),
        flower(cx + 22, cy - 44, 32, P.blush, P.softgold),
        // tiny leaf accents
        `<ellipse cx="${(cx - 22).toFixed(1)}" cy="${(cy + 36).toFixed(1)}" rx="10" ry="17" fill="${P.darkgreen}" opacity="0.5" transform="rotate(-40,${(cx - 22).toFixed(1)},${(cy + 36).toFixed(1)})"/>`,
        `<ellipse cx="${(cx + 30).toFixed(1)}" cy="${(cy + 18).toFixed(1)}" rx="10" ry="17" fill="${P.darkgreen}" opacity="0.5" transform="rotate(30,${(cx + 30).toFixed(1)},${(cy + 18).toFixed(1)})"/>`,
      ].join(""))
    ),
  },

  // ---- 3. Lace Doily --------------------------------------------------------
  {
    name: "Lace Doily",
    order: 2,
    svg: svg(
      // two scallop rings (different insets for layered lace look)
      scallopBorderPath(18, 20, P.white, "none", 3) +
      scallopBorderPath(40, 14, P.white, "none", 2) +
      scallopBorderPath(58, 10, P.blush, "none", 1.5) +
      // dot accents at scallop line intersections
      edgeDotBorder(18, 3, 40, P.white, 0.7)
    ),
  },

  // ---- 4. Pink Polka --------------------------------------------------------
  {
    name: "Pink Polka",
    order: 3,
    svg: svg(
      edgeDotBorder(30, 11, 44, P.pink) +
      edgeDotBorder(68, 7, 44, P.blush, 0.7) +
      rectBorder(22, P.blush, 3, 0.5)
    ),
  },

  // ---- 5. Pastel Rainbow ----------------------------------------------------
  {
    name: "Pastel Rainbow",
    order: 4,
    svg: (function () {
      const stripes = [P.pink, P.peach, P.softgold, P.mint, P.babyblue, P.lavender, P.lilac];
      const bw = 10;
      const startInset = 10;
      const bands = stripes.map((c, i) => {
        const ins = startInset + i * bw;
        return rectBorder(ins, c, bw, 0.75);
      }).join("");
      return svg(bands);
    })(),
  },

  // ---- 6. Coquette Bow ------------------------------------------------------
  {
    name: "Coquette Bow",
    order: 5,
    svg: svg(
      // pearl dot string along top
      pearlRow(28, 60, S - 60, 7, P.white, 4) +
      // decorative bows at top two corners
      bow(110, 60, 70, P.pink) +
      bow(S - 110, 60, 70, P.pink) +
      // small pearl clusters at top bow centers
      dot(110, 60, 9, P.white) +
      dot(S - 110, 60, 9, P.white) +
      // thin blush border
      rectBorder(20, P.blush, 4) +
      // small bows on bottom corners
      bow(110, S - 60, 48, P.blush) +
      bow(S - 110, S - 60, 48, P.blush)
    ),
  },

  // ---- 7. Sparkle Stars -----------------------------------------------------
  {
    name: "Sparkle Stars",
    order: 6,
    svg: svg(
      // scattered sparkles on all 4 edges (within 130px of border)
      [
        // top edge
        [120, 35, 14], [280, 22, 10], [440, 40, 8], [600, 20, 12], [750, 38, 10], [900, 26, 14],
        // bottom edge
        [150, S - 30, 12], [310, S - 45, 8], [500, S - 25, 14], [680, S - 40, 10], [880, S - 28, 12],
        // left edge
        [28, 160, 10], [45, 350, 14], [22, 520, 8], [40, 720, 12], [30, 900, 10],
        // right edge
        [S - 30, 140, 12], [S - 42, 380, 8], [S - 26, 560, 14], [S - 38, 760, 10], [S - 28, 940, 12],
      ].map(([x, y, s]) => sparkle(x, y, s, P.softgold)).join("") +
      rectBorder(16, P.softgold, 2, 0.4)
    ),
  },

  // ---- 8. Cherry Blossom ----------------------------------------------------
  {
    name: "Cherry Blossom",
    order: 7,
    svg: svg(
      // sakura petals in all 4 corners + a few mid-edge
      allCorners(80, (cx, cy) => [
        sakura(cx, cy, 52),
        sakura(cx - 44, cy - 20, 32),
        sakura(cx + 20, cy - 46, 30),
        sakura(cx - 20, cy + 44, 26),
      ].join("")) +
      // a few mid-edge single blossoms
      [
        [S / 2 - 30, 32], [S / 2 + 30, 32],
        [S / 2 - 30, S - 32], [S / 2 + 30, S - 32],
        [32, S / 2 - 30], [32, S / 2 + 30],
        [S - 32, S / 2 - 30], [S - 32, S / 2 + 30],
      ].map(([x, y]) => sakura(x, y, 24)).join("") +
      rectBorder(16, P.blush, 3, 0.5)
    ),
  },

  // ---- 9. Gold Elegant ------------------------------------------------------
  {
    name: "Gold Elegant",
    order: 8,
    svg: svg(
      // double-line gold border
      rectBorder(12, P.softgold, 3) +
      rectBorder(22, P.softgold, 1, 0.6) +
      // corner filigree: small diamond + dot cluster
      allCorners(50, (cx, cy) => [
        // diamond
        `<polygon points="${cx},${cy - 22} ${cx + 16},${cy} ${cx},${cy + 22} ${cx - 16},${cy}" fill="${P.softgold}" opacity="0.7"/>`,
        dot(cx, cy, 5, P.softgold),
        dot(cx - 24, cy, 3, P.softgold, 0.5),
        dot(cx + 24, cy, 3, P.softgold, 0.5),
        dot(cx, cy - 28, 3, P.softgold, 0.5),
        dot(cx, cy + 28, 3, P.softgold, 0.5),
      ].join(""))
    ),
  },

  // ---- 10. Pearl String -----------------------------------------------------
  {
    name: "Pearl String",
    order: 9,
    svg: svg(
      // outer "string" line
      rectBorder(28, P.blush, 2, 0.4) +
      // pearl beads along all 4 edges
      (function () {
        let out = "";
        const r = 10, gap = 6, inset = 28;
        // top + bottom rows
        for (let x = inset; x <= S - inset; x += (r * 2 + gap)) {
          out += dot(x, inset, r, P.white);
          out += dot(x, S - inset, r, P.white);
          // inner shadow ring to give pearl effect
          out += `<circle cx="${x}" cy="${inset}" r="${r}" fill="none" stroke="#ddd" stroke-width="1.5" opacity="0.5"/>`;
          out += `<circle cx="${x}" cy="${S - inset}" r="${r}" fill="none" stroke="#ddd" stroke-width="1.5" opacity="0.5"/>`;
        }
        // left + right columns (skip corners already done)
        for (let y = inset + r * 2 + gap; y <= S - inset - r * 2 - gap; y += (r * 2 + gap)) {
          out += dot(inset, y, r, P.white);
          out += dot(S - inset, y, r, P.white);
          out += `<circle cx="${inset}" cy="${y}" r="${r}" fill="none" stroke="#ddd" stroke-width="1.5" opacity="0.5"/>`;
          out += `<circle cx="${S - inset}" cy="${y}" r="${r}" fill="none" stroke="#ddd" stroke-width="1.5" opacity="0.5"/>`;
        }
        return out;
      })()
    ),
  },

  // ---- 11. Butterfly --------------------------------------------------------
  {
    name: "Butterfly",
    order: 10,
    svg: svg(
      // butterflies in top-left and bottom-right corners
      butterfly(140, 140, 90, P.lavender, P.lilac) +
      butterfly(S - 140, S - 140, 90, P.babyblue, P.mint) +
      // smaller accent butterflies
      butterfly(S - 120, 120, 60, P.pink, P.blush) +
      butterfly(120, S - 120, 60, P.peach, P.coral) +
      // tiny dot scatter near butterflies
      [
        [60, 60], [200, 70], [70, 200],
        [S - 60, S - 60], [S - 200, S - 70], [S - 70, S - 200],
      ].map(([x, y]) => dot(x, y, 4, P.lavender, 0.6)).join("") +
      rectBorder(14, P.lavender, 3, 0.4)
    ),
  },

  // ---- 12. Daisy Chain ------------------------------------------------------
  {
    name: "Daisy Chain",
    order: 11,
    svg: svg(
      // daisies along top + bottom
      (function () {
        let out = "";
        const step = 90;
        for (let x = 60; x <= S - 60; x += step) {
          out += daisy(x, 45, 38);
          out += daisy(x, S - 45, 38);
        }
        // connector dots between daisies
        for (let x = 60 + step / 2; x < S - 60; x += step) {
          out += dot(x, 45, 4, P.green, 0.6);
          out += dot(x, S - 45, 4, P.green, 0.6);
        }
        // daisies along sides (fewer, at corners)
        for (let y = 60 + step; y <= S - 60 - step; y += step) {
          out += daisy(45, y, 32);
          out += daisy(S - 45, y, 32);
        }
        return out;
      })() +
      rectBorder(16, P.green, 2, 0.35)
    ),
  },

  // ---- 13. Lavender Floral --------------------------------------------------
  {
    name: "Lavender Floral",
    order: 12,
    svg: svg(
      rectBorder(18, P.lavender, 5) +
      allCorners(90, (cx, cy) => [
        lavenderSprig(cx - 10, cy + 30, 60, P.lavender),
        lavenderSprig(cx + 10, cy + 30, 50, P.lilac),
        lavenderSprig(cx + 28, cy + 10, 44, P.lavender),
        dot(cx, cy + 35, 4, P.softgold, 0.5),
      ].join("")) +
      // mid-edge single sprigs
      [
        [S / 2, 55], [S / 2, S - 55],
        [55, S / 2], [S - 55, S / 2],
      ].map(([x, y]) => lavenderSprig(x, y, 40, P.lavender)).join("")
    ),
  },

  // ---- 14. Mint Scallop -----------------------------------------------------
  {
    name: "Mint Scallop",
    order: 13,
    svg: svg(
      scallopBorderPath(14, 22, P.mint, "none", 4) +
      scallopBorderPath(40, 14, P.mint, "none", 2) +
      edgeDotBorder(14, 4, 44, P.mint, 0.5) +
      rectBorder(60, P.mint, 2, 0.3)
    ),
  },

  // ---- 15. Peach Hearts -----------------------------------------------------
  {
    name: "Peach Hearts",
    order: 14,
    svg: svg(
      rectBorder(18, P.peach, 8) +
      // scattered tiny hearts along border band
      (function () {
        let out = "";
        const positions = [
          // top
          [160, 48], [320, 34], [480, 50], [640, 32], [800, 48], [940, 36],
          // bottom
          [140, S - 44], [300, S - 32], [500, S - 48], [700, S - 34], [900, S - 44],
          // left
          [38, 200], [50, 380], [34, 560], [48, 760],
          // right
          [S - 36, 220], [S - 48, 420], [S - 34, 620], [S - 46, 820],
        ];
        positions.forEach(([x, y]) => {
          out += heart(x, y, 14, P.peach);
        });
        return out;
      })()
    ),
  },

  // ---- 16. Strawberry Sweet -------------------------------------------------
  {
    name: "Strawberry Sweet",
    order: 15,
    svg: svg(
      rectBorder(18, P.pink, 4) +
      allCorners(85, (cx, cy) => [
        strawberry(cx, cy, 52, P.red, P.cream),
        strawberry(cx - 38, cy + 18, 34, P.coral, P.cream),
        strawberry(cx + 38, cy + 18, 30, P.red, P.cream),
        dot(cx - 18, cy - 42, 5, P.pink),
        dot(cx + 18, cy - 42, 5, P.pink),
        dot(cx, cy - 50, 5, P.blush),
      ].join("")) +
      // small dots between corners
      edgeDotBorder(40, 5, 70, P.pink, 0.6)
    ),
  },

  // ---- 17. Cloud Dream ------------------------------------------------------
  {
    name: "Cloud Dream",
    order: 16,
    svg: svg(
      // clouds across the top
      (function () {
        let out = "";
        const cloudPositions = [
          [100, 65, 65], [250, 50, 55], [420, 70, 72], [600, 48, 58],
          [760, 65, 68], [930, 52, 60],
        ];
        cloudPositions.forEach(([x, y, s]) => {
          out += cloud(x, y, s, P.babyblue);
        });
        // a few bottom clouds
        [[180, S - 60, 50], [500, S - 55, 60], [860, S - 60, 52]].forEach(([x, y, s]) => {
          out += cloud(x, y, s, P.lavender, 0.65);
        });
        // stars scattered on top area
        [[180, 30], [350, 20], [540, 35], [710, 18], [880, 28]].forEach(([x, y]) => {
          out += sparkle(x, y, 8, P.softgold, 0.7);
        });
        return out;
      })() +
      rectBorder(14, P.babyblue, 3, 0.4)
    ),
  },

  // ---- 18. Lilac Lace -------------------------------------------------------
  {
    name: "Lilac Lace",
    order: 17,
    svg: svg(
      scallopBorderPath(12, 22, P.lilac, "none", 4) +
      scallopBorderPath(36, 15, P.lavender, "none", 2.5) +
      edgeDotBorder(12, 5, 44, P.lilac, 0.8) +
      edgeDotBorder(48, 3, 44, P.lavender, 0.5) +
      rectBorder(62, P.lilac, 1.5, 0.3)
    ),
  },

  // ---- 19. Sunflower Soft ---------------------------------------------------
  {
    name: "Sunflower Soft",
    order: 18,
    svg: svg(
      rectBorder(18, P.softgold, 4, 0.6) +
      allCorners(88, (cx, cy) => [
        sunflower(cx, cy, 58, P.peach),
        sunflower(cx - 46, cy - 20, 36, P.softgold),
        sunflower(cx + 20, cy - 46, 34, P.peach),
        `<ellipse cx="${(cx - 22).toFixed(1)}" cy="${(cy + 38).toFixed(1)}" rx="10" ry="18" fill="${P.darkgreen}" opacity="0.45" transform="rotate(-40,${(cx - 22).toFixed(1)},${(cy + 38).toFixed(1)})"/>`,
        `<ellipse cx="${(cx + 32).toFixed(1)}" cy="${(cy + 20).toFixed(1)}" rx="10" ry="18" fill="${P.darkgreen}" opacity="0.45" transform="rotate(30,${(cx + 32).toFixed(1)},${(cy + 20).toFixed(1)})"/>`,
      ].join(""))
    ),
  },

  // ---- 20. Sweet Sprinkles --------------------------------------------------
  {
    name: "Sweet Sprinkles",
    order: 19,
    svg: svg(
      rectBorder(16, P.blush, 4) +
      (function () {
        // Deterministic confetti sprinkles along all 4 border bands (~130px deep)
        const colors = [P.pink, P.mint, P.lavender, P.peach, P.babyblue, P.softgold, P.coral, P.lilac];
        const positions = [];
        // top band
        for (let x = 30; x < S - 30; x += 38) {
          positions.push([x, 20 + (x % 60), colors[Math.floor(x / 38) % colors.length], (x * 37) % 180]);
          positions.push([x + 15, 55 + (x % 40), colors[(Math.floor(x / 38) + 3) % colors.length], (x * 53) % 180]);
        }
        // bottom band
        for (let x = 30; x < S - 30; x += 38) {
          positions.push([x, S - 20 - (x % 50), colors[(Math.floor(x / 38) + 1) % colors.length], (x * 41) % 180]);
          positions.push([x + 18, S - 60 - (x % 35), colors[(Math.floor(x / 38) + 4) % colors.length], (x * 67) % 180]);
        }
        // left band
        for (let y = 130; y < S - 130; y += 42) {
          positions.push([20 + (y % 45), y, colors[(Math.floor(y / 42) + 2) % colors.length], (y * 29) % 180]);
          positions.push([58 + (y % 35), y + 18, colors[(Math.floor(y / 42) + 5) % colors.length], (y * 43) % 180]);
        }
        // right band
        for (let y = 130; y < S - 130; y += 42) {
          positions.push([S - 20 - (y % 45), y, colors[(Math.floor(y / 42) + 3) % colors.length], (y * 31) % 180]);
          positions.push([S - 58 - (y % 35), y + 18, colors[(Math.floor(y / 42) + 6) % colors.length], (y * 59) % 180]);
        }
        return positions.map(([x, y, c, angle]) =>
          sprinkle(x, y, 22, 7, angle, c)
        ).join("");
      })()
    ),
  },
];

module.exports = { FEMININE_FRAMES };
