import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X, MapPin, Phone, Mail, User, Building2, Navigation,
  CreditCard, Truck, Loader2, AlertCircle, CheckCircle,
  ShoppingBag, ArrowRight, ChevronDown
} from 'lucide-react';
import { cartApi, orderApi } from '../api';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const INITIAL_FORM = {
  name: '', phone: '', email: '', address: '',
  city: '', state: '', postal_code: '', payment_method: 'cod', notes: '',
};

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="auth-field">
      <label>{label}</label>
      {Icon ? (
        <div className="auth-input-wrap">
          <Icon size={17} className="auth-field-icon" />
          {children}
        </div>
      ) : children}
      {error && <span className="checkout-field-error">{error}</span>}
    </div>
  );
}

export default function CheckoutModal({ isOpen, onClose, currentUser, onOrderPlaced, onShowToast }) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill name/email from user profile
  useEffect(() => {
    if (currentUser) {
      setForm((f) => ({
        ...f,
        name: f.name || currentUser.full_name || '',
        email: f.email || currentUser.email || '',
        phone: f.phone || currentUser.phone || '',
      }));
    }
  }, [currentUser]);

  const loadCart = useCallback(async () => {
    if (!currentUser) return;
    setCartLoading(true);
    try {
      const data = await cartApi.get();
      // Validate response shape — guard against null/malformed data.
      setCart({
        items: Array.isArray(data?.items) ? data.items : [],
        total_items: Number(data?.total_items) || 0,
        total_price: Number(data?.total_price ?? data?.total) || 0,
      });
    } catch {
      setErrorMsg('Failed to load your cart. Please close and try again.');
    } finally {
      setCartLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setErrors({});
      loadCart();
    }
  }, [isOpen, loadCart]);

  if (!isOpen) return null;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  // ── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      e.name = 'Enter a valid full name (min. 2 characters).';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10)
      e.phone = 'Enter a valid 10-digit phone number.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address.';
    if (!form.address.trim() || form.address.trim().length < 10)
      e.address = 'Enter a complete street address (min. 10 characters).';
    if (!form.city.trim() || form.city.trim().length < 2)
      e.city = 'Enter a valid city name.';
    if (!form.state.trim())
      e.state = 'Please select your state.';
    if (!form.postal_code.trim() || !/^\d{6}$/.test(form.postal_code.trim()))
      e.postal_code = 'Enter a valid 6-digit PIN code.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      // Generate idempotency key to prevent duplicate orders
      const idempotencyKey = `${currentUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const result = await orderApi.checkout({
        shipping: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postal_code: form.postal_code.trim(),
        },
        payment_method: form.payment_method,
        idempotency_key: idempotencyKey,
        notes: form.notes.trim() || null,
      });

      onOrderPlaced?.(result.order);
      onShowToast?.(`Order ${result.order.order_number} placed!`, 'cart');
      onClose();
    } catch (err) {
      setErrorMsg(err.userMessage || err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cart?.total_price || 0;
  const shippingCharge = subtotal >= 999 ? 0 : (cart?.items?.length > 0 ? 49 : 0);
  const grandTotal = subtotal + shippingCharge;

  return (
    <div className="auth-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Checkout">
      <motion.div
        className="checkout-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25 }}
      >
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close checkout">
          <X size={20} />
        </button>

        <div className="auth-brand-header">
          <span className="auth-brand-tag">GLOW &amp; GLAM</span>
          <h2>Secure Checkout</h2>
          <p>Fill in your shipping details to complete your order.</p>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} /><span>{errorMsg}</span>
          </div>
        )}

        <div className="checkout-layout">
          {/* ── Left: Form ── */}
          <form className="checkout-form" onSubmit={handleSubmit} noValidate>
            <p className="checkout-section-label">
              <MapPin size={14} /> Shipping Address
            </p>

            <div className="checkout-row-2">
              <Field label="Full Name *" icon={User} error={errors.name}>
                <input
                  id="checkout-name"
                  type="text"
                  placeholder="Recipient's full name"
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                  className={errors.name ? 'checkout-input-error' : ''}
                />
              </Field>
              <Field label="Phone Number *" icon={Phone} error={errors.phone}>
                <input
                  id="checkout-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={set('phone')}
                  autoComplete="tel"
                  className={errors.phone ? 'checkout-input-error' : ''}
                />
              </Field>
            </div>

            <Field label="Email Address *" icon={Mail} error={errors.email}>
              <input
                id="checkout-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                className={errors.email ? 'checkout-input-error' : ''}
              />
            </Field>

            <Field label="Street Address *" icon={MapPin} error={errors.address}>
              <input
                id="checkout-address"
                type="text"
                placeholder="House / Flat no., Street, Area"
                value={form.address}
                onChange={set('address')}
                autoComplete="street-address"
                className={errors.address ? 'checkout-input-error' : ''}
              />
            </Field>

            <div className="checkout-row-3">
              <Field label="City *" icon={Building2} error={errors.city}>
                <input
                  id="checkout-city"
                  type="text"
                  placeholder="City"
                  value={form.city}
                  onChange={set('city')}
                  autoComplete="address-level2"
                  className={errors.city ? 'checkout-input-error' : ''}
                />
              </Field>

              <div className="auth-field">
                <label>State *</label>
                <div className="auth-input-wrap checkout-select-wrap">
                  <Navigation size={17} className="auth-field-icon" />
                  <select
                    id="checkout-state"
                    value={form.state}
                    onChange={set('state')}
                    className={`checkout-select ${errors.state ? 'checkout-input-error' : ''}`}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="select-chevron" />
                </div>
                {errors.state && <span className="checkout-field-error">{errors.state}</span>}
              </div>

              <Field label="PIN Code *" error={errors.postal_code}>
                <div className="auth-input-wrap">
                  <input
                    id="checkout-postal"
                    type="text"
                    placeholder="6-digit PIN"
                    value={form.postal_code}
                    onChange={set('postal_code')}
                    maxLength={6}
                    autoComplete="postal-code"
                    style={{ paddingLeft: '14px' }}
                    className={errors.postal_code ? 'checkout-input-error' : ''}
                  />
                </div>
              </Field>
            </div>

            {/* Payment */}
            <p className="checkout-section-label" style={{ marginTop: '18px' }}>
              <CreditCard size={14} /> Payment Method
            </p>
            <div className="payment-options">
              <label className={`payment-option ${form.payment_method === 'cod' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={form.payment_method === 'cod'}
                  onChange={set('payment_method')}
                />
                <Truck size={18} />
                <div>
                  <strong>Cash on Delivery</strong>
                  <small>Pay when your order arrives</small>
                </div>
              </label>
              <label className={`payment-option payment-option-disabled ${form.payment_method === 'online' ? 'selected' : ''}`}
                     title="Online payment coming soon">
                <input type="radio" name="payment_method" value="online" disabled />
                <CreditCard size={18} />
                <div>
                  <strong>Online Payment</strong>
                  <small>Coming soon – UPI, Card, Net Banking</small>
                </div>
              </label>
            </div>

            {/* Notes */}
            <div className="auth-field" style={{ marginTop: '14px' }}>
              <label>Order Notes (optional)</label>
              <textarea
                id="checkout-notes"
                className="checkout-textarea"
                placeholder="Any delivery instructions or special requests…"
                value={form.notes}
                onChange={set('notes')}
                rows={2}
                maxLength={500}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting || cartLoading || !cart || !cart.items || cart.items.length === 0}
              style={{ marginTop: '20px' }}
            >
              {submitting ? (
                <><Loader2 size={16} className="spinner" /> Placing Order…</>
              ) : (
                <>Place Order – {money(grandTotal)} <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* ── Right: Order Summary ── */}
          <aside className="checkout-summary">
            <p className="checkout-section-label">
              <ShoppingBag size={14} /> Order Summary
            </p>

            {cartLoading ? (
              <div className="cart-loading" style={{ minHeight: '100px' }}>
                <Loader2 size={22} className="spinner" />
              </div>
            ) : cart && cart.items.length > 0 ? (
              <>
                <div className="checkout-summary-items">
                  {cart.items.map((item) => (
                    <div key={item.id} className="checkout-summary-item">
                      <img
                        src={item.product.image_url || 'https://placehold.co/50x50?text=img'}
                        alt={item.product.name}
                        className="checkout-summary-img"
                      />
                      <div className="checkout-summary-item-info">
                        <p>{item.product.name}</p>
                        <small>× {item.quantity}</small>
                      </div>
                      <span>{money(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="cart-summary" style={{ marginTop: '12px' }}>
                  <div className="cart-summary-row">
                    <span>Subtotal</span><span>{money(subtotal)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Shipping</span>
                    <span className={shippingCharge === 0 ? 'cart-free-shipping' : ''}>
                      {shippingCharge === 0 ? 'FREE' : money(shippingCharge)}
                    </span>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total</span><span>{money(grandTotal)}</span>
                  </div>
                </div>
                <div className="checkout-secure-note">
                  <CheckCircle size={13} />
                  Prices are verified server-side before order confirmation
                </div>
              </>
            ) : (
              <p style={{ color: '#766764', fontSize: '13px' }}>Cart is empty.</p>
            )}
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
