import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, ShieldCheck, Users, X, Mail, Hash, Calendar, Lock, Briefcase, Clock, ChevronRight, Key, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const DEPARTMENTS = [
  'QC & Microbiology & AD Lab',
  'Raw Material Warehouse',
  'Packing Material Warehouse',
  'Finished Good Material Warehouse',
  'Production',
  'Primary Packing Production',
  'Secondary Packing Production',
  'Post Production',
  'Facilities',
];

const SHIFTS = ['1', '2', '3'];

// ── Multi-select checkbox helpers ──────────────────────────────────────────────
const toggleItem = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

const arrToStr = (arr) => arr.length ? arr.join(',') : 'NONE';
const strToArr = (str) => (!str || str === 'NONE') ? [] : str.split(',').map(s => s.trim()).filter(Boolean);

// ── Reusable multi-checkbox components ────────────────────────────────────────
const ShiftCheckboxes = ({ selected, onChange }) => (
  <div className="flex gap-2">
    {SHIFTS.map(s => (
      <button
        key={s}
        type="button"
        onClick={() => onChange(toggleItem(selected, s))}
        className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
          selected.includes(s)
            ? 'bg-emerald-700 text-white shadow-md'
            : 'bg-emerald-50/50 border border-emerald-100 text-emerald-400 hover:text-emerald-700'
        }`}
      >
        {s}
      </button>
    ))}
  </div>
);

const DeptCheckboxes = ({ selected, onChange }) => (
  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
    {DEPARTMENTS.map(dept => (
      <label key={dept} className="flex items-center gap-3 cursor-pointer group">
        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 pointer-events-auto ${
          selected.includes(dept)
            ? 'bg-emerald-600 border-emerald-600'
            : 'border-emerald-200 group-hover:border-emerald-400'
        }`}>
          {selected.includes(dept) && <span className="text-white text-[10px] font-black">✓</span>}
        </span>
        <span className="text-xs font-semibold text-slate-700 leading-tight">{dept}</span>
      </label>
    ))}
  </div>
);

// ── User table row (shared by all 3 tables) ───────────────────────────────────
const UserRow = ({ u, showDeptShift, editData, onLocalChange, onSave }) => {
  const id = u._id;
  const selectedShifts = strToArr(editData[id]?.shift ?? u.shift ?? '');
  const selectedDepts  = strToArr(editData[id]?.dept ?? editData[id]?.department ?? u.department ?? '');

  return (
    <tr className="hover:bg-emerald-50/20 transition-colors">
      <td className="px-5 py-3 font-black text-emerald-950 text-xs uppercase whitespace-nowrap">{u.employeeId || '—'}</td>
      <td className="px-5 py-3 font-bold text-slate-700 text-xs whitespace-nowrap">{u.name}</td>
      <td className="px-5 py-3 text-[10px] text-emerald-500 font-bold whitespace-nowrap">{u.gmail}</td>

      {showDeptShift && (
        <>
          <td className="px-5 py-3 min-w-[220px]">
            <div className="space-y-1.5">
              {DEPARTMENTS.map(dept => (
                <label key={dept} className="flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all pointer-events-auto ${
                    selectedDepts.includes(dept) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200'
                  }`}>
                    {selectedDepts.includes(dept) && <span className="text-white text-[8px] font-black">✓</span>}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600 leading-tight">{dept}</span>
                </label>
              ))}
            </div>
            {/* hidden - apply on checkbox click */}
            <input type="hidden" onChange={() => {}} value={arrToStr(selectedDepts)} name="department" />
          </td>
          <td className="px-5 py-3">
            <div className="flex gap-1">
              {SHIFTS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const next = toggleItem(selectedShifts, s);
                    onLocalChange(id, 'shift', arrToStr(next));
                  }}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                    selectedShifts.includes(s)
                      ? 'bg-emerald-900 text-white'
                      : 'bg-white text-emerald-200 border border-emerald-100 hover:text-emerald-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </td>
        </>
      )}

      <td className="px-5 py-3">
        <div className="flex items-center bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 max-w-[140px]">
          <Key size={12} className="text-emerald-300 mr-2 flex-shrink-0" />
          <input
            type="password"
            placeholder="NEW PWD"
            className="bg-transparent border-none outline-none text-[10px] font-black w-full placeholder:text-emerald-200"
            value={editData[id]?.password || ''}
            onChange={e => onLocalChange(id, 'password', e.target.value)}
          />
        </div>
      </td>

      <td className="px-5 py-3 text-center">
        <button
          onClick={() => onSave(id, u.name, selectedDepts)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all flex items-center justify-center mx-auto shadow-md active:scale-95"
        >
          <Save size={16} />
        </button>
      </td>
    </tr>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', role: '' });

  const [formData, setFormData] = useState({
    name: '', dob: '', employeeId: '', gmail: '', password: '',
    selectedDepts: [],
    selectedShifts: [],
  });

  // User lists
  const [employees,   setEmployees]   = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [hods,        setHods]        = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [editData, setEditData]       = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const showNotify = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [empRes, supRes, hodRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users/all/employee'),
        axios.get('http://localhost:5000/api/users/all/supervisor'),
        axios.get('http://localhost:5000/api/users/all/hod'),
      ]);
      setEmployees(empRes.data);
      setSupervisors(supRes.data);
      setHods(hodRes.data);
    } catch (err) {
      showNotify('Failed to load user lists', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLocalChange = (id, field, value) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // For dept checkboxes in table — toggle and store
  const handleDeptToggle = (id, dept, currentSelected) => {
    const next = toggleItem(currentSelected, dept);
    handleLocalChange(id, 'department', arrToStr(next));
  };

  const handleRowSave = async (id, name, deptArr) => {
    const raw = editData[id];
    if (!raw) { showNotify('No changes to save', 'error'); return; }
    const updates = Object.fromEntries(Object.entries(raw).filter(([_, v]) => v !== ''));
    try {
      const res = await axios.put(`http://localhost:5000/api/users/update/${id}`, updates);
      if (res.data.success) {
        showNotify(`${name} updated!`, 'success');
        setEditData(prev => { const s = { ...prev }; delete s[id]; return s; });
        fetchAll();
      }
    } catch (err) {
      showNotify(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  const openModal = (title, role) => {
    setFormData({
      name: '', dob: '', employeeId: '', gmail: '', password: '',
      selectedDepts: role === 'hod' ? [] : [],
      selectedShifts: role === 'hod' ? [] : [],
    });
    setModalConfig({ isOpen: true, title, role });
  };

  const handleCreateUser = async () => {
    try {
      const token = JSON.parse(localStorage.getItem('userInfo'))?.token;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        name:       formData.name,
        dob:        formData.dob,
        employeeId: formData.employeeId,
        gmail:      formData.gmail,
        password:   formData.password,
        role:       modalConfig.role,
        department: arrToStr(formData.selectedDepts),
        shift:      modalConfig.role === 'hod' ? 'NONE' : arrToStr(formData.selectedShifts),
      };
      await axios.post('http://localhost:5000/api/users/register', payload, config);
      showNotify(`${modalConfig.role.toUpperCase()} registered successfully!`, 'success');
      setModalConfig({ ...modalConfig, isOpen: false });
      fetchAll();
    } catch (err) {
      showNotify('Error: ' + (err.response?.data?.message || 'Internal Server Error'), 'error');
    }
  };

  const TABLE_COL_HEADER = (showDeptShift) => (
    <tr className="bg-emerald-50/50 text-emerald-900 text-[10px] font-black uppercase tracking-widest border-b border-emerald-100">
      <th className="px-5 py-4">Emp ID</th>
      <th className="px-5 py-4">Name</th>
      <th className="px-5 py-4">Email</th>
      {showDeptShift && <>
        <th className="px-5 py-4">Department</th>
        <th className="px-5 py-4">Shift</th>
      </>}
      <th className="px-5 py-4">Password</th>
      <th className="px-5 py-4 text-center">Save</th>
    </tr>
  );

  const UserTable = ({ title, count, users, showDeptShift }) => (
    <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden mb-8">
      <div className="bg-emerald-900 p-5 text-white flex justify-between items-center">
        <h3 className="font-black uppercase text-xs tracking-widest">{title}</h3>
        <span className="bg-emerald-800 px-4 py-1 rounded-full text-[10px] font-bold">COUNT: {count}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>{TABLE_COL_HEADER(showDeptShift)}</thead>
          <tbody className="divide-y divide-emerald-50">
            {loadingUsers ? (
              <tr><td colSpan={showDeptShift ? 7 : 5} className="py-16 text-center font-black text-emerald-200 uppercase tracking-widest animate-pulse">Syncing...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={showDeptShift ? 7 : 5} className="py-12 text-center font-bold text-slate-200 uppercase tracking-widest">No records found</td></tr>
            ) : users.map(u => (
              <UserRow
                key={u._id}
                u={u}
                showDeptShift={showDeptShift}
                editData={editData}
                onLocalChange={handleLocalChange}
                onSave={handleRowSave}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-emerald-50/30 p-4 md:p-8 lg:p-12">

      {notification.show && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white ${
          notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-900'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-emerald-100 pb-6">
          <h1 className="text-3xl md:text-4xl font-black text-emerald-900 tracking-tighter uppercase">Administration</h1>
          <p className="text-emerald-600 font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs">Arcolab Management Portal</p>
        </header>

        {/* Register cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
          <AdminCard title="Manage HODs"  desc="Global access across all departments" icon={<ShieldCheck size={28}/>} color="bg-emerald-700" onClick={() => openModal('Register HOD', 'hod')} />
          <AdminCard title="Supervisors"  desc="Shift & floor-level tracking"         icon={<UserPlus size={28}/>}  color="bg-emerald-900" onClick={() => openModal('Register Supervisor', 'supervisor')} />
          <AdminCard title="Employees"    desc="General staff members"                icon={<Users size={28}/>}    color="bg-green-500"  onClick={() => openModal('Register Employee', 'employee')} />
        </div>

        {/* 3 User listing tables */}
        <UserTable title="Active HODs"        count={hods.length}        users={hods}        showDeptShift={true} />
        <UserTable title="Active Supervisors" count={supervisors.length} users={supervisors} showDeptShift={true} />
        <UserTable title="Active Employees"   count={employees.length}   users={employees}   showDeptShift={false} />
      </div>

      {/* Register Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white shrink-0">
              <h3 className="text-lg font-black uppercase tracking-widest">{modalConfig.title}</h3>
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="hover:bg-emerald-800 p-2 rounded-full transition-colors"><X size={24} /></button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-5">
              {/* Basic fields */}
              {[
                { icon: <UserPlus />, name: 'name',       placeholder: 'Full Name',      type: 'text',     fullWidth: true },
                { icon: <Calendar />, name: 'dob',        placeholder: '',               type: 'date' },
                { icon: <Hash />,     name: 'employeeId', placeholder: 'Emp ID',         type: 'text' },
                { icon: <Mail />,     name: 'gmail',      placeholder: 'Gmail Address',  type: 'email',    fullWidth: true },
                { icon: <Lock />,     name: 'password',   placeholder: 'Set Password',   type: 'password', fullWidth: true },
              ].map((field, idx) => (
                <div key={idx} className={`relative ${field.fullWidth ? '' : 'grid grid-cols-2 gap-4'}`}>
                  {!field.fullWidth && idx > 0 && idx === 1 ? null : null}
                  <div className={`relative ${field.fullWidth ? '' : ''}`}>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">{React.cloneElement(field.icon, { size: 20 })}</div>
                    <input
                      name={field.name} type={field.type}
                      value={formData[field.name] || ''}
                      placeholder={field.placeholder}
                      onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                      style={{ paddingLeft: '50px' }}
                      className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                  </div>
                </div>
              ))}

              {/* Date + EmpID side by side */}
              <div className="grid grid-cols-2 gap-4 -mt-3">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600"><Calendar size={20} /></div>
                  <input type="date" value={formData.dob || ''} onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))} style={{ paddingLeft: '50px' }} className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-sm font-semibold" />
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600"><Hash size={20} /></div>
                  <input type="text" placeholder="Emp ID" value={formData.employeeId || ''} onChange={e => setFormData(p => ({ ...p, employeeId: e.target.value }))} style={{ paddingLeft: '50px' }} className="w-full py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none text-sm font-semibold" />
                </div>
              </div>

              {/* Shift multi-select (not for HOD employee) */}
              {modalConfig.role !== 'employee' && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-emerald-600" />
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Shift Assignment</span>
                  </div>
                  <ShiftCheckboxes
                    selected={formData.selectedShifts}
                    onChange={val => setFormData(p => ({ ...p, selectedShifts: val }))}
                  />
                </div>
              )}

              {/* Department multi-select */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={16} className="text-emerald-600" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Department(s)</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                  <DeptCheckboxes
                    selected={formData.selectedDepts}
                    onChange={val => setFormData(p => ({ ...p, selectedDepts: val }))}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateUser}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl mt-2 uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Confirm Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminCard = ({ title, desc, icon, color, onClick }) => (
  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-emerald-100 hover:shadow-xl transition-all group cursor-pointer flex flex-col justify-between" onClick={onClick}>
    <div>
      <div className={`w-12 h-12 md:w-14 md:h-14 ${color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>{icon}</div>
      <h2 className="text-lg md:text-xl font-black text-emerald-950 mb-2 uppercase tracking-tighter">{title}</h2>
      <p className="text-emerald-600/70 mb-6 text-[10px] md:text-xs font-bold leading-relaxed">{desc}</p>
    </div>
    <div className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">Launch Form <ChevronRight size={14} /></div>
  </div>
);

export default SuperAdminDashboard;
