import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import InventoryForm from './InventoryForm';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    AlertTriangle,
    Package,
    TrendingDown,
    RefreshCw,
} from 'lucide-react';

interface InventoryItem {
    id: string;
    _id?: string;
    name: string;
    sku: string;
    category: string;
    description?: string;
    quantity: number;
    unit: string;
    minQuantity?: number;
    location?: {
        building?: string;
        room?: string;
        shelf?: string;
    };
    price?: {
        costPrice?: number;
        sellingPrice?: number;
    };
    supplier?: {
        name?: string;
        contact?: string;
        email?: string;
    };
    images?: Array<{ url: string }>;
    createdAt?: string;
    updatedAt?: string;
}

const InventoryPage: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [filters, setFilters] = useState({
        category: '',
        search: '',
        lowStock: false
    });

    const categories = [
        'stationery',
        'electronics',
        'sports',
        'furniture',
        'books',
        'uniforms',
        'lab_equipment',
        'other'
    ];

    // Load inventory from API
    const loadInventory = async () => {
        setLoading(true);
        try {
            const data = await api.inventory.getAll();
            setInventory(Array.isArray(data) ? data : (data.data || []));
        } catch (err: any) {
            console.error('Failed to load inventory', err);
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventory();
    }, []);

    // Save inventory locally
    useEffect(() => {
        try {
            localStorage.setItem('school_inventory', JSON.stringify(inventory));
        } catch (e) {
            console.error('Failed to save inventory to localStorage', e);
        }
    }, [inventory]);

    const handleSaveItem = async (formData: any) => {
        try {
            let result;
            if (selectedItem?.id) {
                result = await api.inventory.update(selectedItem.id, formData);
                setInventory(prev => prev.map(item => 
                    item.id === selectedItem.id ? (result.data || result) : item
                ));
                toast.success('Item updated successfully');
            } else {
                result = await api.inventory.create(formData);
                setInventory(prev => [result.data || result, ...prev]);
                toast.success('Item added successfully');
            }
            setShowForm(false);
            setSelectedItem(null);
        } catch (err: any) {
            console.error('Failed to save item', err);
            toast.error(err.message || 'Failed to save item');
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }
        try {
            await api.inventory.delete(id);
            setInventory(prev => prev.filter(item => item.id !== id));
            toast.success('Item deleted successfully');
        } catch (err: any) {
            console.error('Failed to delete item', err);
            toast.error(err.message || 'Failed to delete item');
        }
    };

    const handleEditItem = (item: InventoryItem) => {
        setSelectedItem(item);
        setShowForm(true);
    };

    const handleNewItem = () => {
        setSelectedItem(null);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedItem(null);
    };

    const filteredInventory = inventory.filter(item => {
        const matchesCategory = !filters.category || item.category === filters.category;
        const matchesSearch = !filters.search || 
            item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            item.sku.toLowerCase().includes(filters.search.toLowerCase());
        const matchesLowStock = !filters.lowStock || (item.quantity <= (item.minQuantity || 10));
        
        return matchesCategory && matchesSearch && matchesLowStock;
    });

    const getCategoryLabel = (category: string) => {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getStockStatus = (quantity: number, minQuantity: number = 10) => {
        if (quantity <= 0)
            return { color: 'text-red-600', bg: 'bg-red-100', label: 'Out of Stock' };
        if (quantity <= minQuantity)
            return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Low Stock' };
        return { color: 'text-green-600', bg: 'bg-green-100', label: 'In Stock' };
    };

    const lowStockCount = inventory.filter(
        item => item.quantity <= (item.minQuantity || 10)
    ).length;

    const totalValue = inventory.reduce(
        (sum, item) => sum + ((item.price?.costPrice || 0) * item.quantity),
        0
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">School Inventory Management</h1>
                    <p className="text-gray-600 mt-2">Manage and track all school inventory items</p>
                </div>
                <button
                    onClick={handleNewItem}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Add New Item
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Items</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.length}</p>
                        </div>
                        <Package className="w-12 h-12 text-blue-500 opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Total Quantity</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                {inventory.reduce((sum, item) => sum + item.quantity, 0)}
                            </p>
                        </div>
                        <Package className="w-12 h-12 text-green-500 opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
                            <p className="text-3xl font-bold text-yellow-600 mt-2">{lowStockCount}</p>
                        </div>
                        <AlertTriangle className="w-12 h-12 text-yellow-500 opacity-20" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Inventory Value</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                        <TrendingDown className="w-12 h-12 text-purple-500 opacity-20" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button
                        onClick={() => {
                            setFilters({ category: '', search: '', lowStock: false });
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Reset Filters
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search className="w-4 h-4 inline mr-1" />
                            Search by Name or SKU
                        </label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            placeholder="Search..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category
                        </label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {getCategoryLabel(cat)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Stock Level
                        </label>
                        <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.lowStock}
                                onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="ml-2 text-gray-700">Show Low Stock Only</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                        Loading inventory...
                    </div>
                ) : filteredInventory.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {inventory.length === 0 ? 'No items in inventory' : 'No items match your filters'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Unit Price</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInventory.map((item) => {
                                    const status = getStockStatus(item.quantity, item.minQuantity);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{item.name}</p>
                                                    {item.description && (
                                                        <p className="text-sm text-gray-500">{item.description}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.sku}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {getCategoryLabel(item.category)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.quantity}</p>
                                                    <p className="text-xs text-gray-500">{item.unit}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                ${item.price?.costPrice?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {item.location?.room && (
                                                    <span>{item.location.room}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditItem(item)}
                                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="text-red-600 hover:text-red-700 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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

            {/* Form Modal */}
            {showForm && (
                <InventoryForm
                    initialData={selectedItem}
                    onSubmit={handleSaveItem}
                    onCancel={handleCloseForm}
                />
            )}
        </div>
    );
};

export default InventoryPage;
