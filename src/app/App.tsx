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

// ── constants ────────────────────────────────────────────────────────────────
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
const CITIES = [
  { lat:  32.7767, lon:  -96.7970, name: "Dallas, Texas, USA (Headquarters)",   variant: "up"   as "up" | "down", Card: Dal, image: imgDal },
  { lat:   9.9281, lon:  -84.0907, name: "San José, Costa Rica",  variant: "up"   as "up" | "down", Card: San, image: imgSan },
  { lat:  17.3850, lon:   78.4867, name: "Hyderabad, India",      variant: "up"   as "up" | "down", Card: Hyd, image: imgHyd },
  { lat:  17.6868, lon:   83.2185, name: "Visakhapatnam, India",  variant: "down" as "up" | "down", Card: Viz, image: imgViz },
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

// ── TagMarker ────────────────────────────────────────────────────────────────
// Pill label + connecting line + glowing square dot.
// variant="up"   → label above, dot below  (anchor = dot = bottom-center)
// variant="down" → dot above, label below  (anchor = dot = top-center)
// Position is driven imperatively via style.left / style.top by the animation loop.
// transform: translate(-50%, -100%) for "up" → bottom-center at (left, top)
// transform: translate(-50%, 0%)   for "down" → top-center at (left, top)
const TagMarker = forwardRef<HTMLDivElement, {
  name: string;
  variant: "up" | "down";
  isActive: boolean;
  image: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}>(({ name, variant, isActive, image, onMouseEnter, onMouseLeave, onClick }, ref) => {
  const isUp = variant === "up";

  const pill = (
    <div style={{
      background:   "white",
      borderRadius: 1000,
      border:       "1px solid #fe5732",
      height:       57,
      padding:      "0 24px",
      display:      "flex",
      alignItems:   "center",
      flexShrink:   0,
    }}>
      <span style={{
        fontFamily:     "Inter, sans-serif",
        fontSize:       18,
        color:          isActive ? "#fe5732" : "#0b1f3a",
        letterSpacing:  "-0.5px",
        whiteSpace:     "nowrap",
        lineHeight:     "25px",
        fontWeight:     400,
        transition:     "color 0.15s ease",
      }}>{name}</span>
    </div>
  );

  const line = (
    <div style={{ width: 2, height: 75, background: "#fe5732", flexShrink: 0 }} />
  );

  const dot = (
    <div style={{
      width:      8,
      height:     8,
      borderRadius: 1,
      background: "#fe5732",
      boxShadow:  "0 0 11.4px 4px rgba(254,87,50,0.85)",
      flexShrink: 0,
    }} />
  );

  // Only shown for the active city, sitting right next to its pill (above
  // for "up", below for "down") — margin goes on whichever side actually
  // faces the pill so the gap is visible instead of trailing off the stack.
  // overflow:hidden on the wrapper clips the photo to the same radius as the
  // border, instead of relying on border-radius on the <img> itself (which
  // doesn't reliably clip content flush with the border corners).
  const thumbnail = isActive && (
    <div style={{
      width:        206,
      flexShrink:   0,
      marginBottom: isUp ? 8 : 0,
      marginTop:    isUp ? 0 : 8,
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
        ? <>{thumbnail}{pill}{line}{dot}</>
        : <>{dot}{line}{pill}{thumbnail}</>}
    </div>
  );
});
TagMarker.displayName = "TagMarker";

// ── Globe ────────────────────────────────────────────────────────────────────
interface CityFrameData { visible: boolean; sx: number; sy: number; }

// Target Y rotation to bring a city to front-center of the globe
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

// ── grid ─────────────────────────────────────────────────────────────────────
const GRID_MARGIN = 80;
const GRID_GUTTER = 20;

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Stable refs — readable by the animation-loop callback without stale closures
  const tagEls        = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const tagHoveredRef = useRef<boolean>(false);
  const gotoRef       = useRef<number | null>(null);
  const autoStopRef   = useRef<boolean>(false);
  const [activeCity, setActiveCity]   = useState<number | null>(null);
  const [hoveredTab, setHoveredTab]   = useState<number | null>(null);

  // Globe must render into a square mount (camera aspect is fixed at 1) — measure
  // the left half and clamp to whichever of width/height is smaller.
  const globeHalfRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState(0);
  useEffect(() => {
    const el = globeHalfRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setGlobeSize(Math.min(el.clientWidth, el.clientHeight));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
      height:              "100vh",
      background:          BG,
      display:             "grid",
      gridTemplateColumns: "repeat(12, 1fr)",
      columnGap:           GRID_GUTTER,
      padding:             `0 ${GRID_MARGIN}px`,
      boxSizing:            "border-box",
      overflow:             "hidden",
      position:             "relative",
    }}>
      {/* Left — menu + info card (4 cols). paddingTop anchors the menu at a
          fixed position. minHeight:0 lets overflowY:auto engage as a fallback
          (long addresses on short viewports) instead of the grid track
          growing past 100vh and getting hard-clipped. */}
      <div style={{
        gridColumn:     "1 / span 4",
        height:         "100%",
        minHeight:      0,
        display:        "flex",
        flexDirection:  "column",
        justifyContent: "center",
        gap:            32,
        boxSizing:      "border-box",
        overflowY:      "auto",
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
                  fontSize:      20,
                  fontWeight:    400,
                  lineHeight:    "29px",
                  letterSpacing: "-1px",
                  textAlign:     "left",
                  color,
                  background:    "transparent",
                  border:        "none",
                  borderBottom:  `1px solid ${highlight ? "#fe5732" : "rgba(255,255,255,0.2)"}`,
                  padding:       "16px 4px",
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

      {/* Right — globe (8 cols), fixed to the viewport height. */}
      <div ref={globeHalfRef} style={{
        gridColumn:     "5 / span 8",
        height:         "100%",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        boxSizing:      "border-box",
      }}>
        <div style={{ position: "relative", width: globeSize, height: globeSize }}>
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
                onMouseEnter={() => markHover(true)}
                onMouseLeave={() => markHover(false)}
                onClick={() => selectCity(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
