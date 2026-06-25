import { useState, useEffect, useCallback, useRef } from "react";
import { waAdminAPI } from "../../services/api";
import toast from "react-hot-toast";
import Spinner from "../common/Spinner";
import {
  FiMessageSquare, FiSend, FiUsers, FiActivity, FiSettings,
  FiCheckCircle, FiXCircle, FiPhone, FiRefreshCw, FiRadio,
  FiClock, FiZap, FiTrash2, FiPlay, FiPause, FiPlus, FiEdit2,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiBell, FiMenu,
  FiToggleLeft, FiToggleRight, FiArrowDown, FiCode, FiSave,
  FiX, FiInfo, FiMove
} from "react-icons/fi";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Analytics Panel ─────────────────────────────────────────────────────────

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
        <StatCard label="Windows Opened" value={stats.windowOpenCount} icon={FiZap} color="blue" />
        <StatCard label="Opt-Outs" value={stats.optOutCount} icon={FiXCircle} color="red" />
      </div>

      {stats.dailyMessages && stats.dailyMessages.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Message Volume</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyMessages.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${Math.round(((d.count || 0) / maxDaily) * 100)}%`, minHeight: "2px" }}
                  title={`${d.count} messages`}
                />
                <span className="text-xs text-gray-400 truncate w-full text-center">{d.date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.config && (
        <div className="card p-4 flex items-center gap-3">
          <FiSettings size={18} className="text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-700">Config Status</p>
            <p className="text-xs text-gray-500">{stats.config.status || "Configured"} — Phone: {stats.config.phone || "—"}</p>
          </div>
          <StatusBadge active={stats.config.active} className="ml-auto" />
        </div>
      )}
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
      setConvos(res.data?.conversations || res.data || []);
    } catch { toast.error("Failed to load conversations"); }
    finally { setLoading(false); }
  }, [search]);

  const loadMessages = useCallback(async (phone) => {
    try {
      const res = await waAdminAPI.getConversationByPhone(phone);
      setMessages(res.data?.messages || res.data || []);
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

  const windowOpen = selected?.windowExpiresAt && new Date(selected.windowExpiresAt) > new Date();
  const minsLeft = selected ? minutesUntil(selected.windowExpiresAt) : null;

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: "600px" }}>
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col card overflow-hidden">
        <div className="p-3 border-b">
          <input className="input w-full text-sm" placeholder="Search phone or name…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
            convos.length === 0 ? <p className="text-center text-gray-400 py-8 text-sm">No conversations</p> :
            convos.map(c => {
              const mins = minutesUntil(c.windowExpiresAt);
              const open = c.windowExpiresAt && new Date(c.windowExpiresAt) > new Date();
              return (
                <button key={c.phone} onClick={() => setSelected(c)}
                  className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 transition-colors ${selected?.phone === c.phone ? "bg-blue-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-800 truncate">{c.name || c.phone}</span>
                    {c.windowExpiresAt && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        {open ? `${mins}m` : "closed"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{c.phone}</p>
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
                <p className="text-xs text-gray-400">{selected.phone}</p>
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

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${m.direction === "outbound" ? "bg-green-500 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                    <p>{m.message || m.body || "(media)"}</p>
                    <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-green-100" : "text-gray-400"}`}>{fmtTime(m.createdAt)}</p>
                  </div>
                </div>
              ))}
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
        <StatCard label="Open Windows" value={data.openCount} icon={FiCheckCircle} color="green" />
        <StatCard label="Closed Windows" value={data.closedCount} icon={FiXCircle} color="red" />
        <StatCard label="Total Sessions" value={data.totalCount} icon={FiClock} color="blue" />
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
                  const mins = minutesUntil(s.expiresAt);
                  const cls = windowColor(mins);
                  return (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{s.phone}</td>
                      <td className="px-4 py-2 text-gray-700">{s.name || "—"}</td>
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

// ─── Campaign Form ────────────────────────────────────────────────────────────

function CampaignForm({ initial, onSave, onCancel }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name || "",
    type: initial?.type || "auto_reply",
    keywords: initial?.keywords || [],
    matchType: initial?.matchType || "contains",
    role: initial?.role || "all",
    audienceRole: initial?.audienceRole || "all",
    premiumOnly: initial?.premiumOnly || false,
    respectOptOut: initial?.respectOptOut !== false,
    messageType: initial?.messageType || "text",
    content: initial?.content || "",
    templateName: initial?.templateName || "",
    templateLanguage: initial?.templateLanguage || "en",
    templateParams: initial?.templateParams?.join(", ") || "",
  });
  const [kwInput, setKwInput] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addKeyword = () => {
    if (!kwInput.trim()) return;
    set("keywords", [...form.keywords, kwInput.trim()]);
    setKwInput("");
  };

  const removeKeyword = (kw) => set("keywords", form.keywords.filter(k => k !== kw));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = { ...form, templateParams: form.templateParams.split(",").map(s => s.trim()).filter(Boolean) };
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
            <option value="auto_reply">Auto Reply</option>
            <option value="broadcast_campaign">Broadcast Campaign</option>
          </select>
        </div>
      </div>

      {form.type === "auto_reply" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Keywords</label>
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
                <option value="startsWith">Starts With</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Target Role</label>
              <select className="input w-full" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="all">All</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
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
    try {
      await waAdminAPI.updateCampaign(c._id, { active: !c.active });
      toast.success(c.active ? "Paused" : "Activated");
      load();
    } catch { toast.error("Failed to update"); }
  };

  const handleRun = async (id) => {
    try { await waAdminAPI.runCampaign(id); toast.success("Campaign running"); load(); }
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
        <p className="text-center text-gray-400 py-10">No campaigns yet</p>
      ) : (
        campaigns.map(c => (
          <div key={c._id} className="card p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-800">{c.name}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{c.type}</span>
                <StatusBadge active={c.active} />
              </div>
              <p className="text-xs text-gray-400">{c.type === "auto_reply" ? `Keywords: ${(c.keywords || []).join(", ") || "—"}` : `Audience: ${c.audienceRole || "all"}`}</p>
            </div>
            <div className="flex items-center gap-2">
              {c.type === "broadcast_campaign" && (
                <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => handleRun(c._id)}>
                  <FiPlay size={12} /> Run
                </button>
              )}
              <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => handleToggle(c)}>
                {c.active ? <FiPause size={12} /> : <FiPlay size={12} />} {c.active ? "Pause" : "Activate"}
              </button>
              <button className="btn-secondary text-xs flex items-center gap-1" onClick={() => openEdit(c)}>
                <FiEdit2 size={12} /> Edit
              </button>
              <button className="text-red-400 hover:text-red-600 transition-colors p-1" onClick={() => handleDelete(c._id)}>
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))
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
        <p className="text-sm text-amber-700">Text messages can only be delivered within the 24h window. For guaranteed delivery, use an approved template.</p>
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
        <p className="text-sm text-amber-700">Only send to users who have an open 24h window, or use template messages to reach users outside the window.</p>
      </div>
      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Phone Number</label>
          <div className="flex items-center gap-2">
            <FiPhone size={14} className="text-gray-400 flex-shrink-0" />
            <input className="input flex-1" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
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

// ─── Templates Panel ─────────────────────────────────────────────────────────

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
    if (status === "APPROVED") return "bg-green-100 text-green-700";
    if (status === "PENDING") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-600";
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Templates</h2>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={handleSync} disabled={syncing}>
          {syncing ? <Spinner size="sm" /> : <FiRefreshCw size={14} />} Sync from Meta
        </button>
      </div>
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiBell size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">Only APPROVED templates can be used in broadcasts and outside the 24h window. Templates must be submitted to Meta for review before use.</p>
      </div>
      {templates.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No templates found. Click "Sync from Meta" to import.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-gray-800">{t.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColor(t.status)}`}>{t.status || "UNKNOWN"}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{t.category}</span><span>·</span><span>{t.language}</span>
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
    try { await waAdminAPI.addOptOut({ phone, reason }); toast.success("Added"); setPhone(""); setReason(""); load(); }
    catch { toast.error("Failed to add opt-out"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this opt-out?")) return;
    try { await waAdminAPI.removeOptOut(id); toast.success("Removed"); load(); }
    catch { toast.error("Failed to remove"); }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Opt-Outs</h2>
      <div className="card p-4 flex items-start gap-3 bg-blue-50 border-blue-200">
        <FiAlertCircle size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">GDPR compliance: Users who opt out will not receive any WhatsApp messages. Opt-outs are honoured automatically for all broadcasts and campaigns.</p>
      </div>
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Add Opt-Out</h3>
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
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
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Reason</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {optouts.map((o, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{o.phone}</td>
                  <td className="px-4 py-2 text-gray-600">{o.reason || "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{fmtTime(o.createdAt)}</td>
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
      setLogs(res.data?.logs || res.data || []);
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
                    <td className="px-4 py-2 text-gray-600 text-xs">{l.userName || "—"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{l.messageType}</td>
                    <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{l.message || l.templateName || "—"}</td>
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

// ─── Bot Flow Builder ─────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  unknown: { label: "New / Unknown Users", color: "purple", bgClass: "bg-purple-50", borderClass: "border-purple-200", textClass: "text-purple-700", headerBg: "bg-purple-50", badgeClass: "bg-purple-100 text-purple-700" },
  buyer:   { label: "Buyers",              color: "blue",   bgClass: "bg-blue-50",   borderClass: "border-blue-200",   textClass: "text-blue-700",   headerBg: "bg-blue-50",   badgeClass: "bg-blue-100 text-blue-700"   },
  seller:  { label: "Sellers / Vendors",   color: "green",  bgClass: "bg-green-50",  borderClass: "border-green-200",  textClass: "text-green-700",  headerBg: "bg-green-50",  badgeClass: "bg-green-100 text-green-700"  },
};

function CommandCard({ cmd, index, onToggle, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragTarget }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [responseText, setResponseText] = useState(cmd.response?.text || "");
  const [saving, setSaving] = useState(false);
  const role = ROLE_CONFIG[cmd.role] || ROLE_CONFIG.buyer;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onEdit(cmd._id, { response: { ...cmd.response, text: responseText } });
      setEditing(false);
    } finally { setSaving(false); }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      onDragEnd={onDragEnd}
      className={`border rounded-xl bg-white transition-all duration-150 select-none
        ${isDragTarget ? "border-blue-400 shadow-lg scale-[1.01]" : "border-gray-200 hover:border-gray-300"}
        ${!cmd.isEnabled ? "opacity-50" : ""}
      `}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none" title="Drag to reorder">
          <FiMove size={16} />
        </div>

        {/* Priority badge */}
        <span className="text-xs font-mono text-gray-400 w-6 text-center flex-shrink-0">{index + 1}</span>

        {/* Command info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{cmd.name}</span>
            {cmd.isBuiltin && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">built-in</span>
            )}
            {cmd.isDynamic ? (
              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                <FiCode size={9} /> dynamic
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">static</span>
            )}
          </div>
          {cmd.triggerKeywords?.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {cmd.triggerKeywords.map((kw) => (
                <span key={kw} className={`text-xs px-1.5 py-0.5 rounded font-mono ${role.badgeClass}`}>{kw.toUpperCase()}</span>
              ))}
              <span className="text-xs text-gray-400 self-center">({cmd.matchType})</span>
            </div>
          )}
          {cmd.triggerKeywords?.length === 0 && (
            <span className="text-xs text-gray-400 italic">fallback (no trigger keywords)</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Toggle */}
          <button
            onClick={() => onToggle(cmd._id, !cmd.isEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${cmd.isEnabled ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
            title={cmd.isEnabled ? "Disable" : "Enable"}
          >
            {cmd.isEnabled ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
          </button>
          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            title="Show response"
          >
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          </button>
          {/* Delete (custom only) */}
          {!cmd.isBuiltin && (
            <button
              onClick={() => onDelete(cmd._id)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded response area */}
      {expanded && (
        <div className="border-t mx-3 mb-3 pt-3">
          <p className="text-xs text-gray-500 mb-2">{cmd.description}</p>
          {cmd.exampleUsage && (
            <p className="text-xs text-gray-400 mb-3">
              <span className="font-medium">Example:</span>{" "}
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{cmd.exampleUsage}</span>
            </p>
          )}

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">
                {cmd.isDynamic ? "Response Preview (data-driven)" : "Bot Response"}
              </span>
              {!cmd.isDynamic && !editing && (
                <button
                  onClick={() => { setResponseText(cmd.response?.text || ""); setEditing(true); }}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <FiEdit2 size={11} /> Edit
                </button>
              )}
            </div>

            {cmd.isDynamic && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                <FiInfo size={12} className="flex-shrink-0 mt-0.5" />
                <span>This response is generated dynamically from live database data. The template below shows the format — actual values are filled in at runtime.</span>
              </div>
            )}

            {editing ? (
              <div className="space-y-2">
                <textarea
                  className="w-full text-xs font-mono bg-white border border-gray-200 rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={8}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
                  >
                    {saving ? <Spinner size="sm" /> : <FiSave size={11} />} Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {cmd.response?.text || <span className="text-gray-400 italic">(no response text)</span>}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCommandForm({ role, onSave, onCancel }) {
  const [form, setForm] = useState({
    commandKey: "", name: "", description: "", triggerKeywords: [],
    matchType: "exact", exampleUsage: "", response: { type: "text", text: "" },
  });
  const [kwInput, setKwInput] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addKw = () => {
    if (!kwInput.trim()) return;
    set("triggerKeywords", [...form.triggerKeywords, kwInput.trim().toLowerCase()]);
    setKwInput("");
  };

  const handleSubmit = async () => {
    if (!form.commandKey.trim() || !form.name.trim()) return toast.error("Command key and name are required");
    if (form.triggerKeywords.length === 0) return toast.error("Add at least one trigger keyword");
    setSaving(true);
    try {
      await onSave({ ...form, role });
    } finally { setSaving(false); }
  };

  return (
    <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50/50 space-y-3">
      <p className="text-sm font-semibold text-blue-700">New Custom Command</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Command Key (unique ID)</label>
          <input className="input w-full text-sm font-mono" placeholder="e.g. CUSTOM_PROMO" value={form.commandKey}
            onChange={(e) => set("commandKey", e.target.value.toUpperCase().replace(/\s/g, "_"))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Display Name</label>
          <input className="input w-full text-sm" placeholder="e.g. Promo Info" value={form.name}
            onChange={(e) => set("name", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
        <input className="input w-full text-sm" placeholder="What does this command do?" value={form.description}
          onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Trigger Keywords</label>
        <div className="flex gap-2 mb-2">
          <input className="input flex-1 text-sm" placeholder="Type keyword, press Enter" value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKw()} />
          <button className="btn-secondary text-sm" onClick={addKw}><FiPlus size={14} /></button>
        </div>
        <div className="flex flex-wrap gap-1">
          {form.triggerKeywords.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-mono">
              {kw}
              <button onClick={() => set("triggerKeywords", form.triggerKeywords.filter((k) => k !== kw))}>
                <FiX size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Match Type</label>
          <select className="input w-full text-sm" value={form.matchType} onChange={(e) => set("matchType", e.target.value)}>
            <option value="exact">Exact match</option>
            <option value="starts_with">Starts with keyword</option>
            <option value="contains">Contains keyword</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Example Usage</label>
          <input className="input w-full text-sm font-mono" placeholder="e.g. PROMO" value={form.exampleUsage}
            onChange={(e) => set("exampleUsage", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Bot Response</label>
        <textarea className="input w-full text-sm font-mono" rows={4}
          placeholder="Type the exact message the bot will send..."
          value={form.response.text}
          onChange={(e) => set("response", { type: "text", text: e.target.value })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-primary text-sm flex items-center gap-2" onClick={handleSubmit} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <FiCheckCircle size={14} />} Add Command
        </button>
        <button className="btn-secondary text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function RoleFlowTab({ commands, roleKey, onToggle, onEdit, onDelete, onReorder, onAdd }) {
  const cfg = ROLE_CONFIG[roleKey];
  const [dragIndex, setDragIndex] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [items, setItems] = useState(commands);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setItems(commands); }, [commands]);

  const handleDragStart = (e, idx) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (idx) => setDragTarget(idx);
  const handleDragEnd = () => { setDragIndex(null); setDragTarget(null); };

  const handleDrop = async (dropIdx) => {
    if (dragIndex === null || dragIndex === dropIdx) { handleDragEnd(); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIdx, 0, moved);
    setItems(reordered);
    handleDragEnd();
    setSaving(true);
    try {
      await onReorder(reordered.map((c) => c._id));
      toast.success("Order saved");
    } catch { toast.error("Failed to save order"); setItems(commands); }
    finally { setSaving(false); }
  };

  const handleAdd = async (data) => {
    try {
      await onAdd(data);
      setShowAddForm(false);
      toast.success("Command added");
    } catch { toast.error("Failed to add command"); }
  };

  return (
    <div className="space-y-2">
      {/* Role header */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-xl ${cfg.bgClass} border ${cfg.borderClass}`}>
        <div className="flex items-center gap-2">
          <FiUsers size={15} className={cfg.textClass} />
          <span className={`font-semibold text-sm ${cfg.textClass}`}>{cfg.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>{items.length} commands</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Spinner size="sm" />}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-secondary text-xs flex items-center gap-1 py-1 px-2"
          >
            <FiPlus size={12} /> Add Custom
          </button>
        </div>
      </div>

      {showAddForm && (
        <AddCommandForm role={roleKey} onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Command cards with flow arrows */}
      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-6 text-sm">No commands configured for this role</p>
      ) : (
        items.map((cmd, idx) => (
          <div key={cmd._id} className="relative">
            <CommandCard
              cmd={cmd}
              index={idx}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              isDragTarget={dragTarget === idx && dragIndex !== idx}
            />
            {/* Flow arrow between cards (not after last) */}
            {idx < items.length - 1 && (
              <div className="flex justify-center my-1">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-gray-300" />
                  <FiArrowDown size={12} className="text-gray-300" />
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function BotFlowPanel() {
  const [grouped, setGrouped] = useState({ unknown: [], buyer: [], seller: [] });
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState("buyer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getBotCommands();
      setGrouped(res.data?.grouped || { unknown: [], buyer: [], seller: [] });
    } catch { toast.error("Failed to load bot commands"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, isEnabled) => {
    try {
      await waAdminAPI.updateBotCommand(id, { isEnabled });
      toast.success(isEnabled ? "Command enabled" : "Command disabled");
      setGrouped((g) => {
        const update = (arr) => arr.map((c) => c._id === id ? { ...c, isEnabled } : c);
        return { unknown: update(g.unknown), buyer: update(g.buyer), seller: update(g.seller) };
      });
    } catch { toast.error("Failed to update command"); }
  };

  const handleEdit = async (id, updates) => {
    await waAdminAPI.updateBotCommand(id, updates);
    toast.success("Response saved");
    setGrouped((g) => {
      const update = (arr) => arr.map((c) => c._id === id ? { ...c, ...updates } : c);
      return { unknown: update(g.unknown), buyer: update(g.buyer), seller: update(g.seller) };
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this custom command?")) return;
    try {
      await waAdminAPI.deleteBotCommand(id);
      toast.success("Command deleted");
      setGrouped((g) => {
        const remove = (arr) => arr.filter((c) => c._id !== id);
        return { unknown: remove(g.unknown), buyer: remove(g.buyer), seller: remove(g.seller) };
      });
    } catch { toast.error("Failed to delete command"); }
  };

  const handleReorder = async (orderedIds) => {
    await waAdminAPI.reorderBotCommands(orderedIds);
  };

  const handleAdd = async (data) => {
    const res = await waAdminAPI.createBotCommand(data);
    const newCmd = res.data;
    setGrouped((g) => ({
      ...g,
      [newCmd.role]: [...(g[newCmd.role] || []), newCmd],
    }));
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  const roleTabs = [
    { key: "buyer", label: "Buyers", icon: FiUsers },
    { key: "seller", label: "Sellers", icon: FiActivity },
    { key: "unknown", label: "New Users", icon: FiMessageSquare },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Bot Flow Builder</h2>
          <p className="text-xs text-gray-500 mt-0.5">Drag to reorder commands. Click to expand and edit responses.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={load}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Priority info box */}
      <div className="card p-4 flex items-start gap-3 bg-purple-50 border-purple-200">
        <FiZap size={15} className="text-purple-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-purple-700">
          <p className="font-medium mb-1">How the bot processes messages</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-purple-600">
            <li>Opt-out check (STOP / UNSUBSCRIBE)</li>
            <li>Auto-reply campaigns (keyword-matched, from Campaigns tab)</li>
            <li>Role-based bot commands below (in priority order — drag to reorder)</li>
            <li>Default fallback reply</li>
          </ol>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-gray-500">
          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">built-in</span>
          = hardcoded logic (response editable, can't delete)
        </span>
        <span className="flex items-center gap-1.5 text-gray-500">
          <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">dynamic</span>
          = response includes live DB data
        </span>
        <span className="flex items-center gap-1.5 text-gray-500">
          <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">static</span>
          = fixed text, fully editable
        </span>
        <span className="flex items-center gap-1.5 text-gray-500">
          <FiMove size={12} /> = drag handle to reorder
        </span>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b">
        {roleTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveRole(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeRole === key
                ? `border-${ROLE_CONFIG[key].color}-500 text-${ROLE_CONFIG[key].color}-700`
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={14} /> {label}
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {grouped[key]?.length || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Active role flow */}
      <RoleFlowTab
        key={activeRole}
        commands={grouped[activeRole] || []}
        roleKey={activeRole}
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReorder={handleReorder}
        onAdd={handleAdd}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "analytics", label: "Analytics", icon: FiActivity },
  { id: "inbox", label: "Inbox", icon: FiMessageSquare },
  { id: "window", label: "24h Window", icon: FiClock },
  { id: "campaigns", label: "Campaigns", icon: FiZap },
  { id: "broadcast", label: "Broadcast", icon: FiRadio },
  { id: "direct", label: "Direct Send", icon: FiSend },
  { id: "templates", label: "Templates", icon: FiSettings },
  { id: "optouts", label: "Opt-Outs", icon: FiXCircle },
  { id: "logs", label: "Logs", icon: FiActivity },
  { id: "botflow", label: "Bot Flow", icon: FiMenu },
];

export default function WhatsAppAdmin() {
  const [activeTab, setActiveTab] = useState("analytics");

  const renderPanel = () => {
    switch (activeTab) {
      case "analytics": return <StatsPanel />;
      case "inbox": return <ConversationsPanel />;
      case "window": return <WindowPanel />;
      case "campaigns": return <CampaignsPanel />;
      case "broadcast": return <BroadcastPanel />;
      case "direct": return <DirectMessagePanel />;
      case "templates": return <TemplatesPanel />;
      case "optouts": return <OptOutPanel />;
      case "logs": return <LogsPanel />;
      case "botflow": return <BotFlowPanel />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FiMessageSquare size={22} className="text-green-600" />
        <h1 className="text-xl font-bold text-gray-800">WhatsApp Admin</h1>
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
