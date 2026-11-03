import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Package, Clock, CheckCircle, Truck, XCircle, ChevronDown,
  ChevronUp, MapPin, CreditCard, Loader2, AlertCircle, Lock,
  RefreshCw, ArrowLeft
} from 'lucide-react';
import { orderApi } from '../api';

const money = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const STATUS_CONFIG = {
  placed:           { label: 'Placed',           icon: Package,     color: '#f59e0b' },
  pending:          { label: 'Pending',          icon: Clock,       color: '#f59e0b' },
  confirmed:        { label: 'Confirmed',        icon: CheckCircle, color: '#3b82f6' },
  processing:       { label: 'Processing',       icon: Clock,       color: '#6366f1' },
  packed:           { label: 'Packed',           icon: Package,     color: '#8b5cf6' },
  shipped:          { label: 'Shipped',          icon: Truck,       color: '#ec4899' },
  out_for_delivery: { label: 'Out for Delivery', icon: Truck,       color: '#06b6d4' },
  delivered:        { label: 'Delivered',        icon: CheckCircle, color: '#22c55e' },
  cancelled:        { label: 'Cancelled',        icon: XCircle,     color: '#ef4444' },
};

const PAYMENT_STATUS_COLOR = {
  pending:  '#f59e0b',
  paid:     '#22c55e',
  failed:   '#ef4444',
  refunded: '#8b5cf6',
};

function OrderStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className="order-status-badge" style={{ '--status-color': cfg.color }}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  return (
    <span
      className="order-payment-badge"
      style={{ '--payment-color': PAYMENT_STATUS_COLOR[status] || '#f59e0b' }}
    >
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending'}
    </span>
  );
}

function OrderCard({ order, onViewDetails, onTrackOrder, onCancel, cancelling }) {
  const [expanded, setExpanded] = useState(false);
  const canCancel = ['pending', 'placed', 'confirmed'].includes(order.order_status);

  return (
    <motion.div
      className="order-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Card header */}
      <div className="order-card-header">
        <div className="order-card-meta">
          <span className="order-number">#{order.order_number}</span>
          <OrderStatusBadge status={order.order_status} />
        </div>
        <div className="order-card-meta" style={{ gap: '8px' }}>
          <PaymentBadge status={order.payment_status} />
          <span className="order-date">
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </span>
        </div>
      </div>

      {/* Items preview */}
      <div className="order-items-preview">
        {order.items.slice(0, 3).map((it) => (
          <div key={it.id} className="order-item-row">
            <span className="order-item-name">{it.product_name}</span>
            <span className="order-item-qty">× {it.quantity}</span>
            <span className="order-item-price">{money(it.subtotal)}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="order-more-items">+{order.items.length - 3} more item(s)</p>
        )}
      </div>

      {/* Total row */}
      <div className="order-total-row">
        <div className="order-payment-method">
          <CreditCard size={13} />
          {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
        </div>
        <div className="order-total-amount">
          Total: <strong>{money(order.total_amount)}</strong>
        </div>
      </div>

      {/* Shipping (expandable) */}
      <button
        type="button"
        className="order-expand-btn"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <MapPin size={13} />
        {expanded ? 'Hide address' : 'Show address'}
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="order-address"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p>{order.shipping_name} • {order.shipping_phone}</p>
            <p>{order.shipping_address}</p>
            <p>{order.shipping_city}, {order.shipping_state} – {order.shipping_postal}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="order-card-actions">
        <button
          type="button"
          className="order-track-btn"
          onClick={() => onTrackOrder?.(order.order_number, order)}
        >
          <Truck size={13} /> Track
        </button>
        <button
          type="button"
          className="order-details-btn"
          onClick={() => onViewDetails(order)}
        >
          View Details
        </button>
        {canCancel && (
          <button
            type="button"
            className="order-cancel-btn"
            onClick={() => onCancel(order.order_number)}
            disabled={cancelling === order.order_number}
          >
            {cancelling === order.order_number ? (
              <><Loader2 size={13} className="spinner" /> Cancelling…</>
            ) : (
              'Cancel Order'
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function OrderDetailView({ order, onBack, onTrackOrder, onCancel, cancelling }) {
  const canCancel = ['pending', 'placed', 'confirmed'].includes(order.order_status);

  return (
    <motion.div
      className="order-detail-view"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
    >
      <button type="button" className="order-back-btn" onClick={onBack}>
        <ArrowLeft size={15} /> Back to Orders
      </button>

      <div className="order-detail-header">
        <div>
          <h3 className="order-detail-number">Order #{order.order_number}</h3>
          <p className="order-detail-date">
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.order_status} />
      </div>

      <button
        type="button"
        className="order-track-btn"
        style={{ width: '100%', marginBottom: '18px', justifyContent: 'center', padding: '10px' }}
        onClick={() => onTrackOrder?.(order.order_number, order)}
      >
        <Truck size={15} /> Track Delivery Progress
      </button>

      {/* Items */}
      <section className="order-detail-section">
        <h4><Package size={14} /> Items Ordered</h4>
        {order.items.map((it) => (
          <div key={it.id} className="order-detail-item">
            <div className="order-detail-item-info">
              <p className="order-item-name">{it.product_name}</p>
              <p className="order-detail-unit">
                {money(it.unit_price)} × {it.quantity}
              </p>
            </div>
            <span className="order-item-price">{money(it.subtotal)}</span>
          </div>
        ))}
      </section>

      {/* Price breakdown */}
      <section className="order-detail-section">
        <h4><CreditCard size={14} /> Payment Summary</h4>
        <div className="cart-summary">
          <div className="cart-summary-row">
            <span>Subtotal</span><span>{money(order.subtotal)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span className={Number(order.shipping_charge) === 0 ? 'cart-free-shipping' : ''}>
              {Number(order.shipping_charge) === 0 ? 'FREE' : money(order.shipping_charge)}
            </span>
          </div>
          <div className="cart-summary-total">
            <span>Total</span><span>{money(order.total_amount)}</span>
          </div>
        </div>
        <div className="order-payment-info">
          <span>
            Payment Method:{' '}
            <strong>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong>
          </span>
          <span>
            Payment Status: <PaymentBadge status={order.payment_status} />
          </span>
        </div>
      </section>

      {/* Address */}
      <section className="order-detail-section">
        <h4><MapPin size={14} /> Delivery Address</h4>
        <div className="order-address order-address-detail">
          <p><strong>{order.shipping_name}</strong></p>
          <p>{order.shipping_phone} • {order.shipping_email}</p>
          <p>{order.shipping_address}</p>
          <p>{order.shipping_city}, {order.shipping_state} – {order.shipping_postal}</p>
        </div>
      </section>

      {/* Notes */}
      {order.notes && (
        <section className="order-detail-section">
          <h4>Order Notes</h4>
          <p className="order-notes-text">{order.notes}</p>
        </section>
      )}

      {/* Actions */}
      {canCancel && (
        <button
          type="button"
          className="order-cancel-btn"
          style={{ width: '100%', marginTop: '16px' }}
          onClick={() => onCancel(order.order_number)}
          disabled={cancelling === order.order_number}
        >
          {cancelling === order.order_number ? (
            <><Loader2 size={14} className="spinner" /> Cancelling Order…</>
          ) : (
            'Cancel This Order'
          )}
        </button>
      )}
    </motion.div>
  );
}

export default function OrdersModal({ isOpen, onClose, currentUser, onShowToast, onTrackOrder }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  const PAGE_SIZE = 5;

  const loadOrders = useCallback(async (pg = 1, silent = false) => {
    if (!currentUser) return;
    silent ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await orderApi.list(pg, PAGE_SIZE);
      setOrders(data.items);
      setTotal(data.total);
      setPage(pg);
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && currentUser) {
      setDetailOrder(null);
      loadOrders(1);
    }
  }, [isOpen, currentUser, loadOrders]);

  const handleCancel = async (orderNumber) => {
    setCancelling(orderNumber);
    try {
      const updated = await orderApi.cancel(orderNumber);
      // Update in list
      setOrders((prev) =>
        prev.map((o) => (o.order_number === orderNumber ? updated : o))
      );
      // Update detail if viewing
      if (detailOrder?.order_number === orderNumber) setDetailOrder(updated);
      onShowToast?.(`Order #${orderNumber} cancelled. Stock restored.`, 'info');
    } catch (err) {
      onShowToast?.(err.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(null);
    }
  };

  if (!isOpen) return null;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="My Orders">
      <motion.div
        className="cart-modal orders-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="cart-modal-header">
          <div className="cart-modal-title">
            <Package size={20} />
            <span>My Orders</span>
            {total > 0 && <span className="cart-count-badge">{total}</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentUser && !detailOrder && (
              <button
                type="button"
                className="cart-clear-btn"
                onClick={() => loadOrders(page, true)}
                disabled={refreshing}
                title="Refresh orders"
              >
                <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
              </button>
            )}
            <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close orders">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Guest */}
        {!currentUser && (
          <div className="cart-guest-prompt">
            <Lock size={32} />
            <h3>Sign in to view your orders</h3>
            <p>Your order history is saved to your account.</p>
          </div>
        )}

        {/* Loading */}
        {currentUser && loading && (
          <div className="cart-loading">
            <Loader2 size={28} className="spinner" />
            <span>Loading orders…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="auth-alert auth-alert-error" style={{ margin: '16px' }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {/* Detail view */}
        {currentUser && !loading && detailOrder && (
          <div className="cart-items-list" style={{ padding: '16px' }}>
            <AnimatePresence mode="wait">
              <OrderDetailView
                key={detailOrder.order_number}
                order={detailOrder}
                onBack={() => setDetailOrder(null)}
                onTrackOrder={onTrackOrder}
                onCancel={handleCancel}
                cancelling={cancelling}
              />
            </AnimatePresence>
          </div>
        )}

        {/* Order list */}
        {currentUser && !loading && !detailOrder && (
          <>
            {orders.length === 0 && !error ? (
              <div className="cart-empty">
                <Package size={52} strokeWidth={1.2} />
                <h3>No orders yet</h3>
                <p>Your orders will appear here once you make a purchase.</p>
                <button type="button" className="auth-submit-btn" onClick={onClose}>
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="cart-items-list" style={{ padding: '16px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence>
                  {orders.map((order) => (
                    <OrderCard
                      key={order.order_number}
                      order={order}
                      onViewDetails={setDetailOrder}
                      onTrackOrder={onTrackOrder}
                      onCancel={handleCancel}
                      cancelling={cancelling}
                    />
                  ))}
                </AnimatePresence>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="orders-pagination">
                    <button
                      type="button"
                      className="orders-page-btn"
                      disabled={page <= 1}
                      onClick={() => loadOrders(page - 1)}
                    >
                      ← Prev
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      type="button"
                      className="orders-page-btn"
                      disabled={page >= totalPages}
                      onClick={() => loadOrders(page + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
