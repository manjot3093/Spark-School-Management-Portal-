import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location: string;
    condition: 'New' | 'Good' | 'Fair' | 'Poor';
    purchaseDate: string;
    purchasePrice: number;
    supplier: string;
    lastChecked: string;
    minimumQuantity: number;
    notes: string;
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

    useEffect(() => {
        try {
            localStorage.setItem('school_inventory', JSON.stringify(inventory));
        } catch (e) {
            console.error('Failed to save inventory to localStorage', e);
        }
    }, [inventory]);

    useEffect(() => {
        try {
            localStorage.setItem('school_stock_movements', JSON.stringify(stockMovements));
        } catch (e) {
            console.error('Failed to save stock movements to localStorage', e);
        }
    }, [stockMovements]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || !newItem.category) {
            toast.error('Please fill required fields');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('name', newItem.name);
            formData.append('category', newItem.category);
            formData.append('quantity', String(newItem.quantity || 0));
            formData.append('unit', newItem.unit || 'pieces');
            formData.append('location', newItem.location || '');
            formData.append('supplier', newItem.supplier || '');
            formData.append('minQuantity', String(newItem.minimumQuantity || 0));
            formData.append('description', newItem.notes || '');

            if (selectedFiles?.length > 0) {
                selectedFiles.forEach((f) => formData.append('images', f));
            }

            let res;
            if ((newItem as any).id) {
                res = await api.inventory.update((newItem as any).id, formData);
            } else {
                res = await api.inventory.create(formData);
            }
            
            const created = res.data || res;
            
            if ((newItem as any).id) {
                setInventory(prev => prev.map(it => it.id === created.id ? created : it));
            } else {
                setInventory(prev => [created, ...prev]);
            }
            
            setNewItem({});
            setSelectedFiles([]);
            setShowAddForm(false);
            toast.success((newItem as any).id ? 'Item updated' : 'Item added');
        } catch (err: any) {
            console.error('Failed to save item', err);
            toast.error(err.message || 'Failed to save item');
        }
    };

    const handleStockMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMovement.itemId || !newMovement.quantity || !selectedItem) {
            toast.error('Please select item and quantity');
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
                ? (selectedItem.quantity + movement.quantity) 
                : (selectedItem.quantity - movement.quantity);

            const updatePayload = {
                quantity: updatedQuantity,
                transactions: [...(selectedItem as any).transactions || [], movement]
            };

            const res = await api.inventory.update(selectedItem.id, updatePayload);
            const updatedItem = res.data || res;

            setInventory(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
            setStockMovements(prev => [{
                ...movement,
                id: Date.now().toString(),
                itemId: selectedItem.id,
                requestedBy: newMovement.requestedBy || '',
                approvedBy: newMovement.approvedBy || '',
                purpose: newMovement.purpose || '',
                type: movement.type as 'in' | 'out',
                quantity: movement.quantity,
                date: movement.date
            }, ...prev]);
            
            setNewMovement({});
            setShowMovementForm(false);
            setSelectedItem(null);
            toast.success('Stock movement recorded');
        } catch (err: any) {
            console.error('Failed to record movement', err);
            toast.error(err.message || 'Failed to record movement');
        }
    };

    const filteredInventory = inventory.filter(item => {
        return (
            (!filters.category || item.category === filters.category) &&
            (!filters.location || item.location === filters.location) &&
            (!filters.condition || item.condition === filters.condition) &&
            (!filters.search || 
                item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                item.supplier.toLowerCase().includes(filters.search.toLowerCase())) &&
            (!filters.lowStock || item.quantity <= item.minimumQuantity)
        );
    });

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">School Inventory Management</h1>
                <div className="space-x-2">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Add New Item
                    </button>
                    <button
                        onClick={() => setShowMovementForm(true)}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                    >
                        Record Stock Movement
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {/* Inventory List */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredInventory.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-gray-600">{item.category}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-sm ${
                                item.quantity <= item.minimumQuantity
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-green-100 text-green-800'
                            }`}>
                                {item.quantity} {item.unit}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                            <p>Location: {item.location}</p>
                            <p>Condition: {item.condition}</p>
                            <p>Supplier: {item.supplier}</p>
                            <p>Min Qty: {item.minimumQuantity}</p>
                            <p>Last Checked: {item.lastChecked ? new Date(item.lastChecked).toLocaleDateString() : 'N/A'}</p>
                            {item.notes && <p>Notes: {item.notes}</p>}
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
                                    setSelectedItem(item);
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
                                    try {
                                        await api.inventory.delete(item.id);
                                        setInventory(prev => prev.filter(i => i.id !== item.id));
                                        toast.success('Item deleted successfully');
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
                ))}
            </div>

            {/* Add/Edit Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">
                            {(newItem as any).id ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                        </h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Form fields go here - removed for brevity */}
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewItem({});
                                    }}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                                >
                                    {(newItem as any).id ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Movement Modal */}
            {showMovementForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Record Stock Movement</h2>
                        <form onSubmit={handleStockMovement} className="space-y-4">
                            {/* Movement form fields go here - removed for brevity */}
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMovementForm(false);
                                        setSelectedItem(null);
                                        setNewMovement({});
                                    }}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
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
                    <h2 className="text-xl font-bold mb-4">Recent Stock Movements</h2>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stockMovements.map((movement) => {
                                    const item = inventory.find(i => i.id === movement.itemId);
                                    return (
                                        <tr key={movement.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(movement.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{item?.name}</td>
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
                                            <td className="px-6 py-4">{movement.purpose}</td>
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