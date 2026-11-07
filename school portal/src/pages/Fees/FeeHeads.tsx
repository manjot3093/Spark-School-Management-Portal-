import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Edit, Trash2, X } from 'lucide-react';
import { feesAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FeeCategoryData {
  _id: string;
  name: string;
  description?: string;
  chargeType: 'one_time' | 'recurring';
  isMandatory: boolean;
  status: string;
}

const FeeHeads: React.FC = () => {
  const [categories, setCategories] = useState<FeeCategoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    chargeType: 'recurring' as 'one_time' | 'recurring',
    isMandatory: true,
    status: 'active',
  });

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await feesAPI.getCategories({ limit: 500 });
      if (res?.success && Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load charge types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openAdd = () => {
    setFormData({
      name: '',
      description: '',
      chargeType: 'recurring',
      isMandatory: true,
      status: 'active',
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: FeeCategoryData) => {
    setFormData({
      name: cat.name,
      description: cat.description || '',
      chargeType: cat.chargeType || 'recurring',
      isMandatory: cat.isMandatory !== false,
      status: cat.status || 'active',
    });
    setEditingId(cat._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    // Ensure chargeType is explicitly sent so backend persists one_time correctly
    const payload = {
      name: formData.name.trim(),
      description: formData.description || '',
      chargeType: formData.chargeType === 'one_time' ? 'one_time' : 'recurring',
      isMandatory: formData.isMandatory,
      status: formData.status || 'active',
    };
    try {
      if (editingId) {
        await feesAPI.updateCategory(editingId, payload);
        toast.success('Charge type updated');
      } else {
        await feesAPI.createCategory(payload);
        toast.success('Charge type created');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this charge type? It may be used in fee structures.')) return;
    try {
      await feesAPI.deleteCategory(id);
      toast.success('Charge type deleted');
      loadCategories();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Charge Types (Fee Heads)</h2>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add charge type
        </button>
      </div>
      <p className="px-6 py-2 text-sm text-gray-500">
        One-time charges (e.g. Admission, Exam, Lab, Misc) are collected once; recurring can be paid in installments as per parent&apos;s plan.
      </p>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mandatory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No charge types yet. Add one to use in fee structures.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{cat.name}</span>
                      {cat.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        (cat.chargeType || 'recurring') === 'one_time'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {(cat.chargeType || 'recurring') === 'one_time' ? 'One-time' : 'Recurring'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cat.isMandatory !== false ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">{cat.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat._id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit charge type' : 'Add charge type'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g. Tuition, Admission, Exam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charge type</label>
                <select
                  value={formData.chargeType}
                  onChange={(e) => setFormData((p) => ({ ...p, chargeType: e.target.value as 'one_time' | 'recurring' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="one_time">One-time (e.g. Admission, Exam, Lab, Misc)</option>
                  <option value="recurring">Recurring (installments by parent plan)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onChange={(e) => setFormData((p) => ({ ...p, isMandatory: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isMandatory" className="text-sm text-gray-700">Mandatory</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeHeads;
