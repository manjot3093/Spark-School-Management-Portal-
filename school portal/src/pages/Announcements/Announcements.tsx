import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ANNOUNCEMENTS_API } from '../../services/schoolModulesAPI';

interface Notice {
    _id: string;
    title: string;
    content: string;
    category: string;
    publishDate: string;
    priority: 'high' | 'medium' | 'low';
}

const Announcements: React.FC = () => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newNotice, setNewNotice] = useState<Partial<Notice>>({});
    const [submitting, setSubmitting] = useState(false);

    const fetchNotices = async () => {
        try {
            const res = await ANNOUNCEMENTS_API.getAll();
            // API returns { success, data } or an array depending on backend implementation
            const items = Array.isArray(res) ? res : (res.data || []);
            setNotices(items);
        } catch (err: any) {
            console.error('Failed to fetch announcements', err);
            toast.error('Failed to load notices');
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = newNotice.title?.trim() || '';
        const content = newNotice.content?.trim() || '';
        if (!title || !content || !newNotice.category) {
            toast.error('Enter a title, category and content');
            return;
        }
        if (title.length > 300 || content.length > 5000) {
            toast.error('Title must be at most 300 characters and content at most 5,000 characters');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                title,
                content,
                category: newNotice.category,
                date: new Date().toISOString(),
                type: 'notice',
                priority: (newNotice.priority || 'medium') as 'low' | 'medium' | 'high',
                applyToAllClasses: true,
                classes: []
            };
            await ANNOUNCEMENTS_API.create(payload);
            toast.success('Notice posted');
            setShowForm(false);
            setNewNotice({});
            // Refresh list
            await fetchNotices();
        } catch (err: any) {
            console.error('Failed to post notice', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to post notice';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-7 pb-12">
            <div className="relative overflow-hidden rounded-[28px] bg-[#20396c] px-6 py-8 text-white sm:px-10 sm:py-10">
                <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[34px] border-white/10" aria-hidden="true" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#ffb17c]">School communication</p>
                    <h1 className="font-['Manrope'] text-3xl font-extrabold tracking-tight sm:text-4xl">Notice board</h1>
                    <p className="mt-2 max-w-xl text-sm text-blue-100">Keep families and staff in step with the latest school updates.</p>
                    <p className="mt-5 text-xs font-bold uppercase tracking-widest text-blue-200">{notices.length} notices on record</p>
                  </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="self-start rounded-xl bg-[#f47b35] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#10244b]/20 hover:bg-[#e96b27] sm:self-auto"
                >
                    Post New Notice
                </button>
                </div>
            </div>

            {showForm && (
                <div className="max-w-2xl rounded-2xl border border-[#e1e8f3] bg-white p-6 shadow-md sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="notice-title" className="block mb-1">Title</label>
                            <input
                                id="notice-title"
                                type="text"
                                value={newNotice.title || ''}
                                onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                                className="w-full border rounded-md p-2"
                                required
                                maxLength={300}
                            />
                        </div>
                        <div>
                            <label htmlFor="notice-category" className="block mb-1">Category</label>
                            <select
                                id="notice-category"
                                value={newNotice.category || ''}
                                onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                                className="w-full border rounded-md p-2"
                                required
                            >
                                <option value="">Select Category</option>
                                <option value="academic">Academic</option>
                                <option value="administrative">Administrative</option>
                                <option value="sports">Sports</option>
                                <option value="cultural">Cultural</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="notice-priority" className="block mb-1">Priority</label>
                            <select
                                id="notice-priority"
                                value={newNotice.priority || 'medium'}
                                onChange={(e) => setNewNotice({
                                    ...newNotice,
                                    priority: e.target.value as 'high' | 'medium' | 'low'
                                })}
                                className="w-full border rounded-md p-2"
                                required
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="notice-content" className="block mb-1">Content</label>
                            <textarea
                                id="notice-content"
                                value={newNotice.content || ''}
                                onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                                className="w-full border rounded-md p-2"
                                rows={4}
                                required
                                maxLength={5000}
                            />
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
                                disabled={submitting}
                                className="bg-blue-500 text-white px-4 py-2 rounded-md"
                            >
                                {submitting ? 'Posting…' : 'Post Notice'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {notices.map((notice) => (
                    <div key={notice._id} className="rounded-2xl border border-[#e2e8f2] bg-white p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{notice.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-sm ${getPriorityColor(notice.priority)}`}>
                                {notice.priority}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                            Category: {notice.category} | Date: {new Date(notice.publishDate).toLocaleDateString()}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
                    </div>
                ))}
                {notices.length === 0 && <p className="rounded-2xl border border-dashed border-[#c7d2e2] bg-white p-8 text-sm text-[#61718c] md:col-span-2 xl:col-span-3">No notices yet. Post the first update when you are ready.</p>}
            </div>
        </div>
    );
};

export default Announcements;
