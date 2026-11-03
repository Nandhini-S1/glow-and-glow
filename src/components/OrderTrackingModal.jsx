import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  CheckCircle,
  Truck,
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Navigation,
  Box,
  Home,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { orderApi } from '../api';

const money = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const TIMELINE_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: Package, description: 'Order has been received by Glow & Glam' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, description: 'Order details and payment verified' },
  { key: 'processing', label: 'Processing', icon: Clock, description: 'Order is being prepared in our warehouse' },
  { key: 'packed', label: 'Packed', icon: Box, description: 'Items safely packed and ready for dispatch' },
  { key: 'shipped', label: 'Shipped', icon: Truck, description: 'Package dispatched with our courier partner' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Navigation, description: 'Courier agent is on the way to your address' },
  { key: 'delivered', label: 'Delivered', icon: Home, description: 'Package delivered safely to recipient' },
];

const STEP_ORDER = {
  placed: 0,
  pending: 0,
  confirmed: 1,
  processing: 2,
  packed: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
};

export default function OrderTrackingModal({
  isOpen,
  onClose,
  initialOrderNumber = '',
  initialOrder = null,
  currentUser,
  onShowToast,
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber || initialOrder?.order_number || '');
  const [searchInput, setSearchInput] = useState(initialOrderNumber || initialOrder?.order_number || '');
  const [trackingData, setTrackingData] = useState(initialOrder || null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const fetchTracking = useCallback(
    async (numberToFetch, silent = false) => {
      const num = (numberToFetch || '').trim();
      if (!num) {
        setTrackingData(null);
        return;
      }
      silent ? setRefreshing(true) : setLoading(true);
      setErrorMsg('');

      try {
        const res = await orderApi.track(num);
        const data = res?.data || res;
        setTrackingData(data);
        setOrderNumber(num);
      } catch (err) {
        // Fallback: try getByOrderNumber
        try {
          const fallback = await orderApi.getByOrderNumber(num);
          const data = fallback?.data || fallback;
          setTrackingData(data);
          setOrderNumber(num);
        } catch (err2) {
          setErrorMsg(err2?.userMessage || err?.userMessage || err2?.message || 'Order not found or unauthorized.');
          setTrackingData(null);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      const targetNum = initialOrderNumber || initialOrder?.order_number || '';
      setOrderNumber(targetNum);
      setSearchInput(targetNum);
      if (targetNum) {
        fetchTracking(targetNum);
      } else if (initialOrder) {
        setTrackingData(initialOrder);
      } else {
        setTrackingData(null);
      }
    }
  }, [isOpen, initialOrderNumber, initialOrder, fetchTracking]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    fetchTracking(searchInput.trim());
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast?.(`Copied ${text}`, 'info');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  if (!isOpen) return null;

  const currentStatus = (trackingData?.current_status || trackingData?.order_status || trackingData?.status || '').toLowerCase();
  const isCancelled = currentStatus === 'cancelled';
  const currentStepIndex = isCancelled ? -1 : (STEP_ORDER[currentStatus] ?? 0);

  // Map events to status keys
  const events = trackingData?.tracking_events || [];
  const eventByStatus = {};
  events.forEach((ev) => {
    const s = (ev.status || '').toLowerCase();
    // Keep latest if multiple
    eventByStatus[s] = ev;
  });

  // Calculate progress percentage
  const totalStages = TIMELINE_STEPS.length - 1;
  const progressPercent = isCancelled
    ? 0
    : Math.min(100, Math.round((Math.max(0, currentStepIndex) / totalStages) * 100));

  // Determine actual logistics data
  const estimatedDelivery = trackingData?.estimated_delivery;
  const courierName = trackingData?.courier_name;
  const trackingNumber = trackingData?.tracking_number;
  const hasLogisticsData = Boolean(estimatedDelivery || courierName || trackingNumber);

  return (
    <div
      className="auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Order Tracking"
    >
      <motion.div
        className="tracking-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.24 }}
      >
        {/* Header */}
        <div className="tracking-modal-header">
          <div className="tracking-header-title">
            <div className="tracking-header-icon">
              <Truck size={20} />
            </div>
            <div>
              <h3>Order Tracking</h3>
              <p>Live order progress and delivery updates</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {orderNumber && (
              <button
                type="button"
                className="cart-clear-btn"
                onClick={() => fetchTracking(orderNumber, true)}
                disabled={refreshing || loading}
                title="Refresh tracking status"
              >
                <RefreshCw size={14} className={refreshing ? 'spinner' : ''} />
                <span className="hide-on-mobile">Refresh</span>
              </button>
            )}
            <button
              type="button"
              className="auth-close-btn"
              onClick={onClose}
              aria-label="Close tracking"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="tracking-search-bar">
          <form onSubmit={handleSearchSubmit} className="tracking-search-form">
            <Search size={16} className="tracking-search-icon" />
            <input
              type="text"
              placeholder="Search by Order # (e.g. GG-20261029-XXXX)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="tracking-search-input"
            />
            <button
              type="submit"
              className="tracking-search-btn"
              disabled={loading || !searchInput.trim()}
            >
              {loading ? <Loader2 size={14} className="spinner" /> : 'Track'}
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="tracking-modal-body">
          {loading && !trackingData && (
            <div className="cart-loading" style={{ minHeight: '260px' }}>
              <Loader2 size={32} className="spinner" />
              <span>Fetching order tracking details…</span>
            </div>
          )}

          {errorMsg && (
            <div className="auth-alert auth-alert-error" style={{ margin: '16px 0' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!loading && !trackingData && !errorMsg && (
            <div className="cart-empty" style={{ padding: '40px 20px' }}>
              <Package size={48} strokeWidth={1.3} />
              <h3>Track your shipment</h3>
              <p>Enter your order number above to view real-time delivery status.</p>
            </div>
          )}

          {trackingData && (
            <div className="tracking-content-layout">
              {/* Order Meta Ribbon */}
              <div className="tracking-order-ribbon">
                <div className="tracking-ribbon-left">
                  <div className="tracking-num-tag">
                    <span>Order</span>
                    <strong>#{trackingData.order_number}</strong>
                    <button
                      type="button"
                      className="tracking-copy-btn"
                      onClick={() => handleCopy(trackingData.order_number, 'order')}
                      title="Copy order number"
                    >
                      {copiedKey === 'order' ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                    </button>
                  </div>
                  {trackingData.created_at && (
                    <span className="tracking-order-date">
                      Placed on{' '}
                      {new Date(trackingData.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                <div className="tracking-ribbon-right">
                  <span
                    className={`order-status-badge status-${currentStatus}`}
                    style={{ fontSize: '13px', padding: '5px 12px' }}
                  >
                    {isCancelled ? (
                      <>
                        <XCircle size={14} /> Cancelled
                      </>
                    ) : (
                      <>
                        <Truck size={14} />{' '}
                        {TIMELINE_STEPS[currentStepIndex]?.label || currentStatus.replace('_', ' ').toUpperCase()}
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Cancelled Banner if cancelled */}
              {isCancelled && (
                <div className="tracking-cancelled-banner">
                  <AlertCircle size={20} />
                  <div>
                    <h4>This order was cancelled</h4>
                    <p>
                      {eventByStatus['cancelled']?.description ||
                        'This order has been cancelled and will not be processed for delivery.'}
                    </p>
                    {eventByStatus['cancelled']?.created_at && (
                      <small>
                        Cancelled on:{' '}
                        {new Date(eventByStatus['cancelled'].created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar (hidden if cancelled) */}
              {!isCancelled && (
                <div className="tracking-progress-card">
                  <div className="tracking-progress-header">
                    <span className="tracking-progress-title">Delivery Progress</span>
                    <span className="tracking-progress-pct">{progressPercent}% Completed</span>
                  </div>
                  <div className="tracking-progress-track">
                    <motion.div
                      className="tracking-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="tracking-progress-labels">
                    <span>Order Placed</span>
                    <span>Shipped</span>
                    <span>Delivered</span>
                  </div>
                </div>
              )}

              {/* Logistics Details - Display ONLY when actual data exists */}
              {hasLogisticsData && (
                <div className="tracking-logistics-grid">
                  {estimatedDelivery && (
                    <div className="tracking-logistics-card">
                      <div className="tracking-logistics-icon">
                        <Calendar size={18} />
                      </div>
                      <div className="tracking-logistics-info">
                        <span className="tracking-logistics-label">Estimated Delivery</span>
                        <strong className="tracking-logistics-val">
                          {new Date(estimatedDelivery).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </strong>
                      </div>
                    </div>
                  )}

                  {courierName && (
                    <div className="tracking-logistics-card">
                      <div className="tracking-logistics-icon">
                        <Truck size={18} />
                      </div>
                      <div className="tracking-logistics-info">
                        <span className="tracking-logistics-label">Courier Partner</span>
                        <strong className="tracking-logistics-val">{courierName}</strong>
                      </div>
                    </div>
                  )}

                  {trackingNumber && (
                    <div className="tracking-logistics-card">
                      <div className="tracking-logistics-icon">
                        <Package size={18} />
                      </div>
                      <div className="tracking-logistics-info">
                        <span className="tracking-logistics-label">Tracking / AWB Number</span>
                        <div className="tracking-awb-row">
                          <strong className="tracking-logistics-val">{trackingNumber}</strong>
                          <button
                            type="button"
                            className="tracking-copy-mini"
                            onClick={() => handleCopy(trackingNumber, 'awb')}
                            title="Copy tracking number"
                          >
                            {copiedKey === 'awb' ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7-Step Timeline */}
              <div className="tracking-timeline-card">
                <h4 className="tracking-section-title">
                  <Clock size={16} /> Tracking Timeline
                </h4>
                <div className="tracking-timeline">
                  {TIMELINE_STEPS.map((step, idx) => {
                    const StepIcon = step.icon;
                    const event = eventByStatus[step.key];
                    const hasPassed = !isCancelled && idx <= currentStepIndex;
                    const isCurrent = !isCancelled && idx === currentStepIndex;
                    const isUpcoming = !isCancelled && idx > currentStepIndex;

                    return (
                      <div
                        key={step.key}
                        className={`tracking-timeline-step ${hasPassed ? 'passed' : ''} ${
                          isCurrent ? 'current' : ''
                        } ${isUpcoming ? 'upcoming' : ''}`}
                      >
                        {/* Vertical line indicator */}
                        {idx < TIMELINE_STEPS.length - 1 && (
                          <div
                            className={`tracking-step-line ${
                              !isCancelled && idx < currentStepIndex ? 'filled' : ''
                            }`}
                          />
                        )}

                        {/* Step Marker */}
                        <div className="tracking-step-marker">
                          <StepIcon size={14} />
                        </div>

                        {/* Step Content */}
                        <div className="tracking-step-content">
                          <div className="tracking-step-row">
                            <h5 className="tracking-step-name">{step.label}</h5>
                            {event?.created_at && (
                              <span className="tracking-step-time">
                                {new Date(event.created_at).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <p className="tracking-step-desc">
                            {event?.description || step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Address & Summary */}
              {trackingData.shipping && (
                <div className="tracking-footer-grid">
                  <div className="tracking-mini-card">
                    <h5>
                      <MapPin size={14} /> Delivery Address
                    </h5>
                    <p className="tracking-address-name">
                      <strong>{trackingData.shipping.name}</strong>
                    </p>
                    <p>{trackingData.shipping.address}</p>
                    <p>
                      {trackingData.shipping.city}, {trackingData.shipping.state} –{' '}
                      {trackingData.shipping.postal}
                    </p>
                    {trackingData.shipping.phone && (
                      <p className="tracking-contact-phone">Phone: {trackingData.shipping.phone}</p>
                    )}
                  </div>

                  <div className="tracking-mini-card">
                    <h5>
                      <ShieldCheck size={14} /> Order Summary
                    </h5>
                    <div className="tracking-summary-rows">
                      <div className="tracking-summary-row">
                        <span>Items:</span>
                        <strong>{trackingData.items?.length || 0} product(s)</strong>
                      </div>
                      <div className="tracking-summary-row">
                        <span>Total Paid:</span>
                        <strong>{money(trackingData.total_amount)}</strong>
                      </div>
                      <div className="tracking-summary-row">
                        <span>Status:</span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {currentStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
