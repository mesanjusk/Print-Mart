import { useState, useEffect, useCallback, useRef } from "react";
import { waAdminAPI } from "../../services/api";
import toast from "react-hot-toast";
import Spinner from "../common/Spinner";
import {
  FiMessageSquare, FiSend, FiUsers, FiActivity, FiSettings,
  FiCheckCircle, FiXCircle, FiPhone, FiRefreshCw, FiRadio,
  FiClock, FiZap, FiTrash2, FiPlay, FiPause, FiPlus, FiEdit2,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiBell, FiCommand
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

// ─── Bot Flow Panel ───────────────────────────────────────────────────────────

const ROLE_STYLES = {
  guest:  { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', header: 'bg-purple-50 border-purple-200', label: '👤 Guest (Unregistered)' },
  buyer:  { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',     header: 'bg-blue-50 border-blue-200',     label: '🛒 Buyer' },
  seller: { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   header: 'bg-green-50 border-green-200',   label: '🏪 Seller' },
  any:    { bg: 'bg-gray-50',   border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',     header: 'bg-gray-50 border-gray-200',     label: '🌐 Any Role' },
};
const ROLE_ORDER = ['guest', 'buyer', 'seller', 'any'];

function CommandCard({ cmd, onEdit, onDelete, onReset, onToggleActive,
                       onDragStart, onDragOver, onDrop, onDragEnd, isDragTarget }) {
  const s = ROLE_STYLES[cmd.role] || ROLE_STYLES.any;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      onDragEnd={onDragEnd}
      className={`card border rounded-xl overflow-hidden transition-shadow ${isDragTarget ? 'border-blue-400 shadow-lg ring-2 ring-blue-100' : s.border}`}
    >
      <div className="flex">
        {/* Drag handle — full-height strip */}
        <div className="flex-shrink-0 w-7 flex items-center justify-center cursor-grab active:cursor-grabbing bg-gray-50 border-r border-gray-100 hover:bg-gray-100 transition-colors group" title="Drag to reorder">
          <span className="select-none text-gray-300 group-hover:text-gray-500 text-base leading-none">⋮⋮</span>
        </div>

        <div className="flex-1 min-w-0 p-3 space-y-2">
          {/* Label + actions row */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-snug">{cmd.label}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.badge}`}>{s.label}</span>
                {cmd.isSystem && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">System</span>}
                <span className={`text-xs font-medium ${cmd.isActive ? 'text-green-600' : 'text-gray-400'}`}>{cmd.isActive ? '● On' : '○ Off'}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => onToggleActive(cmd)} title={cmd.isActive ? 'Turn off' : 'Turn on'}
                className={`p-1.5 rounded-lg transition-colors ${cmd.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                {cmd.isActive ? <FiCheckCircle size={14} /> : <FiXCircle size={14} />}
              </button>
              <button onClick={() => onEdit(cmd)} title="Edit message"
                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                <FiEdit2 size={14} />
              </button>
              {cmd.isSystem ? (
                <button onClick={() => onReset(cmd)} title="Restore factory defaults"
                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors">
                  <FiRefreshCw size={14} />
                </button>
              ) : (
                <button onClick={() => onDelete(cmd)} title="Delete"
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Message preview */}
          {cmd.response.text && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2 leading-relaxed line-clamp-2">
              {cmd.response.text.replace(/\*/g, '').slice(0, 120)}{cmd.response.text.length > 120 ? '\u2026' : ''}
            </div>
          )}

          {/* Button pills */}
          {cmd.response.type === 'button' && cmd.response.buttons?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cmd.response.buttons.map((btn, i) => (
                <span key={i} className="text-xs bg-white border border-gray-300 text-gray-700 px-2.5 py-0.5 rounded-full shadow-sm">
                  {btn.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandModal({ command, onSave, onClose, saving }) {
  const isNew = !command?._id;
  const [form, setForm] = useState(() => command ? {
    ...command,
    response: { ...command.response, buttons: (command.response.buttons || []).map(b => ({ ...b })) },
  } : {
    key: '', label: '', description: '', role: 'guest',
    triggers: [],
    response: { type: 'text', text: '', buttons: [] },
    isActive: true,
  });
  const [triggersInput, setTriggersInput] = useState((command?.triggers || []).join(', '));

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  const setResp = (f, v) => setForm(prev => ({ ...prev, response: { ...prev.response, [f]: v } }));

  const switchType = (type) => {
    setForm(prev => ({
      ...prev,
      response: {
        ...prev.response,
        type,
        buttons: type === 'button' && prev.response.buttons.length === 0 ? [{ id: '', title: '' }] : prev.response.buttons,
      },
    }));
  };

  const addBtn = () => {
    if (form.response.buttons.length >= 3) return;
    setResp('buttons', [...form.response.buttons, { id: '', title: '' }]);
  };
  const removeBtn = (i) => setResp('buttons', form.response.buttons.filter((_, idx) => idx !== i));
  const updateBtnTitle = (i, title) => {
    const btns = [...form.response.buttons];
    btns[i] = {
      id: btns[i].id || title.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20),
      title,
    };
    setResp('buttons', btns);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      triggers: triggersInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    }, isNew);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-semibold text-gray-800">{isNew ? 'New Bot Command' : 'Edit Bot Command'}</h3>
            {!isNew && <p className="text-xs text-gray-400 mt-0.5 font-mono">{command.key}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-lg">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Command name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Command name <span className="font-normal text-gray-400">(admin label only)</span></label>
            <input className="input-field" placeholder="e.g. Buyer Welcome Message"
              value={form.label} onChange={e => set('label', e.target.value)} required />
          </div>

          {/* Who + Active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Who sees this?</label>
              <select className="input-field text-sm" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="guest">👤 Guests (new users)</option>
                <option value="buyer">🛒 Buyers</option>
                <option value="seller">🏠 Sellers</option>
                <option value="any">🌐 Everyone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm text-gray-700">{form.isActive ? 'Active' : 'Inactive'}</p>
                  <p className="text-xs text-gray-400">{form.isActive ? 'Bot will use this' : 'Bot ignores this'}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Response section */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">What should the bot reply?</p>
              <p className="text-xs text-gray-400 mt-0.5">This is the exact message users receive on WhatsApp.</p>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2">
              <button type="button" onClick={() => switchType('text')}
                className={`flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all ${form.response.type === 'text' ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                💬 Text only
              </button>
              <button type="button" onClick={() => switchType('button')}
                className={`flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all ${form.response.type === 'button' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                🔘 Text + tap buttons
              </button>
            </div>

            {/* Message text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Message</label>
                <span className="text-xs text-gray-400">*bold*  ·  {"{name}"} = user's name</span>
              </div>
              <textarea className="input-field font-mono text-sm resize-y" rows={5}
                value={form.response.text} onChange={e => setResp('text', e.target.value)}
                placeholder="Type what the bot will send..." required />
            </div>

            {/* Buttons */}
            {form.response.type === 'button' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tap buttons <span className="text-gray-400 font-normal text-xs">— max 3, shown under the message</span>
                </label>
                <div className="space-y-2">
                  {form.response.buttons.map((btn, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-4 text-center">{i + 1}.</span>
                      <input className="input-field text-sm flex-1" placeholder="Button label (e.g. View Orders)"
                        value={btn.title} maxLength={20}
                        onChange={e => updateBtnTitle(i, e.target.value)} required />
                      <button type="button" onClick={() => removeBtn(i)} className="p-1.5 text-red-400 hover:text-red-600">
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {form.response.buttons.length < 3 && (
                    <button type="button" onClick={addBtn}
                      className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-green-300 hover:text-green-500 transition-colors">
                      + Add button
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Advanced — only for new commands */}
          {isNew && (
            <details className="border border-gray-200 rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-gray-500 cursor-pointer select-none">Advanced settings</summary>
              <div className="px-4 pb-4 pt-3 border-t space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Command key <span className="font-normal text-gray-400">(unique ID, no spaces)</span></label>
                  <input className="input-field text-sm font-mono" placeholder="e.g. promo_reply"
                    value={form.key} onChange={e => set('key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Trigger keywords <span className="font-normal text-gray-400">(comma-separated, for reference)</span></label>
                  <input className="input-field text-sm font-mono" placeholder="hi, hello, start"
                    value={triggersInput} onChange={e => setTriggersInput(e.target.value)} />
                </div>
              </div>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : (isNew ? 'Create Command' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_DESCRIPTIONS = {
  guest:  "New visitors who haven't registered yet",
  buyer:  "Registered users buying products",
  seller: "Vendors managing their listings",
  any:    "Sent to all users regardless of role",
};

function BotFlowPanel() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragInfo = useRef(null);
  const [dragState, setDragState] = useState({ role: null, toIdx: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await waAdminAPI.getBotCommands();
      setCommands(res.data);
    } catch {
      toast.error('Failed to load bot commands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = commands.reduce((acc, cmd) => {
    (acc[cmd.role] = acc[cmd.role] || []).push(cmd);
    return acc;
  }, {});

  const handleDragStart = (role, idx) => { dragInfo.current = { role, idx }; };
  const handleDragOver = (role, idx) => { if (dragInfo.current?.role === role) setDragState({ role, toIdx: idx }); };
  const handleDragEnd = () => { setDragState({ role: null, toIdx: null }); dragInfo.current = null; };

  const handleDrop = async (role, toIdx) => {
    const from = dragInfo.current;
    if (!from || from.role !== role || from.idx === toIdx) { handleDragEnd(); return; }
    const roleItems = commands.filter(c => c.role === role);
    const others = commands.filter(c => c.role !== role);
    const reordered = [...roleItems];
    const [moved] = reordered.splice(from.idx, 1);
    reordered.splice(toIdx, 0, moved);
    setCommands([...others, ...reordered]);
    handleDragEnd();
    try {
      await waAdminAPI.reorderBotCommands(reordered.map(c => c._id));
    } catch { toast.error('Failed to save order'); }
  };

  const handleSave = async (data, isNew) => {
    setSaving(true);
    try {
      if (isNew) {
        await waAdminAPI.createBotCommand(data);
        toast.success('Command created');
      } else {
        await waAdminAPI.updateBotCommand(data._id, data);
        toast.success('Saved');
      }
      setEditModal(null);
      setCreateModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cmd) => {
    if (!window.confirm(`Delete "${cmd.label}"?`)) return;
    try {
      await waAdminAPI.deleteBotCommand(cmd._id);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  };

  const handleReset = async (cmd) => {
    if (!window.confirm(`Reset "${cmd.label}" back to factory defaults?`)) return;
    try {
      await waAdminAPI.resetBotCommand(cmd._id);
      toast.success('Reset to default');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reset failed');
    }
  };

  const toggleActive = async (cmd) => {
    try {
      await waAdminAPI.updateBotCommand(cmd._id, { isActive: !cmd.isActive });
      setCommands(cs => cs.map(c => c._id === cmd._id ? { ...c, isActive: !c.isActive } : c));
    } catch { toast.error('Toggle failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Bot Flow Builder</h2>
          <p className="text-sm text-gray-500 mt-0.5">Edit what the WhatsApp bot says. Drag cards to reorder.</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-1.5 text-sm flex-shrink-0">
          <FiPlus size={14} /> Add Command
        </button>
      </div>

      {/* Quick guide */}
      <div className="card p-4 bg-blue-50 border-blue-200 text-xs text-blue-800 space-y-1">
        <p className="font-semibold text-blue-900 mb-1.5">How to use this</p>
        <p>• <strong>✏️ Edit</strong> — change the message and buttons the bot sends to users</p>
        <p>• <strong>✓ / ✗ On/Off</strong> — enable or disable a command without deleting it</p>
        <p>• <strong>↺ Reset</strong> — restore a system command to its original wording</p>
        <p>• <strong>⋮⋮ Drag</strong> — grab the left strip of a card to reorder within a group</p>
      </div>

      {/* Role sections */}
      {ROLE_ORDER.map(role => {
        const cmds = grouped[role];
        if (!cmds?.length) return null;
        const s = ROLE_STYLES[role];
        return (
          <div key={role}>
            <div className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full ${s.bg} border ${s.border} mb-3`}>
              <span className="text-sm font-semibold text-gray-700">{s.label}</span>
              <span className="text-xs text-gray-500">— {ROLE_DESCRIPTIONS[role]}</span>
              <span className="text-xs text-gray-400 ml-1">({cmds.length})</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {cmds.map((cmd, idx) => (
                <CommandCard key={cmd._id} cmd={cmd}
                  onEdit={setEditModal} onDelete={handleDelete}
                  onReset={handleReset} onToggleActive={toggleActive}
                  onDragStart={() => handleDragStart(role, idx)}
                  onDragOver={() => handleDragOver(role, idx)}
                  onDrop={() => handleDrop(role, idx)}
                  onDragEnd={handleDragEnd}
                  isDragTarget={dragState.role === role && dragState.toIdx === idx && dragInfo.current?.idx !== idx}
                />
              ))}
            </div>
          </div>
        );
      })}

      {(editModal || createModal) && (
        <CommandModal
          command={editModal || null}
          onSave={handleSave}
          onClose={() => { setEditModal(null); setCreateModal(false); }}
          saving={saving}
        />
      )}
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
  { id: "botref", label: "Bot Flows", icon: FiCommand },
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
      case "botref": return <BotFlowPanel />;
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
