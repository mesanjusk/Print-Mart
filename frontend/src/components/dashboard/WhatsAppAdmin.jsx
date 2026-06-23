import { useState, useEffect, useCallback, useRef } from "react";
import { waAdminAPI } from "../../services/api";
import toast from "react-hot-toast";
import Spinner from "../common/Spinner";
import {
  FiMessageSquare, FiSend, FiUsers, FiActivity, FiSettings,
  FiCheckCircle, FiXCircle, FiPhone, FiRefreshCw, FiRadio,
  FiClock, FiZap, FiTrash2, FiPlay, FiPause, FiPlus, FiEdit2,
  FiAlertCircle, FiBell, FiCode, FiTerminal, FiSliders, FiGitBranch,
  FiRotateCcw, FiSave,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtTime = (iso) => iso ? new Date(iso).toLocaleString() : "—";
const minutesUntil = (iso) => iso ? Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000)) : null;

function StatusBadge({ active, labels = ["Active", "Inactive"] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {active ? <FiCheckCircle size={11} /> : <FiXCircle size={11} />}
      {active ? labels[0] : labels[1]}
    </span>
  );
}

function DirectionBadge({ direction }) {
  const inbound = direction === "inbound";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inbound ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
      {inbound ? "In" : "Out"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{fmt(value)}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getStats();
      setStats(res.data);
    } catch {
      toast.error("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!stats) return null;

  const maxDaily = Math.max(...(stats.dailyMessages || []).map((d) => d.count || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">WhatsApp Analytics</h2>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={load}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Messages" value={stats.totalMessages} icon={FiMessageSquare} color="blue" />
        <StatCard label="Inbound" value={stats.inboundMessages} icon={FiActivity} color="green" />
        <StatCard label="Outbound" value={stats.outboundMessages} icon={FiSend} color="purple" />
        <StatCard label="Active Sessions (7d)" value={stats.activeSessionsLast7Days} icon={FiClock} color="amber" />
        <StatCard label="Windows Open" value={stats.windowOpenCount} icon={FiZap} color="blue" />
        <StatCard label="Opt-Outs" value={stats.optOutCount} icon={FiXCircle} color="red" />
      </div>

      {stats.ordersViaWhatsapp !== undefined && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Orders via WhatsApp" value={stats.ordersViaWhatsapp} icon={FiCheckCircle} color="green" />
          <StatCard label="Active Campaigns" value={stats.activeCampaigns} icon={FiZap} color="purple" />
        </div>
      )}

      {stats.dailyMessages?.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Message Volume (7 days)</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyMessages.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${Math.round(((d.count || 0) / maxDaily) * 100)}%`, minHeight: "2px" }}
                  title={`${d.count} messages on ${d._id}`}
                />
                <span className="text-xs text-gray-400 truncate w-full text-center">{(d._id || d.date)?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">API Config Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            { label: "Phone ID", ok: stats.config?.phoneIdConfigured },
            { label: "Access Token", ok: stats.config?.accessTokenConfigured },
            { label: "Verify Token", ok: stats.config?.verifyTokenConfigured },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${item.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {item.ok ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
              {item.label}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">API v{stats.config?.apiVersion || "18.0"}</p>
      </div>
    </div>
  );
}

// ─── Conversations / Inbox Panel ──────────────────────────────────────────────

function ConversationsPanel() {
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [replyType, setReplyType] = useState("text");
  const [tplName, setTplName] = useState("");
  const [tplLang, setTplLang] = useState("en");
  const [tplParams, setTplParams] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const loadConvos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getConversations({ search });
      setConvos(res.data?.conversations || []);
    } catch { toast.error("Failed to load conversations"); }
    finally { setLoading(false); }
  }, [search]);

  const loadMessages = useCallback(async (phone) => {
    try {
      const res = await waAdminAPI.getConversationByPhone(phone);
      setMessages(res.data?.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { toast.error("Failed to load messages"); }
  }, []);

  useEffect(() => { loadConvos(); }, [loadConvos]);
  useEffect(() => { if (selected) loadMessages(selected.phone); }, [selected, loadMessages]);

  const handleSend = async () => {
    if (!selected) return;
    if (replyType === "text" && !reply.trim()) return toast.error("Message is empty");
    if (replyType === "template" && !tplName.trim()) return toast.error("Template name required");
    setSending(true);
    try {
      const payload = replyType === "text"
        ? { message: reply, messageType: "text" }
        : { messageType: "template", templateName: tplName, templateLanguage: tplLang, templateParams: tplParams.split(",").map(s => s.trim()).filter(Boolean) };
      await waAdminAPI.replyToConversation(selected.phone, payload);
      toast.success("Sent");
      setReply(""); setTplName(""); setTplParams("");
      loadMessages(selected.phone);
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  const windowOpen = selected?.windowOpen;
  const minsLeft = selected ? minutesUntil(selected.windowExpiresAt) : null;

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: "600px" }}>
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col card overflow-hidden">
        <div className="p-3 border-b">
          <input className="input w-full text-sm" placeholder="Search phone or role…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
            convos.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">No conversations</p> :
            convos.map(c => {
              const open = c.windowOpen;
              const mins = minutesUntil(c.windowExpiresAt);
              return (
                <button key={c.phone} onClick={() => setSelected(c)}
                  className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 transition-colors ${selected?.phone === c.phone ? "bg-blue-50" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-gray-800 truncate">{c.name || c.phone}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {open ? `${mins}m` : "closed"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.phone}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 capitalize">{c.role || "unknown"}</span>
                    {c.state && c.state !== "idle" && (
                      <span className="text-xs px-1 py-0.5 bg-amber-100 text-amber-700 rounded">{c.state}</span>
                    )}
                  </div>
                  {c.lastMessage && <p className="text-xs text-gray-500 mt-1 truncate">{c.lastMessage}</p>}
                </button>
              );
            })
          }
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            <div className="text-center"><FiMessageSquare size={36} className="mx-auto mb-2 opacity-30" /><p>Select a conversation</p></div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{selected.name || selected.phone}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{selected.phone}</p>
                  <span className="text-xs text-gray-400 capitalize">· {selected.role || "unknown"}</span>
                  {selected.state && selected.state !== "idle" && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">state: {selected.state}</span>
                  )}
                </div>
              </div>
              <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => loadMessages(selected.phone)}>
                <FiRefreshCw size={12} /> Refresh
              </button>
            </div>

            {!windowOpen && (
              <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <FiAlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">24h window is closed. You can only send template messages.</p>
              </div>
            )}
            {windowOpen && minsLeft !== null && minsLeft < 120 && (
              <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <FiClock size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">Window closing in {minsLeft} minutes. Use template after it closes.</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${m.direction === "outbound" ? "bg-green-500 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                    <p className="whitespace-pre-wrap">{m.message || m.templateName || "(media)"}</p>
                    <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-green-100" : "text-gray-400"}`}>{fmtTime(m.createdAt)}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No messages yet</p>}
              <div ref={bottomRef} />
            </div>

            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2 items-center">
                <select className="input text-sm py-1.5" value={replyType} onChange={e => setReplyType(e.target.value)}>
                  <option value="text">Text</option>
                  <option value="template">Template</option>
                </select>
              </div>
              {replyType === "text" ? (
                <div className="flex gap-2">
                  <textarea className="input flex-1 text-sm resize-none" rows={2} placeholder="Type a message…"
                    value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                  <button className="btn-primary px-4 flex items-center gap-1 self-end" onClick={handleSend} disabled={sending}>
                    {sending ? <Spinner size="sm" /> : <FiSend size={14} />}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input className="input flex-1 text-sm" placeholder="Template name" value={tplName} onChange={e => setTplName(e.target.value)} />
                    <input className="input w-20 text-sm" placeholder="Lang" value={tplLang} onChange={e => setTplLang(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <input className="input flex-1 text-sm" placeholder="Params (comma separated)" value={tplParams} onChange={e => setTplParams(e.target.value)} />
                    <button className="btn-primary px-4 flex items-center gap-1" onClick={handleSend} disabled={sending}>
                      {sending ? <Spinner size="sm" /> : <FiSend size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sessions Management Panel ────────────────────────────────────────────────

function SessionsPanel() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getSessions({ page, limit });
      setSessions(res.data?.sessions || []);
      setTotal(res.data?.total || 0);
    } catch { toast.error("Failed to load sessions"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleReset = async (phone) => {
    try {
      await waAdminAPI.resetSession(phone);
      toast.success("Session reset to idle");
      load();
    } catch { toast.error("Failed to reset session"); }
  };

  const handleDelete = async (phone) => {
    if (!confirm(`Delete session for ${phone}?`)) return;
    try {
      await waAdminAPI.deleteSession(phone);
      toast.success("Session deleted");
      load();
    } catch { toast.error("Failed to delete session"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const stateColor = (state) => {
    if (!state || state === "idle") return "bg-gray-100 text-gray-500";
    if (state.startsWith("reg_")) return "bg-blue-100 text-blue-700";
    if (state.includes("confirm")) return "bg-amber-100 text-amber-700";
    return "bg-purple-100 text-purple-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Session Management</h2>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={load}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="card p-3 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiAlertCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Sessions track each WhatsApp phone's conversation state. Reset a session if a user is stuck in a flow (e.g., mid-registration).
        </p>
      </div>

      {loading ? <div className="flex justify-center py-10"><Spinner /></div> :
        sessions.length === 0 ? <p className="text-center text-gray-400 py-10">No sessions found</p> :
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">User</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Role</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">State</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">24h Window</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Last Activity</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const open = s.windowOpen;
                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{s.phone}</td>
                      <td className="px-4 py-2 text-gray-700 text-xs">{s.userId?.name || "—"}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs capitalize">{s.role || "unknown"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateColor(s.state)}`}>
                          {s.state || "idle"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {open ? "open" : "closed"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{fmtTime(s.lastActivity)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          {s.state && s.state !== "idle" && (
                            <button onClick={() => handleReset(s.phone)} className="text-amber-500 hover:text-amber-700 transition-colors p-1" title="Reset state to idle">
                              <FiRotateCcw size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(s.phone)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Delete session">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-gray-500">{fmt(total)} total sessions</p>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="text-xs text-gray-600 px-2 py-1">{page} / {totalPages}</span>
                <button className="btn-secondary text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      }
    </div>
  );
}

// ─── 24h Window Panel ─────────────────────────────────────────────────────────

function WindowPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await waAdminAPI.getWindowStatus();
        setData(res.data);
      } catch { toast.error("Failed to load window status"); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!data) return null;

  const sessions = (data.openSessions || []).slice().sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));

  const windowColor = (mins) => {
    if (mins < 60) return "text-red-600 bg-red-50";
    if (mins < 240) return "text-amber-600 bg-amber-50";
    return "text-green-700 bg-green-50";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open Windows" value={data.open ?? data.openCount} icon={FiCheckCircle} color="green" />
        <StatCard label="Closed Windows" value={data.closed ?? data.closedCount} icon={FiXCircle} color="red" />
        <StatCard label="Total Sessions" value={data.total ?? data.totalCount} icon={FiClock} color="blue" />
      </div>

      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiAlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Meta's 24-hour rule: You can send free-form messages only within 24 hours of the customer's last inbound message. After the window closes, only approved template messages are allowed.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No open windows</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b"><h3 className="font-semibold text-gray-700">Open Sessions (soonest expiry first)</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Expires At</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Time Left</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const mins = s.expiresInMinutes ?? minutesUntil(s.expiresAt);
                  const cls = windowColor(mins);
                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{s.phone}</td>
                      <td className="px-4 py-2 text-gray-700">{s.userId?.name || "—"}</td>
                      <td className="px-4 py-2 text-gray-500">{fmtTime(s.expiresAt)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{mins}m remaining</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bot Config Panel ─────────────────────────────────────────────────────────

const MSG_FIELDS = [
  { key: "welcomeBuyer", label: "Welcome (Buyer)", hint: "Supports {{name}} and {{clientUrl}}", rows: 6 },
  { key: "welcomeSeller", label: "Welcome (Seller)", hint: "Supports {{name}} and {{clientUrl}}", rows: 6 },
  { key: "helpBuyer", label: "Help (Buyer)", hint: "List of buyer commands", rows: 8 },
  { key: "helpSeller", label: "Help (Seller)", hint: "List of seller commands", rows: 8 },
  { key: "unknownUserGreeting", label: "Unknown User Greeting", hint: "Shown to unregistered users. Supports {{clientUrl}}", rows: 5 },
  { key: "fallbackMessage", label: "Fallback Message", hint: "Shown when bot doesn't understand a message", rows: 3 },
  { key: "guestInquiryPrompt", label: "Guest Inquiry Prompt", hint: "Shown when unregistered user types INQUIRE", rows: 6 },
  { key: "optOutConfirmation", label: "Opt-Out Confirmation", hint: "Sent when user types STOP", rows: 4 },
  { key: "optInConfirmation", label: "Opt-In Confirmation", hint: "Sent when user types START after opting out", rows: 3 },
];

function BotConfigPanel() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState(MSG_FIELDS[0].key);
  const [newCmd, setNewCmd] = useState({ keyword: "", response: "", matchType: "exact", roles: ["all"], active: true });
  const [addingCmd, setAddingCmd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getBotConfig();
      setConfig(res.data);
      const f = {};
      MSG_FIELDS.forEach(field => { f[field.key] = res.data[field.key] || ""; });
      f.botEnabled = res.data.botEnabled !== false;
      f.customCommands = res.data.customCommands || [];
      setForm(f);
    } catch { toast.error("Failed to load bot config"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await waAdminAPI.updateBotConfig(form);
      toast.success("Bot config saved");
      load();
    } catch { toast.error("Failed to save config"); }
    finally { setSaving(false); }
  };

  const addCmd = () => {
    if (!newCmd.keyword.trim() || !newCmd.response.trim()) return toast.error("Keyword and response required");
    setForm(f => ({ ...f, customCommands: [...(f.customCommands || []), { ...newCmd, keyword: newCmd.keyword.trim().toLowerCase() }] }));
    setNewCmd({ keyword: "", response: "", matchType: "exact", roles: ["all"], active: true });
    setAddingCmd(false);
  };

  const removeCmd = (idx) => setForm(f => ({ ...f, customCommands: f.customCommands.filter((_, i) => i !== idx) }));
  const toggleCmd = (idx) => setForm(f => ({
    ...f,
    customCommands: f.customCommands.map((c, i) => i === idx ? { ...c, active: !c.active } : c),
  }));

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const activeMsg = MSG_FIELDS.find(f => f.key === activeField);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Bot Configuration</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.botEnabled !== false} onChange={e => setForm(f => ({ ...f, botEnabled: e.target.checked }))} />
            Bot Enabled
          </label>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <FiSave size={14} />} Save All Changes
          </button>
        </div>
      </div>

      {config?.updatedBy && (
        <p className="text-xs text-gray-400">Last updated by {config.updatedBy?.name} on {fmtTime(config.updatedAt)}</p>
      )}

      <div className="card p-3 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiCode size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">Use <code className="bg-blue-100 px-1 rounded">{"{{name}}"}</code> for the user's name and <code className="bg-blue-100 px-1 rounded">{"{{clientUrl}}"}</code> for the app URL in any message.</p>
      </div>

      {/* Message editor */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Messages</p>
          {MSG_FIELDS.map(f => (
            <button key={f.key} onClick={() => setActiveField(f.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeField === f.key ? "bg-green-50 text-green-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="col-span-2 space-y-2">
          {activeMsg && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">{activeMsg.label}</label>
                <span className="text-xs text-gray-400">{activeMsg.hint}</span>
              </div>
              <textarea
                className="input w-full font-mono text-sm"
                rows={activeMsg.rows}
                value={form[activeField] || ""}
                onChange={e => setForm(f => ({ ...f, [activeField]: e.target.value }))}
              />
              <p className="text-xs text-gray-400">{(form[activeField] || "").length} chars</p>
            </>
          )}
        </div>
      </div>

      {/* Custom commands */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Custom Commands</h3>
          <button className="btn-secondary flex items-center gap-1 text-xs" onClick={() => setAddingCmd(v => !v)}>
            <FiPlus size={12} /> Add Command
          </button>
        </div>

        {addingCmd && (
          <div className="card p-4 space-y-3 border-dashed">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Keyword</label>
                <input className="input w-full text-sm" placeholder="e.g. price" value={newCmd.keyword} onChange={e => setNewCmd(c => ({ ...c, keyword: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Match Type</label>
                <select className="input w-full text-sm" value={newCmd.matchType} onChange={e => setNewCmd(c => ({ ...c, matchType: e.target.value }))}>
                  <option value="exact">Exact</option>
                  <option value="contains">Contains</option>
                  <option value="starts_with">Starts With</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Response</label>
              <textarea className="input w-full text-sm" rows={3} placeholder="Bot response text" value={newCmd.response} onChange={e => setNewCmd(c => ({ ...c, response: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Target Role</label>
                <select className="input w-full text-sm" value={newCmd.roles[0]} onChange={e => setNewCmd(c => ({ ...c, roles: [e.target.value] }))}>
                  <option value="all">All</option>
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                  <option value="unknown">Unknown (unregistered)</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button className="btn-primary text-sm flex items-center gap-1" onClick={addCmd}><FiCheckCircle size={13} /> Add</button>
                <button className="btn-secondary text-sm" onClick={() => setAddingCmd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {(form.customCommands || []).length === 0 && !addingCmd ? (
          <p className="text-sm text-gray-400 py-4 text-center">No custom commands. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {(form.customCommands || []).map((cmd, idx) => (
              <div key={idx} className={`card p-3 flex items-start gap-3 ${!cmd.active ? "opacity-60" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{cmd.keyword}</code>
                    <span className="text-xs text-gray-400">{cmd.matchType}</span>
                    <span className="text-xs text-gray-400">→ {cmd.roles?.join(", ") || "all"}</span>
                    <StatusBadge active={cmd.active} />
                  </div>
                  <p className="text-sm text-gray-600 truncate">{cmd.response}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleCmd(idx)} className="text-gray-400 hover:text-amber-600 p-1" title={cmd.active ? "Pause" : "Activate"}>
                    {cmd.active ? <FiPause size={13} /> : <FiPlay size={13} />}
                  </button>
                  <button onClick={() => removeCmd(idx)} className="text-red-400 hover:text-red-600 p-1" title="Remove">
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bot Flow Diagram Panel ───────────────────────────────────────────────────

function BotFlowPanel() {
  const [view, setView] = useState("buyer");

  const buyerNodes = [
    { id: "start", label: "Message Received", color: "bg-gray-700 text-white", shape: "rounded-full" },
    { id: "optout_check", label: "Check Opt-Out?", color: "bg-red-100 text-red-700", shape: "rounded" },
    { id: "auto_reply", label: "Auto-Reply Campaign Match?", color: "bg-purple-100 text-purple-700", shape: "rounded" },
    { id: "known_user", label: "Known User?", color: "bg-blue-100 text-blue-700", shape: "rounded" },
    {
      id: "buyer_cmds", label: "Buyer Commands", color: "bg-blue-50 text-blue-800 border border-blue-200", shape: "rounded",
      sub: ["HI/HELLO → Welcome", "HELP → Commands list", "ORDERS → Order list", "QUOTES → Quotation list", "STATUS → Overview", "ACCEPT → Accept quote + create order", "REJECT → Reject quote", "PAID [#] → Confirm payment", "TRACK [#] → Tracking info", "CANCEL [#] → Cancel order"],
    },
    { id: "inquiry_reply", label: "Reply to open inquiry (pass-through)", color: "bg-blue-50 text-blue-700 border border-blue-200", shape: "rounded" },
    { id: "fallback", label: "Fallback message", color: "bg-gray-100 text-gray-600", shape: "rounded" },
  ];

  const sellerNodes = [
    { id: "start", label: "Message Received", color: "bg-gray-700 text-white", shape: "rounded-full" },
    { id: "optout_check", label: "Check Opt-Out?", color: "bg-red-100 text-red-700", shape: "rounded" },
    { id: "auto_reply", label: "Auto-Reply Campaign Match?", color: "bg-purple-100 text-purple-700", shape: "rounded" },
    { id: "known_user", label: "Seller / Admin?", color: "bg-green-100 text-green-700", shape: "rounded" },
    {
      id: "seller_cmds", label: "Seller Commands", color: "bg-green-50 text-green-800 border border-green-200", shape: "rounded",
      sub: ["HI/HELLO → Welcome", "HELP → Commands list", "ORDERS → Order list", "STATUS → Pending inquiries & orders", "QUOTE [amount] → Send quotation", "DISPATCH [#] [tracking] → Mark dispatched", "DELIVER [#] → Mark delivered"],
    },
    { id: "inquiry_reply_seller", label: "Reply to open inquiry (pass-through)", color: "bg-green-50 text-green-700 border border-green-200", shape: "rounded" },
    { id: "fallback", label: "Fallback message", color: "bg-gray-100 text-gray-600", shape: "rounded" },
  ];

  const unknownNodes = [
    { id: "start", label: "Message Received", color: "bg-gray-700 text-white", shape: "rounded-full" },
    { id: "auto_reply", label: "Auto-Reply Campaign Match?", color: "bg-purple-100 text-purple-700", shape: "rounded" },
    { id: "state_check", label: "Session State?", color: "bg-amber-100 text-amber-700", shape: "rounded" },
    {
      id: "idle_state", label: "idle state", color: "bg-amber-50 text-amber-800 border border-amber-200", shape: "rounded",
      sub: ["REGISTER → Start registration flow (reg_role → reg_name → reg_email)", "INQUIRE → Guest inquiry (guest_inquiry state)", "HI/HELLO → Show greeting with register link", "Other → Default greeting"],
    },
    {
      id: "reg_flow", label: "Registration Flow", color: "bg-orange-50 text-orange-800 border border-orange-200", shape: "rounded",
      sub: ["reg_role: Choose BUYER or SELLER", "reg_name: Enter full name", "reg_email: Enter email → Account created! Temp password sent"],
    },
    {
      id: "guest_inquiry", label: "Guest Inquiry Flow", color: "bg-yellow-50 text-yellow-800 border border-yellow-200", shape: "rounded",
      sub: ["Format: Product | Quantity | Name", "Admin notified via WhatsApp", "Reply with REGISTER link"],
    },
  ];

  const systemFlows = [
    { label: "STOP / UNSUBSCRIBE", desc: "Added to opt-out list. Confirmation sent. All future broadcasts skipped.", color: "bg-red-50 border-red-200" },
    { label: "RESET (existing user)", desc: "Generates a new temp password and sends login link.", color: "bg-blue-50 border-blue-200" },
    { label: "SELLER (buyer only)", desc: "Enters upgrade_seller_confirm state. YES upgrades account.", color: "bg-green-50 border-green-200" },
    { label: "REGISTER (existing user)", desc: "Sends existing account info with new temp password.", color: "bg-purple-50 border-purple-200" },
    { label: "Auto-Reply Campaigns", desc: "Keyword-triggered campaigns run BEFORE the normal bot flow. Priority: opt-out check → campaign → bot flow.", color: "bg-amber-50 border-amber-200" },
    { label: "Status Updates (delivered/read)", desc: "WhatsApp delivery receipts update the message log. No bot response sent.", color: "bg-gray-50 border-gray-200" },
  ];

  const nodes = view === "buyer" ? buyerNodes : view === "seller" ? sellerNodes : unknownNodes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Bot Flow Diagram</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {[["buyer", "Buyer Flow"], ["seller", "Seller Flow"], ["unknown", "Unknown User"], ["system", "System Events"]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${view === v ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view !== "system" && (
        <div className="relative">
          <div className="flex flex-col items-center gap-0">
            {nodes.map((node, idx) => (
              <div key={node.id} className="flex flex-col items-center w-full max-w-xl">
                <div className={`w-full px-4 py-3 ${node.color} ${node.shape} shadow-sm`}>
                  <p className="font-semibold text-center text-sm">{node.label}</p>
                  {node.sub && (
                    <ul className="mt-2 space-y-1">
                      {node.sub.map((s, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className="text-green-500 mt-0.5 flex-shrink-0">▸</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {idx < nodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-6 bg-gray-300" />
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-gray-400" style={{ borderTopWidth: "6px" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "system" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemFlows.map((f, i) => (
            <div key={i} className={`card p-4 border ${f.color}`}>
              <p className="font-semibold text-gray-800 text-sm mb-1">{f.label}</p>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Priority legend */}
      <div className="card p-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Message Processing Priority</p>
        <div className="flex flex-wrap gap-2">
          {["1. Webhook received", "2. Status update? → log only", "3. Opt-out check (STOP)", "4. Auto-reply campaign match", "5. Registered user? (buyer/seller)", "6. Special commands (REGISTER/RESET/SELLER)", "7. Role-based bot flow", "8. Fallback message"].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white border rounded px-2 py-1">
              <span className="text-green-500 font-bold">{i + 1}</span>
              <span>{s.split(". ").slice(1).join(". ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bot Command Tester ───────────────────────────────────────────────────────

function BotTesterPanel() {
  const [form, setForm] = useState({ message: "", role: "buyer", hasAccount: true });
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTest = async () => {
    if (!form.message.trim()) return toast.error("Enter a message to test");
    setTesting(true);
    try {
      const res = await waAdminAPI.testBotCommand({ message: form.message, role: form.role, hasAccount: form.hasAccount });
      setResult(res.data);
    } catch { toast.error("Test failed"); }
    finally { setTesting(false); }
  };

  const typeColors = {
    custom_command: "bg-purple-50 border-purple-200 text-purple-700",
    welcome_buyer: "bg-blue-50 border-blue-200 text-blue-700",
    welcome_seller: "bg-green-50 border-green-200 text-green-700",
    help_buyer: "bg-blue-50 border-blue-200 text-blue-700",
    help_seller: "bg-green-50 border-green-200 text-green-700",
    opt_out: "bg-red-50 border-red-200 text-red-700",
    opt_in: "bg-green-50 border-green-200 text-green-700",
    fallback_or_inquiry_reply: "bg-gray-50 border-gray-200 text-gray-600",
    unknown_greeting: "bg-amber-50 border-amber-200 text-amber-700",
    registration_flow: "bg-orange-50 border-orange-200 text-orange-700",
    guest_inquiry: "bg-yellow-50 border-yellow-200 text-yellow-700",
  };

  const quickTests = [
    { label: "HI", msg: "Hi", role: "buyer" },
    { label: "HELP", msg: "Help", role: "buyer" },
    { label: "ORDERS", msg: "Orders", role: "seller" },
    { label: "STATUS", msg: "Status", role: "seller" },
    { label: "STOP", msg: "Stop", role: "buyer" },
    { label: "REGISTER (unknown)", msg: "Register", role: "buyer", noAccount: true },
    { label: "INQUIRE (unknown)", msg: "Inquire", role: "buyer", noAccount: true },
    { label: "Unknown msg", msg: "What do you sell?", role: "buyer" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800">Bot Command Tester</h2>

      <div className="card p-3 flex items-start gap-3 bg-purple-50 border-purple-200">
        <FiTerminal size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-purple-700">Simulate bot responses without sending real WhatsApp messages. Tests are based on the current bot config.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Simulated User Role</label>
            <select className="input w-full" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Has Account?</label>
            <select className="input w-full" value={form.hasAccount ? "yes" : "no"} onChange={e => set("hasAccount", e.target.value === "yes")}>
              <option value="yes">Yes (registered user)</option>
              <option value="no">No (unknown user)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Message to simulate</label>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. Hi" value={form.message} onChange={e => set("message", e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleTest()} />
            <button className="btn-primary flex items-center gap-2" onClick={handleTest} disabled={testing}>
              {testing ? <Spinner size="sm" /> : <FiPlay size={14} />} Test
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Quick tests:</p>
          <div className="flex flex-wrap gap-2">
            {quickTests.map((q, i) => (
              <button key={i} onClick={() => {
                set("message", q.msg);
                set("role", q.role);
                if (q.noAccount !== undefined) set("hasAccount", !q.noAccount);
              }} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-mono transition-colors">
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-gray-700">Simulation Result</p>
            <span className="text-xs text-gray-400">Role: {result.role} | Has account: {result.hasAccount ? "Yes" : "No"}</span>
          </div>

          <div className="flex justify-end mb-2">
            <div className="max-w-xs px-3 py-2 bg-gray-100 text-gray-800 rounded-2xl rounded-br-sm text-sm">
              <p>{result.message}</p>
              <p className="text-xs text-gray-400 mt-1">User message</p>
            </div>
          </div>

          {result.simulatedResponses?.map((r, i) => (
            <div key={i} className={`card p-4 border ${typeColors[r.type] || "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide">{r.type?.replace(/_/g, " ")}</span>
                {r.keyword && <code className="text-xs bg-white px-1 rounded">{r.keyword}</code>}
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans">{r.body}</pre>
            </div>
          ))}
          {(!result.simulatedResponses || result.simulatedResponses.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">No response would be sent for this input.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

function CampaignForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    type: initial?.type || "auto_reply",
    keywords: initial?.trigger?.keywords || initial?.keywords || [],
    matchType: initial?.trigger?.matchType || initial?.matchType || "contains",
    role: (initial?.trigger?.roles || initial?.role || ["all"])[0] || "all",
    audienceRole: (initial?.audience?.roles || initial?.audienceRole || ["all"])[0] || "all",
    premiumOnly: initial?.audience?.premiumOnly || initial?.premiumOnly || false,
    respectOptOut: initial?.respectOptOut !== false,
    messageType: initial?.response?.messageType || initial?.messageType || "text",
    content: initial?.response?.content || initial?.content || "",
    templateName: initial?.response?.templateName || initial?.templateName || "",
    templateLanguage: initial?.response?.templateLanguage || initial?.templateLanguage || "en",
    templateParams: (initial?.response?.templateParams || initial?.templateParams || []).join(", "),
  });
  const [kwInput, setKwInput] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addKeyword = () => {
    if (!kwInput.trim()) return;
    set("keywords", [...form.keywords, kwInput.trim().toLowerCase()]);
    setKwInput("");
  };
  const removeKeyword = (kw) => set("keywords", form.keywords.filter(k => k !== kw));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        trigger: { keywords: form.keywords, matchType: form.matchType, roles: [form.role] },
        audience: { roles: [form.audienceRole], premiumOnly: form.premiumOnly },
        response: { messageType: form.messageType, content: form.content, templateName: form.templateName, templateLanguage: form.templateLanguage, templateParams: form.templateParams.split(",").map(s => s.trim()).filter(Boolean) },
        respectOptOut: form.respectOptOut,
        status: isEdit ? undefined : "active",
      };
      if (isEdit) await waAdminAPI.updateCampaign(initial._id, payload);
      else await waAdminAPI.createCampaign(payload);
      toast.success(isEdit ? "Campaign updated" : "Campaign created");
      onSave();
    } catch { toast.error("Failed to save campaign"); }
    finally { setSaving(false); }
  };

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-gray-800">{isEdit ? "Edit Campaign" : "New Campaign"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Name</label>
          <input className="input w-full" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
          <select className="input w-full" value={form.type} onChange={e => set("type", e.target.value)}>
            <option value="auto_reply">Auto Reply (keyword-triggered)</option>
            <option value="broadcast_campaign">Broadcast Campaign (send to audience)</option>
          </select>
        </div>
      </div>

      {form.type === "auto_reply" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Trigger Keywords</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Add keyword" value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()} />
              <button className="btn-secondary" onClick={addKeyword}><FiPlus size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {kw}<button onClick={() => removeKeyword(kw)}><FiXCircle size={10} /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Match Type</label>
              <select className="input w-full" value={form.matchType} onChange={e => set("matchType", e.target.value)}>
                <option value="contains">Contains</option>
                <option value="exact">Exact</option>
                <option value="starts_with">Starts With</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Target Role</label>
              <select className="input w-full" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="all">All</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="unknown">Unknown (unregistered)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {form.type === "broadcast_campaign" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Audience Role</label>
              <select className="input w-full" value={form.audienceRole} onChange={e => set("audienceRole", e.target.value)}>
                <option value="all">All</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
              </select>
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.premiumOnly} onChange={e => set("premiumOnly", e.target.checked)} />
              Premium only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.respectOptOut} onChange={e => set("respectOptOut", e.target.checked)} />
              Respect opt-outs
            </label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Response Type</label>
          <select className="input w-48" value={form.messageType} onChange={e => set("messageType", e.target.value)}>
            <option value="text">Text</option>
            <option value="template">Template</option>
          </select>
        </div>
        {form.messageType === "text" ? (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Message Content</label>
            <textarea className="input w-full" rows={3} value={form.content} onChange={e => set("content", e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Template Name</label>
              <input className="input w-full" value={form.templateName} onChange={e => set("templateName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Language</label>
              <input className="input w-full" value={form.templateLanguage} onChange={e => set("templateLanguage", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Params (comma sep)</label>
              <input className="input w-full" value={form.templateParams} onChange={e => set("templateParams", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <FiCheckCircle size={14} />} {isEdit ? "Update" : "Create"}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Campaigns Panel ──────────────────────────────────────────────────────────

function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getCampaigns();
      setCampaigns(res.data?.campaigns || res.data || []);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this campaign?")) return;
    try { await waAdminAPI.deleteCampaign(id); toast.success("Deleted"); load(); }
    catch { toast.error("Failed to delete"); }
  };

  const handleToggle = async (c) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    try {
      await waAdminAPI.updateCampaign(c._id, { status: newStatus });
      toast.success(newStatus === "active" ? "Activated" : "Paused");
      load();
    } catch { toast.error("Failed to update"); }
  };

  const handleRun = async (id) => {
    try { await waAdminAPI.runCampaign(id); toast.success("Campaign running!"); load(); }
    catch { toast.error("Failed to run campaign"); }
  };

  const openEdit = (c) => { setEditing(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };
  const afterSave = () => { closeForm(); load(); };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Campaigns</h2>
        {!showForm && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <FiPlus size={14} /> New Campaign
          </button>
        )}
      </div>

      {showForm && <CampaignForm initial={editing} onSave={afterSave} onCancel={closeForm} />}

      {campaigns.length === 0 && !showForm ? (
        <p className="text-center text-gray-400 py-10">No campaigns yet. Create one to auto-reply to keywords or schedule broadcasts.</p>
      ) : (
        campaigns.map(c => {
          const isActive = c.status === "active";
          const keywords = c.trigger?.keywords || c.keywords || [];
          const audience = c.audience?.roles || [c.audienceRole] || ["all"];
          return (
            <div key={c._id} className="card p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{c.type === "auto_reply" ? "Auto Reply" : "Broadcast"}</span>
                  <StatusBadge active={isActive} labels={["Active", c.status || "Paused"]} />
                  {c.stats?.sent > 0 && <span className="text-xs text-gray-400">{fmt(c.stats.sent)} sent</span>}
                </div>
                <p className="text-xs text-gray-400">
                  {c.type === "auto_reply" ? `Keywords: ${keywords.join(", ") || "—"} · ${c.trigger?.matchType || "contains"}` : `Audience: ${audience.join(", ") || "all"}`}
                </p>
                {c.lastRunAt && <p className="text-xs text-gray-300 mt-0.5">Last run: {fmtTime(c.lastRunAt)}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.type === "broadcast_campaign" && (
                  <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => handleRun(c._id)}>
                    <FiPlay size={12} /> Run Now
                  </button>
                )}
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => handleToggle(c)}>
                  {isActive ? <FiPause size={12} /> : <FiPlay size={12} />} {isActive ? "Pause" : "Activate"}
                </button>
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => openEdit(c)}>
                  <FiEdit2 size={12} /> Edit
                </button>
                <button className="text-red-400 hover:text-red-600 transition-colors p-1" onClick={() => handleDelete(c._id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Broadcast Panel ──────────────────────────────────────────────────────────

function BroadcastPanel() {
  const [form, setForm] = useState({ campaignName: "", role: "all", messageType: "text", message: "", templateName: "", templateLanguage: "en", templateParams: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = async () => {
    setSending(true); setResult(null);
    try {
      const payload = { ...form, templateParams: form.templateParams.split(",").map(s => s.trim()).filter(Boolean) };
      const res = await waAdminAPI.sendBroadcast(payload);
      setResult(res.data);
      toast.success("Broadcast sent");
    } catch { toast.error("Broadcast failed"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800">Broadcast Message</h2>
      <div className="card p-4 flex items-start gap-3 bg-amber-50 border-amber-200">
        <FiAlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">Text messages can only be delivered within the 24h window. For guaranteed delivery to all users, use an approved template.</p>
      </div>
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign Name (optional)</label>
            <input className="input w-full" value={form.campaignName} onChange={e => set("campaignName", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Audience Role</label>
            <select className="input w-full" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="all">All Users</option>
              <option value="seller">Sellers</option>
              <option value="buyer">Buyers</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Message Type</label>
          <select className="input w-48" value={form.messageType} onChange={e => set("messageType", e.target.value)}>
            <option value="text">Text</option>
            <option value="template">Template</option>
          </select>
        </div>
        {form.messageType === "text" ? (
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
            <textarea className="input w-full" rows={4} value={form.message} onChange={e => set("message", e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Template Name</label>
              <input className="input w-full" value={form.templateName} onChange={e => set("templateName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Language</label>
              <input className="input w-full" value={form.templateLanguage} onChange={e => set("templateLanguage", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Params (comma sep)</label>
              <input className="input w-full" value={form.templateParams} onChange={e => set("templateParams", e.target.value)} />
            </div>
          </div>
        )}
        <button className="btn-primary flex items-center gap-2" onClick={handleSend} disabled={sending}>
          {sending ? <Spinner size="sm" /> : <FiRadio size={14} />} Send Broadcast
        </button>
      </div>
      {result && (
        <div className="card p-4 grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-gray-800">{fmt(result.total)}</p><p className="text-xs text-gray-500">Total</p></div>
          <div><p className="text-2xl font-bold text-green-600">{fmt(result.sent)}</p><p className="text-xs text-gray-500">Sent</p></div>
          <div><p className="text-2xl font-bold text-red-500">{fmt(result.failed)}</p><p className="text-xs text-gray-500">Failed</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Direct Message Panel ─────────────────────────────────────────────────────

function DirectMessagePanel() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!phone.trim()) return toast.error("Phone number required");
    if (!message.trim()) return toast.error("Message required");
    setSending(true);
    try {
      await waAdminAPI.sendDirect({ phone, message });
      toast.success("Message sent");
      setMessage("");
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-lg font-semibold text-gray-800">Direct Message</h2>
      <div className="card p-4 flex items-start gap-3 bg-amber-50 border-amber-200">
        <FiAlertCircle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700">Only send to users who have an open 24h window, or use the Broadcast panel with template messages to reach users outside the window.</p>
      </div>
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
          <div className="flex items-center gap-2">
            <FiPhone size={14} className="text-gray-400 flex-shrink-0" />
            <input className="input flex-1" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
          <textarea className="input w-full" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleSend} disabled={sending}>
          {sending ? <Spinner size="sm" /> : <FiSend size={14} />} Send Message
        </button>
      </div>
    </div>
  );
}

// ─── Templates Panel ──────────────────────────────────────────────────────────

function TemplatesPanel() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getTemplates();
      setTemplates(res.data?.templates || res.data || []);
    } catch { toast.error("Failed to load templates"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try { await waAdminAPI.syncTemplates(); toast.success("Templates synced"); load(); }
    catch { toast.error("Sync failed"); }
    finally { setSyncing(false); }
  };

  const statusColor = (status) => {
    if (status === "APPROVED" || status === "approved") return "bg-green-100 text-green-700";
    if (status === "PENDING" || status?.includes("pending")) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-600";
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Message Templates</h2>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={handleSync} disabled={syncing}>
          {syncing ? <Spinner size="sm" /> : <FiRefreshCw size={14} />} Sync from Meta
        </button>
      </div>
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiBell size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">Only APPROVED templates can be used in broadcasts and when the 24h window is closed. Submit templates to Meta via the Meta Business Manager for review.</p>
      </div>
      {templates.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No templates found. Click "Sync from Meta" to import approved templates.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800 font-mono text-sm">{t.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(t.status)}`}>{t.status || "UNKNOWN"}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{t.category}</span><span>·</span><span>{t.language}</span>
                {t.params !== undefined && <span>· {t.params} params</span>}
              </div>
              {t.body && <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{t.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Opt-Out Panel ────────────────────────────────────────────────────────────

function OptOutPanel() {
  const [optouts, setOptouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getOptOuts();
      setOptouts(res.data?.optouts || res.data || []);
    } catch { toast.error("Failed to load opt-outs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!phone.trim()) return toast.error("Phone required");
    setAdding(true);
    try { await waAdminAPI.addOptOut({ phone, reason }); toast.success("Opt-out added"); setPhone(""); setReason(""); load(); }
    catch { toast.error("Failed to add opt-out"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this opt-out? They will receive messages again.")) return;
    try { await waAdminAPI.removeOptOut(id); toast.success("Opt-out removed"); load(); }
    catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Opt-Outs</h2>
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiAlertCircle size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">Opted-out users will not receive any WhatsApp messages. Opt-outs are honoured automatically for all broadcasts and campaigns. Users can opt out by sending STOP.</p>
      </div>
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Add Opt-Out Manually</h3>
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="input flex-1" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <button className="btn-primary flex items-center gap-2" onClick={handleAdd} disabled={adding}>
            {adding ? <Spinner size="sm" /> : <FiPlus size={14} />} Add
          </button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10"><Spinner /></div> :
        optouts.length === 0 ? <p className="text-center text-gray-400 py-10">No opt-outs recorded</p> :
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">User</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Reason</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {optouts.map((o, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{o.phone}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{o.userId?.name || "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{o.reason || "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{fmtTime(o.optedOutAt || o.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-red-400 hover:text-red-600 transition-colors" onClick={() => handleRemove(o._id)}>
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

// ─── Logs Panel ───────────────────────────────────────────────────────────────

function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ phone: "", direction: "", messageType: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getLogs({ ...filters, page, limit });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
    } catch { toast.error("Failed to load logs"); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Message Logs</h2>
        <div className="flex gap-2 flex-wrap">
          <input className="input text-sm" placeholder="Filter by phone" value={filters.phone} onChange={e => setFilter("phone", e.target.value)} />
          <select className="input text-sm" value={filters.direction} onChange={e => setFilter("direction", e.target.value)}>
            <option value="">All directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
          <select className="input text-sm" value={filters.messageType} onChange={e => setFilter("messageType", e.target.value)}>
            <option value="">All types</option>
            <option value="text">Text</option>
            <option value="template">Template</option>
            <option value="image">Image</option>
            <option value="document">Document</option>
          </select>
          <button className="btn-secondary text-sm flex items-center gap-1" onClick={load}>
            <FiRefreshCw size={13} />
          </button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10"><Spinner /></div> :
        logs.length === 0 ? <p className="text-center text-gray-400 py-10">No logs found</p> :
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Time</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Dir</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Phone</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">User</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Message</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                    <td className="px-4 py-2"><DirectionBadge direction={l.direction} /></td>
                    <td className="px-4 py-2 font-mono text-xs">{l.phone}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{l.userId?.name || l.userName || "—"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{l.messageType}</td>
                    <td className="px-4 py-2 text-gray-700 max-w-xs truncate text-xs">{l.message || l.templateName || "—"}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${l.status === "delivered" || l.status === "read" ? "bg-green-100 text-green-700" : l.status === "failed" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                        {l.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-gray-500">{fmt(total)} total records</p>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <span className="text-xs text-gray-600 px-2 py-1">{page} / {totalPages}</span>
                <button className="btn-secondary text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      }
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "analytics", label: "Analytics", icon: FiActivity },
  { id: "inbox", label: "Inbox", icon: FiMessageSquare },
  { id: "sessions", label: "Sessions", icon: FiUsers },
  { id: "window", label: "24h Window", icon: FiClock },
  { id: "campaigns", label: "Campaigns", icon: FiZap },
  { id: "broadcast", label: "Broadcast", icon: FiRadio },
  { id: "direct", label: "Direct Send", icon: FiSend },
  { id: "templates", label: "Templates", icon: FiBell },
  { id: "optouts", label: "Opt-Outs", icon: FiXCircle },
  { id: "logs", label: "Logs", icon: FiActivity },
  { id: "bot-config", label: "Bot Config", icon: FiSliders },
  { id: "bot-flow", label: "Bot Flow", icon: FiGitBranch },
  { id: "bot-test", label: "Bot Tester", icon: FiTerminal },
];

export default function WhatsAppAdmin() {
  const [activeTab, setActiveTab] = useState("analytics");

  const renderPanel = () => {
    switch (activeTab) {
      case "analytics": return <StatsPanel />;
      case "inbox": return <ConversationsPanel />;
      case "sessions": return <SessionsPanel />;
      case "window": return <WindowPanel />;
      case "campaigns": return <CampaignsPanel />;
      case "broadcast": return <BroadcastPanel />;
      case "direct": return <DirectMessagePanel />;
      case "templates": return <TemplatesPanel />;
      case "optouts": return <OptOutPanel />;
      case "logs": return <LogsPanel />;
      case "bot-config": return <BotConfigPanel />;
      case "bot-flow": return <BotFlowPanel />;
      case "bot-test": return <BotTesterPanel />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FiMessageSquare size={22} className="text-green-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-800">WhatsApp Admin</h1>
          <p className="text-xs text-gray-400">Manage bot, conversations, campaigns and settings</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${active ? "border-green-500 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-96">
        {renderPanel()}
      </div>
    </div>
  );
}
