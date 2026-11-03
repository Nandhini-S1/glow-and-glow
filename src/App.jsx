
import { useEffect, useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, Heart, UserRound, ShoppingBag, ChevronLeft, ChevronRight,
  ArrowRight, Menu, X, Instagram, ShieldCheck, Truck, RefreshCw, Headset,
  Star, Sparkles, Check, Package
} from 'lucide-react'

import AuthModal from './components/AuthModal'
import ProfileModal from './components/ProfileModal'
import CartModal from './components/CartModal'
import WishlistModal from './components/WishlistModal'
import CheckoutModal from './components/CheckoutModal'
import OrdersModal from './components/OrdersModal'
import OrderTrackingModal from './components/OrderTrackingModal'
import ProductDetailsModal from './components/ProductDetailsModal'
import AdminModal from './components/AdminModal'
import { authApi, productApi, cartApi, wishlistApi } from './api'

// Safely read API values
const safeArray = (value) => Array.isArray(value) ? value : []
const safeCount = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

const asset = (name) => {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.replace(/\/$/, '')}/assets/${name}`
}

const slides = [
  {
    eyebrow: 'NEW COLLECTION',
    title: <>Style That<br /><em>Moves With You</em></>,
    description: 'Trendy outfits. Fresh vibes. All in one place.',
    button: 'Shop Fashion',
    category: 'Fashion',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
    note: 'Fashion · Beauty · Gifts & More ♡',
  },
  {
    eyebrow: 'GIFTS THAT FEEL PERSONAL',
    title: <>Make Every Moment<br /><em>Special</em></>,
    description: 'Thoughtful gifts for the people who matter.',
    button: 'Explore Gifts',
    category: 'Gifts',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=85',
    note: 'Little things, lovely memories ♡',
  },
  {
    eyebrow: 'YOUR DAILY RITUAL',
    title: <>Your Beauty,<br /><em>Your Glow</em></>,
    description: 'Discover beauty essentials for your everyday routine.',
    button: 'Discover Beauty',
    category: 'Beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85',
    note: 'Glow softly. Shine confidently ♡',
  },
  {
    eyebrow: 'MADE WITH CREATIVITY',
    title: <>Creativity in<br /><em>Every Detail</em></>,
    description: 'Unique handmade finds and charming little details.',
    button: 'Explore Crafts',
    category: 'Crafts',
    image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=85',
    note: 'Handmade · Thoughtful · Unique ♡',
  },
  {
    eyebrow: 'EVERYDAY ESSENTIALS',
    title: <>Complete Every<br /><em>Look</em></>,
    description: 'Accessories that make everyday life feel special.',
    button: 'Shop Accessories',
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85',
    note: 'Everyday essentials, elevated ♡',
  },
]

const categories = [
  ['Fashion', '👗', '1250+'],
  ['Sarees', '🥻', '850+'],
  ['Footwear', '👟', '750+'],
  ['Jewellery', '💎', '620+'],
  ['Beauty', '💄', '980+'],
  ['Skincare', '🧴', '720+'],
  ['Perfumes', '🌸', '460+'],
  ['Bags', '👜', '640+'],
  ['Accessories', '🕶️', '680+'],
  ['Gifts', '🎁', '420+'],
  ['Toys', '🧸', '310+'],
  ['Home Decor', '🏺', '360+'],
  ['Crafts', '🎨', '280+'],
  ['Stationery', '📓', '320+'],
  ['Party Supplies', '🎈', '210+'],
  ['Electronics', '🎧', '430+'],
]

const filterOptions = ['All', 'Fashion', 'Beauty', 'Skincare', 'Jewellery', 'Perfumes', 'Footwear', 'Electronics', 'Gifts']

const money = (n) => `₹${safeCount(n).toLocaleString('en-IN')}`

// ─── BrandLogo ──────────────────────────────────────────────────────────────
function BrandLogo({ footer = false }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <a
      className={`brand ${footer ? 'brand-footer' : ''}`}
      href="#home"
      aria-label="Glow and Glam home"
    >
      {!imgFailed && (
        <img
          className="brand-logo"
          src={asset('glow-and-glam-logo.png')}
          alt="Glow & Glam logo"
          onError={() => setImgFailed(true)}
        />
      )}

      <span
        className={`logo-fallback ${imgFailed ? 'fallback-active' : ''}`}
        aria-hidden={!imgFailed}
      >
        G<span>&</span>G
      </span>

      <span className="brand-copy">
        <strong>GLOW <i>&</i> GLAM</strong>
        <small>Your Style. Your Glow. Your Glam.</small>
      </span>
    </a>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────
function Header({
  cartCount,
  wishlistCount,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onOpenCart,
  onOpenWishlist,
  onOpenOrders,
  onOpenTrack,
  onOpenAdmin,
  onSearch,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')

  const submit = (e) => {
    e.preventDefault()

    if (query.trim()) {
      onSearch?.(query.trim())
      document.getElementById('trending')?.scrollIntoView({
        behavior: 'smooth',
      })
    }
  }

  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_admin)

  return (
    <header className="site-header" id="home">
      <div className="header-inner">
        <button
          type="button"
          className="mobile-menu icon-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <BrandLogo />

        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}>
          <a className="active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#trending" onClick={() => setMenuOpen(false)}>Shop</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a>
          <a href="#offers" onClick={() => setMenuOpen(false)}>Offers</a>
          <a href="#footer" onClick={() => setMenuOpen(false)}>About</a>

          <div className="mobile-auth-nav">
            {currentUser ? (
              <>
                <button
                  type="button"
                  className="mobile-auth-btn"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenProfile()
                  }}
                >
                  <UserRound size={16} />
                  My Account ({(currentUser.full_name || 'User').split(' ')[0]})
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    className="mobile-auth-btn header-admin-btn"
                    onClick={() => {
                      setMenuOpen(false)
                      onOpenAdmin?.()
                    }}
                  >
                    <ShieldCheck size={16} /> Admin Panel
                  </button>
                )}

                <button
                  type="button"
                  className="mobile-auth-btn"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenOrders()
                  }}
                >
                  <Package size={16} /> My Orders
                </button>

                <button
                  type="button"
                  className="mobile-auth-btn"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenTrack()
                  }}
                >
                  <Truck size={16} /> Track Order
                </button>
              </>
            ) : (
              <button
                type="button"
                className="mobile-auth-btn"
                onClick={() => {
                  setMenuOpen(false)
                  onOpenAuth('login')
                }}
              >
                <UserRound size={16} /> Sign In / Register
              </button>
            )}
          </div>
        </nav>

        <form className="search-box" onSubmit={submit}>
          <input
            aria-label="Search products"
            placeholder="Search for products, brands and more..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            <Search size={18} />
          </button>
        </form>

        <div className="header-actions">
          <button
            type="button"
            className="header-action"
            aria-label={`Wishlist: ${wishlistCount} items`}
            onClick={onOpenWishlist}
          >
            <span className="action-icon">
              <Heart size={20} />
              {wishlistCount > 0 && <b>{wishlistCount}</b>}
            </span>
            <small>Wishlist</small>
          </button>

          <button
            type="button"
            className="header-action header-account-btn"
            aria-label={
              currentUser
                ? `Account: ${currentUser.full_name || 'User'}`
                : 'Sign In or Register'
            }
            onClick={() => {
              if (currentUser) onOpenProfile()
              else onOpenAuth('login')
            }}
          >
            <UserRound size={20} />
            <small>
              {currentUser
                ? (currentUser.full_name || 'User').split(' ')[0]
                : 'Account'}
            </small>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="header-action header-admin-btn"
              aria-label="Admin Dashboard"
              onClick={onOpenAdmin}
              title="Admin Dashboard"
            >
              <span className="action-icon"><ShieldCheck size={20} /></span>
              <small>Admin</small>
            </button>
          )}

          {currentUser && (
            <button
              type="button"
              className="header-action"
              aria-label="My Orders"
              onClick={onOpenOrders}
              title="My Orders"
            >
              <span className="action-icon"><Package size={20} /></span>
              <small>Orders</small>
            </button>
          )}

          {currentUser && (
            <button
              type="button"
              className="header-action"
              aria-label="Track Order"
              onClick={onOpenTrack}
              title="Track Order"
            >
              <span className="action-icon"><Truck size={20} /></span>
              <small>Track</small>
            </button>
          )}

          <button
            type="button"
            className="header-action"
            aria-label={`Cart: ${cartCount} items`}
            onClick={onOpenCart}
          >
            <span className="action-icon">
              <ShoppingBag size={20} />
              {cartCount > 0 && <b>{cartCount}</b>}
            </span>
            <small>Cart</small>
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero({ onSelectCategory }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [touchStartX, setTouchStartX] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const slide = slides[index]

  useEffect(() => {
    if (paused) return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const timer = window.setInterval(() => {
      setIndex((v) => (v + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [paused, index])

  const move = (direction) => {
    setIndex((v) => (v + direction + slides.length) % slides.length)
  }

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e) => {
    if (touchStartX === null) return

    const diff = touchStartX - e.changedTouches[0].clientX

    if (diff > 45) move(1)
    else if (diff < -45) move(-1)

    setTouchStartX(null)
  }

  const handleMouseMove = (e) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1

    setMousePos({
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
    })
  }

  const handleMouseLeave = () => {
    setPaused(false)
    setMousePos({ x: 0, y: 0 })
  }

  const handleCta = (cat) => {
    onSelectCategory?.(cat)
    document.getElementById('trending')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured collections"
    >
      <div className="hero-wash" />

      <button
        type="button"
        className="hero-arrow hero-prev"
        aria-label="Previous slide"
        onClick={() => move(-1)}
      >
        <ChevronLeft size={20} />
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          className="hero-content"
          key={`content-${index}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.4 }}
        >
          <span className="eyebrow">{slide.eyebrow}</span>
          <h1>{slide.title}</h1>
          <p>{slide.description}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => handleCta(slide.category)}
          >
            {slide.button} <ArrowRight size={17} />
          </button>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          className="hero-visual"
          key={`visual-${index}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.45 }}
        >
          <div
            className="hero-3d-stage"
            style={{
              transform: `perspective(1200px) rotateY(${-6 + mousePos.x * 10}deg) rotateX(${-mousePos.y * 8}deg)`,
            }}
          >
            <div className="hero-image-frame">
              <img src={slide.image} alt={`${slide.category} collection`} />
            </div>

            <span
              className="floating-note"
              style={{
                transform: `translateZ(65px) rotate(6deg) translate3d(${mousePos.x * -12}px, ${mousePos.y * -10}px, 0)`,
              }}
            >
              {slide.note}
            </span>

            <span
              className="hero-sparkle sparkle-one"
              style={{
                transform: `translateZ(85px) translate3d(${mousePos.x * 18}px, ${mousePos.y * 14}px, 0)`,
              }}
            >
              ✧
            </span>

            <span
              className="hero-sparkle sparkle-two"
              style={{
                transform: `translateZ(60px) translate3d(${mousePos.x * 12}px, ${mousePos.y * 10}px, 0)`,
              }}
            >
              ✦
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      <button
        type="button"
        className="hero-arrow hero-next"
        aria-label="Next slide"
        onClick={() => move(1)}
      >
        <ChevronRight size={20} />
      </button>

      <div className="hero-dots" role="tablist" aria-label="Slide indicators">
        {slides.map((s, i) => (
          <button
            type="button"
            key={s.category}
            role="tab"
            className={i === index ? 'dot active-dot' : 'dot'}
            aria-label={`Slide ${i + 1}: ${s.category}`}
            aria-selected={i === index}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  )
}

// ─── SectionHeading ─────────────────────────────────────────────────────────
function SectionHeading({ title, subtitle, icon, link = 'View All', onLinkClick }) {
  return (
    <div className="section-heading">
      <div>
        <h2>{icon && <span>{icon}</span>}{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      <a href="#trending" onClick={onLinkClick}>
        {link} <ArrowRight size={15} />
      </a>
    </div>
  )
}

// ─── Categories ─────────────────────────────────────────────────────────────
function Categories({ activeCategory, onSelectCategory }) {
  const handleClick = (name) => {
    onSelectCategory?.(name)
    document.getElementById('trending')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <section className="section categories-section" id="categories">
      <SectionHeading
        title="Shop by Category"
        subtitle="Explore our wide range of products"
        icon={<Sparkles size={20} />}
        onLinkClick={(e) => {
          e.preventDefault()
          handleClick('All')
        }}
      />

      <div className="category-grid">
        {categories.map(([name, emoji, count]) => (
          <button
            type="button"
            className={`category-card ${activeCategory === name ? 'category-active' : ''}`}
            key={name}
            onClick={() => handleClick(name)}
            aria-label={`Filter by ${name}`}
          >
            <div className="category-art">
              <span>{emoji}</span><i>✧</i>
            </div>
            <strong>{name}</strong>
            <small>({count})</small>
          </button>
        ))}
      </div>
    </section>
  )
}

// ─── ProductCard ────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onAdd,
  onBuyNow,
  isWishlisted,
  onWishlist,
  addingId,
  wishlistingId,
  onOpenDetails,
}) {
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    shineX: 50,
    shineY: 50,
    isHovered: false,
  })

  const cardRef = useRef(null)

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch') return

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    setTilt({
      rotateX: Number((((centerY - y) / centerY) * 11).toFixed(2)),
      rotateY: Number((((x - centerX) / centerX) * 11).toFixed(2)),
      shineX: Number(((x / rect.width) * 100).toFixed(1)),
      shineY: Number(((y / rect.height) * 100).toFixed(1)),
      isHovered: true,
    })
  }

  const handlePointerLeave = () => {
    setTilt({
      rotateX: 0,
      rotateY: 0,
      shineX: 50,
      shineY: 50,
      isHovered: false,
    })
  }

  const isAdding = addingId === product.id
  const isWishlisting = wishlistingId === product.id
  const outOfStock = product.stock === 0

  return (
    <article
      ref={cardRef}
      className={`product-card ${tilt.isHovered ? 'card-hovered' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: tilt.isHovered
          ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-8px) translateZ(15px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) translateZ(0)',
      }}
    >
      <div
        className="product-card-shine"
        style={{
          opacity: tilt.isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0) 65%)`,
        }}
        aria-hidden="true"
      />

      <div
        className="product-image-wrap"
        onClick={() => onOpenDetails?.(product)}
        style={{ cursor: 'pointer' }}
        title={`View details of ${product.name}`}
      >
        <img
          loading="lazy"
          src={product.image_url || product.image}
          alt={product.name || 'Product'}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80'
          }}
        />

        {(product.discount_pct || product.discount) && (
          <span className="discount-badge">
            -{product.discount_pct || product.discount}%
          </span>
        )}

        {outOfStock && (
          <span className="out-of-stock-badge">Out of Stock</span>
        )}

        <button
          type="button"
          className={`wishlist-button ${isWishlisted ? 'wishlisted' : ''}`}
          aria-label={
            isWishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          onClick={(e) => {
            e.stopPropagation()
            onWishlist(product)
          }}
          disabled={isWishlisting}
        >
          <Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="product-info">
        <small className="product-category">{product.category || 'General'}</small>
        <h3
          onClick={() => onOpenDetails?.(product)}
          style={{ cursor: 'pointer' }}
          title={product.name}
        >
          {product.name || 'Product'}
        </h3>

        {product.rating != null && (
          <div className="rating">
            <span>
              <Star size={12} fill="currentColor" /> {product.rating}
            </span>
            <small>({product.reviews_count ?? product.reviews ?? 0})</small>
          </div>
        )}

        <div className="price-line">
          <strong>{money(product.price)}</strong>
          {(product.original_price || product.old) && (
            <del>{money(product.original_price || product.old)}</del>
          )}
        </div>

        <div className="product-card-actions">
          <button
            type="button"
            className="add-cart-button"
            onClick={() => onAdd(product)}
            disabled={isAdding || outOfStock}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdding
              ? 'Adding…'
              : outOfStock
                ? 'Out of Stock'
                : 'Add to Cart'}
          </button>

          <button
            type="button"
            className="buy-now-button"
            onClick={() => onBuyNow?.(product)}
            disabled={isAdding || outOfStock}
            aria-label={`Buy ${product.name} now`}
          >
            {outOfStock ? 'Unavailable' : 'Buy Now'}
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Trending ───────────────────────────────────────────────────────────────
function Trending({
  filter,
  setFilter,
  searchQuery,
  onAdd,
  onBuyNow,
  wishlistIds,
  onWishlist,
  addingId,
  wishlistingId,
  onOpenDetails,
  refreshTrigger,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = {
        page,
        page_size: 12,
      }

      if (filter && filter !== 'All') {
        params.category = filter
      }

      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      if (sortBy) {
        params.sort = sortBy
      }

      if (priceMin !== '') {
        const minVal = parseFloat(priceMin)
        if (!isNaN(minVal)) params.min_price = minVal
      }

      if (priceMax !== '') {
        const maxVal = parseFloat(priceMax)
        if (!isNaN(maxVal)) params.max_price = maxVal
      }

      const res = await productApi.search(params)
      const data = res?.data ?? res

      const productItems = Array.isArray(data)
        ? data
        : safeArray(data?.items ?? data?.products ?? data?.results)

      setProducts(productItems)

      const total = typeof data?.total === 'number' ? data.total : productItems.length
      const totalP =
        typeof data?.total_pages === 'number'
          ? data.total_pages
          : Math.max(1, Math.ceil(total / 12))
      setTotalPages(totalP)
    } catch (err) {
      console.error('Failed to load products:', err)
      setError(
        err?.userMessage ||
        err?.message ||
        'Unable to load products. Please check that the server is running.'
      )
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [filter, searchQuery, page, sortBy, priceMin, priceMax, refreshTrigger])

  useEffect(() => {
    setPage(1)
  }, [filter, searchQuery, sortBy, priceMin, priceMax])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const safeWishlistIds = safeArray(wishlistIds)

  return (
    <section className="section trending-section" id="trending">
      <SectionHeading
        title={searchQuery ? `Results for "${searchQuery}"` : 'Trending Products'}
        subtitle={
          filter === 'All'
            ? 'Most loved items this week'
            : `Showing products in ${filter}`
        }
        icon="🔥"
        link={filter !== 'All' || searchQuery ? 'Show All' : 'View All'}
        onLinkClick={(e) => {
          e.preventDefault()
          setFilter('All')
        }}
      />

      <div className="product-filters" role="tablist" aria-label="Product filters">
        {filterOptions.map((f) => (
          <button
            type="button"
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={filter === f ? 'filter-active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="product-sort-row">
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="Sort products"
        >
          <option value="">Sort: Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name">Name: A–Z</option>
          <option value="rating">Highest Rated</option>
        </select>

        <div className="price-range-inputs">
          <input
            type="number"
            className="price-input"
            placeholder="Min ₹"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            min="0"
            aria-label="Minimum price"
          />

          <span>–</span>

          <input
            type="number"
            className="price-input"
            placeholder="Max ₹"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            min="0"
            aria-label="Maximum price"
          />

          {(priceMin || priceMax) && (
            <button
              type="button"
              className="price-clear-btn"
              onClick={() => {
                setPriceMin('')
                setPriceMax('')
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="empty-products products-error-state" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p style={{ color: '#d9534f', fontWeight: '600', marginBottom: '14px' }}>
            ⚠️ {error}
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={fetchProducts}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="products-loading">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="product-skeleton" />
          ))}
        </div>
      ) : safeArray(products).length > 0 ? (
        <div className="product-grid">
          {safeArray(products).map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={onAdd}
              onBuyNow={onBuyNow}
              isWishlisted={safeWishlistIds.includes(p.id)}
              onWishlist={onWishlist}
              addingId={addingId}
              wishlistingId={wishlistingId}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </div>
      ) : (
        <div className="empty-products">
          <p>
            No products found{filter !== 'All' ? ` in "${filter}"` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setFilter('All')
              setSortBy('')
              setPriceMin('')
              setPriceMax('')
            }}
          >
            Browse All Products
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="products-pagination">
          <button
            type="button"
            className="orders-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>

          <span>Page {page} of {totalPages}</span>

          <button
            type="button"
            className="orders-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  )
}

// ─── PromoBanners ───────────────────────────────────────────────────────────
function PromoBanners({ onSelectCategory }) {
  const handleClick = (cat) => {
    onSelectCategory?.(cat)
    document.getElementById('trending')?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  return (
    <section className="promo-grid section" id="offers">
      <button
        type="button"
        className="promo-card promo-gift"
        onClick={() => handleClick('Gifts')}
      >
        <div>
          <h3>Personalized Gifts</h3>
          <p>Make it special. Make it yours.</p>
          <span>Shop Gifts <ArrowRight size={14} /></span>
        </div>
        <b aria-hidden="true">🎁</b>
      </button>

      <button
        type="button"
        className="promo-card promo-beauty"
        onClick={() => handleClick('Beauty')}
      >
        <div>
          <h3>Beauty Essentials</h3>
          <p>Glow Every Day</p>
          <span>Shop Beauty <ArrowRight size={14} /></span>
        </div>
        <b aria-hidden="true">🌷</b>
      </button>

      <button
        type="button"
        className="promo-card promo-crafts"
        onClick={() => handleClick('Crafts')}
      >
        <div>
          <h3>Handmade Crafts</h3>
          <p>Unique · Creative · Special</p>
          <span>Shop Crafts <ArrowRight size={14} /></span>
        </div>
        <b aria-hidden="true">🎨</b>
      </button>
    </section>
  )
}

// ─── InstagramSection ──────────────────────────────────────────────────────
function InstagramSection() {
  const [qrFailed, setQrFailed] = useState(false)

  return (
    <section className="instagram-section">
      <div className="instagram-copy">
        <span>Stay Connected with</span>
        <h2>Glow <i>&</i> Glam</h2>
        <p>
          Scan the QR code to follow us on Instagram for the latest updates,
          new arrivals and more!
        </p>
      </div>

      <div className="qr-card">
        {!qrFailed && (
          <img
            src={asset('glow-and-glam-instagram-qr.png')}
            alt="Instagram QR code for @vidhyafashion06"
            onError={() => setQrFailed(true)}
          />
        )}

        <div className={`qr-placeholder ${qrFailed ? 'fallback-active' : ''}`}>
          <Instagram size={30} />
          <strong>@VIDHYAFASHION06</strong>
          <small>Add original QR to public/assets</small>
        </div>
      </div>

      <a
        className="instagram-button"
        href="https://www.instagram.com/vidhyafashion06/"
        target="_blank"
        rel="noreferrer"
      >
        <Instagram size={18} /> Follow Us on Instagram <ArrowRight size={15} />
      </a>

      <span className="instagram-script">Let's Stay<br />Connected ♡</span>
    </section>
  )
}

// ─── Benefits ───────────────────────────────────────────────────────────────
function Benefits() {
  const items = [
    [<ShieldCheck key="sc" />, 'Secure Payments', 'Safe & Encrypted'],
    [<Truck key="tr" />, 'Fast & Reliable Delivery', 'Across India'],
    [<RefreshCw key="rc" />, 'Easy Returns', 'Hassle Free'],
    [<Headset key="hs" />, 'Customer Support', "We're Here to Help"],
  ]

  return (
    <section className="benefits">
      {items.map(([icon, title, text]) => (
        <div className="benefit" key={title}>
          <span>{icon}</span>
          <div>
            <strong>{title}</strong>
            <small>{text}</small>
          </div>
        </div>
      ))}
    </section>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer({ currentUser, onOpenAuth, onOpenProfile, onOpenOrders, onOpenTrack }) {
  return (
    <footer className="footer" id="footer">
      <div className="footer-main">
        <div className="footer-brand">
          <BrandLogo footer />

          <div className="socials">
            <a
              href="https://www.instagram.com/vidhyafashion06/"
              aria-label="Instagram"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram />
            </a>
            <a href="#footer" aria-label="Facebook">f</a>
            <a href="#footer" aria-label="YouTube">▶</a>
            <a href="#footer" aria-label="Pinterest">p</a>
          </div>
        </div>

        <div>
          <h4>Quick Links</h4>
          <a href="#home">Home</a>
          <a href="#trending">Shop</a>
          <a href="#categories">Categories</a>

          {currentUser ? (
            <>
              <a
                href="#profile"
                onClick={(e) => {
                  e.preventDefault()
                  onOpenProfile()
                }}
              >
                My Account ({(currentUser.full_name || 'User').split(' ')[0]})
              </a>

              <a
                href="#orders"
                onClick={(e) => {
                  e.preventDefault()
                  onOpenOrders()
                }}
              >
                My Orders
              </a>

              <a
                href="#track"
                onClick={(e) => {
                  e.preventDefault()
                  onOpenTrack()
                }}
              >
                Track Order
              </a>
            </>
          ) : (
            <a
              href="#login"
              onClick={(e) => {
                e.preventDefault()
                onOpenAuth('login')
              }}
            >
              Customer Login / Register
            </a>
          )}

          <a href="#footer">About Us</a>
          <a href="mailto:hello@glowandglam.example">Contact</a>
        </div>

        <div>
          <h4>Categories</h4>
          <a href="#categories">Fashion</a>
          <a href="#categories">Beauty</a>
          <a href="#categories">Jewellery</a>
          <a href="#categories">Footwear</a>
          <a href="#categories">Gifts</a>
        </div>

        <div>
          <h4>Customer Service</h4>
          <a href="#footer">Shipping Policy</a>
          <a href="#footer">Returns & Refunds</a>
          <a href="#footer">FAQs</a>
          <a
            href="#track"
            onClick={(e) => {
              e.preventDefault()
              onOpenTrack()
            }}
          >
            Track Order
          </a>
        </div>

        <div>
          <h4>Payment Methods</h4>
          <div className="payment-pills">
            <span>Cash on Delivery</span>
            <span>UPI</span>
            <span>Card</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Glow & Glam. All rights reserved.</span>
        <span>Created by NandhiniSakthi ♡</span>
      </div>
    </footer>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null

  return (
    <AnimatePresence>
      <motion.div
        className="toast"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        key={toast.text + toast.icon}
      >
        {toast.icon === 'cart' && <ShoppingBag size={17} />}
        {toast.icon === 'heart-add' && <Heart size={17} fill="currentColor" />}
        {toast.icon === 'heart-remove' && <Heart size={17} />}
        {toast.icon === 'user' && <UserRound size={17} />}
        {toast.icon === 'logout' && <ShieldCheck size={17} />}
        {toast.icon === 'info' && <Sparkles size={17} />}
        {toast.icon === 'check' && <Check size={17} />}
        {toast.icon === 'order' && <Package size={17} />}
        {toast.icon === 'error' && <X size={17} />}
        <span>{toast.text}</span>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [filter, setFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalView, setAuthModalView] = useState('login')
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Modal state
  const [cartModalOpen, setCartModalOpen] = useState(false)
  const [wishlistModalOpen, setWishlistModalOpen] = useState(false)
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [ordersModalOpen, setOrdersModalOpen] = useState(false)
  const [trackModalOpen, setTrackModalOpen] = useState(false)
  const [trackOrderNumber, setTrackOrderNumber] = useState('')
  const [trackInitialOrder, setTrackInitialOrder] = useState(null)
  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [refreshProductsTrigger, setRefreshProductsTrigger] = useState(0)

  // Cart / wishlist counts
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)
  const [addingId, setAddingId] = useState(null)
  const [wishlistingId, setWishlistingId] = useState(null)
  const [wishlistIds, setWishlistIds] = useState([])

  // ── Session load on mount ────────────────────────────────────────────────
  useEffect(() => {
    let active = true

    const loadSession = async () => {
      const token = localStorage.getItem('access_token')
      if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        if (active) setCurrentUser(null)
        return
      }

      try {
        const user = await authApi.getProfile()

        if (!active || !user) return

        setCurrentUser(user)

        try {
          const cart = await cartApi.get()
          if (active) setCartCount(safeCount(cart?.total_items))
        } catch {
          // Keep existing cart count or 0 without crashing
        }

        try {
          const wishlist = await wishlistApi.get()
          if (active) {
            const items = safeArray(wishlist?.items)
            setWishlistCount(safeCount(wishlist?.total_items))
            setWishlistIds(
              items
                .map((item) => item?.product_id)
                .filter((id) => id != null)
            )
          }
        } catch {
          if (active) {
            setWishlistCount(0)
            setWishlistIds([])
          }
        }
      } catch (error) {
        if (active) {
          localStorage.removeItem('access_token')
          setCurrentUser(null)
          setCartCount(0)
        }
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  // ── Hash routing ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || ''

      if (hash === '#login') {
        setAuthModalView('login')
        setAuthModalOpen(true)
      } else if (hash === '#register' || hash === '#signup') {
        setAuthModalView('register')
        setAuthModalOpen(true)
      } else if (hash === '#forgot-password') {
        setAuthModalView('forgot')
        setAuthModalOpen(true)
      } else if (hash.startsWith('#reset-password')) {
        setAuthModalView('reset')
        setAuthModalOpen(true)
      } else if (hash === '#profile') {
        if (currentUser) setProfileModalOpen(true)
        else {
          setAuthModalView('login')
          setAuthModalOpen(true)
        }
      } else if (hash === '#cart') {
        setCartModalOpen(true)
      } else if (hash === '#orders') {
        if (currentUser) setOrdersModalOpen(true)
        else {
          setAuthModalView('login')
          setAuthModalOpen(true)
        }
      } else if (hash === '#track') {
        if (currentUser) setTrackModalOpen(true)
        else {
          setAuthModalView('login')
          setAuthModalOpen(true)
        }
      } else if (hash === '#admin') {
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.is_admin)
        if (isAdmin || currentUser) {
          setAdminModalOpen(true)
        } else {
          setAuthModalView('login')
          setAuthModalOpen(true)
        }
      }
    }

    handleHash()
    window.addEventListener('hashchange', handleHash)

    return () => window.removeEventListener('hashchange', handleHash)
  }, [currentUser])

  // ── Toast auto-dismiss ───────────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return undefined

    const timer = window.setTimeout(() => setToast(null), 3500)

    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((text, icon = 'info') => {
    setToast({ text, icon })
  }, [])

  // ── Auth handlers ────────────────────────────────────────────────────────
  const openAuth = useCallback((view = 'login') => {
    setAuthModalView(view)
    setAuthModalOpen(true)
  }, [])

  const openProfile = useCallback(() => {
    if (currentUser) setProfileModalOpen(true)
    else openAuth('login')
  }, [currentUser, openAuth])

  const handleAuthSuccess = useCallback(async (user, message) => {
    setCurrentUser(user)
    setAuthModalOpen(false)

    showToast(message || `Welcome, ${user?.full_name || 'User'}!`, 'user')

    try {
      const cart = await cartApi.get()
      setCartCount(safeCount(cart?.total_items))
    } catch {
      setCartCount(0)
    }

    try {
      const wishlist = await wishlistApi.get()
      const items = safeArray(wishlist?.items)

      setWishlistCount(safeCount(wishlist?.total_items))
      setWishlistIds(
        items
          .map((item) => item?.product_id)
          .filter((id) => id != null)
      )
    } catch {
      setWishlistCount(0)
      setWishlistIds([])
    }
  }, [showToast])

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout request failed:', error)
    }

    setCurrentUser(null)
    setProfileModalOpen(false)
    setCartCount(0)
    setWishlistCount(0)
    setWishlistIds([])

    showToast('Signed out successfully.', 'logout')
  }, [showToast])

  const handleUpdateUser = useCallback((updatedUser) => {
    setCurrentUser(updatedUser)
  }, [])

  // ── Cart handlers ───────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async (product, qty = 1) => {
    // Note: setWishlist((items) => [...items, product.id]); setCart((items) => [...items, name]);
    if (!currentUser) {
      showToast('Sign in to add items to your cart.', 'info')
      openAuth('login')
      return
    }

    if (!product || !product.id) {
      showToast('Product information is missing.', 'error')
      return
    }

    if (product.stock === 0) {
      showToast('This product is currently out of stock.', 'error')
      return
    }

    setAddingId(product.id)

    try {
      const data = await cartApi.add(product.id, qty)
      setCartCount(safeCount(data?.total_items))
      showToast(`"${product.name || 'Product'}" added to cart!`, 'cart')
    } catch (error) {
      showToast(error?.userMessage || error?.message || 'Failed to add to cart.', 'error')
    } finally {
      setAddingId(null)
    }
  }, [currentUser, openAuth, showToast])

  const handleCartChange = useCallback((newCount) => {
    setCartCount(safeCount(newCount))
  }, [])

  // ── Buy Now: add to cart then open checkout immediately ───────────────────────
  const handleBuyNow = useCallback(async (product, qty = 1) => {
    if (!currentUser) {
      showToast('Sign in to purchase items.', 'info')
      openAuth('login')
      return
    }

    if (product.stock === 0) {
      showToast('This product is currently out of stock.', 'error')
      return
    }

    setAddingId(product.id)
    try {
      const data = await cartApi.add(product.id, qty)
      setCartCount(safeCount(data?.total_items))
      // Open checkout immediately after adding
      setCartModalOpen(false)
      setCheckoutModalOpen(true)
    } catch (error) {
      showToast(error?.userMessage || error?.message || 'Failed to add to cart.', 'error')
    } finally {
      setAddingId(null)
    }
  }, [currentUser, openAuth, showToast])

  // ── Wishlist handlers ───────────────────────────────────────────────────
  const handleWishlist = useCallback(async (product) => {
    if (!currentUser) {
      showToast('Sign in to save items to your wishlist.', 'info')
      openAuth('login')
      return
    }

    setWishlistingId(product.id)

    try {
      if (wishlistIds.includes(product.id)) {
        const wishlist = await wishlistApi.get()
        const items = safeArray(wishlist?.items)

        const item = items.find(
          (entry) => entry?.product_id === product.id
        )

        if (item) {
          const data = await wishlistApi.remove(item.id)
          const updatedItems = safeArray(data?.items)

          setWishlistCount(safeCount(data?.total_items))
          setWishlistIds(
            updatedItems
              .map((entry) => entry?.product_id)
              .filter((id) => id != null)
          )

          showToast(`"${product.name}" removed from wishlist.`, 'heart-remove')
        }
      } else {
        const data = await wishlistApi.add(product.id)
        const updatedItems = safeArray(data?.items)

        setWishlistCount(safeCount(data?.total_items))
        setWishlistIds(
          updatedItems
            .map((entry) => entry?.product_id)
            .filter((id) => id != null)
        )

        showToast(`"${product.name}" added to wishlist!`, 'heart-add')
      }
    } catch (error) {
      showToast(error?.message || 'Failed to update wishlist.', 'error')
    } finally {
      setWishlistingId(null)
    }
  }, [currentUser, openAuth, showToast, wishlistIds])

  const handleWishlistChange = useCallback(async (newCount) => {
    setWishlistCount(safeCount(newCount))

    try {
      const wishlist = await wishlistApi.get()
      const items = safeArray(wishlist?.items)

      setWishlistIds(
        items
          .map((item) => item?.product_id)
          .filter((id) => id != null)
      )
    } catch (error) {
      console.error('Could not refresh wishlist:', error)
    }
  }, [])

  // ── Product Details & Admin handlers ─────────────────────────────────────
  const handleOpenProductDetails = useCallback((product) => {
    setSelectedProductId(product.id)
    setSelectedProduct(product)
    setProductDetailsModalOpen(true)
  }, [])

  const handleProductChanged = useCallback(() => {
    setRefreshProductsTrigger((prev) => prev + 1)
  }, [])

  // ── Tracking handler ────────────────────────────────────────────────────
  const handleOpenTracking = useCallback((orderNumber = '', orderData = null) => {
    if (!currentUser) {
      openAuth('login')
      return
    }
    setTrackOrderNumber(orderNumber)
    setTrackInitialOrder(orderData)
    setTrackModalOpen(true)
  }, [currentUser, openAuth])

  // ── Order placed ─────────────────────────────────────────────────────────
  const handleOrderPlaced = useCallback((order) => {
    setCartCount(0)
    showToast(
      `Order ${order?.order_number || ''} placed successfully!`,
      'order'
    )
    if (order?.order_number) {
      handleOpenTracking(order.order_number, order)
    }
  }, [showToast, handleOpenTracking])

  // ── Checkout flow ────────────────────────────────────────────────────────
  const handleCheckout = useCallback((target) => {
    if (target === 'login') {
      openAuth('login')
      return
    }

    if (!currentUser) {
      openAuth('login')
      return
    }

    setCartModalOpen(false)
    setCheckoutModalOpen(true)
  }, [currentUser, openAuth])

  const onSelectCategory = useCallback((cat) => {
    const matched = filterOptions.includes(cat) ? cat : 'All'
    setFilter(matched)
    setSearchQuery('')
  }, [])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setFilter('All')
  }, [])

  return (
    <>
      <Header
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        currentUser={currentUser}
        onOpenAuth={openAuth}
        onOpenProfile={openProfile}
        onOpenCart={() => setCartModalOpen(true)}
        onOpenWishlist={() => setWishlistModalOpen(true)}
        onOpenOrders={() => {
          if (currentUser) setOrdersModalOpen(true)
          else openAuth('login')
        }}
        onOpenTrack={() => handleOpenTracking()}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onSearch={handleSearch}
      />

      <main>
        <Hero onSelectCategory={onSelectCategory} />

        <Categories
          activeCategory={filter}
          onSelectCategory={onSelectCategory}
        />

        <Trending
          filter={filter}
          setFilter={setFilter}
          searchQuery={searchQuery}
          onAdd={handleAddToCart}
          onBuyNow={handleBuyNow}
          wishlistIds={wishlistIds}
          onWishlist={handleWishlist}
          addingId={addingId}
          wishlistingId={wishlistingId}
          onOpenDetails={handleOpenProductDetails}
          refreshTrigger={refreshProductsTrigger}
        />

        <PromoBanners onSelectCategory={onSelectCategory} />
        <InstagramSection />
        <Benefits />
      </main>

      <Footer
        currentUser={currentUser}
        onOpenAuth={openAuth}
        onOpenProfile={openProfile}
        onOpenOrders={() => {
          if (currentUser) setOrdersModalOpen(true)
          else openAuth('login')
        }}
        onOpenTrack={() => handleOpenTracking()}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialView={authModalView}
        onAuthSuccess={handleAuthSuccess}
        onShowToast={(msg) => showToast(msg, 'info')}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={currentUser}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onShowToast={(msg) => showToast(msg, 'info')}
      />

      <ProductDetailsModal
        isOpen={productDetailsModalOpen}
        productId={selectedProductId}
        initialProduct={selectedProduct}
        onClose={() => setProductDetailsModalOpen(false)}
        onAddToCart={handleAddToCart}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onWishlist={handleWishlist}
        isAdding={addingId === selectedProductId}
        isWishlisting={wishlistingId === selectedProductId}
      />

      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => {
          setAdminModalOpen(false)
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', ' ')
          }
        }}
        currentUser={currentUser}
        onProductChanged={handleProductChanged}
        onShowToast={(msg, type) => showToast(msg, type || 'info')}
      />

      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        currentUser={currentUser}
        onCartChange={handleCartChange}
        onCheckout={handleCheckout}
        onShowToast={showToast}
      />

      <WishlistModal
        isOpen={wishlistModalOpen}
        onClose={() => setWishlistModalOpen(false)}
        currentUser={currentUser}
        onCartChange={handleCartChange}
        onShowToast={showToast}
        onOpenAuth={openAuth}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        currentUser={currentUser}
        onOrderPlaced={handleOrderPlaced}
        onShowToast={showToast}
      />

      <OrdersModal
        isOpen={ordersModalOpen}
        onClose={() => setOrdersModalOpen(false)}
        currentUser={currentUser}
        onShowToast={showToast}
        onTrackOrder={(orderNumber, order) => handleOpenTracking(orderNumber, order)}
      />

      <OrderTrackingModal
        isOpen={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        initialOrderNumber={trackOrderNumber}
        initialOrder={trackInitialOrder}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      <Toast toast={toast} />
    </>
  )
}
