import { useState, useEffect } from 'react';
import { Search, Zap, ToggleLeft, ToggleRight, Users } from 'lucide-react';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const ROLE_VARIANT = {
  superadmin: 'destructive',
  admin: 'purple',
  seller: 'info',
  buyer: 'secondary',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchUsers = () => {
    userAPI.getAll()
      .then((r) => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const handleToggleStatus = async (id) => {
    try {
      const r = await userAPI.toggleStatus(id);
      toast.success(r.data.message);
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleTogglePremium = async (id) => {
    try {
      const r = await userAPI.togglePremium(id);
      toast.success(`Plan updated to ${r.data.plan}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    try {
      await userAPI.changeRole(id, newRole);
      toast.success(`Role changed to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role');
    }
  };

  const visible = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.businessName?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || u.role === filter || (filter === 'premium' && u.plan === 'premium');
    return matchSearch && matchFilter;
  });

  const premiumCount = users.filter((u) => u.role === 'seller' && u.plan === 'premium').length;
  const sellerCount = users.filter((u) => u.role === 'seller').length;
  const availableRoles = isSuperAdmin
    ? ['buyer', 'seller', 'admin', 'superadmin']
    : ['buyer', 'seller', 'admin'];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sellerCount} sellers · {premiumCount} premium (receive WhatsApp broadcasts)
        </p>
      </div>

      <div className="rounded-xl border border-primary-200 dark:border-primary-800/40 bg-primary-50/50 dark:bg-primary-950/20 px-4 py-3 mb-5">
        <p className="font-medium text-foreground text-sm">WhatsApp Broadcast Cost Control</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Only <strong className="text-foreground">Premium sellers</strong> receive WhatsApp lead broadcasts. Max <strong className="text-foreground">5 messages per inquiry</strong>, ranked by rating.
          Free sellers see leads in dashboard only. Estimated cost: ≤₹5 per inquiry.
        </p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / phone..."
            className="input pl-9 text-sm"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input text-sm w-44">
          <option value="all">All users</option>
          <option value="seller">Sellers only</option>
          <option value="buyer">Buyers only</option>
          <option value="admin">Admins only</option>
          <option value="premium">Premium sellers</option>
        </select>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size="lg" /></div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No users found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verified</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visible.map((u) => {
                const canEditRole = isSuperAdmin || u.role !== 'superadmin';
                const isSelf = u._id === currentUser?._id;
                return (
                  <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">
                        {u.name}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                      </p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                      {u.phone && <p className="text-xs text-primary-600 dark:text-primary-400">{u.phone}</p>}
                      {u.businessName && <p className="text-xs text-emerald-600 dark:text-emerald-400">{u.businessName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {canEditRole && !isSelf ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="text-xs font-medium px-2 py-1 rounded-lg border border-border bg-muted/50 text-foreground cursor-pointer capitalize"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant={ROLE_VARIANT[u.role] || 'secondary'} className="text-2xs capitalize">
                          {u.role}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.role === 'seller' ? (
                        <Badge variant={u.plan === 'premium' ? 'warning' : 'secondary'} className="text-2xs">
                          {u.plan === 'premium' ? '⚡ Premium' : 'Free'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={u.isVerified ? 'success' : 'warning'} className="text-2xs">
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={u.isActive ? 'success' : 'destructive'} className="text-2xs">
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {u.role === 'seller' && (
                          <button
                            onClick={() => handleTogglePremium(u._id)}
                            title={u.plan === 'premium' ? 'Downgrade to Free' : 'Upgrade to Premium'}
                            className={cn(
                              'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                              u.plan === 'premium'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                                : 'bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-400'
                            )}
                          >
                            <Zap className="h-3 w-3" />
                            {u.plan === 'premium' ? 'Downgrade' : 'Upgrade'}
                          </button>
                        )}
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleStatus(u._id)}
                            title={u.isActive ? 'Disable user' : 'Enable user'}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            {u.isActive
                              ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                              : <ToggleLeft className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
