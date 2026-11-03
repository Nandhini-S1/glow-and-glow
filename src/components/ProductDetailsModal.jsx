import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  ShoppingBag,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { productApi } from '../api';

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ProductDetailsModal({
  isOpen,
  productId,
  initialProduct = null,
  onClose,
  onAddToCart,
  isWishlisted = false,
  onWishlist,
  isAdding = false,
  isWishlisting = false,
}) {
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setImgError(false);
      return;
    }

    if (initialProduct && initialProduct.id === productId) {
      setProduct(initialProduct);
    }

    if (productId) {
      const fetchDetails = async () => {
        setLoading(true);
        setError('');
        try {
          const res = await productApi.getById(productId);
          const data = res?.data || res;
          setProduct(data);
        } catch (err) {
          setError(err?.userMessage || err?.message || 'Failed to load product details.');
        } finally {
          setLoading(false);
        }
      };
      fetchDetails();
    }
  }, [isOpen, productId, initialProduct]);

  if (!isOpen) return null;

  const currentProduct = product || initialProduct;

  const handleAdd = () => {
    if (currentProduct) {
      onAddToCart?.(currentProduct, quantity);
    }
  };

  const handleWish = () => {
    if (currentProduct) {
      onWishlist?.(currentProduct);
    }
  };

  const fallbackImg =
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      className="auth-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Product Details"
    >
      <motion.div
        className="auth-modal product-detail-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.25 }}
        style={{ maxWidth: '820px', width: '92%', padding: 0, overflow: 'hidden' }}
      >
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close details"
          style={{ zIndex: 10 }}
        >
          <X size={20} />
        </button>

        {loading && !currentProduct ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Loader2 size={36} className="auth-spinner" style={{ margin: '0 auto 16px' }} />
            <p>Loading product details…</p>
          </div>
        ) : error && !currentProduct ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={36} color="#d9534f" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#d9534f' }}>{error}</p>
            <button
              type="button"
              className="primary-button"
              style={{ marginTop: '16px' }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : currentProduct ? (
          <div className="product-detail-layout">
            <div className="product-detail-gallery">
              <img
                src={imgError ? fallbackImg : currentProduct.image_url || currentProduct.image || fallbackImg}
                alt={currentProduct.name}
                onError={() => setImgError(true)}
              />
              {(currentProduct.discount_pct || currentProduct.discount) && (
                <span className="product-detail-badge">
                  Save {currentProduct.discount_pct || currentProduct.discount}%
                </span>
              )}
            </div>

            <div className="product-detail-content">
              <div className="product-detail-header">
                <span className="product-detail-category">{currentProduct.category}</span>
                <h2>{currentProduct.name}</h2>

                {currentProduct.rating && (
                  <div className="rating" style={{ margin: '8px 0 12px' }}>
                    <span>
                      <Star size={14} fill="currentColor" /> {currentProduct.rating}
                    </span>
                    <small>({currentProduct.reviews_count || currentProduct.reviews || 0} reviews)</small>
                  </div>
                )}

                <div className="product-detail-prices">
                  <span className="current-price">{money(currentProduct.price)}</span>
                  {(currentProduct.original_price || currentProduct.old) && (
                    <del className="original-price">
                      {money(currentProduct.original_price || currentProduct.old)}
                    </del>
                  )}
                  {currentProduct.stock > 0 ? (
                    <span className="stock-status in-stock">
                      <Check size={14} /> In Stock ({currentProduct.stock} left)
                    </span>
                  ) : (
                    <span className="stock-status out-of-stock">Out of Stock</span>
                  )}
                </div>
              </div>

              <div className="product-detail-desc">
                <p>
                  {currentProduct.description ||
                    'Premium quality item curated specifically for the Glow & Glam lifestyle collection.'}
                </p>
              </div>

              <div className="product-detail-actions">
                <div className="quantity-controls">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || currentProduct.stock === 0}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(currentProduct.stock || 10, q + 1))}
                    disabled={quantity >= (currentProduct.stock || 10) || currentProduct.stock === 0}
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  className="primary-button product-add-cta"
                  onClick={handleAdd}
                  disabled={isAdding || currentProduct.stock === 0}
                >
                  <ShoppingBag size={18} />
                  {isAdding
                    ? 'Adding…'
                    : currentProduct.stock === 0
                    ? 'Out of Stock'
                    : `Add to Cart • ${money(currentProduct.price * quantity)}`}
                </button>

                <button
                  type="button"
                  className={`wishlist-pill-btn ${isWishlisted ? 'wishlist-pill-active' : ''}`}
                  onClick={handleWish}
                  disabled={isWishlisting}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="product-detail-perks">
                <div className="perk-item">
                  <Truck size={16} />
                  <span>Free Express Delivery over ₹999</span>
                </div>
                <div className="perk-item">
                  <RotateCcw size={16} />
                  <span>7-Day Hassle-Free Returns</span>
                </div>
                <div className="perk-item">
                  <ShieldCheck size={16} />
                  <span>100% Authentic Product</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
