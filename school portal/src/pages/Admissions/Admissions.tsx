import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { ADMISSIONS_API } from '../../services/schoolModulesAPI';
import { classesAPI } from '../../services/api';

interface AdmissionForm {
    id: string;
    studentName: string;
    dateOfBirth: string;
    gender: string;
    class: string;
    parentName: string;
    parentRelation: string;
    contact: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    previousSchool: string;
    status: 'pending' | 'approved' | 'rejected';
}

const Admissions: React.FC = () => {
    const navigate = useNavigate();
    const [applications, setApplications] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newApplication, setNewApplication] = useState<Partial<AdmissionForm>>({});
    const [classes, setClasses] = useState<Array<{ _id: string; name?: string; className?: string }>>([]);
    const [saving, setSaving] = useState(false);

    const fetchApplications = async () => {
        try {
            const res = await ADMISSIONS_API.getApplications();
            const items = Array.isArray(res) ? res : (res.data || []);
            setApplications(items);
        } catch (err: any) {
            console.error('Failed to fetch applications', err);
            toast.error('Failed to load applications');
        }
    };

    useEffect(() => {
        fetchApplications();
        classesAPI.getAll().then((result: any) => setClasses(Array.isArray(result) ? result : result?.data || []))
            .catch(() => toast.error('Failed to load classes'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newApplication.studentName?.trim() || !newApplication.parentName?.trim() || !newApplication.contact?.trim() || !newApplication.email?.trim() || !newApplication.dateOfBirth || !newApplication.gender || !newApplication.class || !newApplication.address?.trim() || !newApplication.city?.trim() || !newApplication.state?.trim() || !newApplication.pincode?.trim()) {
            toast.error('Please fill all required fields');
            return;
        }
        if (new Date(newApplication.dateOfBirth).getTime() > Date.now()) { toast.error('Date of birth cannot be in the future'); return; }
        if (!/^\+?[\d\s-]{7,15}$/.test(newApplication.contact)) { toast.error('Enter a valid contact number'); return; }
        if (!/^\d{4,10}$/.test(newApplication.pincode)) { toast.error('Enter a valid postal code'); return; }
        setSaving(true);
        try {
            const payload = {
                studentName: newApplication.studentName.trim(),
                dateOfBirth: newApplication.dateOfBirth,
                gender: newApplication.gender,
                classApplied: newApplication.class,
                academicYear: new Date().getFullYear().toString(),
                parentDetails: {
                    name: newApplication.parentName.trim(),
                    relation: newApplication.parentRelation || 'father',
                    contact: newApplication.contact,
                    email: newApplication.email.trim().toLowerCase()
                },
                address: {
                    street: newApplication.address.trim(),
                    city: newApplication.city.trim(),
                    state: newApplication.state.trim(),
                    pincode: newApplication.pincode.trim()
                },
                previousSchool: {
                    name: newApplication.previousSchool || ''
                }
            } as any;
            await ADMISSIONS_API.submitApplication(payload);
            toast.success('Application submitted');
            setShowForm(false);
            setNewApplication({});
            fetchApplications();
        } catch (err: any) {
            console.error('Failed to submit application', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to submit';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
        try {
            await ADMISSIONS_API.updateStatus(id, status);
            setApplications(applications.map(app => (app._id || app.id) === id ? { ...app, status } : app));
            toast.success('Status updated');
        } catch (err: any) {
            console.error('Failed to update status', err);
            toast.error(err.message || 'Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <main className="max-w-7xl mx-auto space-y-7 pb-10">
            <div className="relative overflow-hidden rounded-[28px] border border-[#dfe5f1] bg-[#1e376b] px-6 py-7 text-white shadow-[0_20px_50px_#243d711f] md:px-9 md:py-9">
                <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[34px] border-[#f57a321f]" aria-hidden="true" />
                <div className="relative mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.18em] text-[#ffaf70]"><span className="h-2 w-2 rounded-full bg-[#ff893f]" />Student journey / intake</div>
                <div className="relative flex flex-wrap items-end justify-between gap-6">
                  <div><h1 className="font-['Manrope'] text-3xl font-extrabold tracking-[-.05em] md:text-[40px]">Admissions</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#d9e3f5]">Review applications, update decisions and move approved students into enrollment.</p></div>
                <button
                    onClick={() => setShowForm(true)}
                    className="rounded-xl bg-[#f57a32] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#121f442f] hover:bg-[#e76922] focus-visible:ring-2 focus-visible:ring-white"
                >
                    + New application
                </button>
                </div>
            </div>

            {showForm && (
                <div className="rounded-[24px] border border-[#e1e7f1] bg-white p-5 shadow-[0_16px_50px_#2038630b] md:p-8">
                    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ed772f]">Start here</p><h2 className="mt-1 font-['Manrope'] text-2xl font-extrabold tracking-[-.04em] text-[#1d3565]">New application</h2><p className="mt-1 text-sm text-[#697892]">Fields marked as required must be completed before submission.</p></div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <div>
                                <label className="block mb-1">Student Name</label>
                                <input
                                    type="text"
                                    value={newApplication.studentName || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, studentName: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={newApplication.dateOfBirth || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, dateOfBirth: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Gender</label>
                                <select
                                    value={newApplication.gender || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, gender: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1">Class Applying For</label>
                                <select value={newApplication.class || ''} onChange={(e) => setNewApplication({ ...newApplication, class: e.target.value })} className="w-full border rounded-md p-2" required>
                                    <option value="">Select class</option>
                                    {classes.map(item => <option key={item._id} value={item._id}>{item.name || item.className || 'Class'}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1">Parent/Guardian Name</label>
                                <input
                                    type="text"
                                    value={newApplication.parentName || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, parentName: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Relation</label>
                                <select
                                    value={newApplication.parentRelation || 'father'}
                                    onChange={(e) => setNewApplication({ ...newApplication, parentRelation: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                >
                                    <option value="father">Father</option>
                                    <option value="mother">Mother</option>
                                    <option value="guardian">Guardian</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1">Contact Number</label>
                                <input
                                    type="tel"
                                    value={newApplication.contact || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, contact: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newApplication.email || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, email: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-1">Previous School</label>
                                <input
                                    type="text"
                                    value={newApplication.previousSchool || ''}
                                    onChange={(e) => setNewApplication({ ...newApplication, previousSchool: e.target.value })}
                                    className="w-full border rounded-md p-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1">Address</label>
                            <textarea
                                value={newApplication.address || ''}
                                onChange={(e) => setNewApplication({ ...newApplication, address: e.target.value })}
                                className="w-full border rounded-md p-2"
                                rows={3}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(['city', 'state', 'pincode'] as const).map(name => <label key={name} className="block text-sm font-medium text-gray-700">{name === 'pincode' ? 'Postal code' : name[0].toUpperCase() + name.slice(1)}<input type="text" value={newApplication[name] || ''} onChange={event => setNewApplication(previous => ({ ...previous, [name]: event.target.value }))} className="mt-1 w-full border rounded-md p-2" required /></label>)}
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || classes.length === 0}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md"
                            >
                                {saving ? 'Submitting…' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ed772f]">Application queue</p><h2 className="font-['Manrope'] text-2xl font-extrabold tracking-[-.04em] text-[#1d3565]">Recent applications</h2></div><span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#3a527d] shadow-sm">{applications.length} total</span></div>
                {applications.length === 0 && <div className="rounded-2xl border border-dashed border-[#cdd8e9] bg-white p-9 text-center text-[#6b7890]">No applications yet. Start with a new application.</div>}
                {applications.map((application) => (
                    <div key={application._id || application.id} className="rounded-[20px] border border-[#e0e7f2] bg-white p-5 shadow-[0_12px_40px_#2038630b] transition-transform duration-200 hover:-translate-y-0.5 md:p-6">
                        <div className="flex flex-wrap justify-between gap-4">
                            <div>
                                <h3 className="font-['Manrope'] text-lg font-extrabold text-[#203965]">{application.studentName}</h3>
                                <p className="text-gray-600">Class: {classes.find(item => item._id === application.classApplied)?.name || application.classApplied?.name || '—'}</p>
                                <p className="text-gray-600">Contact: {application.parentDetails?.contact || '—'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(application.status)}`}>
                                    {application.status}
                                </span>
                                <select
                                    value={application.status}
                                    onChange={(e) => handleStatusChange(application._id || application.id, e.target.value as any)}
                                    aria-label={`Status for ${application.studentName}`}
                                    className="border rounded-md p-1"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                {application.status === 'approved' && (
                                    <button
                                        onClick={() => navigate('/new-enrollment', { state: { admissionData: application } })}
                                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center space-x-1 hover:bg-blue-700 transition-colors"
                                        title="Enroll as Student"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        <span>Enroll</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#e9edf5] pt-4 text-sm text-[#63728d] md:grid-cols-2">
                            <p>Parent: {application.parentDetails?.name || '—'}</p>
                            <p>DOB: {application.dateOfBirth}</p>
                            <p>Email: {application.parentDetails?.email || '—'}</p>
                            <p>Previous School: {application.previousSchool?.name || '—'}</p>
                        </div>
                        <p className="mt-2">Address: {[application.address?.street, application.address?.city, application.address?.state, application.address?.pincode].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                ))}
            </div>
        </main>
    );
};

export default Admissions;
