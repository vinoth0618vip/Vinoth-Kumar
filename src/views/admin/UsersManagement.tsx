import React, { useState } from 'react';
import { User, Site, UserRole } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import {
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  Shield,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';

interface UsersManagementProps {
  currentUser: User;
  sites: Site[];
  users: User[];
  onRefresh: () => void;
}

const ROLES: UserRole[] = [
  'Admin',
  'Supervisor',
  'Manager',
  'Overall Manager',
  'Overall Incharge',
  'Employee',
];

export const UsersManagement: React.FC<UsersManagementProps> = ({
  currentUser,
  sites,
  users,
  onRefresh,
}) => {
  // Guarantee single synchronized source of truth for site assignments
  const storedSites = storage.getSites();
  const effectiveSites = storedSites.length > 0 || sites.length === 0 ? storedSites : sites;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Single delete confirmation modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Bulk delete all non-admin users state & 2-step password verification flow
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [showPasswordVisibility, setShowPasswordVisibility] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);

  const nonAdminUsers = users.filter((u) => u.role !== 'Admin');
  const adminUsers = users.filter((u) => u.role === 'Admin');

  // Breakdown of non-admin roles for transparent audit
  const roleBreakdown = nonAdminUsers.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  // Form state
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Employee');
  const [siteId, setSiteId] = useState('SITE-01');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');

  const handleOpenAdd = () => {
    setEditingUser(null);
    setId(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setName('');
    setMobile('');
    setPassword('12345678');
    setRole('Employee');
    setSiteId(sites[0]?.id || 'SITE-01');
    setDepartment('Execution');
    setDesignation('Site Worker');
    setIsModalOpen(true);
    setFeedback(null);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setId(user.id);
    setName(user.name);
    setMobile(user.mobile);
    setPassword(user.password || '');
    setRole(user.role);
    setSiteId(user.siteId);
    setDepartment(user.department || '');
    setDesignation(user.designation || '');
    setIsModalOpen(true);
    setFeedback(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'User name is required.' });
      return;
    }
    if (!mobile.trim()) {
      setFeedback({ type: 'error', message: 'Mobile number is required.' });
      return;
    }
    if (!password.trim()) {
      setFeedback({ type: 'error', message: 'Password is required.' });
      return;
    }

    const selectedSite = effectiveSites.find((s) => s.id === siteId);
    const siteName = siteId === 'ALL' ? 'All Sites' : selectedSite?.name || 'Assigned Site';

    const userToSave: User = {
      id: editingUser ? editingUser.id : id,
      name: name.trim(),
      mobile: mobile.trim(),
      password: password.trim(),
      role,
      siteId,
      siteName,
      department: department.trim(),
      designation: designation.trim(),
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    const result = storage.saveUser(userToSave);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setTimeout(() => {
        setIsModalOpen(false);
        onRefresh();
      }, 500);
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const handlePromptDelete = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToDelete(user);
    setFeedback(null);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setUserToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete || isDeleting) return;

    setIsDeleting(true);
    const targetId = userToDelete.id;
    const targetName = userToDelete.name;

    try {
      const res = storage.deleteUser(targetId);
      setIsDeleting(false);

      if (res.success) {
        setUserToDelete(null);
        setFeedback({
          type: 'success',
          message: res.message || `User ${targetName} (${targetId}) deleted successfully.`,
        });
        onRefresh();
      } else {
        setUserToDelete(null);
        setFeedback({
          type: 'error',
          message: res.message || `Failed to delete user ${targetName} (${targetId}).`,
        });
      }
    } catch (err: any) {
      setIsDeleting(false);
      setUserToDelete(null);
      setFeedback({
        type: 'error',
        message: err?.message || 'An unexpected error occurred while deleting user.',
      });
    }
  };

  const handleOpenDeleteAllModal = () => {
    setShowDeleteAllModal(true);
    setShowPasswordModal(false);
    setAdminPassword('');
    setAdminPasswordError(null);
    setFeedback(null);
  };

  const handleCancelDeleteAllModal = () => {
    setShowDeleteAllModal(false);
  };

  const handleProceedToPassword = () => {
    setShowDeleteAllModal(false);
    setShowPasswordModal(true);
    setAdminPassword('');
    setAdminPasswordError(null);
  };

  const handleCancelPasswordModal = () => {
    if (isDeletingAll) return;
    setShowPasswordModal(false);
    setAdminPassword('');
    setAdminPasswordError(null);
  };

  const handleExecuteDeleteAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDeletingAll) return;

    if (!adminPassword.trim()) {
      setAdminPasswordError('Incorrect Admin Password');
      return;
    }

    setIsDeletingAll(true);
    setAdminPasswordError(null);

    try {
      const res = storage.deleteAllUsersWithAdminPassword(adminPassword.trim(), currentUser);
      setIsDeletingAll(false);

      if (res.success) {
        setShowPasswordModal(false);
        setAdminPassword('');
        setAdminPasswordError(null);
        setFeedback({
          type: 'success',
          message: 'All users deleted successfully',
        });
        onRefresh();
      } else {
        // Requirement 6: If password is incorrect, do not delete anything. Show "Incorrect Admin Password"
        setAdminPasswordError(res.message || 'Incorrect Admin Password');
      }
    } catch (err: any) {
      setIsDeletingAll(false);
      setAdminPasswordError('Incorrect Admin Password');
    }
  };

  const columns: ExcelColumn<User>[] = [
    {
      key: 'id',
      header: 'User ID',
      width: 'w-24',
      render: (u) => <span className="font-mono font-bold text-slate-900">{u.id}</span>,
    },
    {
      key: 'name',
      header: 'Full Name',
      render: (u) => (
        <div>
          <span className="font-semibold text-slate-800">{u.name}</span>
          {u.designation && <span className="block text-[10px] text-slate-500">{u.designation}</span>}
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile (Login)',
      width: 'w-28',
      render: (u) => <span className="font-mono text-emerald-800 font-medium">{u.mobile}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      width: 'w-32',
      render: (u) => {
        const roleColors: Record<UserRole, string> = {
          Admin: 'bg-rose-100 text-rose-800 border-rose-300',
          Manager: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          Supervisor: 'bg-amber-100 text-amber-800 border-amber-300',
          'Overall Manager': 'bg-purple-100 text-purple-800 border-purple-300',
          'Overall Incharge': 'bg-cyan-100 text-cyan-800 border-cyan-300',
          Employee: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        };
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
              roleColors[u.role] || 'bg-slate-100 text-slate-700'
            }`}
          >
            {u.role}
          </span>
        );
      },
    },
    {
      key: 'siteName',
      header: 'Assigned Site',
      render: (u) => (
        <span className="text-slate-700">
          {u.siteId === 'ALL' ? (
            <span className="font-bold text-emerald-700">All Sites (HQ)</span>
          ) : (
            u.siteName
          )}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: 'w-28',
      render: (u) => u.department || '—',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Users Management (Excel Grid)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system users, assign roles, update site assignments, and maintain credentials.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'Admin' && (
            <button
              onClick={handleOpenDeleteAllModal}
              type="button"
              disabled={nonAdminUsers.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              title={
                nonAdminUsers.length === 0
                  ? 'No non-admin accounts to delete'
                  : `Permanently delete all ${nonAdminUsers.length} non-admin user accounts`
              }
            >
              <Trash2 className="w-4 h-4" /> Delete All Users
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" /> Add New User
          </button>
        </div>
      </div>

      {/* Global Page Feedback (Shows confirmation after delete or error) */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Excel Table */}
      <ExcelTable
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        actionsHeader="Actions"
        renderActions={(u) => (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(u);
              }}
              className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
              title={`Edit User ${u.name} (${u.id})`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {u.id !== currentUser.id ? (
              <button
                type="button"
                onClick={(e) => handlePromptDelete(e, u)}
                className="p-1.5 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded transition-colors cursor-pointer"
                title={`Delete user ${u.name} (${u.id})`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span
                className="p-1.5 text-slate-300 cursor-not-allowed"
                title="Current logged-in Admin account (self-deletion protected)"
              >
                <Shield className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}
      />

      {/* Confirmation Before Deletion Modal Popup */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-100" />
                Confirm Delete User
              </h3>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="text-rose-200 hover:text-white transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-900 font-semibold">
                    Are you sure you want to delete this user?
                  </p>
                </div>
                <p className="text-[11px] text-rose-800">
                  Their account and login credentials will be removed. They will no longer be able to sign in to Attendance Plus PMS.
                </p>

                {/* Selected User Details */}
                <div className="bg-white p-3 rounded-lg border border-rose-200/80 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Full Name:</span>
                    <strong className="text-slate-900 font-bold">{userToDelete.name}</strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">User / Employee ID:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                      {userToDelete.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Mobile (Login ID):</span>
                    <span className="font-mono text-emerald-800 font-bold">{userToDelete.mobile}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">System Role:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {userToDelete.role}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 text-[11px]">Assigned Site:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">
                      {userToDelete.siteName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Retention Notice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Retention Notice:</strong> Historical attendance logs, punch timestamps, facial photos, and PMS progress submissions associated with ID{' '}
                  <span className="font-mono font-bold text-slate-800">{userToDelete.id}</span> are safely preserved in the database for company audit compliance.
                </span>
              </div>

              {/* Modal Actions: Cancel and Confirm Delete */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Users Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-rose-300">
            {/* Header */}
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm tracking-tight">
                  Delete All Users Confirmation
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelDeleteAllModal}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Alert Warning Box */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Permanent Bulk Deletion Warning</span>
                </div>
                <p className="leading-relaxed">
                  You are about to delete <strong className="font-mono text-rose-950 font-bold underline">{nonAdminUsers.length}</strong> non-admin user account(s) in one operation. This cannot be undone.
                </p>
              </div>

              {/* Breakdown of Affected Categories */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Accounts Scheduled for Deletion ({nonAdminUsers.length} Total)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(roleBreakdown).map(([roleName, count]) => (
                    <span
                      key={roleName}
                      className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-800 shadow-2xs"
                    >
                      {roleName}: <strong className="text-rose-700 font-mono font-bold">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>

              {/* Admin Accounts Protection Box */}
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Admin Protection Guarantee</span>
                </div>
                <p className="text-[11px] text-emerald-950 leading-relaxed">
                  The main Admin account ({adminUsers.map((a) => `${a.name} (${a.id})`).join(', ')}) will be <strong>safely preserved</strong> and never deleted.
                </p>
              </div>

              {/* Historical Data Retention Notice */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                ℹ️ <strong>Data Retention:</strong> Existing sites, attendance records, progress records, employee points, and other app data will not be deleted.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelDeleteAllModal}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPassword}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirm Delete All Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Input Dialog */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-slate-800">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Admin Password Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelPasswordModal}
                disabled={isDeletingAll}
                className="text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteDeleteAll} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed">
                Please enter your Admin password to authorize deleting all user accounts except the main Admin account.
              </div>

              {/* Admin Identity Display */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Admin Account: <strong>{currentUser.name}</strong> ({currentUser.id})
                </span>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Admin Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordVisibility ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminPasswordError(null);
                    }}
                    placeholder="Enter Admin password"
                    autoFocus
                    disabled={isDeletingAll}
                    className="w-full text-xs px-3.5 py-2.5 pl-9 pr-10 border-2 border-slate-300 focus:border-rose-500 rounded-lg font-mono focus:outline-hidden"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisibility(!showPasswordVisibility)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPasswordVisibility ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {adminPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminPasswordError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelPasswordModal}
                  disabled={isDeletingAll}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAll || !adminPassword.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isDeletingAll ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying Admin Password...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                {editingUser ? `Edit User: ${editingUser.name}` : 'Add New PMS User'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    User / Employee ID *
                  </label>
                  <input
                    type="text"
                    value={id}
                    disabled={!!editingUser}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mobile Number * (Login ID)
                  </label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                    placeholder="e.g. 12345678"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. R. Vinoth Kumar"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    System Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assigned Site *
                  </label>
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ALL">All Sites (Executive HQ)</option>
                    {effectiveSites
                      .filter((s) => s.active !== false || s.id === siteId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.siteNumber}] {s.name} {s.active === false ? '(Archived)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. Electrical / Piping"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="e.g. Lead Electrician"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Account Password *</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Stored securely for login authentication
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 pl-8"
                    placeholder="e.g. 12345678"
                    required
                  />
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" /> Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
