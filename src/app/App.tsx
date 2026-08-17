import {
  forwardRef, useEffect, useRef, useState, useCallback,
} from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-client";

// @ts-expect-error — no bundled types for world-atlas JSON
import worldTopo from "world-atlas/countries-50m.json";

import Dal from "../imports/Dal";
import San from "../imports/San";
import Hyd from "../imports/Hyd";
import Viz from "../imports/Viz";

import imgDal from "../../assets/image-DAL.png";
import imgSan from "../../assets/image-SAN.png";
import imgHyd from "../../assets/image-HYD.png";
import imgViz from "../../assets/image-VIZ.png";

// ── globe constants ─────────────────────────────────────────────────────────
const GLOBE_RADIUS  = 1.933;
const TILT_X        = 22 * (Math.PI / 180);
const BORDER_COLOR  = "rgba(255,255,255,0.55)";
const GRID_COLOR    = "rgba(255,255,255,0.055)";
const AUTO_ROTATE   = 0.0006;
const INERTIA       = 0.91;
const DRAG_SENS     = 0.005;
const CAM_FOV       = 45;
const CAM_Z         = 5.6;
const GRID_LAT      = 18;
const GRID_LON      = 36;
const GRID_SUB      = 128;
const BORDER_SUB    = 5;
const ANTART_ID     = "010";
const BG            = "#0B1F3A";

// ── city definitions ─────────────────────────────────────────────────────────
// imgSide only matters on desktop (row layout), where the thumbnail sits
// beside the pill instead of above/below it — see TagMarker's `sideBySide`.
const CITIES = [
  { lat:  32.7767, lon:  -96.7970, name: "Dallas, Texas, USA (Headquarters)",   variant: "up"   as "up" | "down", imgSide: "right" as "left" | "right", Card: Dal, image: imgDal },
  { lat:   9.9281, lon:  -84.0907, name: "San José, Costa Rica",  variant: "up"   as "up" | "down", imgSide: "left"  as "left" | "right", Card: San, image: imgSan },
  { lat:  17.3850, lon:   78.4867, name: "Hyderabad, India",      variant: "up"   as "up" | "down", imgSide: "right" as "left" | "right", Card: Hyd, image: imgHyd },
  { lat:  17.6868, lon:   83.2185, name: "Visakhapatnam, India",  variant: "down" as "up" | "down", imgSide: "left"  as "left" | "right", Card: Viz, image: imgViz },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function parseRgba(s: string): [string, number] {
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if (!m) return [s, 1];
  const hex = "#" + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, "0")).join("");
  return [hex, m[4] !== undefined ? parseFloat(m[4]) : 1];
}

function geo3(lon: number, lat: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function arcPts(lo0: number, la0: number, lo1: number, la1: number, n: number, r: number) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return geo3(lo0 + (lo1 - lo0) * t, la0 + (la1 - la0) * t, r);
  });
}

function ringLine(coords: number[][], r: number, mat: THREE.LineBasicMaterial): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const seg = arcPts(coords[i][0], coords[i][1], coords[i+1][0], coords[i+1][1], BORDER_SUB, r);
    if (i === 0) pts.push(...seg); else pts.push(...seg.slice(1));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

// ── TagMarker sizing ─────────────────────────────────────────────────────────
// Base (desktop, scale=1) pixel sizes for TagMarker parts — shared between the
// marker itself and the reserved-space calculation below so they never drift apart.
const TAG_BASE = { thumb: 206, gap: 8, pill: 57, line: 75, dot: 8 };

// Scales a TagMarker dimension for the current breakpoint, with a floor so
// text/touch targets stay legible even at the smallest scale.
function tagPx(value: number, min: number, scale: number): number {
  return Math.max(min, Math.round(value * scale));
}

// Pill(57) + line(75) + dot(8) — the headroom an "up" marker's popup needs
// above its globe point. Reserved above the globe so the pill never clips
// against the panel's top edge. Mirrors the same floors TagMarker uses so
// it stays accurate at any scale.
//
// Deliberately does NOT budget for the thumbnail (206px) on top of that:
// with the fixed 22° tilt, none of the real CITIES latitudes put a pin
// anywhere near the box's top edge, so a thumbnail never actually needs
// extra headroom beyond the pill/line/dot above — budgeting the full
// thumbnail height "just in case" only produced a large, permanently empty
// gap above the globe. If a future city is added far enough north/south
// that its thumbnail does clip, revisit this rather than reintroducing a
// blanket worst-case reserve.
function tagStackReserve(scale: number): number {
  return (
    tagPx(TAG_BASE.pill,   38, scale) +
    tagPx(TAG_BASE.line,   28, scale) +
    tagPx(TAG_BASE.dot,     6, scale) +
    6 // safety buffer
  );
}

// ── responsive design tokens ────────────────────────────────────────────────
// Reference screens from the design spec: Desktop 1440, Tablet 768, Mobile 402.
// `getBreakpoint` still picks desktop/tablet/mobile design tokens (fonts,
// margins, tag scale) purely off width, but the structural row↔stacked
// switch is separate — see STACK_BELOW_W — and only lands on "desktop"
// tokens at full desktop width (≥1440px, see STACK_BELOW_W below).
type Breakpoint = "desktop" | "tablet" | "mobile";

function getBreakpoint(w: number): Breakpoint {
  if (w < 768)  return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function useViewportSize(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth  : 1440,
    h: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

// Below this viewport height, the globe box's usual "fit within cqh minus the
// tag-popup headroom" formula runs out of room and collapses toward zero —
// crushing the pill labels into an overlapping mess (landscape phones, short
// laptop/browser windows). Below the threshold we stop sizing the globe off
// viewport height entirely and fall back to a width-driven, naturally-tall,
// page-scrolling layout instead.
const SHORT_VIEWPORT_H = 600;

// Below this viewport width, the layout switches to the stacked (globe on
// top, menu below, page scrolls) arrangement regardless of the desktop/
// tablet/mobile breakpoint — the row layout's fixed-width menu column only
// has room to breathe above this width.
const STACK_BELOW_W = 1000;

interface LayoutConfig {
  margin:         number;  // outer horizontal padding
  gutter:         number;  // gap between menu/globe columns (row layouts)
  columns:        number;  // grid column count (row layouts)
  menuCols:       number;  // menu's column span
  globeCols:      number;  // globe's column span
  tagScale:       number;  // TagMarker pill/line/dot/thumbnail scale
  menuFont:       number;
  menuLineHeight: number;
  menuPadding:    string;
  menuGap:        number;  // gap between the city list and the info card
}

// Values from the design spec's Desktop(1440) / Tablet(768) / Mobile(402)
// columns. Menu:globe column ratio (1:2) is preserved across breakpoints.
const LAYOUTS: Record<Breakpoint, LayoutConfig> = {
  desktop: { margin: 80, gutter: 20, columns: 12, menuCols: 4, globeCols: 8, tagScale: 1,    menuFont: 20, menuLineHeight: 29, menuPadding: "16px 4px", menuGap: 32 },
  tablet:  { margin: 40, gutter: 20, columns: 6,  menuCols: 2, globeCols: 4, tagScale: 0.82, menuFont: 18, menuLineHeight: 26, menuPadding: "14px 4px", menuGap: 28 },
  mobile:  { margin: 20, gutter: 16, columns: 4,  menuCols: 4, globeCols: 4, tagScale: 0.6,  menuFont: 16, menuLineHeight: 24, menuPadding: "12px 4px", menuGap: 24 },
};

// React's CSSProperties type doesn't know about CSS custom properties or
// some newer properties (container-type, aspect-ratio queries via cq units).
// This lets us pass them through inline styles without fighting the compiler —
// there's no tsc build gate in this project (esbuild strips types unchecked).
type CSSVars = React.CSSProperties & Record<string, string | number | undefined>;

// ── TagMarker ────────────────────────────────────────────────────────────────
// Pill label + connecting line + glowing square dot.
// variant="up"   → label above, dot below  (anchor = dot = bottom-center)
// variant="down" → dot above, label below  (anchor = dot = top-center)
// Position is driven imperatively via style.left / style.top by the animation loop.
// transform: translate(-50%, -100%) for "up" → bottom-center at (left, top)
// transform: translate(-50%, 0%)   for "down" → top-center at (left, top)
//
// `sideBySide` (desktop/row layout only) moves the active thumbnail from
// stacked-above/below-the-pill to floating beside it (imgSide: left/right),
// absolutely positioned off the pill so it doesn't affect the pill/line/dot
// column's own centering or the anchor math above.
const TagMarker = forwardRef<HTMLDivElement, {
  name: string;
  variant: "up" | "down";
  isActive: boolean;
  image: string;
  scale: number;
  sideBySide: boolean;
  imgSide: "left" | "right";
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}>(({ name, variant, isActive, image, scale, sideBySide, imgSide, onMouseEnter, onMouseLeave, onClick }, ref) => {
  const isUp = variant === "up";
  const px = (v: number, min: number) => tagPx(v, min, scale);

  const pill = (
    <div style={{
      background:   "white",
      borderRadius: 1000,
      border:       "1px solid #fe5732",
      height:       px(TAG_BASE.pill, 38),
      padding:      `0 ${px(24, 14)}px`,
      display:      "flex",
      alignItems:   "center",
      flexShrink:   0,
    }}>
      <span style={{
        fontFamily:     "Inter, sans-serif",
        fontSize:       px(18, 13),
        color:          isActive ? "#fe5732" : "#0b1f3a",
        letterSpacing:  "-0.5px",
        whiteSpace:     "nowrap",
        lineHeight:     px(25, 18) + "px",
        fontWeight:     400,
        transition:     "color 0.15s ease",
      }}>{name}</span>
    </div>
  );

  const line = (
    <div style={{ width: 2, height: px(TAG_BASE.line, 28), background: "#fe5732", flexShrink: 0 }} />
  );

  const dot = (
    <div style={{
      width:      px(TAG_BASE.dot, 6),
      height:     px(TAG_BASE.dot, 6),
      borderRadius: 1,
      background: "#fe5732",
      boxShadow:  "0 0 11.4px 4px rgba(254,87,50,0.85)",
      flexShrink: 0,
    }} />
  );

  // The photo itself — shared between the stacked (mobile/tablet) and
  // side-by-side (desktop) placements below. overflow:hidden on the wrapper
  // clips the photo to the same radius as the border, instead of relying on
  // border-radius on the <img> itself (which doesn't reliably clip content
  // flush with the border corners).
  const thumbnailImg = (
    <div style={{
      width:        px(TAG_BASE.thumb, 120),
      flexShrink:   0,
      border:       "1px solid white",
      borderRadius: 8,
      overflow:     "hidden",
      filter:       "drop-shadow(0 4px 10px rgba(0,0,0,0.35))",
    }}>
      <img
        src={image}
        alt=""
        style={{
          display:  "block",
          width:    "100%",
          height:   "auto",
          maxWidth: "none",
        }}
      />
    </div>
  );

  // Stacked layouts (mobile/tablet): thumbnail sits in-flow right next to
  // its pill (above for "up", below for "down") — margin goes on whichever
  // side actually faces the pill so the gap is visible instead of trailing
  // off the stack.
  const stackedThumbnail = isActive && !sideBySide && (
    <div style={{
      marginBottom: isUp ? px(TAG_BASE.gap, 4) : 0,
      marginTop:    isUp ? 0 : px(TAG_BASE.gap, 4),
    }}>
      {thumbnailImg}
    </div>
  );

  // Desktop row layout: thumbnail floats beside the pill instead, absolutely
  // positioned off it so it doesn't affect the pill/line/dot column's own
  // width/centering (and therefore doesn't shift the anchor point below).
  const sideBySideThumbnail = isActive && sideBySide && (
    <div style={{
      position:  "absolute",
      top:       "50%",
      [imgSide === "right" ? "left" : "right"]: "100%",
      [imgSide === "right" ? "marginLeft" : "marginRight"]: px(TAG_BASE.gap, 4),
      transform: "translateY(-50%)",
    }}>
      {thumbnailImg}
    </div>
  );

  const pillGroup = sideBySide ? (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {pill}
      {sideBySideThumbnail}
    </div>
  ) : pill;

  return (
    <div
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      style={{
        position:       "absolute",
        left:           0,
        top:            0,
        opacity:        0,           // animation loop fades in when visible
        pointerEvents:  "none",      // animation loop enables when visible
        // centering offset — fixed, never overridden by animation loop
        transform:      isUp ? "translate(-50%, -100%)" : "translate(-50%, 0%)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        cursor:         "pointer",
        zIndex:         10,
        transition:     "opacity 0.25s ease",
        willChange:     "left, top, opacity",
      }}
    >
      {isUp
        ? <>{stackedThumbnail}{pillGroup}{line}{dot}</>
        : <>{dot}{line}{pillGroup}{stackedThumbnail}</>}
    </div>
  );
});
TagMarker.displayName = "TagMarker";

// ── Globe ────────────────────────────────────────────────────────────────────
interface CityFrameData { visible: boolean; sx: number; sy: number; }

// Target Y rotation to bring a city to front-center of the globe. Solved
// against the untilted local point: the group's fixed X tilt only mixes
// Y/Z after this Y rotation is applied (standard Euler 'XYZ' composition),
// so it never affects world.x — this zeroes world.x regardless of TILT_X.
function cityTargetY(lon: number, lat: number): number {
  const b = geo3(lon, lat, GLOBE_RADIUS);
  return Math.atan2(-b.x, b.z);
}

interface GlobeProps {
  onFrameRef: React.MutableRefObject<(data: CityFrameData[]) => void>;
  tagHoveredRef: React.MutableRefObject<boolean>;
  gotoRef: React.MutableRefObject<number | null>;
  autoStopRef: React.MutableRefObject<boolean>;
  onDragStart: () => void;
}

// Renders into whatever box its mount div ends up being laid out at (see the
// CSS aspect-ratio/container-query sizing in App below) — this component just
// watches that box via ResizeObserver and keeps the renderer/camera in sync,
// it never dictates its own size.
function Globe({ onFrameRef, tagHoveredRef, gotoRef, autoStopRef, onDragStart }: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const ro = new ResizeObserver(() => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
    camera.position.z = CAM_Z;

    const group = new THREE.Group();
    group.rotation.x = TILT_X; // fixed 22° downward tilt — only Y changes after this
    scene.add(group);

    // Depth-mask sphere — occludes back hemisphere
    const maskMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 0.995, 64, 64),
      new THREE.MeshBasicMaterial({ colorWrite: false }),
    );
    maskMesh.renderOrder = 0;
    group.add(maskMesh);

    const [bHex, bA] = parseRgba(BORDER_COLOR);
    const borderMat  = new THREE.LineBasicMaterial({ color: new THREE.Color(bHex), transparent: true, opacity: bA, depthTest: true });
    const [gHex, gA] = parseRgba(GRID_COLOR);
    const gridMat    = new THREE.LineBasicMaterial({ color: new THREE.Color(gHex), transparent: true, opacity: gA, depthTest: true });
    const LO = 1;
    const geos: THREE.BufferGeometry[] = [];

    // lat/lon grid
    for (let i = 1; i < GRID_LAT; i++) {
      const lat = -90 + (180 / GRID_LAT) * i;
      const pts = Array.from({ length: GRID_SUB + 1 }, (_, j) =>
        geo3((j / GRID_SUB) * 360 - 180, lat, GLOBE_RADIUS));
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
      l.renderOrder = LO; geos.push(l.geometry); group.add(l);
    }
    for (let i = 0; i < GRID_LON; i++) {
      const lon = (360 / GRID_LON) * i - 180;
      const pts = Array.from({ length: GRID_SUB + 1 }, (_, j) =>
        geo3(lon, -90 + (180 / GRID_SUB) * j, GLOBE_RADIUS));
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat);
      l.renderOrder = LO; geos.push(l.geometry); group.add(l);
    }

    // country borders
    const topo      = worldTopo as unknown as Topology<{ countries: GeometryCollection }>;
    const countries = feature(topo, topo.objects.countries);
    for (const f of countries.features) {
      if (!f.geometry || String(f.id) === ANTART_ID) continue;
      const rings: number[][][] = f.geometry.type === "Polygon"
        ? f.geometry.coordinates
        : f.geometry.type === "MultiPolygon"
          ? f.geometry.coordinates.flat(1)
          : [];
      for (const ring of rings) {
        const l = ringLine(ring, GLOBE_RADIUS, borderMat);
        l.renderOrder = LO; geos.push(l.geometry); group.add(l);
      }
    }

    // Precompute city base vectors (before any globe rotation)
    const cityBase = CITIES.map(c => geo3(c.lon, c.lat, GLOBE_RADIUS));
    const projVec  = new THREE.Vector3();

    // ── interaction state ────────────────────────────────────────────────────
    let dragging = false;
    let prevX    = 0;
    let spinVel  = 0;
    let auto     = true;

    const cv = renderer.domElement;
    const onDown = (e: PointerEvent) => { dragging = true; auto = false; prevX = e.clientX; spinVel = 0; gotoRef.current = null; onDragStart(); cv.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (!dragging) return; spinVel = (e.clientX - prevX) * DRAG_SENS; group.rotation.y += spinVel; prevX = e.clientX; };
    const onUp   = () => { dragging = false; };

    cv.addEventListener("pointerdown",  onDown);
    cv.addEventListener("pointermove",  onMove);
    cv.addEventListener("pointerup",    onUp);
    cv.addEventListener("pointerleave", onUp);
    cv.addEventListener("contextmenu",  e => e.preventDefault());

    let raf: number;

    const animate = () => {
      raf = requestAnimationFrame(animate);

      const tagHovered = tagHoveredRef?.current ?? false;
      const gotoTarget = gotoRef?.current ?? null;
      if (!dragging) {
        if (gotoTarget !== null) {
          // Shortest-path lerp to target Y rotation
          const diff = ((gotoTarget - group.rotation.y + Math.PI) % (2 * Math.PI)) - Math.PI;
          if (Math.abs(diff) < 0.003) {
            group.rotation.y = gotoTarget;
            gotoRef.current  = null;
            auto = true;
          } else {
            group.rotation.y += diff * 0.06;
            spinVel = 0;
            auto    = false;
          }
        } else if (Math.abs(spinVel) > 0.00005) {
          group.rotation.y += spinVel;
          spinVel *= INERTIA;
        } else {
          spinVel = 0;
          auto    = true;
        }
        if (auto && !tagHovered && !autoStopRef.current) group.rotation.y += AUTO_ROTATE;
      }

      // Ensure camera and group matrices are fresh before projecting
      camera.updateMatrixWorld();
      group.updateWorldMatrix(false, false);

      // Compute world position of each city using the group's actual world matrix
      // (includes both X tilt and current Y spin, exactly matching the rendered globe)
      const cw = mount.clientWidth;
      const ch = mount.clientHeight;
      const frameData: CityFrameData[] = cityBase.map(base => {
        const world = base.clone().applyMatrix4(group.matrixWorld);
        // world.z > 0 means the city faces the camera; use a small positive
        // buffer so the tag fully fades before reaching the geometric horizon
        // Perspective horizon: point is occluded when (cam - P)·N ≤ 0,
        // which for cam=(0,0,CAM_Z) simplifies to world.z ≤ r²/CAM_Z
        if (world.z <= GLOBE_RADIUS * GLOBE_RADIUS / CAM_Z) return { visible: false, sx: 0, sy: 0 };
        projVec.copy(world).project(camera);
        return {
          visible: true,
          // map NDC [-1,1] → canvas pixels using the actual rendered dimensions
          sx: (projVec.x  + 1) / 2 * cw,
          sy: (-projVec.y + 1) / 2 * ch,
        };
      });

      onFrameRef.current(frameData);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown",  onDown);
      cv.removeEventListener("pointermove",  onMove);
      cv.removeEventListener("pointerup",    onUp);
      cv.removeEventListener("pointerleave", onUp);
      ro.disconnect();
      geos.forEach(g => g.dispose());
      maskMesh.geometry.dispose();
      (maskMesh.material as THREE.Material).dispose();
      borderMat.dispose(); gridMat.dispose();
      renderer.dispose();
      if (mount.contains(cv)) mount.removeChild(cv);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100%", cursor: "grab" }}
      onMouseDown={e => { (e.currentTarget as HTMLDivElement).style.cursor = "grabbing"; }}
      onMouseUp={e   => { (e.currentTarget as HTMLDivElement).style.cursor = "grab"; }}
    />
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { w, h }      = useViewportSize();
  const bp             = getBreakpoint(w);
  const cfg             = LAYOUTS[bp];
  const shortViewport  = h < SHORT_VIEWPORT_H;
  const stacked        = w < STACK_BELOW_W || shortViewport;
  // Shrink the tag stack further on short viewports so the reserved headroom
  // (and the globe it makes room for) stays reasonable even when width alone
  // would otherwise pick a larger scale (e.g. a wide-but-short window).
  const tagScale        = shortViewport ? Math.min(cfg.tagScale, 0.55) : cfg.tagScale;
  const reserve         = tagStackReserve(tagScale);

  // Stable refs — readable by the animation-loop callback without stale closures
  const tagEls        = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const tagHoveredRef = useRef<boolean>(false);
  const gotoRef       = useRef<number | null>(null);
  const autoStopRef   = useRef<boolean>(false);
  const [activeCity, setActiveCity]   = useState<number | null>(null);
  const [hoveredTab, setHoveredTab]   = useState<number | null>(null);

  const selectCity = useCallback((i: number) => {
    setActiveCity(i);
    gotoRef.current     = cityTargetY(CITIES[i].lon, CITIES[i].lat);
    autoStopRef.current = true; // stop auto-rotate once the globe is aimed at a selection
  }, []);

  const markHover = useCallback((on: boolean) => { tagHoveredRef.current = on; }, []);

  // Manually rotating the globe abandons whatever city was selected —
  // also lets auto-rotate resume once inertia decays back to idle.
  const deselectCity = useCallback(() => {
    setActiveCity(null);
    autoStopRef.current = false;
  }, []);

  // Called every animation frame — updates tag marker DOM positions directly
  const onFrameRef = useRef((data: CityFrameData[]) => {
    data.forEach((d, i) => {
      const el = tagEls.current[i];
      if (!el) return;
      if (!d.visible) {
        el.style.opacity       = "0";
        el.style.pointerEvents = "none";
        return;
      }
      el.style.left          = d.sx + "px";
      el.style.top           = d.sy + "px";
      el.style.opacity       = "1";
      el.style.pointerEvents = "auto";
    });
  });

  const ActiveCard = activeCity !== null ? CITIES[activeCity].Card : null;

  return (
    <div style={{
      width:               "100vw",
      minHeight:           "100vh",
      height:              stacked ? "auto" : "100vh",
      background:          BG,
      display:             stacked ? "flex" : "grid",
      flexDirection:       stacked ? "column" : undefined,
      gridTemplateColumns: stacked ? undefined : `repeat(${cfg.columns}, 1fr)`,
      columnGap:           stacked ? undefined : cfg.gutter,
      padding:             stacked ? 0 : `0 ${cfg.margin}px`,
      boxSizing:           "border-box",
      overflowX:           "hidden",
      overflowY:           stacked ? "visible" : "hidden",
      position:            "relative",
    }}>
      {/* Menu + info card. On row layouts (desktop/tablet) this sits left of the
          globe at a fixed width; minHeight:0 lets overflowY:auto engage as a
          fallback (long addresses on short viewports) instead of the grid
          track growing past 100vh and getting hard-clipped. On the stacked
          mobile layout it sits below the globe and the page itself scrolls. */}
      <div style={{
        gridColumn:     stacked ? undefined : `1 / span ${cfg.menuCols}`,
        order:          stacked ? 2 : undefined,
        width:          stacked ? "100%" : undefined,
        height:         stacked ? "auto" : "100%",
        minHeight:      0,
        display:        "flex",
        flexDirection:  "column",
        justifyContent: stacked ? "flex-start" : "center",
        gap:            cfg.menuGap,
        boxSizing:      "border-box",
        overflowY:      stacked ? "visible" : "auto",
        padding:        stacked ? `28px ${cfg.margin}px 48px` : 0,
        zIndex:         20,
      }}>
        {/* Menu */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {CITIES.map((city, i) => {
            const isActive  = activeCity === i;
            const isHovered = hoveredTab === i;
            const highlight = isActive || isHovered;
            const color     = highlight ? "#fe5732" : "rgba(255,255,255,0.55)";
            return (
              <button
                key={i}
                onClick={() => selectCity(i)}
                onMouseEnter={() => setHoveredTab(i)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  fontFamily:    "'Cabinet Grotesk Variable', sans-serif",
                  fontSize:      cfg.menuFont,
                  fontWeight:    400,
                  lineHeight:    `${cfg.menuLineHeight}px`,
                  letterSpacing: "-1px",
                  textAlign:     "left",
                  color,
                  background:    "transparent",
                  border:        "none",
                  borderBottom:  `1px solid ${highlight ? "#fe5732" : "rgba(255,255,255,0.2)"}`,
                  padding:       cfg.menuPadding,
                  cursor:        "pointer",
                  transition:    "color 0.15s ease, border-color 0.15s ease",
                  outline:       "none",
                }}
              >
                {city.name}
              </button>
            );
          })}
        </div>

        {/* Info card — empty state until a city is selected */}
        {ActiveCard ? (
          <div style={{ width: "100%" }}>
            <ActiveCard />
          </div>
        ) : (
          <div style={{
            fontFamily: "Inter, sans-serif",
            fontSize:   16,
            lineHeight: "24px",
            color:      "rgba(255,255,255,0.5)",
            padding:    "0 16px",
          }}>
            Select a location to view details.
          </div>
        )}
      </div>

      {/* Globe panel. On row layouts it fills the remaining columns at full
          viewport height; on the stacked mobile layout it's a full-width band
          pinned to the top, sized as a share of the viewport height.

          Sizing/centering is pure CSS (container query units), not a
          ResizeObserver + React state round-trip — that JS-measured approach
          was a step behind the real layout on resize and could size or
          position the globe wrong for a frame (or longer). `container-type:
          size` turns this panel into a query container; `--box` picks the
          largest square that fits both its width and (height minus the
          headroom reserved for an "up" pin's popup). The box itself sits
          centered in the panel (equal space above/below) — the subtracted
          reserve just keeps the box small enough that a popup normally has
          room to pop up into that centered slack without clipping.

          Any stacked layout (globe-on-top, page-scrolling) uses a separate,
          width-only formula instead: fitting the box to a fixed vh share of
          the viewport (as row layouts do) only works when the reserve was
          tuned against that same vh share, and the desktop/tablet reserve
          values are tuned for full-height row use, not a shrunk vh band —
          plugged into a vh-band formula they starve the box down to a
          fraction of its width, which is what was happening here at
          tablet-width stacked layouts. Sizing off width alone sidesteps
          that mismatch entirely, and the panel's height becomes auto
          instead of a viewport-height share, so the reserved headroom is
          real layout space the page can scroll to rather than space
          squeezed out of a fixed box. */}
      <div style={{
        gridColumn:     stacked ? undefined : `${cfg.menuCols + 1} / span ${cfg.globeCols}`,
        order:          stacked ? 1 : undefined,
        width:          stacked ? "100%" : undefined,
        height:         stacked ? "auto" : "100%",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        boxSizing:      "border-box",
        padding:        stacked ? "24px 0" : 0,
        // container queries only apply to the row/normal-height sizing
        // formula below — the stacked-layout box is width-only and doesn't
        // need a size container (which would otherwise require this panel
        // to have a definite height, conflicting with height:"auto" above).
        containerType:  stacked ? undefined : "size",
        "--box":        stacked ? "min(100%, 420px)" : `min(100cqw, calc(100cqh - ${reserve}px))`,
      } as CSSVars}>
        {stacked ? (
          // Scrolling stacked layout: the reserve is real spacer space
          // above the box in normal flow, not shared/centered — the page
          // can just scroll to reveal a popup that needs it.
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "var(--box)" }}>
            <div style={{ height: reserve, flexShrink: 0 }} />
            <div style={{ position: "relative", width: "100%", aspectRatio: "1" }}>
              <Globe onFrameRef={onFrameRef} tagHoveredRef={tagHoveredRef} gotoRef={gotoRef} autoStopRef={autoStopRef} onDragStart={deselectCity} />

              {/* Overlay: same footprint as globe, overflow visible so pill labels can extend outside */}
              <div style={{
                position:      "absolute",
                inset:         0,
                overflow:      "visible",
                pointerEvents: "none",
                zIndex:        5,
              }}>
                {CITIES.map((city, i) => (
                  <TagMarker
                    key={i}
                    ref={el => { tagEls.current[i] = el; }}
                    name={city.name}
                    variant={city.variant}
                    isActive={activeCity === i}
                    image={city.image}
                    scale={tagScale}
                    sideBySide={false}
                    imgSide={city.imgSide}
                    onMouseEnter={() => markHover(true)}
                    onMouseLeave={() => markHover(false)}
                    onClick={() => selectCity(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ position: "relative", width: "var(--box)", aspectRatio: "1" }}>
            <Globe onFrameRef={onFrameRef} tagHoveredRef={tagHoveredRef} gotoRef={gotoRef} autoStopRef={autoStopRef} onDragStart={deselectCity} />

            {/* Overlay: same footprint as globe, overflow visible so pill labels can extend outside */}
            <div style={{
              position:      "absolute",
              inset:         0,
              overflow:      "visible",
              pointerEvents: "none",
              zIndex:        5,
            }}>
              {CITIES.map((city, i) => (
                <TagMarker
                  key={i}
                  ref={el => { tagEls.current[i] = el; }}
                  name={city.name}
                  variant={city.variant}
                  isActive={activeCity === i}
                  image={city.image}
                  scale={tagScale}
                  sideBySide={true}
                  imgSide={city.imgSide}
                  onMouseEnter={() => markHover(true)}
                  onMouseLeave={() => markHover(false)}
                  onClick={() => selectCity(i)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
