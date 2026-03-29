import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { computeSankeyLayout, type Post } from "../lib/sankeyLayout";
import SankeyCanvas from "../components/SankeyCanvas";
import ProvinceNav from "../components/ProvinceNav";
import PostDrawer from "../components/PostDrawer";
import DashboardHeader, { type Phase } from "../components/DashboardHeader";

type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

const PROVINCE_PHOTOS: Record<string, string> = {
  EC: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  GP: "https://images.unsplash.com/photo-1577948000111-9c970dfe3743?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  KZN: "https://images.unsplash.com/photo-1552553302-9211bf7f7053?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  WC: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  NW: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  FS: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  MP: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  NC: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&h=1080&fit=crop&auto=format&sat=-100",
  LP: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&h=1080&fit=crop&auto=format&sat=-100",
};

interface Province {
  id: string;
  name: string;
  dominant_emotion: Emotion;
  emotions: Record<Emotion, number>;
  intensity: number;
  consensus: number;
  geist_reading: string;
  themes: any[];
  voices: { text: string; emotion: string; source: string; time?: string }[];
}

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const T = `1200ms ${EASE}`;

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [activeProvince, setActiveProvince] = useState("SA");
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data ──
  const { data: worldData } = useQuery({
    queryKey: ["world-today"],
    queryFn: () => apiRequest("/api/world/today"),
  });

  const snapshot = worldData?.snapshot;
  const provinces: Province[] = snapshot?.provinces || [];
  const postCounts: Record<string, number> = worldData?.postCounts || {};

  const provinceQueryKey = activeProvince === "SA" ? "national" : activeProvince;
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["province-posts", provinceQueryKey],
    queryFn: () => apiRequest(`/api/posts/today?province=${provinceQueryKey}`),
    enabled: !!snapshot,
  });

  const sankeyLayout = useMemo(() => computeSankeyLayout(posts), [posts]);

  const currentVoice = useMemo(() => {
    if (activeProvince === "SA") {
      for (const p of provinces) {
        if (p.voices?.length) return p.voices[0];
      }
      return null;
    }
    const prov = provinces.find((p) => p.id === activeProvince);
    if (!prov?.voices?.length) return null;
    return prov.voices.find((v) => v.emotion === prov.dominant_emotion) || prov.voices[0];
  }, [activeProvince, provinces]);

  const activeProvinceName = useMemo(() => {
    if (activeProvince === "SA") return "South Africa";
    return provinces.find((p) => p.id === activeProvince)?.name || activeProvince;
  }, [activeProvince, provinces]);

  // ── Phase state machine ──
  useEffect(() => {
    if (phase === "loading" && !!snapshot) setPhase("splash");
  }, [phase, snapshot]);

  useEffect(() => {
    if (phase === "splash") {
      const t = setTimeout(() => setPhase("settling"), 3500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "settling") {
      const t = setTimeout(() => setPhase("ready"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // ── Province switch ──
  const handleProvinceSelect = useCallback(
    (provinceId: string) => {
      if (provinceId === activeProvince) return;
      setDrawerNodeId(null);
      setHoveredNode(null);
      setIsTransitioning(true);
      setActiveProvince(provinceId);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), 1200);
    },
    [activeProvince]
  );

  useEffect(() => {
    return () => { if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current); };
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => setDrawerNodeId((prev) => prev === nodeId ? null : nodeId),
    []
  );

  const drawerPosts = useMemo(() => {
    if (!drawerNodeId) return [];
    return sankeyLayout.postsByNode.get(drawerNodeId) || [];
  }, [drawerNodeId, sankeyLayout]);

  const drawerNode = useMemo(() => {
    if (!drawerNodeId) return null;
    return sankeyLayout.nodes.find((n) => n.id === drawerNodeId) || null;
  }, [drawerNodeId, sankeyLayout]);

  const drawerLabel = drawerNode?.label || "";
  const drawerNodeColor = drawerNode?.color || "#8A7860";

  const big = phase === "loading" || phase === "splash";
  const showDashboard = phase === "settling" || phase === "ready";

  return (
    <div
      style={{
        height: "100vh",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        backgroundColor: big ? "#0A0806" : "#F5F1E8",
        overflow: "hidden",
        transition: `background-color ${T}`,
      }}
    >
      {/* ═══ THE HERO — one component, all phases ═══ */}
      <DashboardHeader
        phase={phase}
        provinceName={activeProvinceName}
        voice={currentVoice}
        isProvinceTransitioning={isTransitioning}
        user={user}
        isAdmin={isAdmin}
        onLogout={logout}
      />

      {/* Spacer to push content below the fixed header */}
      <div style={{ height: showDashboard ? 160 : 0, flexShrink: 0, transition: `height ${T}` }} />

      {/* ═══ DASHBOARD ═══ */}
      <main
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          marginBottom: 52,
          opacity: showDashboard ? 1 : 0,
          transition: `opacity 800ms ease 400ms`,
          pointerEvents: showDashboard ? "auto" : "none",
        }}
      >
        <SankeyCanvas
          layout={sankeyLayout}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
          hoveredNode={hoveredNode}
          highlightedNode={drawerNodeId}
          provincePhoto={PROVINCE_PHOTOS[activeProvince] || null}
        />

        <PostDrawer
          isOpen={!!drawerNodeId}
          nodeId={drawerNodeId}
          nodeLabel={drawerLabel}
          nodeColor={drawerNodeColor}
          posts={drawerPosts}
          onClose={() => setDrawerNodeId(null)}
        />
      </main>

      <nav
        style={{
          opacity: showDashboard ? 1 : 0,
          transform: showDashboard ? "translateY(0)" : "translateY(100%)",
          transition: `opacity 600ms ease 500ms, transform 600ms ${EASE} 500ms`,
        }}
      >
        <ProvinceNav
          provinces={provinces}
          activeProvinceId={activeProvince}
          postCounts={postCounts}
          onSelect={handleProvinceSelect}
        />
      </nav>
    </div>
  );
}
