import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, Trash2, ShoppingBag, Loader2, AlertCircle, Lock
} from 'lucide-react';
import { wishlistApi } from '../api';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export default function WishlistModal({ isOpen, onClose, currentUser, onCartChange, onShowToast, onOpenAuth }) {
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');

  const loadWishlist = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const data = await wishlistApi.get();
      setWishlist(data);
    } catch (err) {
      setError(err.message || 'Failed to load wishlist.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && currentUser) loadWishlist();
  }, [isOpen, currentUser, loadWishlist]);

  const handleRemove = async (itemId) => {
    setActionId(itemId);
    try {
      const data = await wishlistApi.remove(itemId);
      setWishlist(data);
      onShowToast?.('Removed from wishlist.', 'info');
    } catch (err) {
      onShowToast?.(err.message || 'Failed to remove.', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleMoveToCart = async (itemId) => {
    setActionId(itemId);
    try {
      const cartData = await wishlistApi.moveToCart(itemId);
      onCartChange?.(cartData.total_items);
      // Reload wishlist
      const wlData = await wishlistApi.get();
      setWishlist(wlData);
      onShowToast?.('Moved to cart!', 'cart');
    } catch (err) {
      onShowToast?.(err.message || 'Failed to move to cart.', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (!isOpen) return null;

  const isEmpty = !wishlist || wishlist.items.length === 0;

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Wishlist">
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
            <Heart size={20} />
            <span>My Wishlist</span>
            {wishlist && wishlist.total_items > 0 && (
              <span className="cart-count-badge">{wishlist.total_items}</span>
            )}
          </div>
          <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close wishlist">
            <X size={20} />
          </button>
        </div>

        {/* Guest */}
        {!currentUser && (
          <div className="cart-guest-prompt">
            <Lock size={32} />
            <h3>Sign in to view your wishlist</h3>
            <p>Save products you love and access them from any device.</p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => { onClose(); onOpenAuth?.('login'); }}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Loading */}
        {currentUser && loading && (
          <div className="cart-loading">
            <Loader2 size={28} className="spinner" />
            <span>Loading wishlist…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="auth-alert auth-alert-error" style={{ margin: '16px' }}>
            <AlertCircle size={16} /><span>{error}</span>
          </div>
        )}

        {/* Empty */}
        {currentUser && !loading && !error && isEmpty && (
          <div className="cart-empty">
            <Heart size={52} strokeWidth={1.2} />
            <h3>Your wishlist is empty</h3>
            <p>Tap the heart icon on any product to save it here.</p>
            <button type="button" className="auth-submit-btn" onClick={onClose}>
              Browse Products
            </button>
          </div>
        )}

        {/* Items */}
        {currentUser && !loading && wishlist && wishlist.items.length > 0 && (
          <div className="cart-items-list">
            <AnimatePresence>
              {wishlist.items.map((item) => (
                <motion.div
                  key={item.id}
                  className="cart-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  layout
                >
                  <img
                    src={item.product.image_url || 'https://placehold.co/80x80?text=No+Image'}
                    alt={item.product.name}
                    className="cart-item-img"
                  />
                  <div className="cart-item-info" style={{ flex: 1 }}>
                    <p className="cart-item-name">{item.product.name}</p>
                    <p className="cart-item-category">{item.product.category}</p>
                    <p className="cart-item-price">{money(item.product.price)}</p>
                    {item.product.stock === 0 && (
                      <span className="cart-out-of-stock">Out of Stock</span>
                    )}
                  </div>
                  <div className="wishlist-item-actions">
                    <button
                      type="button"
                      className="wishlist-move-btn"
                      onClick={() => handleMoveToCart(item.id)}
                      disabled={actionId === item.id || item.product.stock === 0}
                      title="Move to Cart"
                    >
                      {actionId === item.id
                        ? <Loader2 size={14} className="spinner" />
                        : <><ShoppingBag size={14} /> Move to Cart</>
                      }
                    </button>
                    <button
                      type="button"
                      className="cart-remove-btn"
                      onClick={() => handleRemove(item.id)}
                      disabled={actionId === item.id}
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
