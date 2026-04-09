import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Clock, X, Briefcase, Mail, Lock, Edit3,
  CheckCircle, AlertCircle, Lightbulb, Users, Download,
  ChevronDown, ChevronUp, Search
} from 'lucide-react';
import axios from 'axios';
import { parseCSV } from '../utils/parseCSV';

const TABS = ['Supervisors', 'Ideation'];

const BENEFIT_COLORS = {
  Safety:   'bg-orange-100 text-orange-700',
  Quality:  'bg-blue-100 text-blue-700',
  Cost:     'bg-purple-100 text-purple-700',
  Delivery: 'bg-yellow-100 text-yellow-700',
  Morale:   'bg-pink-100 text-pink-700',
};

const API = 'http://localhost:5000/api';

const HodDashboard = () => {
  const user      = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const dept      = user?.department || 'ALL';

  const [activeTab, setActiveTab] = useState('Supervisors');

  // ── Toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showPopup = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // ── Supervisors ────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [supervisors, setSupervisors]         = useState([]);
  const [loadingSup, setLoadingSup]           = useState(true);
  const [editingId, setEditingId]             = useState(null);

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

  const toggleItem = (arr, val) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const arrToStr = (arr) => arr.length ? arr.join(',') : 'NONE';

  const [formData, setFormData] = useState({
    name: '', dob: '', employeeId: '', gmail: '', password: '',
    department: '', role: 'supervisor', shift: '1', selectedDepts: []
  });
  const [editData, setEditData] = useState({ name: '', shift: '', password: '', gmail: '', department: '' });

  const fetchSupervisors = async () => {
    try {
      const { data } = await axios.get(`${API}/users/supervisors/${dept}`);
      setSupervisors(data);
    } catch (err) { console.error(err); } finally { setLoadingSup(false); }
  };

  useEffect(() => { fetchSupervisors(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleDeptToggle = (dept) => {
    const next = toggleItem(formData.selectedDepts, dept);
    setFormData(prev => ({ ...prev, selectedDepts: next }));
  };

  const handleCreateSupervisor = async () => {
    if (!formData.name || !formData.gmail || !formData.password || !formData.employeeId || formData.selectedDepts.length === 0) {
      return showPopup('Please fill all required fields including departments.', 'error');
    }
    try {
      const payload = { ...formData, department: arrToStr(formData.selectedDepts) };
      await axios.post(`${API}/users/register`, payload);
      showPopup(`${formData.name} registered!`, 'success');
      setIsModalOpen(false);
      fetchSupervisors();
      setFormData({ name: '', dob: '', employeeId: '', gmail: '', password: '', department: '', role: 'supervisor', shift: '1', selectedDepts: [] });
    } catch (err) {
      showPopup(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  const handleEditClick = (sv) => {
    setEditingId(sv._id);
    setEditData({ name: sv.name, shift: sv.shift, password: '', gmail: sv.gmail });
    setIsEditModalOpen(true);
  };

  const handleUpdateSupervisor = async () => {
    try {
      await axios.put(`${API}/users/update/${editingId}`, editData);
      showPopup('Supervisor updated!', 'success');
      setIsEditModalOpen(false);
      fetchSupervisors();
    } catch (err) {
      showPopup(err.response?.data?.message || 'Update failed', 'error');
    }
  };

  // ── Ideation ────────────────────────────────────────────────────
  const [ideas, setIdeas]             = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [ideaError, setIdeaError]     = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterBenefit, setFilterBenefit] = useState('All');
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (activeTab !== 'Ideation') return;
    setLoadingIdeas(true);
    setIdeaError(false);

    fetch(`${API}/ideation/config`)
      .then(r => r.json())
      .then(cfg => fetch(cfg.sheetCsvUrl))
      .then(r => r.text())
      .then(csv => setIdeas(parseCSV(csv)))
      .catch(() => setIdeaError(true))
      .finally(() => setLoadingIdeas(false));
  }, [activeTab]);

  const filteredIdeas = useMemo(() => {
    return ideas.filter(row => {
      const deptMatch   = dept === 'ALL' || row.department?.toLowerCase().includes(dept.toLowerCase());
      const searchMatch = !searchTerm ||
        row.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.problem?.toLowerCase().includes(searchTerm.toLowerCase());
      const benefitMatch = filterBenefit === 'All' || (row.benefits || '').includes(filterBenefit);
      return deptMatch && searchMatch && benefitMatch;
    });
  }, [ideas, searchTerm, filterBenefit, dept]);

  const handleDownloadCSV = () => {
    const header = ['Timestamp','Employee ID','Problem Statement','Proposed Solution','Expected Benefit','Area / Department'];
    const rows   = filteredIdeas.map(r =>
      [r.timestamp, r.empId, r.problem, r.solution, r.benefits, r.department]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Ideation_${dept}_${new Date().toLocaleDateString('en-GB').replace(/\//g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-emerald-50/30 p-4 md:p-8">

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border
          ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'}`}>
          {toast.type === 'success' ? <CheckCircle className="text-emerald-500" size={20}/> : <AlertCircle className="text-red-500" size={20}/>}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 border-b border-emerald-100 pb-4">
        <h1 className="text-3xl font-black text-emerald-900 uppercase">{dept} Dept Portal</h1>
        <p className="text-emerald-600 font-bold uppercase text-xs">Welcome, {user?.role?.toUpperCase()} — {user?.name}</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-emerald-100/50 p-1 rounded-2xl w-fit mb-8">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all
              ${activeTab === tab ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-200/50'}`}>
            {tab === 'Supervisors' ? <Users size={14} /> : <Lightbulb size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── SUPERVISORS TAB ── */}
      {activeTab === 'Supervisors' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div onClick={() => setIsModalOpen(true)}
              className="bg-white p-8 rounded-3xl shadow-lg border border-emerald-100 hover:scale-[1.02] transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-emerald-800 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:rotate-12 transition-transform">
                <UserPlus />
              </div>
              <h2 className="text-xl font-black text-emerald-900 uppercase">Add Supervisor</h2>
              <p className="text-emerald-600 text-xs font-bold mt-1">Register new team member</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
            <div className="bg-emerald-900 p-6 flex justify-between items-center text-white">
              <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Briefcase size={18} /> Active Supervisors
              </h2>
              <span className="bg-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                Total: {supervisors.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-emerald-50/50 text-emerald-900 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Shift</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {loadingSup ? (
                    <tr><td colSpan="5" className="p-10 text-center animate-pulse text-emerald-300 font-bold uppercase text-xs tracking-widest">Fetching...</td></tr>
                  ) : supervisors.length === 0 ? (
                    <tr><td colSpan="5" className="p-10 text-center text-slate-300 font-bold uppercase text-xs">No supervisors found</td></tr>
                  ) : supervisors.map(sv => (
                    <tr key={sv._id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-emerald-700 text-sm">#{sv.employeeId}</td>
                      <td className="px-6 py-4 font-black text-emerald-950 uppercase text-sm">{sv.name}</td>
                      <td className="px-6 py-4 text-emerald-700 font-bold text-xs uppercase">
                        <Clock size={14} className="inline mr-1" /> Shift {sv.shift}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">{sv.gmail}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEditClick(sv)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-800 hover:text-white transition-all">
                          <Edit3 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── IDEATION TAB ── */}
      {activeTab === 'Ideation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['All', 'Safety', 'Quality', 'Cost'].map(benefit => {
              const count = benefit === 'All'
                ? filteredIdeas.length
                : filteredIdeas.filter(r => r.benefits?.includes(benefit)).length;
              return (
                <div key={benefit} className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{benefit === 'All' ? 'Total Ideas' : benefit}</p>
                  <p className="text-3xl font-black text-emerald-800 mt-1">{count}</p>
                </div>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by Employee ID or problem..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <select value={filterBenefit} onChange={e => setFilterBenefit(e.target.value)}
              className="px-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm font-black text-slate-600 outline-none min-w-[160px]">
              <option value="All">All Benefits</option>
              {['Safety','Quality','Cost','Delivery','Morale'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <button onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap">
              <Download size={16} /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
            <div className="bg-emerald-900 p-5 flex justify-between items-center text-white">
              <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Lightbulb size={18} /> Idea Submissions — {dept}
              </h2>
              <span className="bg-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                {filteredIdeas.length} record{filteredIdeas.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingIdeas ? (
              <div className="p-16 text-center animate-pulse text-emerald-300 font-black uppercase text-xs tracking-widest">Loading submissions...</div>
            ) : ideaError ? (
              <div className="p-16 text-center text-red-400 font-black uppercase text-xs tracking-widest">Could not load data. Check Google Sheet CSV URL configuration.</div>
            ) : filteredIdeas.length === 0 ? (
              <div className="p-16 text-center text-slate-300 font-black uppercase text-xs italic">No submissions found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-emerald-50/50 text-emerald-900 uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="px-5 py-4">Timestamp</th>
                      <th className="px-5 py-4">Emp ID</th>
                      <th className="px-5 py-4">Problem</th>
                      <th className="px-5 py-4">Benefits</th>
                      <th className="px-5 py-4">Area</th>
                      <th className="px-5 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {filteredIdeas.map((row, i) => (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}>
                          <td className="px-5 py-4 text-xs text-slate-400 font-bold whitespace-nowrap">{row.timestamp}</td>
                          <td className="px-5 py-4 font-black text-emerald-700 text-sm">{row.empId}</td>
                          <td className="px-5 py-4 text-xs text-slate-600 font-medium max-w-[220px] truncate">{row.problem}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(row.benefits || '').split(',').filter(Boolean).map(b => (
                                <span key={b} className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${BENEFIT_COLORS[b.trim()] || 'bg-slate-100 text-slate-600'}`}>
                                  {b.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-500">{row.department}</td>
                          <td className="px-5 py-4 text-slate-300">
                            {expandedRow === i ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                          </td>
                        </tr>
                        {expandedRow === i && (
                          <tr className="bg-emerald-50/30">
                            <td colSpan="6" className="px-6 py-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1">
                                  <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Problem Statement</p>
                                  <p className="text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-emerald-100">{row.problem}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Proposed Solution</p>
                                  <p className="text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-emerald-100">{row.solution}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ADD SUPERVISOR MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-emerald-900 p-6 flex justify-between text-white shrink-0">
              <span className="font-black uppercase tracking-widest">Register Supervisor</span>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform"><X /></button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto space-y-4">
              <Field label="Full Name"><input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className={inputCls}/></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth"><input name="dob" type="date" value={formData.dob} onChange={handleChange} className={inputCls}/></Field>
                <Field label="Employee ID"><input name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="EMP-001" className={inputCls}/></Field>
              </div>
              <Field label="Gmail"><input name="gmail" type="email" value={formData.gmail} onChange={handleChange} placeholder="name@gmail.com" className={inputCls}/></Field>
              <Field label="Password"><input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" className={inputCls}/></Field>
              <Field label="Shift">
                <select name="shift" value={formData.shift} onChange={handleChange} className={inputCls}>
                  <option value="1">Shift 1</option>
                  <option value="2">Shift 2</option>
                  <option value="3">Shift 3</option>
                </select>
              </Field>
              <Field label="Department(s)">
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {DEPARTMENTS.map(dept => (
                    <label key={dept} className="flex items-center gap-3 cursor-pointer group">
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                        formData.selectedDepts.includes(dept)
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'border-emerald-200 group-hover:border-emerald-400'
                      }`}>
                        {formData.selectedDepts.includes(dept) && <span className="text-white text-[10px] font-black">✓</span>}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 leading-tight">{dept}</span>
                    </label>
                  ))}
                </div>
                <input type="hidden" value={arrToStr(formData.selectedDepts)} name="department" readOnly />
              </Field>
              <button onClick={handleCreateSupervisor} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg transition-all active:scale-95">
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT SUPERVISOR MODAL ── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-emerald-800 p-6 flex justify-between text-white">
              <span className="font-black uppercase tracking-widest text-xs">Update Supervisor</span>
              <button onClick={() => setIsEditModalOpen(false)}><X /></button>
            </div>
            <div className="p-8 space-y-4">
              <Field label="Full Name"><input value={editData.name} onChange={e=>setEditData({...editData, name: e.target.value})} className={inputCls}/></Field>
              <Field label="Gmail"><input type="email" value={editData.gmail} onChange={e=>setEditData({...editData, gmail: e.target.value})} className={inputCls}/></Field>
              <Field label="Shift">
                <select value={editData.shift} onChange={e=>setEditData({...editData, shift: e.target.value})} className={inputCls}>
                  <option value="1">Shift 1</option><option value="2">Shift 2</option><option value="3">Shift 3</option>
                </select>
              </Field>
              <Field label="New Password (leave blank to keep current)">
                <input type="password" placeholder="••••••" onChange={e=>setEditData({...editData, password: e.target.value})} className={inputCls}/>
              </Field>
              <button onClick={handleUpdateSupervisor} className="w-full bg-emerald-800 text-white font-black py-4 rounded-xl uppercase tracking-widest hover:bg-emerald-900 transition-all shadow-xl active:scale-95">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const inputCls = 'w-full bg-emerald-50 border-2 border-emerald-100 rounded-xl p-3.5 text-sm font-medium outline-none focus:border-emerald-400 focus:bg-white transition-all';

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

export default HodDashboard;