import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import InventoryForm from './InventoryForm';
import Pagination from '../../components/common/Pagination';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    AlertTriangle,
    Package,
    TrendingDown,
    RefreshCw,
    Download,
    Filter
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

interface StockMovement {
    id: string;
    itemId: string;
    type: 'in' | 'out';
    quantity: number;
    date: string;
    requestedBy: string;
    approvedBy: string;
    purpose: string;
}

const Inventory: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showMovementForm, setShowMovementForm] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({});
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [newMovement, setNewMovement] = useState<Partial<StockMovement>>({});
    const [filters, setFilters] = useState({
        category: '',
        location: '',
        condition: '',
        search: '',
        lowStock: false
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Load inventory from API
    const loadInventory = async () => {
        setLoading(true);
        try {
            const response = await api.inventory.getAll();
            const data = Array.isArray(response) ? response : (response.data || []);
            
            // Normalize IDs (backend uses _id, frontend uses id)
            const normalizedData = data.map((item: any) => ({
                ...item,
                id: item.id || item._id,
            }));
            
            setInventory(normalizedData);
            
            // Extract stock movements from transactions
            const movements: StockMovement[] = [];
            normalizedData.forEach((item: any) => {
                if (item.transactions && Array.isArray(item.transactions)) {
                    item.transactions.forEach((trans: any) => {
                        movements.push({
                            id: trans._id || trans.id || Date.now().toString(),
                            itemId: item.id || item._id,
                            type: trans.type,
                            quantity: trans.quantity,
                            date: trans.date || new Date().toISOString(),
                            requestedBy: trans.requestedBy?.name || trans.requestedBy || '',
                            approvedBy: trans.approvedBy?.name || trans.approvedBy || '',
                            purpose: trans.reason || ''
                        });
                    });
                }
            });
            setStockMovements(movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            // Save to localStorage as backup
            try {
                localStorage.setItem('school_inventory', JSON.stringify(normalizedData));
            } catch (e) {
                console.error('Failed to save inventory to localStorage', e);
            }
        } catch (err: any) {
            console.error('Failed to load inventory', err);
            toast.error(err.message || 'Failed to load inventory');
            
            // Try to load from localStorage as fallback
            try {
                const cached = localStorage.getItem('school_inventory');
                if (cached) {
                    const cachedData = JSON.parse(cached);
                    setInventory(Array.isArray(cachedData) ? cachedData : []);
                }
            } catch (e) {
                console.error('Failed to load from localStorage', e);
            }
        } finally {
            setLoading(false);
        }
    };

    // Load inventory on component mount
    useEffect(() => {
        loadInventory();
    }, []);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || !newItem.category) {
            toast.error('Please fill required fields');
            return;
        }
        try {
            const payload = {
                name: newItem.name,
                sku: newItem.sku || '',
                category: newItem.category,
                description: newItem.description || '',
                quantity: newItem.quantity || 0,
                unit: newItem.unit || 'pieces',
                minQuantity: newItem.minQuantity || 10,
                location: newItem.location || {},
                supplier: newItem.supplier || {},
                price: newItem.price || {},
            };

            let res;
            const itemId = (newItem as any).id || (newItem as any)._id;
            if (itemId) {
                res = await api.inventory.update(itemId, payload);
            } else {
                res = await api.inventory.create(payload);
            }
            
            const created = res.data || res;
            const normalizedItem = {
                ...created,
                id: created.id || created._id,
            };
            
            if (itemId) {
                setInventory(prev => prev.map(it => {
                    const itId = it.id || (it as any)._id;
                    return itId === normalizedItem.id ? normalizedItem : it;
                }));
                toast.success('Item updated');
            } else {
                setInventory(prev => [normalizedItem, ...prev]);
                toast.success('Item added');
            }
            
            setNewItem({});
            setSelectedFiles([]);
            setShowAddForm(false);
            
            // Reload inventory to get latest data including transactions
            await loadInventory();
        } catch (err: any) {
            console.error('Failed to save item', err);
            toast.error(err.message || 'Failed to save item');
        }
    };

    const handleStockMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMovement.itemId || !newMovement.quantity || !newMovement.type) {
            toast.error('Please select item, type, and quantity');
            return;
        }
        
        // Find the selected item from inventory
        const itemToUpdate = inventory.find(i => {
            const iId = i.id || (i as any)._id;
            return iId === newMovement.itemId;
        });
        
        if (!itemToUpdate) {
            toast.error('Selected item not found');
            return;
        }
        
        try {
            const movement = {
                type: newMovement.type || 'out',
                quantity: newMovement.quantity || 0,
                date: new Date().toISOString(),
                reason: newMovement.purpose || ''
            };

            const updatedQuantity = movement.type === 'in' 
                ? (itemToUpdate.quantity + movement.quantity) 
                : (itemToUpdate.quantity - movement.quantity);

            if (updatedQuantity < 0) {
                toast.error('Insufficient stock for this movement');
                return;
            }

            const itemId = itemToUpdate.id || (itemToUpdate as any)._id;
            const existingTransactions = (itemToUpdate as any).transactions || [];
            
            const updatePayload = {
                quantity: updatedQuantity,
                transactions: [...existingTransactions, movement]
            };

            const res = await api.inventory.update(itemId, updatePayload);
            const updatedItem = res.data || res;
            const normalizedItem = {
                ...updatedItem,
                id: updatedItem.id || updatedItem._id,
            };

            setInventory(prev => prev.map(it => {
                const itId = it.id || (it as any)._id;
                return itId === normalizedItem.id ? normalizedItem : it;
            }));
            
            // Add to stock movements list
            const newMovementRecord: StockMovement = {
                id: Date.now().toString(),
                itemId: normalizedItem.id,
                type: movement.type as 'in' | 'out',
                quantity: movement.quantity,
                date: movement.date,
                requestedBy: newMovement.requestedBy || '',
                approvedBy: newMovement.approvedBy || '',
                purpose: newMovement.purpose || ''
            };
            setStockMovements(prev => [newMovementRecord, ...prev]);
            
            setNewMovement({});
            setShowMovementForm(false);
            setSelectedItem(null);
            toast.success('Stock movement recorded');
            
            // Reload inventory to get latest data
            await loadInventory();
        } catch (err: any) {
            console.error('Failed to record movement', err);
            toast.error(err.message || 'Failed to record movement');
        }
    };

    const filteredInventory = inventory.filter(item => {
        return (
            (!filters.category || item.category === filters.category) &&
            (!filters.location || item.location?.building === filters.location || item.location?.room === filters.location) &&
            (!filters.search || 
                item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                item.sku.toLowerCase().includes(filters.search.toLowerCase())) &&
            (!filters.lowStock || item.quantity <= (item.minQuantity || 10))
        );
    });

    return (
        <div className="pb-10 space-y-5">
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5">
                <div><p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">Operations / Inventory</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">School inventory</h1><p className="text-slate-600 mt-1">Track equipment, supplies, and every stock movement.</p></div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={loadInventory}
                        disabled={loading}
                        className="bg-slate-100 text-[#163f5d] px-4 py-2.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-[#163f5d] text-white px-4 py-2.5 rounded-lg hover:bg-[#0e314b] transition-colors font-semibold"
                    >
                        Add New Item
                    </button>
                    <button
                        onClick={() => setShowMovementForm(true)}
                        className="bg-orange-500 text-white px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                    >
                        Record Stock Movement
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">All Categories</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Sports">Sports Equipment</option>
                            <option value="Lab">Lab Equipment</option>
                            <option value="Stationery">Stationery</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <select
                            value={filters.location}
                            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">All Locations</option>
                            <option value="Main Store">Main Store</option>
                            <option value="Science Lab">Science Lab</option>
                            <option value="Computer Lab">Computer Lab</option>
                            <option value="Sports Room">Sports Room</option>
                            <option value="Library">Library</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Search</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Search items..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Stock Level</label>
                        <div className="mt-2">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={filters.lowStock}
                                    onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-600">Show Low Stock Only</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8">
                    <RefreshCw className="animate-spin mx-auto h-8 w-8 text-blue-500" />
                    <p className="mt-2 text-gray-600">Loading inventory...</p>
                </div>
            )}

            {/* Inventory List */}
            {!loading && (
              <>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredInventory.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-600">No inventory items found</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Add Your First Item
                        </button>
                    </div>
                ) : (
                filteredInventory
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-gray-600">{item.category}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-sm ${
                                item.quantity <= (item.minQuantity || 10)
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                            }`}>
                                {item.quantity} {item.unit}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                            <p>SKU: {item.sku}</p>
                            {item.location?.room && <p>Location: {item.location.room}</p>}
                            {item.supplier?.name && <p>Supplier: {item.supplier.name}</p>}
                            <p>Min Qty: {item.minQuantity || 10}</p>
                            {item.description && <p>Description: {item.description}</p>}
                        </div>
                        {Array.isArray((item as any).images) && (item as any).images.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                                {(item as any).images.map((img: any, idx: number) => (
                                    <img 
                                        key={idx} 
                                        src={img.url} 
                                        alt={`${item.name} - ${idx + 1}`} 
                                        className="w-16 h-16 object-cover rounded border" 
                                    />
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => {
                                    const itemId = item.id || (item as any)._id;
                                    setSelectedItem(item);
                                    setNewMovement(prev => ({ ...prev, itemId }));
                                    setShowMovementForm(true);
                                }}
                                className="flex-1 bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors"
                            >
                                Move
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedItem(item);
                                    setShowAddForm(true);
                                    setNewItem(item);
                                }}
                                className="flex-1 bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this item?')) {
                                        return;
                                    }
                                    try {
                                        const itemId = item.id || (item as any)._id;
                                        await api.inventory.delete(itemId);
                                        setInventory(prev => prev.filter(i => {
                                            const iId = i.id || (i as any)._id;
                                            return iId !== itemId;
                                        }));
                                        toast.success('Item deleted successfully');
                                        // Reload inventory to ensure consistency
                                        await loadInventory();
                                    } catch (err: any) {
                                        console.error('Failed to delete item', err);
                                        toast.error(err.message || 'Failed to delete item');
                                    }
                                }}
                                className="flex-1 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))
                )}
            </div>
            {filteredInventory.length > 0 && (
                <Pagination
                    currentPage={page}
                    pageSize={pageSize}
                    totalItems={filteredInventory.length}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[12, 24, 48]}
                />
            )}
              </>
            )}

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-6">
                                {(newItem as any).id ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                            </h2>
                            <form onSubmit={handleAddItem} className="space-y-6">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Item Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.name || ''}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="e.g., Desk Chair"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                SKU *
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.sku || ''}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, sku: e.target.value }))}
                                                placeholder="e.g., SKU-001"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Category *
                                            </label>
                                            <select
                                                value={newItem.category || ''}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="">Select Category</option>
                                                <option value="stationery">Stationery</option>
                                                <option value="electronics">Electronics</option>
                                                <option value="sports">Sports Equipment</option>
                                                <option value="furniture">Furniture</option>
                                                <option value="books">Books</option>
                                                <option value="uniforms">Uniforms</option>
                                                <option value="lab_equipment">Lab Equipment</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <textarea
                                                value={newItem.description || ''}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Item description..."
                                                rows={2}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Quantity Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Quantity *
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.quantity || 0}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                                min="0"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Unit *
                                            </label>
                                            <select
                                                value={newItem.unit || 'pieces'}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="pieces">Pieces</option>
                                                <option value="sets">Sets</option>
                                                <option value="boxes">Boxes</option>
                                                <option value="pairs">Pairs</option>
                                                <option value="kg">Kilogram</option>
                                                <option value="meters">Meters</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Minimum Quantity
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.minQuantity || 10}
                                                onChange={(e) => setNewItem(prev => ({ ...prev, minQuantity: parseInt(e.target.value) || 0 }))}
                                                min="0"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Cost Price ($)
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.price?.costPrice || 0}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    price: { ...prev.price, costPrice: parseFloat(e.target.value) || 0 }
                                                }))}
                                                min="0"
                                                step="0.01"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Selling Price ($)
                                            </label>
                                            <input
                                                type="number"
                                                value={newItem.price?.sellingPrice || 0}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    price: { ...prev.price, sellingPrice: parseFloat(e.target.value) || 0 }
                                                }))}
                                                min="0"
                                                step="0.01"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Location Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Building
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.location?.building || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    location: { ...prev.location, building: e.target.value }
                                                }))}
                                                placeholder="e.g., Block A"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Room/Area
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.location?.room || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    location: { ...prev.location, room: e.target.value }
                                                }))}
                                                placeholder="e.g., Room 101"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Shelf/Rack
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.location?.shelf || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    location: { ...prev.location, shelf: e.target.value }
                                                }))}
                                                placeholder="e.g., Shelf A1"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Supplier Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Supplier Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newItem.supplier?.name || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    supplier: { ...prev.supplier, name: e.target.value }
                                                }))}
                                                placeholder="Supplier name"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contact Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={newItem.supplier?.contact || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    supplier: { ...prev.supplier, contact: e.target.value }
                                                }))}
                                                placeholder="+1-800-000-0000"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={newItem.supplier?.email || ''}
                                                onChange={(e) => setNewItem(prev => ({
                                                    ...prev,
                                                    supplier: { ...prev.supplier, email: e.target.value }
                                                }))}
                                                placeholder="supplier@example.com"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex gap-4 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setNewItem({});
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {(newItem as any).id ? 'Update Item' : 'Add Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Movement Modal */}
            {showMovementForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-6">Record Stock Movement</h2>
                        <form onSubmit={handleStockMovement} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Item *
                                </label>
                                <select
                                    value={newMovement.itemId || selectedItem?.id || (selectedItem as any)?._id || ''}
                                    onChange={(e) => {
                                        const item = inventory.find(i => {
                                            const iId = i.id || (i as any)._id;
                                            return iId === e.target.value;
                                        });
                                        setSelectedItem(item || null);
                                        setNewMovement(prev => ({ ...prev, itemId: e.target.value }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Choose an item</option>
                                    {inventory.map(item => {
                                        const itemId = item.id || (item as any)._id;
                                        return (
                                            <option key={itemId} value={itemId}>
                                                {item.name} (SKU: {item.sku}) - Qty: {item.quantity}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Movement Type *
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="in"
                                            checked={newMovement.type === 'in'}
                                            onChange={(e) => setNewMovement(prev => ({ ...prev, type: e.target.value as 'in' | 'out' }))}
                                            className="rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="ml-2 text-gray-700">Stock In</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="type"
                                            value="out"
                                            checked={newMovement.type === 'out'}
                                            onChange={(e) => setNewMovement(prev => ({ ...prev, type: e.target.value as 'in' | 'out' }))}
                                            className="rounded border-gray-300 text-blue-600"
                                        />
                                        <span className="ml-2 text-gray-700">Stock Out</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quantity *
                                </label>
                                <input
                                    type="number"
                                    value={newMovement.quantity || 0}
                                    onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                    min="1"
                                    max={newMovement.type === 'out' && newMovement.itemId ? (() => {
                                        const item = inventory.find(i => {
                                            const iId = i.id || (i as any)._id;
                                            return iId === newMovement.itemId;
                                        });
                                        return item?.quantity;
                                    })() : undefined}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                                {newMovement.type === 'out' && newMovement.itemId && (() => {
                                    const item = inventory.find(i => {
                                        const iId = i.id || (i as any)._id;
                                        return iId === newMovement.itemId;
                                    });
                                    return item ? (
                                        <p className="mt-1 text-sm text-gray-500">
                                            Available: {item.quantity} {item.unit}
                                        </p>
                                    ) : null;
                                })()}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Purpose/Reason
                                </label>
                                <textarea
                                    value={newMovement.purpose || ''}
                                    onChange={(e) => setNewMovement(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="e.g., Classroom replenishment, Damage replacement..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Requested By
                                </label>
                                <input
                                    type="text"
                                    value={newMovement.requestedBy || ''}
                                    onChange={(e) => setNewMovement(prev => ({ ...prev, requestedBy: e.target.value }))}
                                    placeholder="Name of person requesting"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Approved By
                                </label>
                                <input
                                    type="text"
                                    value={newMovement.approvedBy || ''}
                                    onChange={(e) => setNewMovement(prev => ({ ...prev, approvedBy: e.target.value }))}
                                    placeholder="Name of approving authority"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMovementForm(false);
                                        setSelectedItem(null);
                                        setNewMovement({});
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Record Movement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Movements Table */}
            {stockMovements.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Recent Stock Movements</h2>
                        <button
                            onClick={loadInventory}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockMovements.slice(0, 20).map((movement) => {
                                    const item = inventory.find(i => {
                                        const iId = i.id || (i as any)._id;
                                        return iId === movement.itemId;
                                    });
                                    return (
                                        <tr key={movement.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(movement.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{item?.name || 'Unknown Item'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded-full text-sm ${
                                                    movement.type === 'in'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {movement.type === 'in' ? 'Stock In' : 'Stock Out'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{movement.quantity}</td>
                                            <td className="px-6 py-4">{movement.purpose || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{movement.requestedBy || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
