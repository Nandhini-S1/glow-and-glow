import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  ShoppingBag,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  BarChart3,
  Truck,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  Box,
  Layers,
  DollarSign,
  Tag,
} from 'lucide-react';
import { adminApi, productApi } from '../api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_LABELS = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Pending',
};

export default function AdminModal({
  isOpen,
  onClose,
  currentUser,
  onProductChanged,
  onShowToast,
}) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'orders' | 'products' | 'low_stock' | 'reports'

  // Overview stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Products state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add / Edit Product form
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fashion',
    price: '',
    original_price: '',
    stock: 50,
    image_url: '',
    description: '',
    rating: '4.8',
    reviews_count: '25',
    is_active: true,
  });
  const [savingProduct, setSavingProduct] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState('All');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Logistics tracking edit modal state
  const [logisticsModalOrder, setLogisticsModalOrder] = useState(null);
  const [logisticsForm, setLogisticsForm] = useState({
    status: 'shipped',
    courier_name: '',
    tracking_number: '',
    estimated_delivery: '',
    description: '',
  });
  const [savingLogistics, setSavingLogistics] = useState(false);

  // Quick inline restock state
  const [restockValues, setRestockValues] = useState({});
  const [updatingStockId, setUpdatingStockId] = useState(null);

  // Sales reports state
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [salesReport, setSalesReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load Dashboard Overview Stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await adminApi.getStats();
      const data = res?.data || res;
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Load products from backend
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setErrorMsg('');
    try {
      const res = await adminApi.getProducts({ page_size: 100 });
      const data = res?.data || res;
      const items = Array.isArray(data) ? data : data?.items || [];
      setProducts(items);

      const catRes = await productApi.getCategories();
      const cats = Array.isArray(catRes?.data) ? catRes.data : Array.isArray(catRes) ? catRes : [];
      setCategories(cats);
    } catch (err) {
      setErrorMsg(err?.userMessage || err?.message || 'Failed to load products.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Load orders from backend
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await adminApi.getOrders();
      const data = res?.data || res;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Load sales report
  const loadSalesReport = useCallback(async (periodParam = reportPeriod, sDate = customStartDate, eDate = customEndDate) => {
    setLoadingReport(true);
    try {
      const params = { period: periodParam };
      if (periodParam === 'custom' && sDate && eDate) {
        params.start_date = sDate;
        params.end_date = eDate;
      }
      const res = await adminApi.getSalesReport(params);
      const data = res?.data || res;
      setSalesReport(data);
    } catch (err) {
      console.error('Failed to load sales report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [reportPeriod, customStartDate, customEndDate]);

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_admin);

  // Tab change effect
  useEffect(() => {
    if (isOpen && isAdmin) {
      setErrorMsg('');
      setSuccessMsg('');
      if (tab === 'overview') {
        loadStats();
      } else if (tab === 'orders') {
        loadOrders();
      } else if (tab === 'products' || tab === 'low_stock') {
        loadProducts();
      } else if (tab === 'reports') {
        loadSalesReport();
      }
    }
  }, [isOpen, isAdmin, tab, loadStats, loadOrders, loadProducts, loadSalesReport]);

  if (!isOpen) return null;

  // Non-admin guard view
  if (!isAdmin) {
    return (
      <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <motion.div
          className="auth-modal admin-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <button type="button" className="auth-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
          <div className="admin-auth-denied">
            <ShieldCheck size={48} color="#e11d48" style={{ margin: '0 auto 12px' }} />
            <h3>Administrator Access Required</h3>
            <p>
              You must be logged in as an administrator to access the Glow & Glam Admin Control Panel.
            </p>
            <button
              type="button"
              className="primary-button"
              style={{ margin: '0 auto' }}
              onClick={onClose}
            >
              Return to Storefront
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Handle Product Create / Update
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setErrorMsg('Product name must be at least 2 characters long.');
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid positive price.');
      return;
    }

    const origPriceNum = formData.original_price ? parseFloat(formData.original_price) : null;
    const stockNum = parseInt(formData.stock, 10);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      price: priceNum,
      original_price: origPriceNum,
      stock: isNaN(stockNum) ? 50 : Math.max(0, stockNum),
      image_url: formData.image_url.trim() || null,
      description: formData.description.trim() || null,
      rating: formData.rating || '4.5',
      reviews_count: formData.reviews_count || '15',
      is_active: formData.is_active,
    };

    setSavingProduct(true);
    try {
      if (isEditing && editingId) {
        await adminApi.updateProduct(editingId, payload);
        setSuccessMsg(`"${payload.name}" updated successfully!`);
        onShowToast?.(`Product updated: ${payload.name}`, 'cart');
      } else {
        await adminApi.addProduct(payload);
        setSuccessMsg(`"${payload.name}" created and published!`);
        onShowToast?.(`New product added: ${payload.name}`, 'cart');
      }

      setIsEditing(false);
      setEditingId(null);
      setFormData({
        name: '',
        category: 'Fashion',
        price: '',
        original_price: '',
        stock: 50,
        image_url: '',
        description: '',
        rating: '4.8',
        reviews_count: '25',
        is_active: true,
      });

      await loadProducts();
      onProductChanged?.();
    } catch (err) {
      setErrorMsg(err?.userMessage || err?.message || 'Failed to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleEditClick = (p) => {
    setIsEditing(true);
    setEditingId(p.id);
    setFormData({
      name: p.name || '',
      category: p.category || 'Fashion',
      price: p.price || '',
      original_price: p.original_price || '',
      stock: p.stock ?? 50,
      image_url: p.image_url || '',
      description: p.description || '',
      rating: p.rating || '4.8',
      reviews_count: p.reviews_count || '25',
      is_active: p.is_active ?? true,
    });
    setErrorMsg('');
    setSuccessMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (p) => {
    try {
      const nextStatus = !p.is_active;
      await adminApi.toggleProductStatus(p.id, nextStatus);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: nextStatus } : item))
      );
      onShowToast?.(`Product ${nextStatus ? 'activated' : 'deactivated'}.`, 'info');
      onProductChanged?.();
    } catch (err) {
      onShowToast?.('Failed to change product status.', 'error');
    }
  };

  const handleDeleteProduct = async (p) => {
    if (!window.confirm(`Are you sure you want to deactivate "${p.name}"?`)) return;
    try {
      await adminApi.deleteProduct(p.id);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: false } : item))
      );
      onShowToast?.(`Product "${p.name}" deactivated.`, 'info');
      onProductChanged?.();
    } catch (err) {
      onShowToast?.('Failed to deactivate product.', 'error');
    }
  };

  // Inline Stock Adjustment
  const handleQuickRestock = async (productId) => {
    const rawVal = restockValues[productId];
    const newStock = parseInt(rawVal, 10);
    if (isNaN(newStock) || newStock < 0) {
      onShowToast?.('Please enter a valid stock number.', 'error');
      return;
    }

    setUpdatingStockId(productId);
    try {
      await adminApi.updateProductStock(productId, newStock);
      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, stock: newStock } : item))
      );
      onShowToast?.(`Stock updated to ${newStock}.`, 'cart');
      onProductChanged?.();
      if (tab === 'overview') loadStats();
    } catch (err) {
      onShowToast?.('Failed to update stock.', 'error');
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Order Status Update
  const handleOrderStatusUpdate = async (orderNumber, newStatus) => {
    setUpdatingOrderId(orderNumber);
    try {
      const res = await adminApi.updateOrderStatus(orderNumber, newStatus);
      const updated = res?.data || res;
      setOrders((prev) =>
        prev.map((o) =>
          o.order_number === orderNumber
            ? { ...o, ...updated, order_status: newStatus, status: newStatus }
            : o
        )
      );
      onShowToast?.(`Order #${orderNumber} set to ${STATUS_LABELS[newStatus] || newStatus}.`, 'cart');
      if (tab === 'overview') loadStats();
    } catch (err) {
      onShowToast?.(err?.userMessage || 'Failed to update order status.', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Logistics / Tracking Modal Submit
  const openLogisticsModal = (order) => {
    setLogisticsModalOrder(order);
    setLogisticsForm({
      status: order.order_status || order.status || 'shipped',
      courier_name: order.courier_name || '',
      tracking_number: order.tracking_number || '',
      estimated_delivery: order.estimated_delivery ? order.estimated_delivery.split('T')[0] : '',
      description: '',
    });
  };

  const handleSaveLogistics = async (e) => {
    e.preventDefault();
    if (!logisticsModalOrder) return;
    setSavingLogistics(true);
    try {
      const res = await adminApi.updateOrderStatus(logisticsModalOrder.order_number, {
        status: logisticsForm.status,
        courier_name: logisticsForm.courier_name.trim() || null,
        tracking_number: logisticsForm.tracking_number.trim() || null,
        estimated_delivery: logisticsForm.estimated_delivery
          ? `${logisticsForm.estimated_delivery}T18:00:00Z`
          : null,
        description: logisticsForm.description.trim() || null,
      });
      const updated = res?.data || res;
      setOrders((prev) =>
        prev.map((o) =>
          o.order_number === logisticsModalOrder.order_number
            ? { ...o, ...updated, order_status: logisticsForm.status, status: logisticsForm.status }
            : o
        )
      );
      onShowToast?.(`Logistics updated for #${logisticsModalOrder.order_number}`, 'cart');
      setLogisticsModalOrder(null);
      if (tab === 'overview') loadStats();
    } catch (err) {
      onShowToast?.(err?.userMessage || 'Failed to update tracking details.', 'error');
    } finally {
      setSavingLogistics(false);
    }
  };

  // Filtered lists
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const lowStockItems = products.filter((p) => (p.stock ?? 0) <= 10);

  const filteredOrders = orders.filter((o) => {
    const statusVal = o.order_status || o.status || 'placed';
    const matchesStatus =
      orderFilterStatus === 'All' || statusVal.toLowerCase() === orderFilterStatus.toLowerCase();

    const q = orderSearchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      o.order_number?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.customer?.email?.toLowerCase().includes(q) ||
      o.shipping_name?.toLowerCase().includes(q) ||
      o.shipping_phone?.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  return (
    <div
      className="auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Admin Dashboard"
    >
      <motion.div
        className="auth-modal admin-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25 }}
        style={{ maxWidth: '1100px', width: '96%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close admin dashboard"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="admin-header">
          <div className="admin-title">
            <Package size={26} className="admin-icon" />
            <div>
              <h2>Glow & Glam Admin Dashboard</h2>
              <p>
                Logged in as <strong>{currentUser?.full_name || 'Admin'}</strong> ({currentUser?.email})
              </p>
            </div>
          </div>

          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${tab === 'overview' ? 'admin-tab-active' : ''}`}
              onClick={() => setTab('overview')}
            >
              <BarChart3 size={15} /> Overview
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${tab === 'orders' ? 'admin-tab-active' : ''}`}
              onClick={() => setTab('orders')}
            >
              <ShoppingBag size={15} /> Orders
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${tab === 'products' ? 'admin-tab-active' : ''}`}
              onClick={() => setTab('products')}
            >
              <Package size={15} /> Products
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${tab === 'low_stock' ? 'admin-tab-active' : ''}`}
              onClick={() => setTab('low_stock')}
            >
              <AlertTriangle size={15} /> Low Stock
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${tab === 'reports' ? 'admin-tab-active' : ''}`}
              onClick={() => setTab('reports')}
            >
              <TrendingUp size={15} /> Sales Reports
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert" style={{ margin: '14px 0' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert auth-alert-success" role="status" style={{ margin: '14px 0' }}>
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="admin-overview-view">
            {loadingStats && !stats ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 size={30} className="auth-spinner" style={{ margin: '0 auto 10px' }} />
                <p>Loading real-time store statistics from PostgreSQL…</p>
              </div>
            ) : (
              <>
                {/* 6 KPI Cards */}
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-blue">
                      <ShoppingBag size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Total Orders</span>
                      <strong className="admin-stat-val">{stats?.total_orders ?? 0}</strong>
                      <span className="admin-stat-sub">Lifetime orders placed</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-green">
                      <TrendingUp size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Total Sales</span>
                      <strong className="admin-stat-val">{money(stats?.total_sales ?? 0)}</strong>
                      <span className="admin-stat-sub">Completed revenue</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-purple">
                      <Users size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Customers</span>
                      <strong className="admin-stat-val">{stats?.total_customers ?? 0}</strong>
                      <span className="admin-stat-sub">Registered accounts</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-terracotta">
                      <Package size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Products</span>
                      <strong className="admin-stat-val">{stats?.total_products ?? 0}</strong>
                      <span className="admin-stat-sub">Active catalog items</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-amber">
                      <Clock size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Pending Orders</span>
                      <strong className="admin-stat-val">{stats?.pending_orders ?? 0}</strong>
                      <span className="admin-stat-sub">Awaiting delivery</span>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon-wrap icon-rose">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="admin-stat-info">
                      <span className="admin-stat-label">Low Stock Alerts</span>
                      <strong className="admin-stat-val">{stats?.low_stock_count ?? 0}</strong>
                      <span className="admin-stat-sub">Stock &le; 10 units</span>
                    </div>
                  </div>
                </div>

                {/* Order Status Distribution Pipeline */}
                <div className="admin-pipeline-card">
                  <div className="admin-pipeline-title">
                    <h4>
                      <Layers size={16} /> Order Status Distribution
                    </h4>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={loadStats}
                      title="Refresh statistics"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                  <div className="admin-pipeline-grid">
                    {Object.entries(STATUS_LABELS).map(([k, label]) => {
                      const count = stats?.status_counts?.[k] || 0;
                      return (
                        <div
                          key={k}
                          className="admin-pipeline-pill"
                          onClick={() => {
                            setOrderFilterStatus(k);
                            setTab('orders');
                          }}
                        >
                          <small>{label}</small>
                          <strong>{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Orders Preview */}
                <div className="admin-table-card" style={{ marginBottom: '24px' }}>
                  <div className="admin-table-header">
                    <h3>Recent Customer Orders</h3>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => setTab('orders')}
                    >
                      View All Orders <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="admin-table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats?.recent_orders || []).slice(0, 5).map((o) => (
                          <tr key={o.order_number}>
                            <td>
                              <strong>#{o.order_number}</strong>
                            </td>
                            <td>
                              {o.customer?.name || o.shipping_name || 'Customer'}
                              <small style={{ display: 'block', color: '#888' }}>
                                {o.customer?.email || o.shipping_email || ''}
                              </small>
                            </td>
                            <td>
                              <strong>{money(o.total_amount)}</strong>
                            </td>
                            <td>
                              <span className={`order-status-badge status-${o.order_status || o.status}`}>
                                {STATUS_LABELS[o.order_status || o.status] || o.order_status || o.status}
                              </span>
                            </td>
                            <td>
                              {o.created_at
                                ? new Date(o.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : '-'}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-restock-btn"
                                onClick={() => {
                                  setOrderSearchQuery(o.order_number);
                                  setTab('orders');
                                }}
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Low Stock Alerts Preview if any */}
                {stats?.low_stock_products && stats.low_stock_products.length > 0 && (
                  <div className="admin-table-card">
                    <div className="admin-table-header">
                      <h3>
                        <AlertTriangle size={16} color="#d97706" style={{ display: 'inline', marginRight: '6px' }} />
                        Low-Stock Products Requiring Attention ({stats.low_stock_products.length})
                      </h3>
                      <button
                        type="button"
                        className="admin-restock-btn"
                        onClick={() => setTab('low_stock')}
                      >
                        Open Low Stock Manager
                      </button>
                    </div>
                    <div className="admin-table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock Level</th>
                            <th>Quick Restock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.low_stock_products.slice(0, 5).map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="admin-product-cell">
                                  <img
                                    src={p.image_url || 'https://placehold.co/60x60?text=No+Img'}
                                    alt={p.name}
                                    className="admin-thumb"
                                  />
                                  <div>
                                    <strong>{p.name}</strong>
                                    <small>ID: #{p.id}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{p.category}</td>
                              <td>{money(p.price)}</td>
                              <td>
                                <span className={p.stock === 0 ? 'admin-badge-danger' : 'admin-badge-warning'}>
                                  {p.stock === 0 ? 'Out of Stock (0)' : `Only ${p.stock} left`}
                                </span>
                              </td>
                              <td>
                                <div className="admin-restock-inline">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="50"
                                    className="admin-restock-input"
                                    value={restockValues[p.id] || ''}
                                    onChange={(e) =>
                                      setRestockValues({ ...restockValues, [p.id]: e.target.value })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="admin-restock-btn"
                                    disabled={updatingStockId === p.id}
                                    onClick={() => handleQuickRestock(p.id)}
                                  >
                                    {updatingStockId === p.id ? '…' : 'Add Stock'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 2. ORDERS MANAGEMENT TAB */}
        {tab === 'orders' && (
          <div className="admin-orders-view">
            <div className="admin-toolbar">
              <div className="admin-search-wrap" style={{ flex: 1, minWidth: '240px' }}>
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search by order #, customer name, email, or phone…"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <select
                value={orderFilterStatus}
                onChange={(e) => setOrderFilterStatus(e.target.value)}
                className="admin-category-select"
              >
                <option value="All">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="icon-button"
                onClick={loadOrders}
                title="Refresh orders list"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="admin-table-card">
              <div className="admin-table-header">
                <h3>Customer Orders ({filteredOrders.length})</h3>
              </div>

              {loadingOrders ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 size={26} className="auth-spinner" style={{ margin: '0 auto 10px' }} />
                  <p>Loading customer orders from database…</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <p style={{ padding: '36px', textAlign: 'center', color: '#888' }}>
                  No customer orders match the selected filters.
                </p>
              ) : (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order # & Date</th>
                        <th>Customer & Shipping</th>
                        <th>Items</th>
                        <th>Total & Payment</th>
                        <th>Status</th>
                        <th>Logistics & Tracking</th>
                        <th>Quick Status Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o) => {
                        const isExpanded = expandedOrderId === o.order_number;
                        return (
                          <React.Fragment key={o.order_number}>
                            <tr>
                              <td>
                                <strong>#{o.order_number}</strong>
                                <small style={{ display: 'block', color: '#888', fontSize: '11px', marginTop: '2px' }}>
                                  {o.created_at
                                    ? new Date(o.created_at).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '-'}
                                </small>
                              </td>
                              <td>
                                <strong>{o.customer?.name || o.shipping_name || 'Customer'}</strong>
                                <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>
                                  {o.customer?.email || o.shipping_email || ''}
                                </small>
                                <small style={{ display: 'block', color: '#777', fontSize: '11px' }}>
                                  {o.shipping_phone || ''}
                                </small>
                                <button
                                  type="button"
                                  className="admin-order-expand-btn"
                                  onClick={() => setExpandedOrderId(isExpanded ? null : o.order_number)}
                                >
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  {isExpanded ? 'Hide Address' : 'View Address & Items'}
                                </button>
                              </td>
                              <td>
                                <strong>{o.items?.length || 0} items</strong>
                              </td>
                              <td>
                                <strong>{money(o.total_amount)}</strong>
                                <small
                                  style={{
                                    display: 'block',
                                    color: '#666',
                                    textTransform: 'uppercase',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    marginTop: '2px',
                                  }}
                                >
                                  {o.payment_method} ({o.payment_status || 'pending'})
                                </small>
                              </td>
                              <td>
                                <span className={`order-status-badge status-${o.order_status || o.status}`}>
                                  {STATUS_LABELS[o.order_status || o.status] || o.order_status || o.status}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => openLogisticsModal(o)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: '#fff0eb',
                                    border: '1px solid #f8d5cd',
                                    borderRadius: '7px',
                                    color: '#b35941',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Truck size={13} />
                                  <span>{o.tracking_number ? 'Edit Tracking' : 'Add Tracking'}</span>
                                </button>
                                {(o.courier_name || o.tracking_number) && (
                                  <small style={{ display: 'block', color: '#666', fontSize: '11px', marginTop: '4px' }}>
                                    {o.courier_name || 'Courier'}: <strong>{o.tracking_number}</strong>
                                  </small>
                                )}
                              </td>
                              <td>
                                <select
                                  value={o.order_status || o.status}
                                  disabled={
                                    updatingOrderId === o.order_number ||
                                    (o.order_status || o.status) === 'cancelled'
                                  }
                                  onChange={(e) => handleOrderStatusUpdate(o.order_number, e.target.value)}
                                  className="admin-status-dropdown"
                                >
                                  <option value="placed">Order Placed</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="processing">Processing</option>
                                  <option value="packed">Packed</option>
                                  <option value="shipped">Shipped</option>
                                  <option value="out_for_delivery">Out for Delivery</option>
                                  <option value="delivered">Delivered</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>

                            {/* Expandable Order Items & Full Address */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} style={{ background: '#fdfaf8', padding: '14px 20px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                      <h5 style={{ margin: '0 0 6px', fontSize: '12px', color: '#7a6660', textTransform: 'uppercase' }}>
                                        Delivery Address
                                      </h5>
                                      <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5' }}>
                                        <strong>{o.shipping_name || o.customer?.name}</strong><br />
                                        {o.shipping_address}<br />
                                        {o.shipping_city}, {o.shipping_state} - {o.shipping_postal}<br />
                                        Phone: {o.shipping_phone || 'N/A'}
                                      </p>
                                    </div>
                                    <div className="admin-order-items-detail">
                                      <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#7a6660', textTransform: 'uppercase' }}>
                                        Ordered Products ({o.items?.length || 0})
                                      </h5>
                                      <ul>
                                        {(o.items || []).map((it) => (
                                          <li key={it.id}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              {it.image_url && (
                                                <img
                                                  src={it.image_url}
                                                  alt=""
                                                  style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }}
                                                />
                                              )}
                                              <span>{it.product_name} &times; {it.quantity}</span>
                                            </div>
                                            <strong>{money(it.subtotal || it.unit_price * it.quantity)}</strong>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. PRODUCTS MANAGEMENT TAB */}
        {tab === 'products' && (
          <div className="admin-products-view">
            <div className="admin-toolbar">
              <div className="admin-search-wrap">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search products by name or category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="admin-category-select"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="primary-button admin-add-btn"
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  setFormData({
                    name: '',
                    category: 'Fashion',
                    price: '',
                    original_price: '',
                    stock: 50,
                    image_url: '',
                    description: '',
                    rating: '4.8',
                    reviews_count: '25',
                    is_active: true,
                  });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Plus size={16} /> Add Product
              </button>
            </div>

            {/* Product Add / Edit Form */}
            <div className="admin-form-card">
              <h3>{isEditing ? `Edit Product #${editingId}` : 'Add New Product to Catalog'}</h3>
              <form onSubmit={handleSubmitProduct} className="admin-product-form">
                <div className="form-grid-2">
                  <div className="auth-input-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Velvet Rose Matte Lipstick"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label>Category *</label>
                    <input
                      type="text"
                      placeholder="e.g. Makeup, Skincare, Fashion…"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-3">
                  <div className="auth-input-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="999"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="auth-input-group">
                    <label>Original Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="1299"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    />
                  </div>

                  <div className="auth-input-group">
                    <label>Stock Inventory *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="50"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Product Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                  {formData.image_url && (
                    <div className="admin-img-preview">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="auth-input-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Short product highlights and details…"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="admin-form-actions">
                  {isEditing && (
                    <button
                      type="button"
                      className="admin-cancel-btn"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingId(null);
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" className="primary-button" disabled={savingProduct}>
                    {savingProduct ? (
                      <>
                        <Loader2 size={16} className="auth-spinner" /> Saving…
                      </>
                    ) : isEditing ? (
                      'Update Product'
                    ) : (
                      'Publish Product'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Products Table */}
            <div className="admin-table-card">
              <div className="admin-table-header">
                <h3>Catalog Products ({filteredProducts.length})</h3>
                <button
                  type="button"
                  className="icon-button"
                  onClick={loadProducts}
                  title="Refresh products"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {loadingProducts ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <Loader2 size={24} className="auth-spinner" style={{ margin: '0 auto 8px' }} />
                  <p>Loading products…</p>
                </div>
              ) : (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="admin-product-cell">
                              <img
                                src={p.image_url || 'https://placehold.co/60x60?text=No+Img'}
                                alt={p.name}
                                className="admin-thumb"
                              />
                              <div>
                                <strong>{p.name}</strong>
                                <small>ID: #{p.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="admin-category-badge">{p.category}</span>
                          </td>
                          <td>
                            <strong>{money(p.price)}</strong>
                            {p.original_price && (
                              <del style={{ display: 'block', color: '#999', fontSize: '11px' }}>
                                {money(p.original_price)}
                              </del>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                p.stock === 0
                                  ? 'stock-out'
                                  : p.stock <= 10
                                  ? 'stock-low'
                                  : 'stock-in'
                              }
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`status-pill ${p.is_active ? 'active' : 'inactive'}`}
                              onClick={() => handleToggleStatus(p)}
                              title={p.is_active ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {p.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td>
                            <div className="admin-action-btns">
                              <button
                                type="button"
                                className="icon-action-btn"
                                onClick={() => handleEditClick(p)}
                                title="Edit product"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                type="button"
                                className="icon-action-btn"
                                onClick={() => handleDeleteProduct(p)}
                                title="Deactivate product"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. LOW-STOCK ALERTS TAB */}
        {tab === 'low_stock' && (
          <div className="admin-low-stock-view">
            <div className="admin-table-card">
              <div className="admin-table-header">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} color="#d97706" />
                    Inventory & Low-Stock Alerts ({lowStockItems.length})
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7a6660' }}>
                    Products with remaining inventory of 10 or fewer units. Update stock immediately below.
                  </p>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  onClick={loadProducts}
                  title="Refresh stock levels"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              {loadingProducts ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <Loader2 size={24} className="auth-spinner" style={{ margin: '0 auto 8px' }} />
                  <p>Checking inventory levels…</p>
                </div>
              ) : lowStockItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#059669' }}>
                  <Check size={40} style={{ margin: '0 auto 8px' }} />
                  <h4>Inventory Healthy</h4>
                  <p>All catalog products currently have more than 10 units in stock.</p>
                </div>
              ) : (
                <div className="admin-table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Current Stock</th>
                        <th>Stock Alert</th>
                        <th>Restock Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="admin-product-cell">
                              <img
                                src={p.image_url || 'https://placehold.co/60x60?text=No+Img'}
                                alt={p.name}
                                className="admin-thumb"
                              />
                              <div>
                                <strong>{p.name}</strong>
                                <small>ID: #{p.id}</small>
                              </div>
                            </div>
                          </td>
                          <td>{p.category}</td>
                          <td>{money(p.price)}</td>
                          <td>
                            <strong style={{ fontSize: '15px' }}>{p.stock}</strong> units
                          </td>
                          <td>
                            <span className={p.stock === 0 ? 'admin-badge-danger' : 'admin-badge-warning'}>
                              {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </td>
                          <td>
                            <div className="admin-restock-inline">
                              <input
                                type="number"
                                min="0"
                                placeholder="New qty"
                                className="admin-restock-input"
                                value={restockValues[p.id] !== undefined ? restockValues[p.id] : p.stock + 20}
                                onChange={(e) =>
                                  setRestockValues({ ...restockValues, [p.id]: e.target.value })
                                }
                              />
                              <button
                                type="button"
                                className="admin-restock-btn"
                                disabled={updatingStockId === p.id}
                                onClick={() => handleQuickRestock(p.id)}
                              >
                                {updatingStockId === p.id ? 'Updating…' : 'Restock'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. SALES REPORTS TAB */}
        {tab === 'reports' && (
          <div className="admin-reports-view">
            <div className="admin-reports-toolbar">
              <div className="admin-report-presets">
                {[
                  ['today', 'Today'],
                  ['7d', 'Last 7 Days'],
                  ['30d', 'Last 30 Days'],
                  ['this_month', 'This Month'],
                  ['all', 'All Time'],
                  ['custom', 'Custom Range'],
                ].map(([pKey, pLabel]) => (
                  <button
                    key={pKey}
                    type="button"
                    className={`admin-preset-btn ${reportPeriod === pKey ? 'active' : ''}`}
                    onClick={() => {
                      setReportPeriod(pKey);
                      if (pKey !== 'custom') loadSalesReport(pKey);
                    }}
                  >
                    {pLabel}
                  </button>
                ))}
              </div>

              {reportPeriod === 'custom' && (
                <div className="admin-date-range-form">
                  <input
                    type="date"
                    className="admin-date-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="admin-date-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-date-submit"
                    onClick={() => loadSalesReport('custom')}
                  >
                    Apply Filter
                  </button>
                </div>
              )}
            </div>

            {loadingReport && !salesReport ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 size={30} className="auth-spinner" style={{ margin: '0 auto 10px' }} />
                <p>Computing sales analytics from PostgreSQL records…</p>
              </div>
            ) : salesReport ? (
              <>
                {/* 3 Summary KPIs */}
                <div className="admin-report-kpis">
                  <div className="admin-report-kpi-card">
                    <span>Period Total Sales</span>
                    <strong>{money(salesReport.total_sales)}</strong>
                    <small>
                      {salesReport.start_date} to {salesReport.end_date}
                    </small>
                  </div>
                  <div className="admin-report-kpi-card">
                    <span>Total Orders Placed</span>
                    <strong>{salesReport.total_orders} orders</strong>
                    <small>{salesReport.valid_orders} valid (non-cancelled)</small>
                  </div>
                  <div className="admin-report-kpi-card">
                    <span>Average Order Value</span>
                    <strong>{money(salesReport.average_order_value)}</strong>
                    <small>Per customer checkout</small>
                  </div>
                </div>

                {/* 2-Column Analytics Layout */}
                <div className="admin-report-grid-2">
                  {/* Daily Sales Trends */}
                  <div className="admin-table-card">
                    <div className="admin-table-header">
                      <h3>Daily Revenue Breakdown</h3>
                    </div>
                    {salesReport.sales_by_day?.length === 0 ? (
                      <p style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                        No orders recorded during this period.
                      </p>
                    ) : (
                      <div className="admin-daily-bars" style={{ padding: '16px' }}>
                        {salesReport.sales_by_day.map((d) => {
                          const maxSales = Math.max(
                            ...salesReport.sales_by_day.map((i) => i.sales),
                            1
                          );
                          const pct = Math.max(4, Math.round((d.sales / maxSales) * 100));
                          return (
                            <div key={d.date} className="admin-daily-row">
                              <span className="admin-daily-date">{d.date}</span>
                              <div className="admin-daily-bar-wrap">
                                <div className="admin-daily-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="admin-daily-amt">{money(d.sales)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Revenue by Category */}
                  <div className="admin-table-card">
                    <div className="admin-table-header">
                      <h3>Sales by Product Category</h3>
                    </div>
                    {salesReport.category_breakdown?.length === 0 ? (
                      <p style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                        No category data for this period.
                      </p>
                    ) : (
                      <div className="admin-cat-list" style={{ padding: '18px' }}>
                        {salesReport.category_breakdown.map((cat) => {
                          const maxCat = Math.max(
                            ...salesReport.category_breakdown.map((i) => i.sales),
                            1
                          );
                          const pct = Math.max(5, Math.round((cat.sales / maxCat) * 100));
                          return (
                            <div key={cat.category} className="admin-cat-item">
                              <div className="admin-cat-meta">
                                <span>{cat.category}</span>
                                <span>{money(cat.sales)} ({cat.count} units)</span>
                              </div>
                              <div className="admin-cat-bar">
                                <div className="admin-cat-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="admin-table-card">
                  <div className="admin-table-header">
                    <h3>Top Selling Products in Period</h3>
                  </div>
                  {salesReport.top_products?.length === 0 ? (
                    <p style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                      No product sales recorded in this date range.
                    </p>
                  ) : (
                    <div className="admin-table-responsive">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Units Sold</th>
                            <th>Total Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {salesReport.top_products.map((tp, idx) => (
                            <tr key={tp.product_id}>
                              <td>
                                <strong>#{idx + 1}</strong>
                              </td>
                              <td>
                                <div className="admin-product-cell">
                                  {tp.image_url && (
                                    <img src={tp.image_url} alt="" className="admin-thumb" />
                                  )}
                                  <span>{tp.name}</span>
                                </div>
                              </td>
                              <td>{tp.category}</td>
                              <td>
                                <strong>{tp.units_sold}</strong> units
                              </td>
                              <td>
                                <strong>{money(tp.revenue)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* LOGISTICS & TRACKING MODAL */}
        {logisticsModalOrder && (
          <div
            className="auth-overlay"
            style={{ zIndex: 1200 }}
            onClick={() => setLogisticsModalOrder(null)}
          >
            <motion.div
              className="auth-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ maxWidth: '500px' }}
            >
              <button
                type="button"
                className="auth-close-btn"
                onClick={() => setLogisticsModalOrder(null)}
              >
                <X size={20} />
              </button>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', margin: 0, color: '#2b1f1d' }}>
                  Update Logistics & Tracking
                </h3>
                <p style={{ fontSize: '12px', color: '#8c7b75', margin: '4px 0 0' }}>
                  Order <strong>#{logisticsModalOrder.order_number}</strong>
                </p>
              </div>

              <form onSubmit={handleSaveLogistics} className="admin-product-form">
                <div className="auth-input-group">
                  <label>Order Status *</label>
                  <select
                    value={logisticsForm.status}
                    onChange={(e) =>
                      setLogisticsForm({ ...logisticsForm, status: e.target.value })
                    }
                    className="admin-category-select"
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                <div className="auth-input-group">
                  <label>Courier Partner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BlueDart Express, Delhivery, DTDC, India Post"
                    value={logisticsForm.courier_name}
                    onChange={(e) =>
                      setLogisticsForm({ ...logisticsForm, courier_name: e.target.value })
                    }
                  />
                </div>

                <div className="auth-input-group">
                  <label>Tracking Number / AWB</label>
                  <input
                    type="text"
                    placeholder="e.g. BD789012345IN"
                    value={logisticsForm.tracking_number}
                    onChange={(e) =>
                      setLogisticsForm({ ...logisticsForm, tracking_number: e.target.value })
                    }
                  />
                </div>

                <div className="auth-input-group">
                  <label>Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={logisticsForm.estimated_delivery}
                    onChange={(e) =>
                      setLogisticsForm({ ...logisticsForm, estimated_delivery: e.target.value })
                    }
                  />
                </div>

                <div className="auth-input-group">
                  <label>Tracking Update Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dispatched from Chennai Sorting Facility"
                    value={logisticsForm.description}
                    onChange={(e) =>
                      setLogisticsForm({ ...logisticsForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="admin-form-actions" style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    className="admin-cancel-btn"
                    onClick={() => setLogisticsModalOrder(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-button" disabled={savingLogistics}>
                    {savingLogistics ? (
                      <>
                        <Loader2 size={16} className="auth-spinner" /> Saving…
                      </>
                    ) : (
                      'Save Logistics & Tracking'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
