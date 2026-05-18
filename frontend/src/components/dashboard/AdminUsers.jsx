import { useState, useEffect } from 'react';
import { FiZap, FiToggleLeft, FiToggleRight, FiSearch } from 'react-icons/fi';
import { userAPI } from '../../services/api';
import Spinner from '../common/Spinner';
import toast from 'react-hot-toast';

export default function AdminUsers() {
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

  const handleToggleStatus = async (id, name) => {
    try {
      const r = await userAPI.toggleStatus(id);
      toast.success(r.data.message);
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleTogglePremium = async (id, currentPlan) => {
    try {
      const r = await userAPI.togglePremium(id);
      toast.success(`Plan updated to ${r.data.plan}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update plan');
    }
  };

  const visible = users.filter((u) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.businessName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || u.role === filter || (filter === 'premium' && u.plan === 'premium');
    return matchSearch && matchFilter;
  });

  const premiumCount = users.filter((u) => u.role === 'seller' && u.plan === 'premium').length;
  const sellerCount = users.filter((u) => u.role === 'seller').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {sellerCount} sellers — {premiumCount} premium (receive WhatsApp broadcasts)
          </p>
        </div>
      </div>

      {/* Cost insight */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-sm">
        <p className="font-medium text-blue-800">WhatsApp Broadcast Cost Control</p>
        <p className="text-blue-600 text-xs mt-0.5">
          Only <strong>Premium sellers</strong> receive WhatsApp lead broadcasts. Max <strong>5 messages per inquiry</strong>, ranked by rating.
          Free sellers see leads in dashboard only. Estimated cost: ≤₹5 per inquiry.
        </p>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-grow max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / business..."
            className="input pl-9 text-sm"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input text-sm w-36">
          <option value="all">All users</option>
          <option value="seller">Sellers only</option>
          <option value="buyer">Buyers only</option>
          <option value="premium">Premium sellers</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Plan</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.businessName && <p className="text-xs text-green-600">{u.businessName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'seller' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.role === 'seller' ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.plan === 'premium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.plan === 'premium' ? '⚡ Premium' : 'Free'}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {u.role === 'seller' && (
                        <button
                          onClick={() => handleTogglePremium(u._id, u.plan)}
                          title={u.plan === 'premium' ? 'Downgrade to Free' : 'Upgrade to Premium'}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-medium transition-colors ${
                            u.plan === 'premium'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                          }`}
                        >
                          <FiZap size={12} />
                          {u.plan === 'premium' ? 'Downgrade' : 'Make Premium'}
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        title={u.isActive ? 'Disable user' : 'Enable user'}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        {u.isActive ? <FiToggleRight size={20} className="text-green-500" /> : <FiToggleLeft size={20} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
