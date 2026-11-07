import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface InventoryItemFormProps {
    initialData?: any;
    onSubmit: (data: any) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

const InventoryForm: React.FC<InventoryItemFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        sku: initialData?.sku || '',
        category: initialData?.category || 'stationery',
        description: initialData?.description || '',
        quantity: initialData?.quantity || 0,
        unit: initialData?.unit || 'pieces',
        minQuantity: initialData?.minQuantity || 10,
        costPrice: initialData?.price?.costPrice || 0,
        sellingPrice: initialData?.price?.sellingPrice || 0,
        building: initialData?.location?.building || '',
        room: initialData?.location?.room || '',
        shelf: initialData?.location?.shelf || '',
        supplierName: initialData?.supplier?.name || '',
        supplierContact: initialData?.supplier?.contact || '',
        supplierEmail: initialData?.supplier?.email || '',
    });

    const [images, setImages] = useState<File[]>([]);
    const [imagePreview, setImagePreview] = useState<string[]>(
        initialData?.images?.map((img: any) => img.url) || []
    );

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

    const units = ['pieces', 'sets', 'boxes', 'pairs', 'kg', 'meters', 'other'];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Quantity') || name.includes('Price') ? parseFloat(value) || 0 : value
        }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages = Array.from(files);
            setImages(prev => [...prev, ...newImages]);

            // Create previews
            newImages.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setImagePreview(prev => [...prev, event.target?.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreview(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.sku || !formData.category) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const payload = {
                name: formData.name,
                sku: formData.sku,
                category: formData.category,
                description: formData.description,
                quantity: formData.quantity,
                unit: formData.unit,
                minQuantity: formData.minQuantity,
                location: {
                    building: formData.building,
                    room: formData.room,
                    shelf: formData.shelf,
                },
                supplier: {
                    name: formData.supplierName,
                    contact: formData.supplierContact,
                    email: formData.supplierEmail,
                },
                price: {
                    costPrice: formData.costPrice,
                    sellingPrice: formData.sellingPrice,
                },
                images: images.length > 0 ? images : undefined,
            };

            await onSubmit(payload);
            toast.success(initialData ? 'Item updated successfully' : 'Item added successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save item');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {initialData ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
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
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleInputChange}
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
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="Item description..."
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quantity and Unit */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Quantity *
                                </label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
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
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                >
                                    {units.map(unit => (
                                        <option key={unit} value={unit}>
                                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Minimum Quantity
                                </label>
                                <input
                                    type="number"
                                    name="minQuantity"
                                    value={formData.minQuantity}
                                    onChange={handleInputChange}
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
                                    name="costPrice"
                                    value={formData.costPrice}
                                    onChange={handleInputChange}
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
                                    name="sellingPrice"
                                    value={formData.sellingPrice}
                                    onChange={handleInputChange}
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
                                    name="building"
                                    value={formData.building}
                                    onChange={handleInputChange}
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
                                    name="room"
                                    value={formData.room}
                                    onChange={handleInputChange}
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
                                    name="shelf"
                                    value={formData.shelf}
                                    onChange={handleInputChange}
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
                                    name="supplierName"
                                    value={formData.supplierName}
                                    onChange={handleInputChange}
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
                                    name="supplierContact"
                                    value={formData.supplierContact}
                                    onChange={handleInputChange}
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
                                    name="supplierEmail"
                                    value={formData.supplierEmail}
                                    onChange={handleInputChange}
                                    placeholder="supplier@example.com"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Images</h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <label className="cursor-pointer">
                                <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                                    Click to upload images
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                        </div>

                        {/* Image Previews */}
                        {imagePreview.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {imagePreview.map((preview, index) => (
                                    <div key={index} className="relative">
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="w-full h-24 object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : initialData ? 'Update Item' : 'Add Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryForm;
