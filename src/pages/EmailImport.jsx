import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// ─── Tiny icon wrapper ────────────────────────────────────────────────────────
const Ic = ({ children, className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IcInbox   = ({className}) => <Ic className={className}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ic>;
const IcPlug    = ({className}) => <Ic className={className}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></Ic>;
const IcRefresh = ({className}) => <Ic className={className}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.47"/></Ic>;
const IcDl      = ({className}) => <Ic className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ic>;
const IcX       = ({className}) => <Ic className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>;
const IcCheck   = ({className}) => <Ic className={className}><polyline points="20 6 9 17 4 12"/></Ic>;
const IcEdit2   = ({className}) => <Ic className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Ic>;
const IcAlert   = ({className}) => <Ic className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ic>;
const IcMail    = ({className}) => <Ic className={className}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Ic>;
const IcCopy    = ({className}) => <Ic className={className}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ic>;
const IcPkg     = ({className}) => <Ic className={className}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></Ic>;
const IcChev    = ({ open }) => (
  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const confStyle = (pct) => ({
  bar:  pct >= 80 ? "bg-green-500"  : pct >= 55 ? "bg-amber-400"  : "bg-red-500",
  text: pct >= 80 ? "text-green-600": pct >= 55 ? "text-amber-600": "text-red-600",
  pill: pct >= 80
    ? "bg-green-50 text-green-700 border-green-200"
    : pct >= 55
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200",
});
const confMsg = (pct) =>
  pct >= 80 ? "Ready to import" : pct >= 55 ? "Review recommended" : "Missing key data — fill manually";

const STORE_STYLE = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("amazon"))   return "bg-orange-50 text-orange-700 border-orange-200";
  if (n.includes("best buy")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (n.includes("walmart"))  return "bg-green-50 text-green-700 border-green-200";
  if (n.includes("target"))   return "bg-red-50 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
};

const EMAIL_TYPE_STYLE = {
  "Order placed":  "bg-purple-50 text-purple-700",
  "Shipped":       "bg-blue-50 text-blue-700",
  "Delivered":     "bg-green-50 text-green-700",
  "Pickup ready":  "bg-amber-50 text-amber-700",
  "Reminder":      "bg-red-50 text-red-700",
  "Update":        "bg-gray-100 text-gray-600",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function ParsedField({ label, value, found }) {
  return found ? (
    <div className="rounded-lg p-2.5 bg-green-50 border border-green-200">
      <p className="text-[9.5px] uppercase tracking-wider text-green-600 font-semibold mb-1">{label}</p>
      <p className="text-xs font-semibold text-green-700 truncate">{value}</p>
    </div>
  ) : (
    <div className="rounded-lg p-2.5 bg-red-50 border border-red-200">
      <p className="text-[9.5px] uppercase tracking-wider text-red-500 font-semibold mb-1">{label}</p>
      <p className="text-xs text-gray-400 italic">{value || "Not found"}</p>
    </div>
  );
}

function EmailTypeBadge({ type }) {
  return (
    <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full shrink-0 ${EMAIL_TYPE_STYLE[type] || EMAIL_TYPE_STYLE["Update"]}`}>
      {type}
    </span>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className={`w-9 h-5 rounded-full transition-colors ${checked ? "bg-purple-600" : "bg-gray-200"}`}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : ""}`} />
      </div>
    </label>
  );
}

// ─── Order group card ─────────────────────────────────────────────────────────
function OrderGroup({ group, checked, onCheck, existingOrders }) {
  const [open, setOpen] = useState(false);
  const cs = confStyle(group.confidence);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${checked ? "border-purple-300 ring-1 ring-purple-200" : "border-gray-200"}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <input
          type="checkbox"
          className="accent-purple-600 w-3.5 h-3.5 shrink-0"
          checked={checked}
          onChange={e => { e.stopPropagation(); onCheck(e.target.checked); }}
          onClick={e => e.stopPropagation()}
        />

        {/* Store badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 border ${STORE_STYLE(group.store)}`}>
          {(group.store || "?").slice(0, 3).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[13.5px] font-semibold text-gray-900">{group.store || "Unknown store"}</span>
            {group.orderNumber && (
              <code className="text-[11px] text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md font-mono">
                {group.orderNumber}
              </code>
            )}
            <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
              {group.emails.length} email{group.emails.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {group.productName
              ? <><span className="text-gray-700 font-medium">{group.productName}</span>{group.price ? ` — ${group.price}` : ""}</>
              : <span className="italic text-gray-400">No product parsed — status emails only</span>
            }
          </p>
        </div>

        {/* Right meta */}
        <div className="flex items-center gap-2 shrink-0">
          {group.price && <span className="text-sm font-bold text-gray-900">{group.price}</span>}
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cs.pill}`}>
            {group.confidence}%
          </span>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
          <IcChev open={open} />
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-gray-100">
          {/* Parsed fields */}
          <div className="px-4 py-4 bg-gray-50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Parsed order data</p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              <ParsedField label="Order #"  value={group.orderNumber} found={!!group.orderNumber} />
              <ParsedField label="Store"    value={group.store}       found={!!group.store} />
              <ParsedField label="Product"  value={group.productName} found={!!group.productName} />
              <ParsedField label="Price"    value={group.price}       found={!!group.price} />
              <ParsedField label="Qty"      value={group.qty}         found={!!group.qty} />
              <ParsedField label="Date"     value={group.date}        found={!!group.date} />
              <ParsedField label="Tracking" value={group.tracking}    found={!!group.tracking} />
              <ParsedField label="SKU"      value={group.sku}         found={!!group.sku} />
              <ParsedField label="Buyer"    value={group.buyer}       found={!!group.buyer} />
              <ParsedField label="Payment"  value={group.payment}     found={!!group.payment} />
            </div>

            {/* Confidence bar */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-500 shrink-0">Parse confidence</span>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cs.bar}`} style={{ width: `${group.confidence}%`, transition: "width .5s" }} />
              </div>
              <span className={`text-xs font-semibold shrink-0 ${cs.text}`}>
                {group.confidence}% — {confMsg(group.confidence)}
              </span>
            </div>

            {/* Item card or warning */}
            {group.productName ? (
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <IcPkg className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{group.productName}</p>
                  {group.sku && <p className="text-xs text-gray-400">SKU: {group.sku}</p>}
                </div>
                {group.qty && (
                  <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    Qty {group.qty}
                  </span>
                )}
                {group.price && <span className="text-sm font-bold text-gray-900">{group.price}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <IcAlert className="w-4 h-4 shrink-0" />
                No order confirmation found — all emails are status updates. Link to an existing order or reject.
              </div>
            )}
          </div>

          {/* Email thread */}
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {group.emails.length} email{group.emails.length !== 1 ? "s" : ""} in this order thread
            </p>
            <div className="space-y-0">
              {group.emails.map((em, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-b-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? "bg-purple-500" : "bg-gray-300"}`} />
                  <span className="flex-1 text-xs text-gray-600 truncate">{em.subject}</span>
                  <EmailTypeBadge type={em.type} />
                  <span className="text-[10.5px] text-gray-400 shrink-0">{em.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              {group.storeMatched ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                  <IcCheck className="w-3.5 h-3.5" /> {group.store} matched to your stores
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <IcAlert className="w-3.5 h-3.5" /> No store match — link to existing:
                  </span>
                  <select className="select text-xs py-1 px-2 rounded-lg border border-gray-200 bg-white text-gray-700 outline-none"
                    style={{ minWidth: 160 }}
                    onClick={e => e.stopPropagation()}>
                    <option value="">— match existing —</option>
                    {existingOrders.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-colors">
                <IcEdit2 className="w-3 h-3" /> Edit parse
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                <IcDl className="w-3 h-3" /> Import as transaction
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors">
                <IcX className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gmail Auth Modal ─────────────────────────────────────────────────────────
function GmailAuthModal({ open, onClose, onConnect }) {
  return (
    open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Gmail Access</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <IcX className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Required scopes</p>
            <div className="space-y-2 text-sm text-blue-600 font-medium">
              <p>openid</p>
              <p>https://www.googleapis.com/auth/gmail.readonly</p>
              <p>https://www.googleapis.com/auth/userinfo.email</p>
            </div>
          </div>

          <button onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors border-0">
            Done
          </button>
        </div>
      </div>
    )
  );
}

// ─── Integrations tab ─────────────────────────────────────────────────────────
function IntegrationsTab() {
  const [copied, setCopied] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [showGmailModal, setShowGmailModal] = useState(false);
  const FWD = "orders+abc123xyz@inbox.churnlytics.io";

  // Check Gmail connection status on mount
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        const res = await fetch("/api/gmail/status");
        if (res.ok) {
          const data = await res.json();
          setGmailConnected(data.connected || false);
          setGmailEmail(data.email || "");
        }
      } catch (e) {
        console.error("Gmail status check error:", e);
      }
    };
    checkGmailStatus();
  }, []);

  const handleDisconnectGmail = async () => {
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      setGmailConnected(false);
      setGmailEmail("");
    } catch (e) {
      console.error("Disconnect error:", e);
    }
  };

  const handleConnectGmail = async () => {
    setShowGmailModal(false);
    try {
      // Request Gmail OAuth authorization via Base44
      // This will open a popup for user consent
      const scopes = [
        'openid',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ];
      
      // Use Base44's built-in request_oauth_authorization
      // In real implementation, this would be called via a helper function
      // For now, we'll make a backend call that handles this
      const response = await base44.functions.invoke("handleGmailOAuth", {
        action: "authorize",
        scopes: scopes
      });

      if (response?.data?.success) {
        // Check status after successful authorization
        setTimeout(() => {
          const checkStatus = async () => {
            try {
              const res = await fetch("/api/gmail/status");
              if (res.ok) {
                const data = await res.json();
                setGmailConnected(data.connected || false);
                setGmailEmail(data.email || "");
              }
            } catch (e) {
              console.error("Status check error:", e);
            }
          };
          checkStatus();
        }, 1000);
      }
    } catch (e) {
      console.error("Connect error:", e);
    }
  };

  const CARDS = [
    { name: "Gmail", desc: "Connect your Gmail to automatically pull order confirmation emails. No forwarding needed — we scan your inbox directly.", connected: gmailConnected, label: gmailEmail || "Connect Gmail", icBg: "bg-amber-50", icStroke: "text-amber-500", onDisconnect: handleDisconnectGmail, onConnect: () => setShowGmailModal(true) },
    { name: "Outlook / Microsoft 365", desc: "Connect your Outlook or Microsoft 365 account to automatically import order emails without setting up forwarding rules.", connected: false, icBg: "bg-blue-50", icStroke: "text-blue-500" },
    { name: "Email forwarding (manual)", desc: "Use the forwarding address above to forward from Yahoo, Apple Mail, iCloud, or any custom domain. Works with any email client.", connected: true, label: "Address active", icBg: "bg-green-50", icStroke: "text-green-500" },
    { name: "Webhook / API", desc: "Send order data directly via webhook or the Churnlytics API. Useful for automating imports from custom workflows or browser extensions.", connected: false, icBg: "bg-purple-50", icStroke: "text-purple-500" },
  ];

  const PS_ITEMS = [
    { label: "Auto-group by order number",         sub: "Collapse all emails sharing the same order # into one review card",          def: true },
    { label: "Auto-import high-confidence (≥90%)", sub: "Skip manual review for orders that parse cleanly — imports automatically",  def: false },
    { label: "Skip status-only emails",            sub: "Hide pickup reminders, delivery notices, and cancellation warnings",         def: true },
    { label: "Match to existing orders",           sub: "When an order number matches a transaction, link the thread automatically",  def: true },
  ];
  const [ps, setPs] = useState(() => Object.fromEntries(PS_ITEMS.map((s, i) => [i, s.def])));

  return (
    <>
      <GmailAuthModal open={showGmailModal} onClose={() => setShowGmailModal(false)} onConnect={handleConnectGmail} />
      <div className="space-y-5">
      {/* Forwarding address */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Your forwarding address</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Forward any order confirmation email to this address and it'll appear in your inbox for review. Works with any email provider — no account connection required.
        </p>
        <div className="flex gap-2">
          <code className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono select-all">
            {FWD}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(FWD); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <IcCopy className="w-3 h-3" /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <div key={c.name} className={`bg-white rounded-2xl border p-5 ${c.connected ? "border-green-200" : "border-gray-200"}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.icBg}`}>
              <IcMail className={`w-5 h-5 ${c.icStroke}`} />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1.5">{c.name}</h4>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">{c.desc}</p>
            <div className="flex items-center justify-between">
              {c.connected ? (
                <>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                    <IcCheck className="w-3.5 h-3.5" /> {c.label}
                  </span>
                  <button onClick={c.onDisconnect} className="text-xs font-medium text-gray-500 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors">
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400">Not connected</span>
                  <button onClick={c.onConnect} className="text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg transition-colors border-0">
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Parse settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-4">Parse settings</p>
        {PS_ITEMS.map((s, i) => (
          <div key={i} className={`flex items-center justify-between py-3 ${i < PS_ITEMS.length - 1 ? "border-b border-gray-100" : ""}`}>
            <div>
              <p className="text-[13.5px] font-medium text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
            <Toggle checked={ps[i]} onChange={e => setPs(prev => ({ ...prev, [i]: e.target.checked }))} />
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmailImport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inbox");
  const [subFilter, setSubFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [existingOrders, setExistingOrders] = useState([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const data = await fetch(`/api/inbox?${params}`).then(r => r.json()).catch(() => ({ emails: [] }));
      const raw = data.emails || [];

      // Group by orderNumber client-side
      const map = new Map();
      for (const email of raw) {
        const key = email.orderNumber || `_${email.id}`;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            store: email.store || "",
            orderNumber: email.orderNumber || "",
            productName: email.productName || "",
            price: email.price ? `$${parseFloat(email.price).toFixed(2)}` : "",
            qty: email.qty ? String(email.qty) : "",
            date: email.date || "",
            tracking: email.tracking || "",
            buyer: email.buyer || "",
            payment: email.payment || "",
            sku: email.sku || "",
            confidence: email.confidence || 0,
            storeMatched: !!email.storeMatched,
            status: email.status || "pending",
            emails: [],
          });
        }
        const g = map.get(key);
        g.emails.push({ subject: email.subject || "", type: email.emailType || "Update", date: email.date || "" });
        // Keep best fields across thread
        if (!g.productName && email.productName) g.productName = email.productName;
        if (!g.price && email.price) g.price = `$${parseFloat(email.price).toFixed(2)}`;
        if (!g.tracking && email.tracking) g.tracking = email.tracking;
        if (!g.sku && email.sku) g.sku = email.sku;
        if (email.confidence > g.confidence) g.confidence = email.confidence;
        if (email.storeMatched) g.storeMatched = true;
      }
      setGroups([...map.values()]);
    } catch (e) {
      console.error("Inbox fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchInbox();
    fetch("/api/transactions?groupBy=orderNumber")
      .then(r => r.json())
      .then(d => setExistingOrders((d.orders || []).map(o => ({ id: o.id, name: o.orderNumber || o.id }))))
      .catch(() => {});
  }, [fetchInbox]);

  // Counts
  const counts = useMemo(() => ({
    all:       groups.length,
    review:    groups.filter(g => g.status === "pending").length,
    processed: groups.filter(g => g.status === "processed").length,
    failed:    groups.filter(g => g.status === "failed").length,
  }), [groups]);

  const visible = useMemo(() => {
    if (subFilter === "review")    return groups.filter(g => g.status === "pending");
    if (subFilter === "processed") return groups.filter(g => g.status === "processed");
    if (subFilter === "failed")    return groups.filter(g => g.status === "failed");
    return groups;
  }, [groups, subFilter]);

  const allSelected = visible.length > 0 && visible.every(g => selected.has(g.id));

  const bulkImport = async () => {
    const ids = [...selected];
    await Promise.allSettled(ids.map(id => fetch(`/api/inbox/${id}/import`, { method: "POST" })));
    setGroups(prev => prev.map(g => selected.has(g.id) ? { ...g, status: "processed" } : g));
    setSelected(new Set());
  };

  const bulkReject = async () => {
    await Promise.allSettled([...selected].map(id => fetch(`/api/inbox/${id}/reject`, { method: "POST" })));
    setGroups(prev => prev.filter(g => !selected.has(g.id)));
    setSelected(new Set());
  };

  const SUB_TABS = [
    { key: "all",       label: "All",          count: counts.all },
    { key: "review",    label: "Needs review", count: counts.review, countStyle: "bg-amber-100 text-amber-700" },
    { key: "processed", label: "Processed",    count: counts.processed },
    { key: "failed",    label: "Failed",       count: counts.failed, countStyle: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="container max-w-5xl 3xl:max-w-6xl 4xl:max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            {counts.review > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {counts.review} need{counts.review === 1 ? "s" : ""} review
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Forwarded order emails — grouped by order number, review and import as transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-gray-600 outline-none" />
            <span className="text-gray-300">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-gray-600 outline-none" />
          </div>
          <button onClick={fetchInbox} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-60 transition-colors border-0">
            {loading
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <IcRefresh className="w-3.5 h-3.5" />
            }
            {loading ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 border border-gray-200 rounded-xl w-fit mb-6">
        {[
          { key: "inbox", label: "Order inbox", Icon: IcInbox },
          { key: "integrations", label: "Email integrations", Icon: IcPlug },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-purple-600 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "inbox" && counts.review > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"}`}>
                {counts.review}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input type="checkbox" className="accent-purple-600 w-3.5 h-3.5"
                  checked={allSelected}
                  onChange={e => {
                    if (e.target.checked) setSelected(new Set(visible.map(g => g.id)));
                    else setSelected(new Set());
                  }} />
                Select all
              </label>
              {selected.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{selected.size} selected</span>
                  <button onClick={bulkImport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors">
                    <IcDl className="w-3 h-3" /> Import selected
                  </button>
                  <button onClick={bulkReject}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                    <IcX className="w-3 h-3" /> Reject selected
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 border border-gray-200 rounded-xl">
              {SUB_TABS.map(({ key, label, count, countStyle }) => (
                <button key={key} onClick={() => setSubFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    subFilter === key ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${subFilter === key ? (countStyle || "bg-gray-100 text-gray-600") : (countStyle || "bg-gray-200 text-gray-500")}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Fetching emails...</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-4">
                <IcInbox className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-gray-800 font-semibold mb-1">No emails found</p>
              <p className="text-sm text-gray-400">Try adjusting the date range or click Fetch to pull new emails.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map(g => (
                <OrderGroup
                  key={g.id}
                  group={g}
                  checked={selected.has(g.id)}
                  onCheck={v => setSelected(prev => {
                    const next = new Set(prev);
                    v ? next.add(g.id) : next.delete(g.id);
                    return next;
                  })}
                  existingOrders={existingOrders}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── INTEGRATIONS TAB ── */}
      {activeTab === "integrations" && <IntegrationsTab />}
    </div>
  );
}