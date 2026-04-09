import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, UserPlus, X, Save, Key, AlertCircle, CheckCircle2,
  ChevronRight, Mail, Calendar, Hash, User, Users, ShieldCheck
} from 'lucide-react';
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

const toggleItem = (arr, val) =>
  arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

const arrToStr = (arr) => (Array.isArray(arr) && arr.length) ? arr.join(',') : 'NONE';
const strToArr = (str) => (!str || str === 'NONE') ? [] : str.split(',').map(s => s.trim()).filter(Boolean);

// ── Shift toggle buttons (multi-select) ───────────────────────────────────────
const ShiftToggle = ({ value, onToggle }) => {
  const selected = strToArr(value);
  return (
    <div className="flex gap-1">
      {SHIFTS.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onToggle(arrToStr(toggleItem(selected, s)))}
          className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
            selected.includes(s)
              ? 'bg-emerald-900 text-white'
              : 'bg-white text-emerald-200 border border-emerald-100 hover:text-emerald-500'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
};

// ── Dept multi-checkbox in table cell ────────────────────────────────────────
const DeptCell = ({ value, onChange }) => {
  const selected = strToArr(value);
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-left bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-emerald-900 max-w-[180px] truncate"
      >
        {selected.length ? selected.join(', ') : 'None assigned'}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[240px] max-h-64 overflow-y-auto">
          {DEPARTMENTS.map(dept => (
            <label key={dept} className="flex items-center gap-2 py-1.5 cursor-pointer group">
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                selected.includes(dept) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-200 group-hover:border-emerald-400'
              }`}>
                {selected.includes(dept) && <span className="text-white text-[8px] font-black">✓</span>}
              </span>
              <span className="text-[10px] font-medium text-slate-700">{dept}</span>
            </label>
          ))}
          <button onClick={() => { onChange(arrToStr(selected)); setOpen(false); }}
            className="w-full mt-2 bg-emerald-600 text-white text-[10px] font-black py-1.5 rounded-lg">
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

// ── Generic user table ────────────────────────────────────────────────────────
const UserTable = ({ title, icon, count, users, loading, showDeptShift, editData, onLocalChange, onSave }) => (
  <div className="bg-white rounded-[2rem] shadow-xl border border-emerald-50 overflow-hidden mb-8">
    <div className="bg-emerald-900 p-6 text-white flex justify-between items-center">
      <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">{icon} {title}</h3>
      <span className="bg-emerald-800 px-4 py-1 rounded-full text-[10px] font-bold">COUNT: {count}</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-emerald-50/50 text-emerald-900 text-[10px] font-black uppercase tracking-widest border-b border-emerald-100">
            <th className="px-6 py-5">Emp ID</th>
            <th className="px-6 py-5">Name</th>
            <th className="px-6 py-5">Email</th>
            {showDeptShift && <>
              <th className="px-6 py-5">Department</th>
              <th className="px-6 py-5">Shift</th>
            </>}
            <th className="px-6 py-5">Password</th>
            <th className="px-6 py-5 text-center">Save</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-50">
          {loading ? (
            <tr><td colSpan={showDeptShift ? 7 : 5} className="py-20 text-center font-black text-emerald-200 uppercase tracking-widest animate-pulse">Syncing Database...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={showDeptShift ? 7 : 5} className="py-12 text-center font-bold text-slate-200 uppercase tracking-widest">No records found</td></tr>
          ) : users.map(u => {
            const id = u._id;
            const shiftVal = editData[id]?.shift ?? u.shift ?? 'NONE';
            const deptVal  = editData[id]?.department ?? u.department ?? 'NONE';
            return (
              <tr key={id} className="hover:bg-emerald-50/20 transition-colors">
                <td className="px-6 py-4 font-black text-emerald-950 text-xs uppercase whitespace-nowrap">{u.employeeId || '—'}</td>
                <td className="px-6 py-4 font-bold text-slate-700 text-sm whitespace-nowrap">{u.name}</td>
                <td className="px-6 py-4 text-[10px] text-emerald-500 font-bold whitespace-nowrap">{u.gmail}</td>

                {showDeptShift && <>
                  <td className="px-6 py-4">
                    <DeptCell
                      value={deptVal}
                      onChange={val => onLocalChange(id, 'department', val)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <ShiftToggle
                      value={shiftVal}
                      onToggle={val => onLocalChange(id, 'shift', val)}
                    />
                  </td>
                </>}

                <td className="px-6 py-4">
                  <div className="flex items-center bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100 max-w-[140px]">
                    <Key size={12} className="text-emerald-300 mr-2 flex-shrink-0" />
                    <input
                      type="password" placeholder="NEW PWD"
                      className="bg-transparent border-none outline-none text-[10px] font-black w-full placeholder:text-emerald-200"
                      value={editData[id]?.password || ''}
                      onChange={e => onLocalChange(id, 'password', e.target.value)}
                    />
                  </div>
                </td>

                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onSave(id, u.name)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-all flex items-center justify-center mx-auto shadow-md active:scale-95"
                  >
                    <Save size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const HodDashboard = () => {
  const user = JSON.parse(localStorage.getItem('userInfo'));

  const [supervisors, setSupervisors] = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [hods,        setHods]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [editData,       setEditData]       = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification,   setNotification]   = useState({ show: false, message: '', type: '' });

  const [newSv, setNewSv] = useState({
    name: '', dob: '', employeeId: '', gmail: '', password: '',
    selectedDepts: [], selectedShifts: [],
    role: 'supervisor'
  });

  const showNotify = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [supRes, empRes, hodRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users/all/supervisor'),
        axios.get('http://localhost:5000/api/users/all/employee'),
        axios.get('http://localhost:5000/api/users/all/hod'),
      ]);
      setSupervisors(supRes.data);
      setEmployees(empRes.data);
      setHods(hodRes.data);
    } catch (err) {
      showNotify('Connection Error', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLocalChange = (id, field, value) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleRowUpdate = async (id, name) => {
    const rawUpdates = editData[id];
    if (!rawUpdates) { showNotify('No changes to update', 'error'); return; }
    const updates = Object.fromEntries(Object.entries(rawUpdates).filter(([_, v]) => v !== ''));
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

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users/register', {
        name:       newSv.name,
        dob:        newSv.dob,
        employeeId: newSv.employeeId,
        gmail:      newSv.gmail,
        password:   newSv.password,
        role:       newSv.role,
        department: arrToStr(newSv.selectedDepts),
        shift:      arrToStr(newSv.selectedShifts),
      });
      showNotify(`${newSv.role === 'supervisor' ? 'Supervisor' : 'Employee'} registered successfully`, 'success');
      setIsAddModalOpen(false);
      setNewSv({ name: '', dob: '', employeeId: '', gmail: '', password: '', selectedDepts: [], selectedShifts: [], role: 'supervisor' });
      fetchAll();
    } catch (err) {
      showNotify(err.response?.data?.message || 'Registration Failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FDFB] p-4 md:p-10 font-sans">

      {notification.show && (
        <div className={`fixed top-6 right-6 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white ${
          notification.type === 'error' ? 'bg-red-600' : 'bg-emerald-900'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}

      <header className="mb-10">
        <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-tighter">Global Monitor</h1>
        <p className="text-emerald-600 font-bold text-xs uppercase opacity-70 tracking-[0.2em]">HOD Console: {user?.name}</p>
      </header>

      {/* Add Supervisor card */}
      <div className="mb-12">
        <div
          className="bg-white border border-emerald-100 rounded-[2rem] p-8 w-full max-w-sm shadow-sm hover:shadow-xl transition-all group cursor-pointer"
          onClick={() => setIsAddModalOpen(true)}
        >
          <div className="bg-emerald-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform">
            <UserPlus size={28} />
          </div>
          <h2 className="text-2xl font-black text-emerald-950 uppercase mb-1">Add Supervisor</h2>
          <p className="text-emerald-400 font-bold text-[10px] mb-8 uppercase tracking-widest">Register new staff members</p>
          <button className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
            Launch Form <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── 3 Tables ── */}
      <UserTable
        title="Active HODs"
        icon={<ShieldCheck size={16} />}
        count={hods.length}
        users={hods}
        loading={loading}
        showDeptShift={true}
        editData={editData}
        onLocalChange={handleLocalChange}
        onSave={handleRowUpdate}
      />
      <UserTable
        title="Active Supervisors"
        icon={<Briefcase size={16} />}
        count={supervisors.length}
        users={supervisors}
        loading={loading}
        showDeptShift={true}
        editData={editData}
        onLocalChange={handleLocalChange}
        onSave={handleRowUpdate}
      />
      <UserTable
        title="Active Employees"
        icon={<Users size={16} />}
        count={employees.length}
        users={employees}
        loading={loading}
        showDeptShift={false}
        editData={editData}
        onLocalChange={handleLocalChange}
        onSave={handleRowUpdate}
      />

      {/* Add Supervisor / Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/70 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 max-h-[90vh] flex flex-col">
            <div className="bg-emerald-900 p-8 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="font-black uppercase tracking-[0.2em] text-sm">New Staff Member</h2>
                <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">Personnel Registration</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:rotate-90 transition-transform"><X size={24} /></button>
            </div>

            <form onSubmit={handleRegister} className="p-8 space-y-5 overflow-y-auto">
              {/* Role toggle */}
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                {[{ val: 'supervisor', label: 'Supervisor' }, { val: 'employee', label: 'Employee' }].map(({ val, label }) => (
                  <button
                    key={val} type="button"
                    onClick={() => setNewSv(s => ({ ...s, role: val }))}
                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      newSv.role === val ? 'bg-emerald-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Name */}
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="text" placeholder="FULL NAME"
                  className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all uppercase"
                  value={newSv.name} onChange={e => setNewSv(s => ({ ...s, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center bg-[#F5FBF9] rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-emerald-500 transition-all">
                  <Calendar className="text-emerald-300 mr-3" size={18} />
                  <input required type="date" className="bg-transparent font-bold text-[10px] outline-none w-full"
                    value={newSv.dob} onChange={e => setNewSv(s => ({ ...s, dob: e.target.value }))} />
                </div>
                <div className="flex items-center bg-[#F5FBF9] rounded-2xl px-4 py-4 border-2 border-transparent focus-within:border-emerald-500 transition-all">
                  <Hash className="text-emerald-300 mr-3" size={18} />
                  <input required type="text" placeholder="EMP ID"
                    className="bg-transparent font-bold text-[10px] outline-none w-full uppercase"
                    value={newSv.employeeId} onChange={e => setNewSv(s => ({ ...s, employeeId: e.target.value }))} />
                </div>
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="email" placeholder="GMAIL ADDRESS"
                  className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all lowercase"
                  value={newSv.gmail} onChange={e => setNewSv(s => ({ ...s, gmail: e.target.value }))} />
              </div>

              <div className="relative group">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 group-focus-within:text-emerald-600" size={18} />
                <input required type="password" placeholder="SECURITY KEY"
                  className="w-full bg-[#F5FBF9] border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 font-bold text-xs outline-none transition-all"
                  value={newSv.password} onChange={e => setNewSv(s => ({ ...s, password: e.target.value }))} />
              </div>

              {/* Shift multi-select */}
              <div className="bg-emerald-50 rounded-2xl px-5 py-4">
                <label className="block text-[8px] font-black text-emerald-900 uppercase mb-2 opacity-60">Shift Assignment (select all that apply)</label>
                <div className="flex gap-2">
                  {SHIFTS.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => setNewSv(sv => ({ ...sv, selectedShifts: toggleItem(sv.selectedShifts, s) }))}
                      className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                        newSv.selectedShifts.includes(s)
                          ? 'bg-emerald-700 text-white shadow-md'
                          : 'bg-white text-emerald-300 border border-emerald-200 hover:text-emerald-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department multi-select */}
              <div className="bg-emerald-50 rounded-2xl px-5 py-4">
                <label className="block text-[8px] font-black text-emerald-900 uppercase mb-3 opacity-60">Department(s) (select all that apply)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {DEPARTMENTS.map(dept => (
                    <label key={dept} className="flex items-center gap-3 cursor-pointer group">
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        newSv.selectedDepts.includes(dept)
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-emerald-300 group-hover:border-emerald-500'
                      }`}>
                        {newSv.selectedDepts.includes(dept) && <span className="text-white text-[10px] font-black">✓</span>}
                      </span>
                      <span className="text-xs font-semibold text-emerald-800 leading-tight">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit"
                className="w-full bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-900/20">
                Verify & Save Member
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;
