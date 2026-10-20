import React, { useState, useEffect } from 'react';
import { User, Site } from './types';
import { storage } from './services/storage';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LoginView } from './views/LoginView';

// Admin views
import { UsersManagement } from './views/admin/UsersManagement';
import { SitesManagement } from './views/admin/SitesManagement';
import { BulkWorkGuideUpload } from './views/admin/BulkWorkGuideUpload';
import { ProgressMonitor } from './views/admin/ProgressMonitor';
import { EmployeePointsView } from './views/admin/EmployeePointsView';
import { AttendanceDetailsView } from './views/admin/AttendanceDetailsView';
import { ReportsView } from './views/admin/ReportsView';
import { OTSheetView } from './views/OTSheetView';

// Employee & Manager views
import { EmployeeAttendance } from './views/employee/EmployeeAttendance';
import { EmployeeProgressUpdate } from './views/employee/EmployeeProgressUpdate';
import { MySavedProgress } from './views/employee/MySavedProgress';
import { EmployeeProfile } from './views/employee/EmployeeProfile';
import { ManagerDashboard } from './views/manager/ManagerDashboard';

// Icons
import {
  FileSpreadsheet,
  TrendingUp,
  Award,
  Users,
  Building,
  CalendarCheck,
  ClipboardList,
  FolderKanban,
  FileText,
  Clock,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());
  const [sites, setSites] = useState<Site[]>(() => storage.getSites());
  const [allUsers, setAllUsers] = useState<User[]>(() => storage.getUsers());
  const [activeTab, setActiveTab] = useState<string>('attendance');

  // Subsections inside Admin PMS System: 'bulk' | 'monitor' | 'points'
  const [pmsSubTab, setPmsSubTab] = useState<'bulk' | 'monitor' | 'points'>('bulk');

  // Subsections inside Admin Settings: 'users' | 'sites'
  const [settingsSubTab, setSettingsSubTab] = useState<'users' | 'sites'>('users');

  // Subsections inside Employee Progress: 'update' | 'saved'
  const [employeeProgressSubTab, setEmployeeProgressSubTab] = useState<'update' | 'saved'>('update');

  // Listen to cross-component storage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      setSites(storage.getSites());
      setAllUsers(storage.getUsers());
      setCurrentUser(storage.getCurrentUser());
    };

    window.addEventListener('pms_storage_updated', handleStorageUpdate);
    window.addEventListener('pms_sites_updated', handleStorageUpdate);
    window.addEventListener('pms_sites_cleared', handleStorageUpdate);
    return () => {
      window.removeEventListener('pms_storage_updated', handleStorageUpdate);
      window.removeEventListener('pms_sites_updated', handleStorageUpdate);
      window.removeEventListener('pms_sites_cleared', handleStorageUpdate);
    };
  }, []);

  const handleRefresh = () => {
    setSites(storage.getSites());
    setAllUsers(storage.getUsers());
    setCurrentUser(storage.getCurrentUser());
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleSwitchUser = (user: User) => {
    storage.setCurrentUser(user);
    setCurrentUser(user);
    // Reset active tab based on role
    setActiveTab('attendance');
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      {/* 4. Common Header across all role-specific pages */}
      <Header
        user={currentUser}
        sites={sites}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {/* =========================================
            ADMIN VIEWS
            ========================================= */}
        {currentUser.role === 'Admin' && (
          <div className="space-y-4">
            {/* 1. Admin Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <EmployeeAttendance
                  currentUser={currentUser}
                  sites={sites}
                  onRefresh={handleRefresh}
                />
              </div>
            )}

            {/* 2. Admin PMS System Tab with Sub-navigation: Bulk Upload, Progress Monitor, Employee Points */}
            {activeTab === 'pms' && (
              <div className="space-y-4">
                {/* Sub-header Navigation for Admin PMS */}
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-start gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setPmsSubTab('bulk')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      pmsSubTab === 'bulk'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" /> 1. Bulk Data Input (Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmsSubTab('monitor')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      pmsSubTab === 'monitor'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" /> 2. Progress Monitor
                  </button>
                  <button
                    type="button"
                    onClick={() => setPmsSubTab('points')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      pmsSubTab === 'points'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Award className="w-4 h-4" /> 3. Employee Points
                  </button>
                </div>

                {pmsSubTab === 'bulk' && (
                  <BulkWorkGuideUpload currentUser={currentUser} sites={sites} onRefresh={handleRefresh} />
                )}
                {pmsSubTab === 'monitor' && (
                  <ProgressMonitor
                    currentUser={currentUser}
                    sites={sites}
                    onRefresh={handleRefresh}
                  />
                )}
                {pmsSubTab === 'points' && (
                  <EmployeePointsView currentUser={currentUser} sites={sites} />
                )}
              </div>
            )}

            {/* 3. Admin Attendance Details Tab */}
            {activeTab === 'attendance_details' && (
              <AttendanceDetailsView currentUser={currentUser} sites={sites} />
            )}

            {/* 4. Admin OT Sheet Tab */}
            {activeTab === 'ot_sheet' && (
              <OTSheetView currentUser={currentUser} sites={sites} />
            )}

            {/* 5. Admin Reports Tab */}
            {activeTab === 'reports' && (
              <ReportsView currentUser={currentUser} sites={sites} />
            )}

            {/* 5. Admin Settings Tab: Users & Add Site */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-start gap-1">
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('users')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      settingsSubTab === 'users'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Users Management
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsSubTab('sites')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      settingsSubTab === 'sites'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-4 h-4" /> Add Site & Site List
                  </button>
                </div>

                {settingsSubTab === 'users' && (
                  <UsersManagement
                    currentUser={currentUser}
                    sites={sites}
                    users={allUsers}
                    onRefresh={handleRefresh}
                  />
                )}
                {settingsSubTab === 'sites' && (
                  <SitesManagement sites={sites} onRefresh={handleRefresh} />
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            MANAGER VIEWS
            ========================================= */}
        {currentUser.role === 'Manager' && (
          <div className="space-y-4">
            {activeTab === 'attendance' && (
              <EmployeeAttendance
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'attendance_details' && (
              <AttendanceDetailsView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'progress' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setEmployeeProgressSubTab('update')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                      employeeProgressSubTab === 'update'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    Progress Update Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeProgressSubTab('saved')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                      employeeProgressSubTab === 'saved'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    My Saved Progress
                  </button>
                </div>

                {employeeProgressSubTab === 'update' ? (
                  <EmployeeProgressUpdate
                    currentUser={currentUser}
                    sites={sites}
                    onSubmissionSuccess={() => setEmployeeProgressSubTab('saved')}
                  />
                ) : (
                  <MySavedProgress currentUser={currentUser} />
                )}
              </div>
            )}
            {activeTab === 'monitor' && (
              <ManagerDashboard
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'ot_sheet' && (
              <OTSheetView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'profile' && (
              <EmployeeProfile currentUser={currentUser} sites={sites} />
            )}
          </div>
        )}

        {/* =========================================
            SUPERVISOR & OVERALL INCHARGE VIEWS
            ========================================= */}
        {(currentUser.role === 'Supervisor' || currentUser.role === 'Overall Incharge') && (
          <div className="space-y-4">
            {activeTab === 'attendance' && (
              <EmployeeAttendance
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'progress_monitor' && (
              <ProgressMonitor
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}
            {/* OT Sheet visible only to Overall Incharge, not to Supervisors */}
            {activeTab === 'ot_sheet' && currentUser.role === 'Overall Incharge' && (
              <OTSheetView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'profile' && (
              <EmployeeProfile currentUser={currentUser} sites={sites} />
            )}
          </div>
        )}

        {/* =========================================
            OVERALL MANAGER VIEWS
            ========================================= */}
        {currentUser.role === 'Overall Manager' && (
          <div className="space-y-4">
            {activeTab === 'attendance' && (
              <AttendanceDetailsView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'pms_monitor' && (
              <ProgressMonitor
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'ot_sheet' && (
              <OTSheetView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'reports' && (
              <ReportsView currentUser={currentUser} sites={sites} />
            )}
            {activeTab === 'profile' && (
              <EmployeeProfile currentUser={currentUser} sites={sites} />
            )}
          </div>
        )}

        {/* =========================================
            EMPLOYEE VIEWS (Attendance, Progress, Profile only)
            ========================================= */}
        {currentUser.role === 'Employee' && (
          <div className="space-y-4">
            {/* 1. Folder 1: Attendance */}
            {activeTab === 'attendance' && (
              <EmployeeAttendance
                currentUser={currentUser}
                sites={sites}
                onRefresh={handleRefresh}
              />
            )}

            {/* 2. Folder 2: Progress / PMS */}
            {activeTab === 'progress' && (
              <div className="space-y-3">
                {/* Folder Sub-tabs: Update vs My Saved Progress */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 max-w-2xl mx-auto">
                  <button
                    type="button"
                    onClick={() => setEmployeeProgressSubTab('update')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      employeeProgressSubTab === 'update'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Progress Update Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeProgressSubTab('saved')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      employeeProgressSubTab === 'saved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    My Saved Progress
                  </button>
                </div>

                {employeeProgressSubTab === 'update' ? (
                  <EmployeeProgressUpdate
                    currentUser={currentUser}
                    sites={sites}
                    onSubmissionSuccess={() => setEmployeeProgressSubTab('saved')}
                  />
                ) : (
                  <MySavedProgress currentUser={currentUser} />
                )}
              </div>
            )}

            {/* 3. Folder 3: Profile */}
            {activeTab === 'profile' && (
              <EmployeeProfile currentUser={currentUser} sites={sites} />
            )}
          </div>
        )}
      </main>

      {/* Role-Based Bottom Navigation Bar with discreet small logout at bottom-left */}
      <BottomNav
        role={currentUser.role}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={handleLogout}
      />
    </div>
  );
}
