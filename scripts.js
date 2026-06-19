
// ============================================
// 1. UTILITY FUNCTIONS
// ============================================

/**
 * Utility functions used throughout the application
 */
const Utils = {
    /**
     * Generate a unique ID
     * @returns {string} - Unique ID
     */
    generateId() {
        return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Format currency in South African Rand
     * @param {number} amount - Amount to format
     * @returns {string} - Formatted currency
     */
    formatCurrency(amount) {
        return `R${amount.toFixed(2)}`;
    },

    /**
     * Get query parameter from URL
     * @param {string} param - Parameter name
     * @returns {string|null} - Parameter value
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Log events with timestamp
     * @param {string} module - Module name
     * @param {string} message - Log message
     */
    logEvent(module, message) {
        if (window.console && window.console.log) {
            console.log(`[${module}] ${new Date().toISOString()} - ${message}`);
        }
    },

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const colors = {
            success: '#4CAF50',
            error: '#d32f2f',
            warning: '#ff9800',
            info: '#2196F3'
        };
        
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${colors[type] || colors.success};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || icons.success}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem; margin-left: 10px;">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};



/**
 * Cart Manager - Handles shopping cart functionality across all pages
 */
class CartManager {
    constructor() {
        this.cart = [];
        this.cartCount = document.getElementById('cartCount');
        this.cartItems = document.getElementById('cartItems');
        this.cartTotal = document.getElementById('cartTotal');
        this.cartModal = document.getElementById('cartModal');
        
        this.loadCartFromStorage();
        this.updateCartUI();
        this.initCartEvents();
        Utils.logEvent('CartManager', 'Cart Manager initialized');
    }

    /**
     * Initialize cart events
     */
    initCartEvents() {
        // Cart toggle button
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }

        // Cart close button
        const cartClose = document.querySelector('.cart-close');
        if (cartClose) {
            cartClose.addEventListener('click', () => this.closeCart());
        }

        // Close on overlay click
        if (this.cartModal) {
            this.cartModal.addEventListener('click', (e) => {
                if (e.target === this.cartModal) {
                    this.closeCart();
                }
            });
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }

        // Keyboard shortcut (ESC to close cart)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.cartModal && this.cartModal.classList.contains('active')) {
                this.closeCart();
            }
        });
    }

    /**
     * Add product to cart
     * @param {string} productName - Name of the product
     * @param {number} price - Product price
     * @param {string} size - Product size
     * @param {string} image - Product image URL
     */
    addToCart(productName, price, size = '400ml', image = '') {
        // Ensure price is a number
        const numericPrice = typeof price === 'number' ? price : parseFloat(price);
        
        if (isNaN(numericPrice)) {
            Utils.logEvent('CartManager', `Invalid price for ${productName}`);
            return;
        }

        const existingItem = this.cart.find(item => 
            item.name === productName && item.size === size
        );
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: Utils.generateId(),
                name: productName,
                price: numericPrice,
                size: size,
                quantity: 1,
                image: image || `https://picsum.photos/seed/${productName.replace(/\s/g, '')}/100/100`
            });
        }

        this.saveCartToStorage();
        this.updateCartUI();
        Utils.showNotification(`${productName} added to cart!`, 'success');
        Utils.logEvent('CartManager', `Added ${productName} (${size}) to cart`);
    }

    /**
     * Remove item from cart
     * @param {string} id - Cart item ID
     */
    removeFromCart(id) {
        this.cart = this.cart.filter(item => item.id !== id);
        this.saveCartToStorage();
        this.updateCartUI();
        Utils.logEvent('CartManager', `Removed item ${id} from cart`);
    }

    /**
     * Update item quantity
     * @param {string} id - Cart item ID
     * @param {number} change - Change in quantity (+1 or -1)
     */
    updateQuantity(id, change) {
        const item = this.cart.find(item => item.id === id);
        if (!item) return;

        item.quantity += change;
        
        if (item.quantity <= 0) {
            this.removeFromCart(id);
        } else {
            this.saveCartToStorage();
            this.updateCartUI();
        }
    }

    /**
     * Get cart total
     * @returns {number} - Total amount
     */
    getTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    /**
     * Get total number of items in cart
     * @returns {number} - Total items count
     */
    getTotalItems() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    /**
     * Save cart to localStorage
     */
    saveCartToStorage() {
        try {
            localStorage.setItem('cocacola_cart', JSON.stringify(this.cart));
        } catch (e) {
            Utils.logEvent('CartManager', 'Failed to save cart to storage');
        }
    }

    /**
     * Load cart from localStorage
     */
    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem('cocacola_cart');
            if (saved) {
                this.cart = JSON.parse(saved);
            }
        } catch (e) {
            Utils.logEvent('CartManager', 'Failed to load cart from storage');
        }
    }

    /**
     * Update cart UI elements
     */
    updateCartUI() {
        // Update cart count badge
        if (this.cartCount) {
            const totalItems = this.getTotalItems();
            this.cartCount.textContent = totalItems;
            this.cartCount.style.display = totalItems > 0 ? 'block' : 'none';
        }

        // Update cart items list
        if (this.cartItems) {
            if (this.cart.length === 0) {
                this.cartItems.innerHTML = `
                    <div class="empty-cart" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ccc;"></i>
                        <p style="margin-top: 1rem; color: #666;">Your cart is empty</p>
                        <button class="btn" onclick="window.cartManager.closeCart()" style="margin-top: 1rem; background: #CC0000;">
                            Continue Shopping
                        </button>
                    </div>
                `;
            } else {
                this.cartItems.innerHTML = this.cart.map(item => `
                    <div class="cart-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee;">
                        <div class="cart-item-info" style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
                                <div>
                                    <h4 style="margin: 0; font-size: 0.95rem;">${item.name}</h4>
                                    <p style="margin: 3px 0 0; font-size: 0.85rem; color: #666;">${item.size} | ${Utils.formatCurrency(item.price)}</p>
                                </div>
                            </div>
                        </div>
                        <div class="cart-item-controls" style="display: flex; align-items: center; gap: 8px;">
                            <button onclick="window.cartManager.updateQuantity('${item.id}', -1)" style="background: #f0f0f0; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;">-</button>
                            <span style="min-width: 24px; text-align: center; font-weight: bold;">${item.quantity}</span>
                            <button onclick="window.cartManager.updateQuantity('${item.id}', 1)" style="background: #f0f0f0; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-weight: bold;">+</button>
                            <button onclick="window.cartManager.removeFromCart('${item.id}')" style="background: none; border: none; color: #CC0000; cursor: pointer; padding: 5px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="cart-item-total" style="font-weight: bold; min-width: 70px; text-align: right;">
                            ${Utils.formatCurrency(item.price * item.quantity)}
                        </div>
                    </div>
                `).join('') + `
                    <div class="cart-actions" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #eee;">
                        <button class="btn btn-secondary" onclick="window.cartManager.clearCart()" style="background: #f0f0f0; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer;">
                            Clear Cart
                        </button>
                        <button class="btn" onclick="window.cartManager.checkout()" style="background: #CC0000; color: white; border: none; padding: 10px 30px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                            Proceed to Checkout
                        </button>
                    </div>
                `;
            }
        }

        // Update cart total
        if (this.cartTotal) {
            this.cartTotal.textContent = Utils.formatCurrency(this.getTotal());
        }
    }

    /**
     * Toggle cart visibility
     */
    toggleCart() {
        if (this.cartModal) {
            this.cartModal.classList.toggle('active');
            document.body.style.overflow = this.cartModal.classList.contains('active') ? 'hidden' : 'auto';
        }
    }

    /**
     * Close cart
     */
    closeCart() {
        if (this.cartModal) {
            this.cartModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Clear all items from cart
     */
    clearCart() {
        if (this.cart.length === 0) {
            Utils.showNotification('Your cart is already empty!', 'info');
            return;
        }
        
        if (confirm('Are you sure you want to clear your cart?')) {
            this.cart = [];
            this.saveCartToStorage();
            this.updateCartUI();
            Utils.showNotification('Cart cleared successfully!', 'info');
            Utils.logEvent('CartManager', 'Cart cleared');
        }
    }

    /**
     * Proceed to checkout
     */
    checkout() {
        if (this.cart.length === 0) {
            Utils.showNotification('Your cart is empty! Please add items before checking out.', 'warning');
            return;
        }

        const total = this.getTotal();
        const itemsList = this.cart.map(item => 
            `${item.name} (${item.size}) x${item.quantity}`
        ).join(', ');

        // Store cart data for checkout
        localStorage.setItem('cocacola_checkout_data', JSON.stringify({
            items: this.cart,
            total: total,
            timestamp: new Date().toISOString()
        }));

        // Redirect to enquiry page with cart details
        const enquiryUrl = `enquiry.html?cart=${encodeURIComponent(itemsList)}&total=${total}`;
        window.location.href = enquiryUrl;
        
        Utils.logEvent('CartManager', `Checkout initiated - Total: ${Utils.formatCurrency(total)}`);
    }

    /**
     * Get cart data for use in other modules
     * @returns {Object} - Cart data
     */
    getCartData() {
        return {
            items: this.cart,
            total: this.getTotal(),
            totalItems: this.getTotalItems()
        };
    }
}


/**
 * SEO Manager - Handles SEO enhancements
 */
class SEOManager {
    constructor() {
        this.initSEO();
        Utils.logEvent('SEOManager', 'SEO Manager initialized');
    }

    initSEO() {
        this.updateMetaTags();
        this.addStructuredData();
        this.optimizeImages();
        this.setupInternalLinks();
        this.addMobileMetaTags();
    }

    updateMetaTags() {
        const page = this.getCurrentPage();
        const seoData = {
            index: {
                title: 'Coca-Cola® - Refreshing the World Since 1886 | Official South Africa',
                description: 'Discover Coca-Cola\'s iconic beverages and rich heritage. Enjoy the taste that has been refreshing the world since 1886.',
                keywords: 'Coca-Cola, Coke, beverages, soft drinks, refreshments, South Africa'
            },
            products: {
                title: 'Coca-Cola Products - Classic, Zero Sugar, Diet, Sprite, Fanta & More',
                description: 'Explore Coca-Cola\'s refreshing beverage range including Classic, Zero Sugar, Diet Coke, Sprite, Fanta, and Cherry Coke.',
                keywords: 'Coca-Cola, Coke, Zero Sugar, Diet Coke, Sprite, Fanta, Cherry Coke, beverages'
            },
            about: {
                title: 'About Coca-Cola - Our History & Heritage',
                description: 'Learn about Coca-Cola\'s rich history from 1886 to today. Discover our journey of refreshing the world.',
                keywords: 'Coca-Cola history, heritage, Atlanta, John Pemberton, iconic brand'
            },
            contact: {
                title: 'Contact Coca-Cola - Get in Touch',
                description: 'Contact Coca-Cola South Africa. We\'d love to hear from you about our products and services.',
                keywords: 'contact Coca-Cola, customer service, South Africa, enquiries'
            },
            enquiry: {
                title: 'Enquiry - Coca-Cola South Africa',
                description: 'Submit your enquiry to Coca-Cola South Africa. We\'re here to help with your questions and feedback.',
                keywords: 'enquiry, Coca-Cola, South Africa, feedback, questions'
            }
        };

        const data = seoData[page] || seoData.index;

        // Update title
        const titleTag = document.querySelector('title');
        if (titleTag) {
            titleTag.textContent = data.title;
        }

        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = data.description;

        // Update meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = 'keywords';
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = data.keywords;

        // Update Open Graph tags
        this.updateOpenGraphTags(data);
    }

    updateOpenGraphTags(data) {
        const ogTags = [
            { property: 'og:title', content: data.title },
            { property: 'og:description', content: data.description },
            { property: 'og:type', content: 'website' },
            { property: 'og:url', content: window.location.href },
            { property: 'og:image', content: 'https://www.coca-cola.com/content/dam/one/us/en/logo/coca-cola-logo-red.png' },
            { property: 'og:site_name', content: 'Coca-Cola South Africa' }
        ];

        ogTags.forEach(tag => {
            let meta = document.querySelector(`meta[property="${tag.property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', tag.property);
                document.head.appendChild(meta);
            }
            meta.content = tag.content;
        });
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page;
    }

    addStructuredData() {
        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Coca-Cola Beverages Africa',
            'description': 'Leading beverage company in Africa, refreshing consumers with quality products.',
            'url': window.location.origin,
            'logo': 'https://www.coca-cola.com/content/dam/one/us/en/logo/coca-cola-logo-red.png',
            'contactPoint': {
                '@type': 'ContactPoint',
                'telephone': '+27-11-123-4567',
                'contactType': 'customer service',
                'availableLanguage': ['English', 'Afrikaans', 'Zulu']
            },
            'sameAs': [
                'https://www.facebook.com/CocaColaAfrica',
                'https://www.twitter.com/CocaColaAfrica',
                'https://www.instagram.com/cocacola_africa',
                'https://www.youtube.com/cocacola'
            ]
        };

        let script = document.querySelector('script[type="application/ld+json"]');
        if (!script) {
            script = document.createElement('script');
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(structuredData);
    }

    optimizeImages() {
        document.querySelectorAll('img').forEach(img => {
            if (!img.loading) {
                img.loading = 'lazy';
            }
            if (!img.alt && img.src) {
                const fileName = img.src.split('/').pop().replace(/\.[^/.]+$/, '');
                img.alt = fileName.replace(/[-_]/g, ' ') || 'Coca-Cola image';
            }
        });
    }

    setupInternalLinks() {
        document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]').forEach(link => {
            if (!link.target && link.href.indexOf('http') !== 0) {
                // Internal link - ensure it's SEO friendly
                link.addEventListener('click', (e) => {
                    Utils.logEvent('SEOManager', `Internal link clicked: ${link.href}`);
                });
            }
        });
    }

    addMobileMetaTags() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
            document.head.appendChild(meta);
        }
    }
}


class ProductTracker {
    constructor() {
        this.productClicks = [];
        this.productViews = [];
        this.sessionId = Utils.generateId();
        this.initTracking();
        Utils.logEvent('ProductTracker', 'Product Tracker initialized');
    }

    initTracking() {
        this.trackProductClicks();
        this.trackProductViews();
        this.trackScrollDepth();
        this.trackTimeOnPage();
        this.logKPISummary();
    }

    trackProductClicks() {
        const productLinks = document.querySelectorAll('[onclick*="trackProduct"]');
        productLinks.forEach(link => {
            const originalOnclick = link.getAttribute('onclick');
            link.setAttribute('data-tracked', 'true');
        });
    }

    trackProductViews() {
        const productSections = document.querySelectorAll('section[id]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    const productName = section.querySelector('h2')?.textContent || section.id;
                    if (!this.productViews.find(v => v.product === productName)) {
                        this.productViews.push({
                            product: productName,
                            timestamp: new Date().toISOString(),
                            sessionId: this.sessionId
                        });
                        Utils.logEvent('ProductTracker', `Product viewed: ${productName}`);
                    }
                }
            });
        }, { threshold: 0.5 });

        productSections.forEach(section => {
            if (section.querySelector('h2') || section.id) {
                observer.observe(section);
            }
        });
    }

    trackScrollDepth() {
        let maxScroll = 0;
        const triggered = new Set();

        window.addEventListener('scroll', () => {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercent > maxScroll) maxScroll = scrollPercent;
        });
    }

    trackTimeOnPage() {
        const startTime = Date.now();
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            localStorage.setItem('cocacola_time_on_page', timeSpent);
            Utils.logEvent('ProductTracker', `Time on page: ${timeSpent} seconds`);
        });
    }

    trackProduct(productName) {
        this.productClicks.push({
            product: productName,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            action: 'click'
        });
        Utils.logEvent('ProductTracker', `Product clicked: ${productName}`);
        this.saveToStorage();
        Utils.showNotification(`Tracking: ${productName} clicked!`, 'info');
        return false;
    }

    saveToStorage() {
        try {
            localStorage.setItem('cocacola_product_tracking', JSON.stringify({
                clicks: this.productClicks,
                views: this.productViews,
                lastUpdated: new Date().toISOString()
            }));
        } catch (e) {
            Utils.logEvent('ProductTracker', 'Failed to save tracking data');
        }
    }

    logKPISummary() {
        console.log('===== Coca-Cola KPI Summary =====');
        console.log(`Total Product Clicks: ${this.productClicks.length}`);
        console.log(`Unique Products Clicked: ${new Set(this.productClicks.map(c => c.product)).size}`);
        console.log(`Products Viewed: ${this.productViews.length}`);
        console.log(`Session ID: ${this.sessionId}`);
        console.log('================================');
    }
}

/**
 * Initialize page-specific functionality
 */
function initPage() {
    const page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

    // Initialize shared components
    const seoManager = new SEOManager();
    const productTracker = new ProductTracker();
    
    // Initialize cart manager (shared across all pages)
    if (typeof window.cartManager === 'undefined') {
        window.cartManager = new CartManager();
    }

    // Page-specific initialization
    switch(page) {
        case 'index':
            initHomePage();
            break;
        case 'products':
            initProductsPage();
            break;
        case 'about':
            initAboutPage();
            break;
        case 'contact':
            initContactPage();
            break;
        case 'enquiry':
            initEnquiryPage();
            break;
        default:
            Utils.logEvent('Init', `Unknown page: ${page}`);
    }

    Utils.logEvent('Init', `Page initialized: ${page}`);
}

/**
 * Initialize Homepage specific functionality
 */
function initHomePage() {
    Utils.logEvent('HomePage', 'Homepage initialized');
    
    // Add featured product quick add buttons
    const featuredProducts = document.querySelectorAll('.featured-product, .product-highlight');
    featuredProducts.forEach(product => {
        const productName = product.querySelector('h3')?.textContent || 'Coca-Cola Classic';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn add-to-cart-btn';
        addBtn.style.cssText = 'background: #CC0000; color: white; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; margin-top: 8px; font-size: 0.9rem;';
        addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        addBtn.onclick = () => {
            const price = product.dataset.price || 12.00;
            const size = product.dataset.size || '400ml';
            window.cartManager.addToCart(productName, parseFloat(price), size);
        };
        product.appendChild(addBtn);
    });

    // Animate welcome section on load
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.animation = 'fadeInUp 1s ease';
    }
}

/**
 * Initialize Products page specific functionality
 */
function initProductsPage() {
    Utils.logEvent('ProductsPage', 'Products page initialized');
    
    // Add add-to-cart buttons to each product section
    const productSections = document.querySelectorAll('section[id]');
    productSections.forEach(section => {
        const productName = section.querySelector('h2')?.textContent;
        if (productName && !section.querySelector('.add-to-cart-btn')) {
            // Determine size and price based on product
            let size = '400ml';
            let price = 12.00;
            
            if (productName.includes('Fanta') || productName.includes('Sprite')) {
                size = '200ml';
                price = 8.00;
            }
            if (productName.includes('Zero Sugar')) {
                price = 12.50;
            }
            if (productName.includes('Cherry')) {
                price = 13.00;
            }
            if (productName.includes('smartwater')) {
                size = '600ml';
                price = 15.00;
            }

            const addBtn = document.createElement('button');
            addBtn.className = 'btn add-to-cart-btn';
            addBtn.style.cssText = `
                background: #CC0000; 
                color: white; 
                border: none; 
                padding: 10px 25px; 
                border-radius: 5px; 
                cursor: pointer; 
                margin-top: 15px; 
                font-size: 1rem;
                font-weight: bold;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            `;
            addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
            addBtn.onmouseover = () => { addBtn.style.transform = 'scale(1.05)'; };
            addBtn.onmouseout = () => { addBtn.style.transform = 'scale(1)'; };
            addBtn.onclick = (e) => {
                e.preventDefault();
                window.cartManager.addToCart(productName, price, size);
                
                // Visual feedback on button
                addBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
                addBtn.style.background = '#4CAF50';
                setTimeout(() => {
                    addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                    addBtn.style.background = '#CC0000';
                }, 2000);
            };
            section.appendChild(addBtn);
        }
    });

    // Add keyboard navigation for product sections
    const productLinks = document.querySelectorAll('section[id] h2');
    productLinks.forEach((heading, index) => {
        heading.setAttribute('tabindex', '0');
        heading.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const section = heading.closest('section');
                const addBtn = section?.querySelector('.add-to-cart-btn');
                if (addBtn) addBtn.click();
            }
        });
    });

    // Initialize search functionality if search elements exist
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
}

/**
 * Filter products based on search
 */
function filterProducts() {
    const searchInput = document.getElementById('productSearch');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const productSections = document.querySelectorAll('section[id]');
    
    let visibleCount = 0;
    productSections.forEach(section => {
        const title = section.querySelector('h2')?.textContent?.toLowerCase() || '';
        const content = section.textContent?.toLowerCase() || '';
        const matches = title.includes(searchTerm) || content.includes(searchTerm);
        section.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount++;
    });

    // Show/hide no results message
    let noResults = document.getElementById('noResults');
    if (visibleCount === 0) {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'noResults';
            noResults.style.cssText = 'text-align: center; padding: 2rem; color: #666;';
            noResults.innerHTML = `
                <i class="fas fa-search" style="font-size: 2rem; color: #ccc;"></i>
                <p style="margin-top: 1rem;">No products found matching your search.</p>
            `;
            const container = document.querySelector('main');
            if (container) container.appendChild(noResults);
        }
        noResults.style.display = 'block';
    } else if (noResults) {
        noResults.style.display = 'none';
    }
}

/**
 * Initialize About page
 */
function initAboutPage() {
    Utils.logEvent('AboutPage', 'About page initialized');
    // Add any about page specific functionality
}

/**
 * Initialize Contact page
 */
function initContactPage() {
    Utils.logEvent('ContactPage', 'Contact page initialized');
    // Add any contact page specific functionality
}

/**
 * Initialize Enquiry page
 */
function initEnquiryPage() {
    Utils.logEvent('EnquiryPage', 'Enquiry page initialized');
    // Pre-fill enquiry form with cart data if coming from checkout
    const cartParam = Utils.getQueryParam('cart');
    const totalParam = Utils.getQueryParam('total');
    
    if (cartParam && totalParam) {
        const messageField = document.getElementById('message');
        if (messageField) {
            messageField.value = `Order: ${decodeURIComponent(cartParam)}\nTotal: R${totalParam}`;
        }
    }
}

/**
 * Performance optimization utilities
 */
class PerformanceOptimizer {
    constructor() {
        this.optimize();
        Utils.logEvent('PerformanceOptimizer', 'Performance optimization initialized');
    }

    optimize() {
        this.deferNonCriticalScripts();
        this.enableLazyLoading();
        this.optimizeEventListeners();
    }

    deferNonCriticalScripts() {
        // Defer loading of non-critical resources
        const scripts = document.querySelectorAll('script[data-defer]');
        scripts.forEach(script => {
            const src = script.src;
            if (src) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'script';
                link.href = src;
                document.head.appendChild(link);
            }
        });
    }

    enableLazyLoading() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                observer.observe(img);
            });
        }
    }

    optimizeEventListeners() {
        // Use event delegation where possible
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-track]');
            if (target) {
                const eventName = target.dataset.track;
                Utils.logEvent('PerformanceOptimizer', `Track event: ${eventName}`);
            }
        });
    }
}

/**
 * Initialize everything when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize performance optimization
    const optimizer = new PerformanceOptimizer();
    
    // Initialize page-specific functionality
    initPage();

    // Add CSS animations if not already present
    addAnimationStyles();

    // Log initialization complete
    Utils.logEvent('Init', 'All modules initialized successfully');
});

/**
 * Add animation keyframes to the document
 */
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}
