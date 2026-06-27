import { useState, useEffect, useCallback, useRef } from "react";
import { waAdminAPI } from "../../services/api";
import toast from "react-hot-toast";
import Spinner from "../common/Spinner";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import {
  MessageSquare, Send, Users, Activity, Settings,
  CheckCircle2, XCircle, Phone, RefreshCw, Radio,
  Clock, Zap, Trash2, Play, Pause, Plus, Edit2,
  ChevronDown, ChevronUp, AlertCircle, Bell, Terminal
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString();
const fmtTime = (iso) => iso ? new Date(iso).toLocaleString() : "—";
const minutesUntil = (iso) => iso ? Math.max(0, Math.round((new Date(iso) - Date.now()) / 60000)) : null;

function StatusBadge({ active, labels = ["Active", "Inactive"] }) {
  return (
    <Badge variant={active ? "success" : "secondary"} className="gap-1 text-xs">
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? labels[0] : labels[1]}
    </Badge>
  );
}

function DirectionBadge({ direction }) {
  const inbound = direction === "inbound";
  return (
    <Badge variant={inbound ? "info" : "success"} className="text-xs">
      {inbound ? "In" : "Out"}
    </Badge>
  );
}

function StatCard({ label, value, icon: Icon, color = "blue" }) {
  const colors = {
    blue: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
    green: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    red: "bg-destructive/10 text-destructive",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="rounded-xl border border-border bg-card flex items-center gap-4 p-4">
      <div className={cn("p-3 rounded-xl flex-shrink-0", colors[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{fmt(value)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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
        <h2 className="text-lg font-semibold text-foreground">WhatsApp Analytics</h2>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Messages" value={stats.totalMessages} icon={MessageSquare} color="blue" />
        <StatCard label="Inbound" value={stats.inboundMessages} icon={Activity} color="green" />
        <StatCard label="Outbound" value={stats.outboundMessages} icon={Send} color="purple" />
        <StatCard label="Active Sessions (7d)" value={stats.activeSessionsLast7Days} icon={Clock} color="amber" />
        <StatCard label="Windows Opened" value={stats.windowOpenCount} icon={Zap} color="blue" />
        <StatCard label="Opt-Outs" value={stats.optOutCount} icon={XCircle} color="red" />
      </div>

      {stats.dailyMessages && stats.dailyMessages.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Message Volume</h3>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyMessages.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary-500 rounded-t"
                  style={{ height: `${Math.round(((d.count || 0) / maxDaily) * 100)}%`, minHeight: "2px" }}
                  title={`${d.count} messages`}
                />
                <span className="text-xs text-muted-foreground truncate w-full text-center">{d.date?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.config && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Config Status</p>
            <p className="text-xs text-muted-foreground">{stats.config.status || "Configured"} — Phone: {stats.config.phone || "—"}</p>
          </div>
          <StatusBadge active={stats.config.active} />
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
      <div className="w-72 flex-shrink-0 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <input className="input w-full text-sm" placeholder="Search phone or name…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? <div className="flex justify-center py-8"><Spinner /></div> :
            convos.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No conversations</p> :
            convos.map(c => {
              const mins = minutesUntil(c.windowExpiresAt);
              const open = c.windowExpiresAt && new Date(c.windowExpiresAt) > new Date();
              return (
                <button key={c.phone} onClick={() => setSelected(c)}
                  className={cn("w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors", selected?.phone === c.phone && "bg-primary-50 dark:bg-primary-900/20")}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground truncate">{c.name || c.phone}</span>
                    {c.windowExpiresAt && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", open ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                        {open ? `${mins}m` : "closed"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.phone}</p>
                  {c.lastMessage && <p className="text-xs text-muted-foreground/70 mt-1 truncate">{c.lastMessage}</p>}
                </button>
              );
            })
          }
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <MessageSquare className="h-9 w-9 mx-auto mb-2 opacity-30" />
              <p>Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{selected.name || selected.phone}</p>
                <p className="text-xs text-muted-foreground">{selected.phone}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadMessages(selected.phone)} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>

            {!windowOpen && (
              <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">24h window is closed. You can only send template messages.</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm", m.direction === "outbound" ? "bg-emerald-500 text-white rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm")}>
                    <p>{m.message || m.body || "(media)"}</p>
                    <p className={cn("text-xs mt-1", m.direction === "outbound" ? "text-emerald-100" : "text-muted-foreground")}>{fmtTime(m.createdAt)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border p-3 space-y-2">
              <select className="input text-sm py-1.5 w-32" value={replyType} onChange={e => setReplyType(e.target.value)}>
                <option value="text">Text</option>
                <option value="template">Template</option>
              </select>
              {replyType === "text" ? (
                <div className="flex gap-2">
                  <textarea className="input flex-1 text-sm resize-none" rows={2} placeholder="Type a message…"
                    value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                  <Button onClick={handleSend} disabled={sending} className="self-end px-4 gap-1">
                    {sending ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input className="input flex-1 text-sm" placeholder="Template name" value={tplName} onChange={e => setTplName(e.target.value)} />
                    <input className="input w-20 text-sm" placeholder="Lang" value={tplLang} onChange={e => setTplLang(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <input className="input flex-1 text-sm" placeholder="Params (comma separated)" value={tplParams} onChange={e => setTplParams(e.target.value)} />
                    <Button onClick={handleSend} disabled={sending} className="px-4 gap-1">
                      {sending ? <Spinner size="sm" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
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
    if (mins < 60) return "text-destructive bg-destructive/10";
    if (mins < 240) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20";
    return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Open Windows" value={data.openCount} icon={CheckCircle2} color="green" />
        <StatCard label="Closed Windows" value={data.closedCount} icon={XCircle} color="red" />
        <StatCard label="Total Sessions" value={data.totalCount} icon={Clock} color="blue" />
      </div>

      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-primary-700 dark:text-primary-300">
          Meta's 24-hour rule: You can send free-form messages only within 24 hours of the customer's last inbound message. After the window closes, only approved template messages are allowed.
        </p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No open windows</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Open Sessions (soonest expiry first)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Expires At</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Time Left</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => {
                  const mins = minutesUntil(s.expiresAt);
                  return (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs text-foreground">{s.phone}</td>
                      <td className="px-4 py-2 text-foreground">{s.name || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtTime(s.expiresAt)}</td>
                      <td className="px-4 py-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", windowColor(mins))}>{mins}m remaining</span>
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
    <div className="rounded-xl border-l-4 border-l-primary-500 border-y border-r border-border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-foreground">{isEdit ? "Edit Campaign" : "New Campaign"}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Name</label>
          <input className="input w-full" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Type</label>
          <select className="input w-full" value={form.type} onChange={e => set("type", e.target.value)}>
            <option value="auto_reply">Auto Reply</option>
            <option value="broadcast_campaign">Broadcast Campaign</option>
          </select>
        </div>
      </div>

      {form.type === "auto_reply" && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Keywords</label>
            <div className="flex gap-2 mb-2">
              <input className="input flex-1" placeholder="Add keyword" value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addKeyword()} />
              <Button variant="outline" size="sm" onClick={addKeyword}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {form.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs">
                  {kw}
                  <button onClick={() => removeKeyword(kw)}><XCircle className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Match Type</label>
              <select className="input w-full" value={form.matchType} onChange={e => set("matchType", e.target.value)}>
                <option value="contains">Contains</option>
                <option value="exact">Exact</option>
                <option value="startsWith">Starts With</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Target Role</label>
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
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Audience Role</label>
            <select className="input w-48" value={form.audienceRole} onChange={e => set("audienceRole", e.target.value)}>
              <option value="all">All</option>
              <option value="buyer">Buyers</option>
              <option value="seller">Sellers</option>
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.premiumOnly} onChange={e => set("premiumOnly", e.target.checked)} />
              Premium only
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.respectOptOut} onChange={e => set("respectOptOut", e.target.checked)} />
              Respect opt-outs
            </label>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Response Type</label>
          <select className="input w-48" value={form.messageType} onChange={e => set("messageType", e.target.value)}>
            <option value="text">Text</option>
            <option value="template">Template</option>
          </select>
        </div>
        {form.messageType === "text" ? (
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Message Content</label>
            <textarea className="input w-full" rows={3} value={form.content} onChange={e => set("content", e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Template Name</label>
              <input className="input w-full" value={form.templateName} onChange={e => set("templateName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Language</label>
              <input className="input w-full" value={form.templateLanguage} onChange={e => set("templateLanguage", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Params (comma sep)</label>
              <input className="input w-full" value={form.templateParams} onChange={e => set("templateParams", e.target.value)} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button loading={saving} onClick={handleSave} size="sm" className="gap-1.5">
          {!saving && <><CheckCircle2 className="h-3.5 w-3.5" /> {isEdit ? "Update" : "Create"}</>}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
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
        <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
        {!showForm && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Campaign
          </Button>
        )}
      </div>

      {showForm && <CampaignForm initial={editing} onSave={afterSave} onCancel={closeForm} />}

      {campaigns.length === 0 && !showForm ? (
        <p className="text-center text-muted-foreground py-10">No campaigns yet</p>
      ) : (
        campaigns.map(c => (
          <div key={c._id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">{c.name}</span>
                <Badge variant="secondary" className="text-xs">{c.type}</Badge>
                <StatusBadge active={c.active} />
              </div>
              <p className="text-xs text-muted-foreground">{c.type === "auto_reply" ? `Keywords: ${(c.keywords || []).join(", ") || "—"}` : `Audience: ${c.audienceRole || "all"}`}</p>
            </div>
            <div className="flex items-center gap-2">
              {c.type === "broadcast_campaign" && (
                <Button variant="outline" size="sm" onClick={() => handleRun(c._id)} className="gap-1">
                  <Play className="h-3 w-3" /> Run
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleToggle(c)} className="gap-1">
                {c.active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} {c.active ? "Pause" : "Activate"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="gap-1">
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
              <button className="text-muted-foreground hover:text-destructive transition-colors p-1" onClick={() => handleDelete(c._id)}>
                <Trash2 className="h-3.5 w-3.5" />
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
      <h2 className="text-lg font-semibold text-foreground">Broadcast Message</h2>
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-400">Text messages can only be delivered within the 24h window. For guaranteed delivery, use an approved template.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Campaign Name (optional)</label>
            <input className="input w-full" value={form.campaignName} onChange={e => set("campaignName", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Audience Role</label>
            <select className="input w-full" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="all">All Users</option>
              <option value="seller">Sellers</option>
              <option value="buyer">Buyers</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Message Type</label>
          <select className="input w-48" value={form.messageType} onChange={e => set("messageType", e.target.value)}>
            <option value="text">Text</option>
            <option value="template">Template</option>
          </select>
        </div>
        {form.messageType === "text" ? (
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">Message</label>
            <textarea className="input w-full" rows={4} value={form.message} onChange={e => set("message", e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Template Name</label>
              <input className="input w-full" value={form.templateName} onChange={e => set("templateName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Language</label>
              <input className="input w-full" value={form.templateLanguage} onChange={e => set("templateLanguage", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Params (comma sep)</label>
              <input className="input w-full" value={form.templateParams} onChange={e => set("templateParams", e.target.value)} />
            </div>
          </div>
        )}
        <Button loading={sending} onClick={handleSend} className="gap-1.5">
          {!sending && <><Radio className="h-3.5 w-3.5" /> Send Broadcast</>}
        </Button>
      </div>
      {result && (
        <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-foreground">{fmt(result.total)}</p><p className="text-xs text-muted-foreground">Total</p></div>
          <div><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(result.sent)}</p><p className="text-xs text-muted-foreground">Sent</p></div>
          <div><p className="text-2xl font-bold text-destructive">{fmt(result.failed)}</p><p className="text-xs text-muted-foreground">Failed</p></div>
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
      <h2 className="text-lg font-semibold text-foreground">Direct Message</h2>
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-400">Only send to users who have an open 24h window, or use template messages to reach users outside the window.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Phone Number</label>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input className="input flex-1" placeholder="+1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Message</label>
          <textarea className="input w-full" rows={4} value={message} onChange={e => setMessage(e.target.value)} />
        </div>
        <Button loading={sending} onClick={handleSend} className="gap-1.5">
          {!sending && <><Send className="h-3.5 w-3.5" /> Send Message</>}
        </Button>
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

  const statusVariant = (status) => {
    if (status === "APPROVED") return "success";
    if (status === "PENDING") return "warning";
    return "destructive";
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Templates</h2>
        <Button variant="outline" size="sm" loading={syncing} onClick={handleSync} className="gap-1.5">
          {!syncing && <><RefreshCw className="h-3.5 w-3.5" /> Sync from Meta</>}
        </Button>
      </div>
      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 flex items-start gap-3">
        <Bell className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-primary-700 dark:text-primary-300">Only APPROVED templates can be used in broadcasts and outside the 24h window. Templates must be submitted to Meta for review before use.</p>
      </div>
      {templates.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No templates found. Click "Sync from Meta" to import.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{t.name}</p>
                <Badge variant={statusVariant(t.status)} className="text-xs flex-shrink-0">{t.status || "UNKNOWN"}</Badge>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{t.category}</span><span>·</span><span>{t.language}</span>
              </div>
              {t.body && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">{t.body}</p>}
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
      <h2 className="text-lg font-semibold text-foreground">Opt-Outs</h2>
      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-primary-700 dark:text-primary-300">GDPR compliance: Users who opt out will not receive any WhatsApp messages. Opt-outs are honoured automatically for all broadcasts and campaigns.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Add Opt-Out</h3>
        <div className="flex gap-3">
          <input className="input flex-1" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="input flex-1" placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <Button loading={adding} onClick={handleAdd} size="sm" className="gap-1.5">
            {!adding && <><Plus className="h-3.5 w-3.5" /> Add</>}
          </Button>
        </div>
      </div>
      {loading ? <div className="flex justify-center py-10"><Spinner /></div> :
        optouts.length === 0 ? <p className="text-center text-muted-foreground py-10">No opt-outs recorded</p> :
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Phone</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Reason</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {optouts.map((o, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{o.phone}</td>
                  <td className="px-4 py-2 text-foreground">{o.reason || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtTime(o.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleRemove(o._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
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

  const statusVariant = (status) => {
    if (status === "delivered" || status === "read") return "success";
    if (status === "failed") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-foreground">Message Logs</h2>
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
        logs.length === 0 ? <p className="text-center text-muted-foreground py-10">No logs found</p> :
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Time</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Dir</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Message</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground text-xs whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                    <td className="px-4 py-2"><DirectionBadge direction={l.direction} /></td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground">{l.phone}</td>
                    <td className="px-4 py-2 text-foreground">{l.userName || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{l.messageType}</td>
                    <td className="px-4 py-2 text-foreground max-w-xs truncate">{l.message || l.templateName || "—"}</td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(l.status)} className="text-xs">{l.status || "—"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">{fmt(total)} total records</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                <span className="text-xs text-muted-foreground self-center px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
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
  guest:  { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/40', badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', label: '👤 Guest (Unregistered)' },
  buyer:  { bg: 'bg-primary-50 dark:bg-primary-900/20', border: 'border-primary-200 dark:border-primary-800/40', badge: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300', label: '🛒 Buyer' },
  seller: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', label: '🏪 Seller' },
  any:    { bg: 'bg-muted/50', border: 'border-border', badge: 'bg-muted text-muted-foreground', label: '🌐 Any Role' },
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
      className={cn("rounded-xl border overflow-hidden transition-shadow", isDragTarget ? "border-primary-400 shadow-lg ring-2 ring-primary-200 dark:ring-primary-800" : s.border)}
    >
      <div className="flex">
        <div className="flex-shrink-0 w-7 flex items-center justify-center cursor-grab active:cursor-grabbing bg-muted/50 border-r border-border hover:bg-muted transition-colors group" title="Drag to reorder">
          <span className="select-none text-muted-foreground/40 group-hover:text-muted-foreground text-base leading-none">⋮⋮</span>
        </div>

        <div className="flex-1 min-w-0 p-3 space-y-2 bg-card">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm leading-snug">{cmd.label}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", s.badge)}>{s.label}</span>
                {cmd.isSystem && <Badge variant="warning" className="text-xs">System</Badge>}
                <span className={cn("text-xs font-medium", cmd.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{cmd.isActive ? "● On" : "○ Off"}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => onToggleActive(cmd)} title={cmd.isActive ? "Turn off" : "Turn on"}
                className={cn("p-1.5 rounded-lg transition-colors", cmd.isActive ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "text-muted-foreground hover:bg-muted")}>
                {cmd.isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              </button>
              <button onClick={() => onEdit(cmd)} title="Edit message"
                className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              {cmd.isSystem ? (
                <button onClick={() => onReset(cmd)} title="Restore factory defaults"
                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button onClick={() => onDelete(cmd)} title="Delete"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {cmd.response.text && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-2 leading-relaxed line-clamp-2">
              {cmd.response.text.replace(/\*/g, "").slice(0, 120)}{cmd.response.text.length > 120 ? "…" : ""}
            </div>
          )}

          {cmd.response.type === "button" && cmd.response.buttons?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cmd.response.buttons.map((btn, i) => (
                <span key={i} className="text-xs bg-card border border-border text-foreground px-2.5 py-0.5 rounded-full shadow-sm">
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
    key: "", label: "", description: "", role: "guest",
    triggers: [],
    response: { type: "text", text: "", buttons: [] },
    isActive: true,
  });
  const [triggersInput, setTriggersInput] = useState((command?.triggers || []).join(", "));

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  const setResp = (f, v) => setForm(prev => ({ ...prev, response: { ...prev.response, [f]: v } }));

  const switchType = (type) => {
    setForm(prev => ({
      ...prev,
      response: {
        ...prev.response,
        type,
        buttons: type === "button" && prev.response.buttons.length === 0 ? [{ id: "", title: "" }] : prev.response.buttons,
      },
    }));
  };

  const addBtn = () => {
    if (form.response.buttons.length >= 3) return;
    setResp("buttons", [...form.response.buttons, { id: "", title: "" }]);
  };
  const removeBtn = (i) => setResp("buttons", form.response.buttons.filter((_, idx) => idx !== i));
  const updateBtnTitle = (i, title) => {
    const btns = [...form.response.buttons];
    btns[i] = { id: btns[i].id || title.toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 20), title };
    setResp("buttons", btns);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, triggers: triggersInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) }, isNew);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-semibold text-foreground">{isNew ? "New Bot Command" : "Edit Bot Command"}</h3>
            {!isNew && <p className="text-xs text-muted-foreground mt-0.5 font-mono">{command.key}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted text-lg">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">Command name <span className="font-normal text-muted-foreground">(admin label only)</span></label>
            <input className="input w-full" placeholder="e.g. Buyer Welcome Message"
              value={form.label} onChange={e => set("label", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Who sees this?</label>
              <select className="input w-full text-sm" value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="guest">👤 Guests (new users)</option>
                <option value="buyer">🛒 Buyers</option>
                <option value="seller">🏠 Sellers</option>
                <option value="any">🌐 Everyone</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Status</label>
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="rounded" />
                <div>
                  <p className="text-sm text-foreground">{form.isActive ? "Active" : "Inactive"}</p>
                  <p className="text-xs text-muted-foreground">{form.isActive ? "Bot will use this" : "Bot ignores this"}</p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-sm font-semibold text-foreground">What should the bot reply?</p>
              <p className="text-xs text-muted-foreground mt-0.5">This is the exact message users receive on WhatsApp.</p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => switchType("text")}
                className={cn("flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all", form.response.type === "text" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground")}>
                💬 Text only
              </button>
              <button type="button" onClick={() => switchType("button")}
                className={cn("flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all", form.response.type === "button" ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-muted-foreground hover:border-emerald-400 hover:text-foreground")}>
                🔘 Text + tap buttons
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Message</label>
                <span className="text-xs text-muted-foreground">*bold*  ·  {"{name}"} = user's name</span>
              </div>
              <textarea className="input font-mono text-sm resize-y w-full" rows={5}
                value={form.response.text} onChange={e => setResp("text", e.target.value)}
                placeholder="Type what the bot will send..." required />
            </div>

            {form.response.type === "button" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tap buttons <span className="text-muted-foreground font-normal text-xs">— max 3, shown under the message</span>
                </label>
                <div className="space-y-2">
                  {form.response.buttons.map((btn, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground w-4 text-center">{i + 1}.</span>
                      <input className="input text-sm flex-1" placeholder="Button label (e.g. View Orders)"
                        value={btn.title} maxLength={20}
                        onChange={e => updateBtnTitle(i, e.target.value)} required />
                      <button type="button" onClick={() => removeBtn(i)} className="p-1.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {form.response.buttons.length < 3 && (
                    <button type="button" onClick={addBtn}
                      className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-emerald-300 hover:text-emerald-500 transition-colors">
                      + Add button
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {isNew && (
            <details className="border border-border rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer select-none">Advanced settings</summary>
              <div className="px-4 pb-4 pt-3 border-t border-border space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Command key <span className="font-normal text-muted-foreground">(unique ID, no spaces)</span></label>
                  <input className="input text-sm font-mono w-full" placeholder="e.g. promo_reply"
                    value={form.key} onChange={e => set("key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Trigger keywords <span className="font-normal text-muted-foreground">(comma-separated, for reference)</span></label>
                  <input className="input text-sm font-mono w-full" placeholder="hi, hello, start"
                    value={triggersInput} onChange={e => setTriggersInput(e.target.value)} />
                </div>
              </div>
            </details>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {!saving && (isNew ? "Create Command" : "Save Changes")}
            </Button>
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
      toast.error("Failed to load bot commands");
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
    } catch { toast.error("Failed to save order"); }
  };

  const handleSave = async (data, isNew) => {
    setSaving(true);
    try {
      if (isNew) {
        await waAdminAPI.createBotCommand(data);
        toast.success("Command created");
      } else {
        await waAdminAPI.updateBotCommand(data._id, data);
        toast.success("Saved");
      }
      setEditModal(null);
      setCreateModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cmd) => {
    if (!window.confirm(`Delete "${cmd.label}"?`)) return;
    try {
      await waAdminAPI.deleteBotCommand(cmd._id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
    }
  };

  const handleReset = async (cmd) => {
    if (!window.confirm(`Reset "${cmd.label}" back to factory defaults?`)) return;
    try {
      await waAdminAPI.resetBotCommand(cmd._id);
      toast.success("Reset to default");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Reset failed");
    }
  };

  const toggleActive = async (cmd) => {
    try {
      await waAdminAPI.updateBotCommand(cmd._id, { isActive: !cmd.isActive });
      setCommands(cs => cs.map(c => c._id === cmd._id ? { ...c, isActive: !c.isActive } : c));
    } catch { toast.error("Toggle failed"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bot Flow Builder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Edit what the WhatsApp bot says. Drag cards to reorder.</p>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)} className="gap-1.5 flex-shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add Command
        </Button>
      </div>

      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 p-4 text-xs text-primary-800 dark:text-primary-300 space-y-1">
        <p className="font-semibold text-primary-900 dark:text-primary-200 mb-1.5">How to use this</p>
        <p>• <strong>✏️ Edit</strong> — change the message and buttons the bot sends to users</p>
        <p>• <strong>✓ / ✗ On/Off</strong> — enable or disable a command without deleting it</p>
        <p>• <strong>↺ Reset</strong> — restore a system command to its original wording</p>
        <p>• <strong>⋮⋮ Drag</strong> — grab the left strip of a card to reorder within a group</p>
      </div>

      {ROLE_ORDER.map(role => {
        const cmds = grouped[role];
        if (!cmds?.length) return null;
        const s = ROLE_STYLES[role];
        return (
          <div key={role}>
            <div className={cn("inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full border mb-3", s.bg, s.border)}>
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
              <span className="text-xs text-muted-foreground">— {ROLE_DESCRIPTIONS[role]}</span>
              <span className="text-xs text-muted-foreground/60 ml-1">({cmds.length})</span>
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
  { id: "analytics", label: "Analytics", icon: Activity },
  { id: "inbox", label: "Inbox", icon: MessageSquare },
  { id: "window", label: "24h Window", icon: Clock },
  { id: "campaigns", label: "Campaigns", icon: Zap },
  { id: "broadcast", label: "Broadcast", icon: Radio },
  { id: "direct", label: "Direct Send", icon: Send },
  { id: "templates", label: "Templates", icon: Settings },
  { id: "optouts", label: "Opt-Outs", icon: XCircle },
  { id: "logs", label: "Logs", icon: Activity },
  { id: "botref", label: "Bot Flows", icon: Terminal },
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
        <div className="h-9 w-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">WhatsApp Admin</h1>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px",
                  active
                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {tab.label}
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
