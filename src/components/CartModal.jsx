import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingBag, Trash2, Plus, Minus, Loader2,
  ArrowRight, ShoppingCart, AlertCircle, Lock
} from 'lucide-react';
import { cartApi } from '../api';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export default function CartModal({ isOpen, onClose, currentUser, onCartChange, onCheckout, onShowToast }) {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');

  const loadCart = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const data = await cartApi.get();
      // Validate the API response shape before storing it.
      // The backend returns { items, total_items, total_price }.
      // Guard against malformed responses so the render never crashes.
      const safeCart = {
        items: Array.isArray(data?.items) ? data.items : [],
        total_items: Number(data?.total_items) || 0,
        total_price: Number(data?.total_price ?? data?.total) || 0,
      };
      setCart(safeCart);
      onCartChange?.(safeCart.total_items);
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load cart.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, onCartChange]);

  useEffect(() => {
    if (isOpen && currentUser) loadCart();
  }, [isOpen, currentUser, loadCart]);

  // Shared helper: normalise any cart API response into a safe shape.
  const normaliseCart = (data) => ({
    items: Array.isArray(data?.items) ? data.items : [],
    total_items: Number(data?.total_items) || 0,
    total_price: Number(data?.total_price ?? data?.total) || 0,
  });

  const handleQtyChange = async (itemId, newQty) => {
    setUpdatingId(itemId);
    try {
      const data = await cartApi.update(itemId, newQty);
      const safe = normaliseCart(data);
      setCart(safe);
      onCartChange?.(safe.total_items);
    } catch (err) {
      onShowToast?.(err.userMessage || err.message || 'Failed to update cart.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId) => {
    setUpdatingId(itemId);
    try {
      const data = await cartApi.remove(itemId);
      const safe = normaliseCart(data);
      setCart(safe);
      onCartChange?.(safe.total_items);
      onShowToast?.('Item removed from cart.', 'info');
    } catch (err) {
      onShowToast?.(err.userMessage || err.message || 'Failed to remove item.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await cartApi.clear();
      setCart({ items: [], total_items: 0, total_price: 0 });
      onCartChange?.(0);
      onShowToast?.('Cart cleared.', 'info');
    } catch (err) {
      onShowToast?.(err.message || 'Failed to clear cart.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Safe: cart starts as null and items may be missing if the API response
  // was malformed. Optional chaining prevents the TypeError crash.
  const isEmpty = !cart || !cart.items || cart.items.length === 0;
  const shippingCharge = (cart?.total_price ?? 0) >= 999 ? 0 : 49;
  const grandTotal = (cart?.total_price || 0) + shippingCharge;

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Shopping Cart">
      <motion.div
        className="cart-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      >
        {/* Header */}
        <div className="cart-modal-header">
          <div className="cart-modal-title">
            <ShoppingBag size={20} />
            <span>My Cart</span>
            {cart && cart.total_items > 0 && (
              <span className="cart-count-badge">{cart.total_items}</span>
            )}
          </div>
          <div className="cart-header-actions">
            {!isEmpty && (
              <button
                type="button"
                className="cart-clear-btn"
                onClick={handleClear}
                disabled={loading}
              >
                Clear All
              </button>
            )}
            <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close cart">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Guest prompt */}
        {!currentUser && (
          <div className="cart-guest-prompt">
            <Lock size={32} />
            <h3>Sign in to view your cart</h3>
            <p>Your cart items are saved to your account when you're logged in.</p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => { onClose(); onCheckout?.('login'); }}
            >
              Sign In to Continue
            </button>
          </div>
        )}

        {/* Loading */}
        {currentUser && loading && (
          <div className="cart-loading">
            <Loader2 size={28} className="spinner" />
            <span>Loading cart…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="auth-alert auth-alert-error" style={{ margin: '16px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Empty */}
        {currentUser && !loading && !error && isEmpty && (
          <div className="cart-empty">
            <ShoppingCart size={52} strokeWidth={1.2} />
            <h3>Your cart is empty</h3>
            <p>Add products from the shop to get started.</p>
            <button type="button" className="auth-submit-btn" onClick={onClose}>
              Browse Products
            </button>
          </div>
        )}

        {/* Cart items */}
        {currentUser && !loading && cart && cart.items.length > 0 && (
          <>
            <div className="cart-items-list">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    className="cart-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    layout
                  >
                    <img
                      src={item.product?.image_url || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=200&q=80'}
                      alt={item.product?.name || 'Product'}
                      className="cart-item-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=200&q=80';
                      }}
                    />
                    <div className="cart-item-info">
                      <p className="cart-item-name">{item.product?.name || 'Item'}</p>
                      <p className="cart-item-category">{item.product?.category || 'General'}</p>
                      <p className="cart-item-price">{money(item.product?.price ?? 0)}</p>
                    </div>
                    <div className="cart-item-controls">
                      {updatingId === item.id ? (
                        <Loader2 size={18} className="spinner" />
                      ) : (
                        <div className="cart-qty-row">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            disabled={item.quantity >= (item.product?.stock ?? 99)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                      <p className="cart-item-subtotal">{money(item.subtotal ?? (Number(item.product?.price || 0) * item.quantity))}</p>
                      <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={() => handleRemove(item.id)}
                        aria-label="Remove item"
                        disabled={updatingId === item.id}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{money(cart.total_price)}</span>
              </div>
              <div className="cart-summary-row">
                <span>Shipping</span>
                <span className={shippingCharge === 0 ? 'cart-free-shipping' : ''}>
                  {shippingCharge === 0 ? 'FREE' : money(shippingCharge)}
                </span>
              </div>
              {shippingCharge > 0 && (
                <p className="cart-shipping-note">
                  Add {money(999 - cart.total_price)} more for free shipping
                </p>
              )}
              <div className="cart-summary-total">
                <span>Total</span>
                <span>{money(grandTotal)}</span>
              </div>
              <button
                type="button"
                className="auth-submit-btn"
                onClick={() => { onClose(); onCheckout?.('checkout'); }}
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
