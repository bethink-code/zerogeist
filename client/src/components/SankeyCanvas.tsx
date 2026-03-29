import { useRef, useEffect, useCallback, useState } from "react";
import {
  SankeyLayout,
  interpolateLayouts,
  cubicEaseInOut,
} from "../lib/sankeyLayout";

// ─── Constants ──────────────────────────────────────────

// Responsive padding — tighter on narrow screens
function getPadding(w: number) {
  const mobile = w < 600;
  return {
    left: mobile ? 20 : 100,
    right: mobile ? 36 : 120,
    top: mobile ? 40 : 60,
    bottom: mobile ? 40 : 60,
  };
}
// No more PAD_ constants — use getPadding(w) everywhere
const COL_W = 10;
const BEZIER_CONTROL = 0.42; // 42% of horizontal distance

const LABEL_FONT = "500 12px Inter, system-ui, sans-serif";
const HEADER_FONT = "600 11px Inter, system-ui, sans-serif";
const SCORE_FONT = "500 11px Inter, system-ui, sans-serif";

const COLOR_LABEL = "#5C5040";
const COLOR_LABEL_DIM = "#B0A090";
const COLOR_HEADER = "#8A7860";

const RIBBON_OPACITY_IDLE = 0.28;
const RIBBON_OPACITY_HIGHLIGHT = 0.55;
const RIBBON_OPACITY_DIM = 0.06;
const NODE_OPACITY_DEFAULT = 0.92;
const NODE_OPACITY_HIGHLIGHT = 1.0;
const PHOTO_OPACITY = 0.07;
const NODE_OPACITY_DIM = 0.28;

const MORPH_DURATION = 400; // ms

// ─── Props ──────────────────────────────────────────────

interface SankeyCanvasProps {
  layout: SankeyLayout | null;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
  hoveredNode: string | null;
  highlightedNode?: string | null;
  provincePhoto?: string | null;
}

// ─── Component ──────────────────────────────────────────

export default function SankeyCanvas({
  layout,
  onNodeClick,
  onNodeHover,
  hoveredNode,
  highlightedNode,
  provincePhoto,
}: SankeyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const sankeyCanvasRef = useRef<HTMLCanvasElement>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement>(null);

  const dimsRef = useRef({ w: 0, h: 0 });
  const [dimsReady, setDimsReady] = useState(false);
  const prevLayoutRef = useRef<SankeyLayout | null>(null);
  const animRef = useRef<number | null>(null);
  const renderLayoutRef = useRef<SankeyLayout | null>(null);
  const nodeIndexMapRef = useRef<Map<number, string>>(new Map());
  // Congestion zoom
  interface CongestionZone { col: number; yMin: number; yMax: number; hiddenNodes: string[]; cx: number; cy: number }
  const [congestionZones, setCongestionZones] = useState<CongestionZone[]>([]);
  const [zoomZone, setZoomZone] = useState<CongestionZone | null>(null);

  // Photo image caching
  const photoRef = useRef<HTMLImageElement | null>(null);
  const photoUrlRef = useRef<string | null>(null);

  // ── Resize observer — always watching the same container ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        const w = Math.round(width);
        const h = Math.round(height);
        dimsRef.current = { w, h };

        // Size all canvases
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        for (const ref of [bgCanvasRef, sankeyCanvasRef, hitCanvasRef]) {
          const c = ref.current;
          if (!c) continue;
          c.width = w * dpr;
          c.height = h * dpr;
          c.style.width = `${w}px`;
          c.style.height = `${h}px`;
          const ctx = c.getContext("2d");
          if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        setDimsReady(true);
        // Trigger re-render
        if (renderLayoutRef.current) {
          fullRender(renderLayoutRef.current);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Load province photo ──
  useEffect(() => {
    if (!provincePhoto) {
      photoRef.current = null;
      photoUrlRef.current = null;
      return;
    }
    if (provincePhoto === photoUrlRef.current) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      photoRef.current = img;
      photoUrlRef.current = provincePhoto;
      drawBg();
    };
    img.src = provincePhoto;
  }, [provincePhoto]);

  // ── Draw background canvas ──
  const drawBg = useCallback(() => {
    const ctx = bgCanvasRef.current?.getContext("2d");
    const { w, h } = dimsRef.current;
    if (!ctx || w === 0) return;

    ctx.fillStyle = "#F5F1E8";
    ctx.fillRect(0, 0, w, h);

    // Draw province photo as faint greyscale watermark
    if (photoRef.current) {
      ctx.save();
      ctx.globalAlpha = PHOTO_OPACITY;
      ctx.filter = "grayscale(1)";
      const img = photoRef.current;
      const imgAspect = img.width / img.height;
      const canvasAspect = w / h;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > canvasAspect) {
        sw = img.height * canvasAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / canvasAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      ctx.filter = "none";
      ctx.restore();
    }

    // Column headers
    const colPositions = getColumnX(w);
    ctx.font = HEADER_FONT;
    ctx.fillStyle = COLOR_HEADER;
    ctx.textBaseline = "top";

    ctx.textAlign = "left";
    ctx.fillText("SOURCES", colPositions[0] + COL_W + 4, 12);
    ctx.textAlign = "left";
    ctx.fillText("THEMES", colPositions[1] + COL_W + 4, 12);
    ctx.textAlign = "right";
    ctx.fillText("EMOTIONS", colPositions[2] - 4, 12);
  }, []);

  // ── Draw Sankey diagram ──
  const drawSankey = useCallback(
    (currentLayout: SankeyLayout) => {
      const ctx = sankeyCanvasRef.current?.getContext("2d");
      const { w, h } = dimsRef.current;
      if (!ctx || w === 0) return;
      const pad = getPadding(w);

      ctx.clearRect(0, 0, w, h);
      renderLayoutRef.current = currentLayout;

      if (currentLayout.nodes.length === 0) return;

      const colX = getColumnX(w);
      const flowH = h - pad.top - pad.bottom;
      const activeNode = highlightedNode || hoveredNode;

      // Determine connected nodes/links
      const connectedNodes = new Set<string>();
      const connectedLinks = new Set<string>();
      if (activeNode) {
        connectedNodes.add(activeNode);
        for (const link of currentLayout.links) {
          if (link.sourceId === activeNode || link.targetId === activeNode) {
            connectedNodes.add(link.sourceId);
            connectedNodes.add(link.targetId);
            connectedLinks.add(`${link.sourceId}→${link.targetId}`);
          }
        }
      }

      // ── Draw ribbons ──
      for (const link of currentLayout.links) {
        const linkKey = `${link.sourceId}→${link.targetId}`;
        const srcNode = currentLayout.nodes.find((n) => n.id === link.sourceId);
        const tgtNode = currentLayout.nodes.find((n) => n.id === link.targetId);
        if (!srcNode || !tgtNode) continue;

        const srcColX = colX[srcNode.column];
        const tgtColX = colX[tgtNode.column];

        const x0 = srcColX + COL_W;
        const x1 = tgtColX;
        const dx = x1 - x0;

        const sy0 = pad.top + link.sourceY * flowH;
        const sy1 = sy0 + link.sourceHeight * flowH;
        const ty0 = pad.top + link.targetY * flowH;
        const ty1 = ty0 + link.targetHeight * flowH;

        let opacity = RIBBON_OPACITY_IDLE;
        if (activeNode) {
          opacity = connectedLinks.has(linkKey)
            ? RIBBON_OPACITY_HIGHLIGHT
            : RIBBON_OPACITY_DIM;
        }

        const grad = ctx.createLinearGradient(x0, 0, x1, 0);
        grad.addColorStop(0, hexToRgba(link.sourceColor, opacity));
        grad.addColorStop(1, hexToRgba(link.targetColor, opacity));

        ctx.beginPath();
        ctx.moveTo(x0, sy0);
        ctx.bezierCurveTo(
          x0 + dx * BEZIER_CONTROL, sy0,
          x1 - dx * BEZIER_CONTROL, ty0,
          x1, ty0
        );
        ctx.lineTo(x1, ty1);
        ctx.bezierCurveTo(
          x1 - dx * BEZIER_CONTROL, ty1,
          x0 + dx * BEZIER_CONTROL, sy1,
          x0, sy1
        );
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        if (activeNode && connectedLinks.has(linkKey)) {
          ctx.strokeStyle = hexToRgba(link.targetColor, 0.35);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // ── Draw node bars ──
      // First pass: draw all bars
      for (const node of currentLayout.nodes) {
        if (node.height <= 0) continue;
        const x = colX[node.column];
        const y = pad.top + node.y * flowH;
        const h = node.height * flowH;

        let nodeOpacity = NODE_OPACITY_DEFAULT;
        if (activeNode) {
          nodeOpacity = connectedNodes.has(node.id)
            ? NODE_OPACITY_HIGHLIGHT
            : NODE_OPACITY_DIM;
        }

        ctx.fillStyle = hexToRgba(node.color, nodeOpacity);
        roundRect(ctx, x, y, COL_W, h, 3);
        ctx.fill();

        if (node.id === activeNode) {
          ctx.strokeStyle = hexToRgba(node.color, 1);
          ctx.lineWidth = 1.5;
          roundRect(ctx, x, y, COL_W, h, 3);
          ctx.stroke();
        }
      }

      // Second pass: draw labels with collision avoidance
      const MIN_LABEL_GAP = 14;
      const zones: CongestionZone[] = [];

      for (const col of [0, 1, 2] as const) {
        const colNodes = currentLayout.nodes
          .filter((n) => n.column === col && n.height > 0)
          .sort((a, b) => a.y - b.y);

        // Calculate label positions and determine which to show
        const labels: { node: typeof colNodes[0]; y: number; show: boolean }[] = [];
        let lastShownY = -Infinity;

        for (const node of colNodes) {
          const y = pad.top + node.y * flowH;
          const h = node.height * flowH;
          const labelY = y + h / 2;

          // Always show if highlighted, otherwise check gap
          const isHighlighted = activeNode && connectedNodes.has(node.id);
          const hasGap = labelY - lastShownY >= MIN_LABEL_GAP;

          if (hasGap || isHighlighted || !activeNode) {
            if (hasGap) {
              labels.push({ node, y: labelY, show: true });
              lastShownY = labelY;
            } else {
              labels.push({ node, y: labelY, show: !!isHighlighted });
              if (isHighlighted) lastShownY = labelY;
            }
          } else {
            labels.push({ node, y: labelY, show: false });
          }
        }

        // Detect if any labels are hidden in this column — one zone per column
        const hiddenLabels = labels.filter((l) => !l.show);
        if (hiddenLabels.length >= 2) {
          const hiddenY = hiddenLabels.map((l) => l.y);
          const yMin = Math.min(...hiddenY);
          const yMax = Math.max(...hiddenY);
          const cx = colX[col] - 24;
          const cy = (yMin + yMax) / 2 - 12;
          zones.push({
            col,
            yMin: yMin - 10,
            yMax: yMax + 10,
            hiddenNodes: hiddenLabels.map((l) => l.node.id),
            cx,
            cy,
          });
        }

        // Draw visible labels
        for (const { node, y: labelY, show } of labels) {
          if (!show) continue;

          const x = colX[node.column];
          const labelOpacity = activeNode
            ? connectedNodes.has(node.id) ? 1 : 0.3
            : 1;
          const labelColor = activeNode && !connectedNodes.has(node.id)
            ? COLOR_LABEL_DIM
            : COLOR_LABEL;

          ctx.font = LABEL_FONT;
          ctx.fillStyle = labelColor;
          ctx.globalAlpha = labelOpacity;
          ctx.textBaseline = "middle";

          if (col === 0) {
            ctx.textAlign = "left";
            ctx.fillText(node.label, x + COL_W + 4, labelY);
          } else if (col === 2) {
            ctx.textAlign = "right";
            ctx.fillText(node.label, x - 4, labelY);
            ctx.textAlign = "left";
            ctx.font = SCORE_FONT;
            ctx.fillStyle = hexToRgba(node.color, labelOpacity);
            ctx.fillText(String(node.value), x + COL_W + 4, labelY);
          } else {
            ctx.textAlign = "left";
            const maxLabelW = 120;
            let label = node.label;
            if (ctx.measureText(label).width > maxLabelW) {
              while (label.length > 3 && ctx.measureText(label + "…").width > maxLabelW) {
                label = label.slice(0, -1);
              }
              label += "…";
            }
            ctx.fillText(label, x + COL_W + 4, labelY);
          }

          ctx.globalAlpha = 1;
        }
      }

      // Update congestion zones for DOM button rendering
      setCongestionZones(zones);
    },
    [hoveredNode, highlightedNode]
  );

  // ── Draw hit canvas ──
  const drawHitCanvas = useCallback(
    (currentLayout: SankeyLayout) => {
      const ctx = hitCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      const { w, h } = dimsRef.current;
      if (!ctx || w === 0) return;
      const pad = getPadding(w);

      ctx.clearRect(0, 0, w, h);
      const colX = getColumnX(w);
      const flowH = h - pad.top - pad.bottom;
      const indexMap = new Map<number, string>();

      let colorIndex = 1;
      for (const node of currentLayout.nodes) {
        if (node.height <= 0) continue;

        const x = colX[node.column];
        const y = pad.top + node.y * flowH;
        const nodeH = node.height * flowH;

        let hitX: number, hitW: number;
        if (node.column === 0) {
          hitX = pad.left - 8;
          hitW = 120;
        } else if (node.column === 2) {
          hitX = x - 80;
          hitW = w - hitX;
        } else {
          hitX = x - 20;
          hitW = COL_W + 40;
        }

        const r = colorIndex & 0xff;
        const g = (colorIndex >> 8) & 0xff;
        ctx.fillStyle = `rgb(${r},${g},0)`;
        ctx.fillRect(hitX, y - 8, hitW, nodeH + 16);

        indexMap.set(colorIndex, node.id);
        colorIndex++;
      }

      nodeIndexMapRef.current = indexMap;
    },
    []
  );

  // ── Combined render ──
  const fullRender = useCallback(
    (currentLayout: SankeyLayout) => {
      drawBg();
      drawSankey(currentLayout);
      drawHitCanvas(currentLayout);
    },
    [drawBg, drawSankey, drawHitCanvas]
  );

  // ── Render when layout changes (with morph) ──
  useEffect(() => {
    if (!layout || dimsRef.current.w === 0) return;

    const prev = prevLayoutRef.current;
    prevLayoutRef.current = layout;
    renderLayoutRef.current = layout;

    if (!prev || prev.nodes.length === 0) {
      fullRender(layout);
      return;
    }

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const startTime = performance.now();
    const from = prev;
    const to = layout;

    function animate(now: number) {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / MORPH_DURATION, 1);
      const t = cubicEaseInOut(rawT);
      const interpolated = interpolateLayouts(from, to, t);
      fullRender(interpolated);

      if (rawT < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        animRef.current = null;
        fullRender(to);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [layout, fullRender]);

  // ── Re-render on hover/highlight changes (no morph) ──
  useEffect(() => {
    const current = renderLayoutRef.current || layout;
    if (current && current.nodes.length > 0 && !animRef.current && dimsRef.current.w > 0) {
      drawBg();
      drawSankey(current);
      drawHitCanvas(current);
    }
  }, [hoveredNode, highlightedNode, drawBg, drawSankey, drawHitCanvas, layout]);

  // ── Hit testing ──
  const hitTest = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = hitCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      const pixel = ctx.getImageData(x * dpr, y * dpr, 1, 1).data;
      const index = pixel[0] + (pixel[1] << 8);
      return index > 0 ? nodeIndexMapRef.current.get(index) || null : null;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const nodeId = hitTest(e);
      onNodeHover(nodeId);
      const canvas = hitCanvasRef.current;
      if (canvas) canvas.style.cursor = nodeId ? "pointer" : "default";
    },
    [hitTest, onNodeHover]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const nodeId = hitTest(e);
      if (nodeId) onNodeClick(nodeId);
    },
    [hitTest, onNodeClick]
  );

  const handleMouseLeave = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  const isEmpty = !layout || layout.nodes.length === 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={bgCanvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      <canvas
        ref={sankeyCanvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      <canvas
        ref={hitCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          pointerEvents: isEmpty ? "none" : "auto",
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />

      {/* Empty state overlay */}
      {/* Congestion zone buttons */}
      {congestionZones.map((zone, i) => (
        <button
          key={i}
          onClick={() => setZoomZone(zone)}
          style={{
            position: "absolute",
            left: zone.cx - 20,
            top: zone.cy - 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid rgba(221, 213, 192, 0.5)",
            backgroundColor: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(44,36,24,0.08)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
            transition: "transform 150ms, box-shadow 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(44,36,24,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(44,36,24,0.08)";
          }}
          title={`${zone.hiddenNodes.length} hidden themes — tap to see all`}
        >
          <span style={{ fontSize: 20, fontWeight: 300, color: "#8A7860", lineHeight: 1 }}>+</span>
        </button>
      ))}

      {/* Zoom modal */}
      {zoomZone && layout && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setZoomZone(null)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(245, 241, 232, 0.8)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Zoomed content */}
          <div
            style={{
              position: "relative",
              width: "80%",
              maxWidth: 500,
              backgroundColor: "#FFFFFF",
              border: "1px solid #DDD5C0",
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(44,36,24,0.12)",
              padding: "20px 24px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#2C2418", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                All themes
              </p>
              <button
                onClick={() => setZoomZone(null)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#8A7860", padding: "2px 6px" }}
              >
                ✕
              </button>
            </div>
            {/* All theme nodes, sorted by value */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {layout.nodes
                .filter((n) => n.column === zoomZone.col && n.height > 0)
                .sort((a, b) => b.value - a.value)
                .map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      setZoomZone(null);
                      onNodeClick(node.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      border: "1px solid #EDE8D8",
                      borderRadius: 6,
                      backgroundColor: "#FAF7F0",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background-color 150ms",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#EDE8D8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#FAF7F0"; }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 24,
                        borderRadius: 2,
                        backgroundColor: node.color,
                        opacity: 0.85,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#2C2418", margin: 0 }}>
                        {node.label}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: "#8A7860", flexShrink: 0 }}>
                      {node.value}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && dimsReady && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <p style={{ color: "#8A7860", fontSize: 14, fontStyle: "italic" }}>
            No signal yet. The geist is silent.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function getColumnX(canvasWidth: number): [number, number, number] {
  const pad = getPadding(canvasWidth);
  const usable = canvasWidth - pad.left - pad.right - COL_W * 3;
  return [
    pad.left,
    pad.left + COL_W + usable / 2,
    canvasWidth - pad.right - COL_W,
  ];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
