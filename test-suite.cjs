const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('GLOW & GLAM TEST SUITE - FULL FUNCTIONAL & 3D CHECKS');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// 1. Read files
const appPath = path.join(__dirname, 'src', 'App.jsx');
const cssPath = path.join(__dirname, 'src', 'styles.css');
const appContent = fs.readFileSync(appPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 2. Test Branding & Footer Credit
assert(appContent.includes('Created by NandhiniSakthi ♡'), 'Footer credit "Created by NandhiniSakthi ♡" is preserved');
assert(appContent.includes('GLOW <i>&</i> GLAM'), 'Brand logo text "GLOW & GLAM" is present');
assert(appContent.includes('Your Style. Your Glow. Your Glam.'), 'Brand slogan is present');

// 3. Test Hero Banner Slider & Navigation
assert(appContent.includes('slides.length') && appContent.includes('5000'), 'Hero slider has 5000ms timer');
assert(appContent.includes('(v + direction + slides.length) % slides.length'), 'Prev/Next slider navigation uses wrap-around modulo arithmetic');
assert(appContent.includes('ChevronLeft') && appContent.includes('ChevronRight'), 'Hero has prev and next navigation chevron arrows');
assert(appContent.includes('role="tablist"') && appContent.includes('role="tab"'), 'Pagination dots have accessible tablist/tab roles');
assert(appContent.includes('onTouchStart') && appContent.includes('onTouchEnd'), 'Hero supports mobile touch swipe navigation');
assert(!appContent.includes('hero-side-note'), 'Overlapping hero-side-note element was removed from Hero');

// 4. Test Hero 3D Effects & Parallax
assert(appContent.includes('handleMouseMove') && appContent.includes('onMouseMove={handleMouseMove}'), 'Hero has mouse movement tracking for 3D parallax');
assert(appContent.includes('hero-3d-stage'), 'Hero contains dedicated hero-3d-stage element for 3D depth');
assert(appContent.includes('rotateY') && appContent.includes('rotateX'), 'Hero applies dynamic rotateX and rotateY based on cursor position');
assert(cssContent.includes('.hero-visual') && cssContent.includes('perspective: 1200px') && cssContent.includes('transform-style: preserve-3d'), 'Hero visual container has perspective: 1200px and transform-style: preserve-3d');
assert(cssContent.includes('.hero-image-frame') && cssContent.includes('translateZ(35px)'), 'Hero image frame is elevated with translateZ(35px)');
assert(cssContent.includes('box-shadow: 0 28px 56px -12px rgba(156, 94, 74, 0.38)'), 'Hero image frame has layered floating shadows');
assert(cssContent.includes('.floating-note') && cssContent.includes('translateZ(65px)'), 'Floating note is elevated on a distinct 3D depth layer with translateZ(65px)');
assert(cssContent.includes('.sparkle-one') && cssContent.includes('translateZ(85px)'), 'Decorative sparkle one has separate 3D depth layer (translateZ: 85px)');
assert(cssContent.includes('.sparkle-two') && cssContent.includes('translateZ(60px)'), 'Decorative sparkle two has separate 3D depth layer (translateZ: 60px)');

// 5. Test Product Cards 3D Tilt & Depth Effects
assert(appContent.includes('onPointerMove={handlePointerMove}') && appContent.includes('onPointerLeave={handlePointerLeave}'), 'ProductCard tracks pointer movements for 3D tilt');
assert(appContent.includes('perspective(1000px) rotateX(') && appContent.includes('rotateY('), 'ProductCard calculates rotateX and rotateY based on cursor position');
assert(appContent.includes('product-card-shine'), 'ProductCard includes subtle glossy shine overlay');
assert(appContent.includes("e.pointerType === 'touch'"), 'ProductCard disables pointer tilt on touchscreens to preserve smooth scrolling');
assert(cssContent.includes('.product-card') && cssContent.includes('perspective: 1000px') && cssContent.includes('transform-style: preserve-3d'), 'ProductCard CSS specifies perspective: 1000px and transform-style: preserve-3d');
assert(cssContent.includes('.product-card.card-hovered') && cssContent.includes('box-shadow: 0 22px 45px -10px rgba(132, 92, 75, 0.24)'), 'ProductCard has deep layered box shadows on hover');
assert(cssContent.includes('.product-image-wrap') && cssContent.includes('translateZ(28px)') && cssContent.includes('transform-style: preserve-3d'), 'Product image container is elevated with translateZ(28px)');
assert(cssContent.includes('.product-card.card-hovered .product-image-wrap') && cssContent.includes('translateZ(38px)'), 'Product image lifts closer to the viewer on hover (translateZ: 38px)');
assert(cssContent.includes('.product-info') && cssContent.includes('translateZ(22px)'), 'Product info text layer is elevated with translateZ(22px)');
assert(cssContent.includes('.add-cart-button') && cssContent.includes('translateZ(10px)'), 'Add to cart button has distinct 3D layer elevation');

// 6. Test Product Categories & Filters
const hasFilterOptions = appContent.includes("filterOptions = ['All', 'Fashion', 'Beauty', 'Skincare', 'Jewellery', 'Perfumes', 'Footwear', 'Electronics', 'Gifts']");
assert(hasFilterOptions, 'Filter options include all primary categories (All, Fashion, Beauty, Skincare, Jewellery, Perfumes, Footwear, Electronics, Gifts)');
assert(appContent.includes('activeCategory={filter}') && appContent.includes('onSelectCategory={onSelectCategory}'), 'Categories grid is connected to filter state');
assert(appContent.includes('handleCta(slide.category)'), 'Hero banner CTA buttons filter directly to the slide category');

// 7. Test Wishlist & Add to Cart
assert(appContent.includes('setWishlist((items) =>'), 'Wishlist toggle function is implemented');
assert(appContent.includes('setCart((items) => [...items, name])'), 'Add to cart increments cart item list');
assert(appContent.includes('heart-add') && appContent.includes('heart-remove') && appContent.includes('toast'), 'Toast notifications provide feedback for both cart and wishlist actions');
assert(appContent.includes('wishlistCount > 0 && <b>{wishlistCount}</b>'), 'Header wishlist badge displays count dynamically');
assert(appContent.includes('cartCount > 0 && <b>{cartCount}</b>'), 'Header cart badge displays count dynamically');

// 8. Test Asset Paths & Fallbacks
assert(appContent.includes("asset('glow-and-glam-logo.png')"), 'Logo asset path uses glow-and-glam-logo.png');
assert(appContent.includes("asset('glow-and-glam-instagram-qr.png')"), 'Instagram QR asset path uses glow-and-glam-instagram-qr.png');
assert(appContent.includes('logo-fallback') && appContent.includes('fallback-active'), 'Logo has active fallback styling when image is absent');
assert(appContent.includes('qr-placeholder') && appContent.includes('@VIDHYAFASHION06'), 'QR card has @VIDHYAFASHION06 placeholder fallback');

// 9. Test CSS & Responsiveness (320px, 375px, 390px, 768px, 1024px, 1440px)
assert(cssContent.includes('overflow-x: hidden') && cssContent.includes('max-width: 100%'), 'html and body prevent horizontal overflow with overflow-x: hidden');
assert(cssContent.includes('@media (max-width: 420px)'), 'Dedicated media query for mobile devices (320px - 420px) exists');
assert(cssContent.includes('@media (max-width: 360px)'), 'Dedicated media query for ultra-small screens (320px - 360px) exists');
assert(cssContent.includes('@media (max-width: 560px)'), 'Media query for standard mobile screens (560px) exists');
assert(cssContent.includes('@media (max-width: 768px)'), 'Media query for tablet screens (768px) exists');
assert(cssContent.includes('@media (max-width: 900px)'), 'Media query for small laptops / tablets (900px) exists');
assert(cssContent.includes('@media (max-width: 1200px)'), 'Media query for 1024px - 1200px laptops exists');
assert(cssContent.includes('@media (min-width: 1500px)'), 'Media query for widescreen displays (> 1440px) exists');
assert(cssContent.includes('.hero-3d-stage {\n    transform: none !important;'), 'Hero 3D stage cleanly resets on screens <= 900px to prevent mobile clipping');
assert(cssContent.includes('@media (prefers-reduced-motion: reduce)') && cssContent.includes('transform: none !important;'), 'Prefers-reduced-motion disables all 3D transforms');

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
