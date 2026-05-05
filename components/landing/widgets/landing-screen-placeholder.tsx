type Variant = "dashboard" | "menu-mobile" | "menu" | "pos" | "inventory" | "cart" | "orders";

export function ScreenPlaceholder({ variant }: { variant: Variant }) {
  switch (variant) {
    case "dashboard":
      return <DashboardPlaceholder />;
    case "menu-mobile":
      return <MenuMobilePlaceholder />;
    case "menu":
      return <MenuPlaceholder />;
    case "pos":
      return <PosPlaceholder />;
    case "inventory":
      return <InventoryPlaceholder />;
    case "cart":
      return <CartPlaceholder />;
    case "orders":
      return <OrdersPlaceholder />;
    default:
      return <DashboardPlaceholder />;
  }
}

function DashboardPlaceholder() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="400" fill="#f8fafc" />
      {/* Sidebar */}
      <rect width="140" height="400" fill="#1e293b" />
      <rect x="16" y="16" width="108" height="8" rx="4" fill="#6366f1" />
      <rect x="16" y="44" width="80" height="6" rx="3" fill="#475569" />
      <rect x="16" y="64" width="96" height="6" rx="3" fill="#334155" />
      <rect x="16" y="84" width="72" height="6" rx="3" fill="#334155" />
      <rect x="16" y="104" width="88" height="6" rx="3" fill="#334155" />
      <rect x="16" y="124" width="64" height="6" rx="3" fill="#334155" />
      {/* Top bar */}
      <rect x="140" y="0" width="500" height="40" fill="#ffffff" />
      <rect x="156" y="14" width="120" height="12" rx="4" fill="#e2e8f0" />
      <circle cx="600" cy="20" r="12" fill="#e2e8f0" />
      {/* KPI cards */}
      <rect x="160" y="56" width="108" height="64" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="176" y="72" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="176" y="88" width="64" height="14" rx="4" fill="#1e293b" />
      <rect x="284" y="56" width="108" height="64" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="300" y="72" width="52" height="6" rx="3" fill="#94a3b8" />
      <rect x="300" y="88" width="56" height="14" rx="4" fill="#6366f1" />
      <rect x="408" y="56" width="108" height="64" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="424" y="72" width="44" height="6" rx="3" fill="#94a3b8" />
      <rect x="424" y="88" width="72" height="14" rx="4" fill="#1e293b" />
      <rect x="532" y="56" width="88" height="64" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="548" y="72" width="40" height="6" rx="3" fill="#94a3b8" />
      <rect x="548" y="88" width="52" height="14" rx="4" fill="#059669" />
      {/* Chart area */}
      <rect x="160" y="136" width="340" height="140" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="176" y="152" width="80" height="8" rx="4" fill="#1e293b" />
      <polyline points="190,250 220,230 250,240 280,210 310,220 340,195 370,200 400,180 430,190 460,170" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="190" y="258" width="280" height="1" fill="#e2e8f0" />
      {/* Table */}
      <rect x="160" y="292" width="460" height="96" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="176" y="308" width="80" height="8" rx="4" fill="#1e293b" />
      <rect x="176" y="328" width="428" height="1" fill="#e2e8f0" />
      <rect x="176" y="340" width="100" height="6" rx="3" fill="#cbd5e1" />
      <rect x="320" y="340" width="60" height="6" rx="3" fill="#cbd5e1" />
      <rect x="440" y="340" width="48" height="6" rx="3" fill="#cbd5e1" />
      <rect x="540" y="336" width="48" height="14" rx="7" fill="#dcfce7" />
      <rect x="176" y="360" width="88" height="6" rx="3" fill="#cbd5e1" />
      <rect x="320" y="360" width="72" height="6" rx="3" fill="#cbd5e1" />
      <rect x="440" y="360" width="56" height="6" rx="3" fill="#cbd5e1" />
      <rect x="540" y="356" width="48" height="14" rx="7" fill="#fef3c7" />
      {/* Right panel */}
      <rect x="516" y="136" width="104" height="140" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="532" y="152" width="64" height="8" rx="4" fill="#1e293b" />
      <circle cx="568" cy="200" r="28" stroke="#6366f1" strokeWidth="4" fill="none" />
      <rect x="556" y="192" width="24" height="10" rx="3" fill="#6366f1" />
    </svg>
  );
}

function MenuMobilePlaceholder() {
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="400" fill="#f8fafc" />
      {/* Top bar */}
      <rect width="200" height="48" fill="#6366f1" />
      <rect x="16" y="16" width="80" height="10" rx="4" fill="white" opacity="0.9" />
      <circle cx="176" cy="21" r="10" fill="white" opacity="0.2" />
      {/* Banner */}
      <rect x="12" y="60" width="176" height="64" rx="10" fill="#e0e7ff" />
      <rect x="24" y="76" width="72" height="8" rx="4" fill="#6366f1" />
      <rect x="24" y="92" width="96" height="6" rx="3" fill="#818cf8" />
      <rect x="128" y="72" width="48" height="44" rx="6" fill="#c7d2fe" />
      {/* Categories */}
      <rect x="12" y="140" width="52" height="22" rx="11" fill="#6366f1" />
      <rect x="20" y="148" width="36" height="6" rx="3" fill="white" />
      <rect x="72" y="140" width="56" height="22" rx="11" fill="#f1f5f9" />
      <rect x="80" y="148" width="40" height="6" rx="3" fill="#94a3b8" />
      <rect x="136" y="140" width="48" height="22" rx="11" fill="#f1f5f9" />
      <rect x="144" y="148" width="32" height="6" rx="3" fill="#94a3b8" />
      {/* Product cards */}
      <rect x="12" y="176" width="84" height="108" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="18" y="182" width="72" height="48" rx="6" fill="#e0e7ff" />
      <rect x="18" y="238" width="56" height="6" rx="3" fill="#1e293b" />
      <rect x="18" y="250" width="36" height="8" rx="3" fill="#6366f1" />
      <rect x="58" y="250" width="28" height="16" rx="8" fill="#6366f1" />
      <rect x="64" y="254" width="16" height="8" rx="2" fill="white" />
      <rect x="104" y="176" width="84" height="108" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="110" y="182" width="72" height="48" rx="6" fill="#fef3c7" />
      <rect x="110" y="238" width="60" height="6" rx="3" fill="#1e293b" />
      <rect x="110" y="250" width="40" height="8" rx="3" fill="#6366f1" />
      <rect x="154" y="250" width="28" height="16" rx="8" fill="#6366f1" />
      <rect x="160" y="254" width="16" height="8" rx="2" fill="white" />
      {/* Second row */}
      <rect x="12" y="296" width="84" height="92" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="18" y="302" width="72" height="48" rx="6" fill="#dcfce7" />
      <rect x="18" y="358" width="52" height="6" rx="3" fill="#1e293b" />
      <rect x="18" y="370" width="32" height="8" rx="3" fill="#6366f1" />
      <rect x="104" y="296" width="84" height="92" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="110" y="302" width="72" height="48" rx="6" fill="#ede9fe" />
      <rect x="110" y="358" width="48" height="6" rx="3" fill="#1e293b" />
      <rect x="110" y="370" width="28" height="8" rx="3" fill="#6366f1" />
    </svg>
  );
}

function MenuPlaceholder() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="400" fill="#f8fafc" />
      {/* Header */}
      <rect width="640" height="52" fill="#6366f1" />
      <rect x="24" y="18" width="100" height="12" rx="4" fill="white" opacity="0.9" />
      <circle cx="590" cy="24" r="14" fill="white" opacity="0.2" />
      <rect x="576" y="20" width="28" height="8" rx="4" fill="white" opacity="0.5" />
      {/* Banner */}
      <rect x="24" y="68" width="592" height="80" rx="12" fill="#e0e7ff" />
      <rect x="44" y="92" width="160" height="12" rx="4" fill="#6366f1" />
      <rect x="44" y="112" width="200" height="8" rx="4" fill="#818cf8" />
      {/* Categories */}
      <rect x="24" y="168" width="72" height="28" rx="14" fill="#6366f1" />
      <rect x="104" y="168" width="80" height="28" rx="14" fill="#f1f5f9" />
      <rect x="192" y="168" width="64" height="28" rx="14" fill="#f1f5f9" />
      <rect x="264" y="168" width="76" height="28" rx="14" fill="#f1f5f9" />
      {/* Product grid */}
      <rect x="24" y="212" width="140" height="172" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="32" y="220" width="124" height="80" rx="8" fill="#e0e7ff" />
      <rect x="32" y="312" width="80" height="8" rx="3" fill="#1e293b" />
      <rect x="32" y="328" width="52" height="10" rx="3" fill="#6366f1" />
      <rect x="32" y="350" width="124" height="24" rx="8" fill="#6366f1" />
      <rect x="178" y="212" width="140" height="172" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="186" y="220" width="124" height="80" rx="8" fill="#fef3c7" />
      <rect x="186" y="312" width="88" height="8" rx="3" fill="#1e293b" />
      <rect x="186" y="328" width="48" height="10" rx="3" fill="#6366f1" />
      <rect x="186" y="350" width="124" height="24" rx="8" fill="#6366f1" />
      <rect x="332" y="212" width="140" height="172" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="340" y="220" width="124" height="80" rx="8" fill="#dcfce7" />
      <rect x="340" y="312" width="72" height="8" rx="3" fill="#1e293b" />
      <rect x="340" y="328" width="56" height="10" rx="3" fill="#6366f1" />
      <rect x="340" y="350" width="124" height="24" rx="8" fill="#6366f1" />
      {/* Cart sidebar */}
      <rect x="488" y="212" width="132" height="172" rx="12" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="500" y="224" width="64" height="8" rx="3" fill="#1e293b" />
      <rect x="500" y="244" width="108" height="1" fill="#e2e8f0" />
      <rect x="500" y="256" width="80" height="6" rx="3" fill="#64748b" />
      <rect x="500" y="270" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="500" y="288" width="80" height="6" rx="3" fill="#64748b" />
      <rect x="500" y="302" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="500" y="324" width="108" height="1" fill="#e2e8f0" />
      <rect x="500" y="340" width="60" height="10" rx="3" fill="#1e293b" />
      <rect x="500" y="360" width="108" height="24" rx="8" fill="#059669" />
    </svg>
  );
}

function PosPlaceholder() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="400" fill="#f8fafc" />
      {/* Left: product grid */}
      <rect width="400" height="400" fill="#ffffff" />
      <rect x="16" y="12" width="120" height="10" rx="4" fill="#1e293b" />
      <rect x="16" y="36" width="368" height="28" rx="8" fill="#f1f5f9" />
      <rect x="28" y="44" width="80" height="12" rx="4" fill="#cbd5e1" />
      {/* Quick categories */}
      <rect x="16" y="76" width="56" height="24" rx="12" fill="#6366f1" />
      <rect x="80" y="76" width="64" height="24" rx="12" fill="#f1f5f9" />
      <rect x="152" y="76" width="52" height="24" rx="12" fill="#f1f5f9" />
      <rect x="212" y="76" width="60" height="24" rx="12" fill="#f1f5f9" />
      {/* Product buttons */}
      <rect x="16" y="116" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="28" y="128" width="60" height="6" rx="3" fill="#475569" />
      <rect x="28" y="142" width="40" height="10" rx="3" fill="#6366f1" />
      <rect x="140" y="116" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="152" y="128" width="72" height="6" rx="3" fill="#475569" />
      <rect x="152" y="142" width="48" height="10" rx="3" fill="#6366f1" />
      <rect x="264" y="116" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="276" y="128" width="56" height="6" rx="3" fill="#475569" />
      <rect x="276" y="142" width="44" height="10" rx="3" fill="#6366f1" />
      <rect x="16" y="196" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="140" y="196" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="264" y="196" width="116" height="68" rx="10" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1" />
      {/* Right: cart/total */}
      <rect x="400" y="0" width="240" height="400" fill="#1e293b" />
      <rect x="420" y="16" width="80" height="10" rx="4" fill="white" opacity="0.8" />
      <rect x="420" y="44" width="200" height="1" fill="#334155" />
      {/* Cart items */}
      <rect x="420" y="60" width="140" height="6" rx="3" fill="#94a3b8" />
      <rect x="580" y="58" width="40" height="10" rx="3" fill="#818cf8" />
      <rect x="420" y="84" width="120" height="6" rx="3" fill="#94a3b8" />
      <rect x="580" y="82" width="40" height="10" rx="3" fill="#818cf8" />
      <rect x="420" y="108" width="160" height="6" rx="3" fill="#94a3b8" />
      <rect x="580" y="106" width="40" height="10" rx="3" fill="#818cf8" />
      {/* Divider */}
      <rect x="420" y="136" width="200" height="1" fill="#334155" />
      {/* Total */}
      <rect x="420" y="156" width="60" height="8" rx="3" fill="#94a3b8" />
      <rect x="556" y="150" width="64" height="20" rx="4" fill="white" opacity="0.9" />
      {/* Payment buttons */}
      <rect x="420" y="320" width="200" height="32" rx="10" fill="#059669" />
      <rect x="460" y="330" width="120" height="12" rx="4" fill="white" opacity="0.9" />
      <rect x="420" y="362" width="96" height="28" rx="8" fill="#475569" />
      <rect x="524" y="362" width="96" height="28" rx="8" fill="#475569" />
    </svg>
  );
}

function InventoryPlaceholder() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="400" fill="#f8fafc" />
      {/* Header */}
      <rect x="24" y="16" width="120" height="14" rx="4" fill="#1e293b" />
      <rect x="480" y="14" width="136" height="28" rx="8" fill="#6366f1" />
      <rect x="504" y="22" width="88" height="12" rx="4" fill="white" opacity="0.9" />
      {/* Filters */}
      <rect x="24" y="52" width="200" height="28" rx="8" fill="#f1f5f9" />
      <rect x="36" y="60" width="100" height="12" rx="4" fill="#cbd5e1" />
      <rect x="240" y="52" width="100" height="28" rx="8" fill="#f1f5f9" />
      {/* Table header */}
      <rect x="24" y="100" width="592" height="32" rx="0" fill="#f1f5f9" />
      <rect x="40" y="112" width="60" height="8" rx="3" fill="#64748b" />
      <rect x="180" y="112" width="48" height="8" rx="3" fill="#64748b" />
      <rect x="320" y="112" width="40" height="8" rx="3" fill="#64748b" />
      <rect x="440" y="112" width="56" height="8" rx="3" fill="#64748b" />
      <rect x="560" y="112" width="40" height="8" rx="3" fill="#64748b" />
      {/* Rows */}
      {[148, 184, 220, 256, 292, 328, 364].map((y, i) => (
        <g key={y}>
          <rect x="24" y={y} width="592" height="32" fill={i % 2 === 0 ? "white" : "#fafafa"} />
          <rect x="40" y={y + 10} width={80 + ((i * 17) % 40)} height="6" rx="3" fill="#475569" />
          <rect x="180" y={y + 10} width="60" height="6" rx="3" fill="#94a3b8" />
          <rect x="320" y={y + 8} width="36" height="12" rx="6"
            fill={i === 2 || i === 5 ? "#fef2f2" : i === 4 ? "#fef3c7" : "#f0fdf4"}
          />
          <rect x="440" y={y + 10} width="48" height="6" rx="3" fill="#94a3b8" />
          <rect x="560" y={y + 8} width="40" height="12" rx="6" fill="#e0e7ff" />
        </g>
      ))}
    </svg>
  );
}

function CartPlaceholder() {
  return (
    <svg viewBox="0 0 200 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="400" fill="#f8fafc" />
      {/* Header */}
      <rect width="200" height="48" fill="white" />
      <rect x="16" y="16" width="12" height="12" rx="2" fill="#94a3b8" />
      <rect x="40" y="18" width="80" height="10" rx="4" fill="#1e293b" />
      {/* Items */}
      <rect x="16" y="64" width="168" height="60" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="24" y="72" width="40" height="40" rx="6" fill="#e0e7ff" />
      <rect x="72" y="76" width="80" height="6" rx="3" fill="#1e293b" />
      <rect x="72" y="90" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="72" y="104" width="36" height="8" rx="3" fill="#6366f1" />
      <rect x="142" y="100" width="32" height="16" rx="8" fill="#f1f5f9" />
      <rect x="16" y="136" width="168" height="60" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="24" y="144" width="40" height="40" rx="6" fill="#fef3c7" />
      <rect x="72" y="148" width="72" height="6" rx="3" fill="#1e293b" />
      <rect x="72" y="162" width="56" height="6" rx="3" fill="#94a3b8" />
      <rect x="72" y="176" width="40" height="8" rx="3" fill="#6366f1" />
      <rect x="142" y="172" width="32" height="16" rx="8" fill="#f1f5f9" />
      <rect x="16" y="208" width="168" height="60" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />
      <rect x="24" y="216" width="40" height="40" rx="6" fill="#dcfce7" />
      <rect x="72" y="220" width="88" height="6" rx="3" fill="#1e293b" />
      <rect x="72" y="234" width="60" height="6" rx="3" fill="#94a3b8" />
      <rect x="72" y="248" width="44" height="8" rx="3" fill="#6366f1" />
      <rect x="142" y="244" width="32" height="16" rx="8" fill="#f1f5f9" />
      {/* Divider */}
      <rect x="16" y="288" width="168" height="1" fill="#e2e8f0" />
      {/* Totals */}
      <rect x="16" y="304" width="60" height="6" rx="3" fill="#94a3b8" />
      <rect x="140" y="304" width="44" height="6" rx="3" fill="#94a3b8" />
      <rect x="16" y="320" width="48" height="6" rx="3" fill="#94a3b8" />
      <rect x="148" y="320" width="36" height="6" rx="3" fill="#94a3b8" />
      <rect x="16" y="340" width="168" height="1" fill="#e2e8f0" />
      <rect x="16" y="352" width="52" height="10" rx="3" fill="#1e293b" />
      <rect x="132" y="350" width="52" height="14" rx="4" fill="#1e293b" />
      {/* CTA */}
      <rect x="16" y="376" width="168" height="16" rx="8" fill="#059669" />
    </svg>
  );
}

function OrdersPlaceholder() {
  return (
    <svg viewBox="0 0 640 400" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="400" fill="#f8fafc" />
      {/* Header */}
      <rect x="24" y="16" width="140" height="14" rx="4" fill="#1e293b" />
      {/* Status tabs */}
      <rect x="24" y="48" width="64" height="24" rx="8" fill="#6366f1" />
      <rect x="96" y="48" width="72" height="24" rx="8" fill="#f1f5f9" />
      <rect x="176" y="48" width="80" height="24" rx="8" fill="#f1f5f9" />
      <rect x="264" y="48" width="68" height="24" rx="8" fill="#f1f5f9" />
      {/* Order cards */}
      {[92, 176, 260, 344].map((y, i) => (
        <g key={y}>
          <rect x="24" y={y} width="592" height="72" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1" />
          <rect x="40" y={y + 12} width={60 + ((i * 13) % 30)} height="8" rx="3" fill="#1e293b" />
          <rect x="40" y={y + 28} width="120" height="6" rx="3" fill="#94a3b8" />
          <rect x="40" y={y + 44} width="80" height="6" rx="3" fill="#cbd5e1" />
          <rect x={520} y={y + 10} width="80" height="14" rx="7"
            fill={i === 0 ? "#fef3c7" : i === 1 ? "#dbeafe" : i === 2 ? "#dcfce7" : "#f1f5f9"}
          />
          <rect x={520} y={y + 36} width="56" height="10" rx="3" fill="#6366f1" />
          {/* Prep indicator */}
          <rect x="340" y={y + 24} width={80 + i * 20} height="6" rx="3" fill="#e2e8f0" />
          <rect x="340" y={y + 24} width={20 + i * 25} height="6" rx="3" fill={i === 3 ? "#059669" : "#6366f1"} />
        </g>
      ))}
    </svg>
  );
}
