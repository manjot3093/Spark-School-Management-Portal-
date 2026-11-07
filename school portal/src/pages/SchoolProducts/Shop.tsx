import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}
import { 
  ShoppingCart, 
  Package, 
  X, 
  Plus, 
  Minus, 
  Eye,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
  }>;
  features: string[];
  specifications: {
    capacity?: string;
    compatibility?: string;
    duration?: string;
    warranty?: string;
    support?: string;
  };
  minimumPurchaseQuantity: number;
  status: string;
  stockStatus: string;
  currentPrice: number;
}

interface Purchase {
  _id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  price: number;
  totalAmount: number;
  purchaseDate: string;
  status: string;
}

const Shop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'purchased'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchPurchaseHistory();
    // Load Razorpay checkout script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.schoolProducts.getAll();
      const productsData = response?.data || response || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const response = await api.schoolProducts.getPurchaseHistory();
      const purchasesData = response?.data || response || [];
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
    } catch (error: any) {
      console.error('Error fetching purchase history:', error);
      setPurchases([]);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(product.minimumPurchaseQuantity || 1);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setQuantity(1);
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedProduct) return;
    const newQuantity = quantity + delta;
    if (newQuantity >= (selectedProduct.minimumPurchaseQuantity || 1) && newQuantity <= selectedProduct.stock) {
      setQuantity(newQuantity);
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;

    if (quantity < (selectedProduct.minimumPurchaseQuantity || 1)) {
      toast.error(`Minimum purchase quantity is ${selectedProduct.minimumPurchaseQuantity}`);
      return;
    }

    if (quantity > selectedProduct.stock) {
      toast.error(`Only ${selectedProduct.stock} units available in stock`);
      return;
    }

    try {
      setProcessingPayment(true);
      
      // Create Razorpay payment order
      const paymentResponse = await api.schoolProducts.purchase(selectedProduct._id, quantity);
      
      if (!paymentResponse.success || !paymentResponse.data) {
        throw new Error('Failed to create payment order');
      }

      const { orderId, amount, keyId, totalAmount } = paymentResponse.data;

      // Initialize Razorpay checkout
      if (!window.Razorpay) {
        toast.error('Razorpay payment gateway is not loaded. Please refresh the page.');
        setProcessingPayment(false);
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round((totalAmount || amount) * 100), // Convert to paise, use totalAmount if available
        currency: 'INR',
        name: 'School Product Purchase',
        description: `Purchase: ${selectedProduct.name}`,
        order_id: orderId,
        prefill: {
          name: 'User',
          email: 'user@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3399cc'
        },
        // Enable payment methods based on selection
        method: {
          upi: paymentMethod === 'upi',
          card: paymentMethod === 'card',
          netbanking: false,
          wallet: false
        },
        handler: async function (response: any) {
          try {
            setProcessingPayment(true);
            
            // Verify payment with backend (using purchase endpoint with verification data)
            const verifyResponse = await api.schoolProducts.purchase(selectedProduct._id, quantity, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyResponse.success) {
              toast.success('Payment successful! Purchase completed.');
              handleCloseModal();
              fetchProducts();
              fetchPurchaseHistory();
            } else {
              toast.error(verifyResponse.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function() {
            setProcessingPayment(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
      setProcessingPayment(false);
    }
  };

  const getStockStatusColor = (stockStatus: string) => {
    switch (stockStatus) {
      case 'in_stock':
        return 'text-green-600 bg-green-100';
      case 'low_stock':
        return 'text-yellow-600 bg-yellow-100';
      case 'out_of_stock':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStockStatusText = (stockStatus: string) => {
    switch (stockStatus) {
      case 'in_stock':
        return 'In Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  };

  const getPrimaryImage = (product: Product) => {
    const primaryImage = product.images?.find(img => img.isPrimary);
    return primaryImage?.url || product.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(115deg,#fff,#f4f7ff_70%,#fff1e7)] px-6 md:px-9 py-8 md:py-10 shadow-sm">
        <p className="text-[11px] font-extrabold uppercase tracking-[.22em] text-orange-600 mb-3">School / shop</p>
        <h1 className="font-[Manrope] text-3xl md:text-4xl font-extrabold tracking-tight text-[#1b3262]">Useful things for school.</h1>
        <p className="text-slate-600 mt-2">Browse school products and keep track of purchases.</p>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
        <nav className="flex gap-2 overflow-x-auto" aria-label="Shop sections">
          <button
            onClick={() => setActiveTab('products')}
            aria-current={activeTab === 'products' ? 'page' : undefined}
            className={`py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-[#213d75] text-white shadow-md'
                : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products
            </div>
          </button>
          <button
            onClick={() => setActiveTab('purchased')}
            aria-current={activeTab === 'purchased' ? 'page' : undefined}
            className={`py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap ${
              activeTab === 'purchased'
                ? 'bg-[#213d75] text-white shadow-md'
                : 'text-slate-600 hover:text-[#213d75] hover:bg-orange-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Purchased ({purchases.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          {/* Search */}
          <div className="mb-6 max-w-xl">
            <label htmlFor="shop-search" className="block text-sm font-semibold text-[#213d75] mb-2">Find a product</label>
            <input
              id="shop-search"
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No products available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={getPrimaryImage(product)}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStockStatusColor(product.stockStatus)}`}>
                        {getStockStatusText(product.stockStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-1 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{product.currentPrice || product.price}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {product.stock}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      disabled={product.stock === 0}
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchased Tab */}
      {activeTab === 'purchased' && (
        <div>
          {purchases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No purchases yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{purchase.productName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{purchase.productSku}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{purchase.quantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{purchase.price.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">₹{purchase.totalAmount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          purchase.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : purchase.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {purchase.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Product Image */}
                <div>
                  <div className="bg-gray-100 rounded-lg">
                    <img
                      src={getPrimaryImage(selectedProduct)}
                      alt={selectedProduct.name}
                      className="w-full h-96 object-contain rounded-lg"
                    />
                  </div>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {selectedProduct.images.map((img, index) => (
                        <div key={index} className="bg-gray-100 rounded">
                          <img
                            src={img.url}
                            alt={img.alt || `Image ${index + 1}`}
                            className="w-full h-20 object-contain rounded cursor-pointer hover:opacity-75"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div>
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStockStatusColor(selectedProduct.stockStatus)}`}>
                      {getStockStatusText(selectedProduct.stockStatus)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-600 mb-2">SKU: {selectedProduct.sku}</p>
                    <p className="text-4xl font-bold text-blue-600 mb-2">
                      ₹{selectedProduct.currentPrice || selectedProduct.price}
                    </p>
                    <p className="text-gray-600">Available Stock: {selectedProduct.stock} units</p>
                    <p className="text-sm text-gray-500">Minimum order: {selectedProduct.minimumPurchaseQuantity || 1} units</p>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
                    <p className="text-gray-600">{selectedProduct.description}</p>
                  </div>

                  {selectedProduct.features && selectedProduct.features.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-2">Features</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedProduct.features.map((feature, index) => (
                          <li key={index} className="text-gray-600">{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-800 mb-2">Specifications</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                          value && (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-gray-700 capitalize">{key}: </span>
                              <span className="text-gray-600">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.stock > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="font-semibold text-gray-800 mb-4">Purchase</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <label className="text-gray-700">Quantity:</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(-1)}
                            className="bg-gray-200 text-gray-700 w-8 h-8 rounded flex items-center justify-center hover:bg-gray-300"
                            disabled={quantity <= (selectedProduct.minimumPurchaseQuantity || 1)}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              if (val >= (selectedProduct.minimumPurchaseQuantity || 1) && val <= selectedProduct.stock) {
                                setQuantity(val);
                              }
                            }}
                            className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
                            min={selectedProduct.minimumPurchaseQuantity || 1}
                            max={selectedProduct.stock}
                          />
                          <button
                            onClick={() => handleQuantityChange(1)}
                            className="bg-gray-200 text-gray-700 w-8 h-8 rounded flex items-center justify-center hover:bg-gray-300"
                            disabled={quantity >= selectedProduct.stock}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-gray-700">
                          Total: <span className="text-2xl font-bold text-blue-600">
                            ₹{((selectedProduct.currentPrice || selectedProduct.price) * quantity).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      
                      {/* Payment Method Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              paymentMethod === 'card'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            Card
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('upi')}
                            className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                              paymentMethod === 'upi'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            UPI
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={handlePurchase}
                        disabled={processingPayment || loading || quantity > selectedProduct.stock}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {processingPayment ? 'Processing Payment...' : 'Purchase Now'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;

