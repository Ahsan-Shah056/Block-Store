/**
 * Shopping Cart Management for BlockMarket
 * Handles cart operations and localStorage persistence
 */

// Cart state
let cart = [];
const CART_STORAGE_KEY = 'blockmarket_cart';

/**
 * Initialize cart from localStorage
 */
function initializeCart() {
    if (!currentAccount) {
        cart = [];
        updateCartUI();
        return;
    }
    const key = `${CART_STORAGE_KEY}_${currentAccount}`;
    const stored = localStorage.getItem(key);
    cart = stored ? JSON.parse(stored) : [];
    updateCartUI();
}

/**
 * Add product to cart
 */
function addToCart(productId, quantity = 1) {
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ productId: parseInt(productId), quantity: parseInt(quantity) });
    }
    
    saveCart();
    updateCartUI();
    showToast(`Added to cart! (${cart.length} items)`, 'success');
}

/**
 * Remove product from cart
 */
function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== parseInt(productId));
    saveCart();
    updateCartUI();
    showToast('Removed from cart', 'success');
}

/**
 * Update quantity in cart
 */
function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.productId === parseInt(productId));
    if (item) {
        item.quantity = parseInt(quantity);
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

/**
 * Clear entire cart
 */
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    showToast('Cart cleared', 'success');
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    if (!currentAccount) return;
    const key = `${CART_STORAGE_KEY}_${currentAccount}`;
    localStorage.setItem(key, JSON.stringify(cart));
}

/**
 * Update cart UI elements
 */
async function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartBadge = document.getElementById('cartBadge');
    
    if (cartCount) cartCount.textContent = cart.length;
    if (cartBadge) {
        cartBadge.textContent = cart.length;
        cartBadge.style.display = cart.length > 0 ? 'block' : 'none';
    }
    
    // Update cart modal if open
    if (document.getElementById('cartModal') && document.getElementById('cartModal').classList.contains('active')) {
        await loadCartDetails();
    }
}

/**
 * Load and display cart details
 */
async function loadCartDetails() {
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutCartBtn');
    
    if (!contract || cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        cartTotalElement.textContent = '0 ETH';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    
    let html = '';
    let total = 0;
    
    try {
        for (const item of cart) {
            const product = await contract.methods.products(item.productId).call();
            const productTotal = (parseFloat(web3.utils.fromWei(product.price, 'ether')) * item.quantity);
            total += productTotal;
            
            html += `
                <div class="cart-item">
                    <img src="${getProductImage(product.imageHash)}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p class="price">${formatEth(product.price)} ETH each</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="cart-item-total">
                        ${productTotal.toFixed(4)} ETH
                    </div>
                    <button class="btn-remove" onclick="removeFromCart(${item.productId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        cartItemsContainer.innerHTML = html;
        
        // Update Summary
        const subtotalElement = document.getElementById('cartSubtotal');
        const feeElement = document.getElementById('cartFee');
        
        if (subtotalElement) subtotalElement.textContent = `${total.toFixed(4)} ETH`;
        // Fee is included in price, so we can show it for info or just show 0 extra
        // Contract takes fee from the price, buyer pays Price * Qty
        if (feeElement) feeElement.textContent = 'Included'; 
        
        cartTotalElement.textContent = `${total.toFixed(4)} ETH`;
        
        if (checkoutBtn) checkoutBtn.disabled = false;
        
    } catch (error) {
        console.error('Error loading cart:', error);
        showToast('Error loading cart details', 'error');
    }
}

/**
 * Checkout cart - purchase all items
 */
/**
 * Checkout cart - purchase all items sequentially
 */
async function checkoutCart() {
    if (!checkConnection()) return;
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    try {
        showLoading(`Processing purchase of ${cart.length} items...`);
        
        // Process items sequentially
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const product = await contract.methods.products(item.productId).call();
            const totalCost = BigInt(product.price) * BigInt(item.quantity);
            
            showLoading(`Purchasing item ${i + 1} of ${cart.length}: ${product.name}...`);
            
            await contract.methods.purchaseProduct(item.productId, item.quantity)
                .send({
                    from: currentAccount,
                    value: totalCost.toString()
                });
        }
        
        hideLoading();
        showToast(`Successfully purchased all items!`, 'success');
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartUI();
        closeCartModal();
        
        // Reload products/orders
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof openOrders === 'function') setTimeout(openOrders, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Cart checkout error:', error);
        showToast('Purchase failed or cancelled: ' + error.message, 'error');
    }
}

/**
 * Open cart modal
 */
function openCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.add('active');
        loadCartDetails();
    }
}

/**
 * Close cart modal
 */
function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for wallet connection to initialize cart with correct account
    // But initialize empty first
    updateCartUI();
    
    // Add cart button listener
    const cartBtn = document.getElementById('viewCartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', openCartModal);
    }
    
    // Add checkout button listener
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkoutCart);
    }
    
    // Close modal on background click
    const cartModal = document.getElementById('cartModal');
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                closeCartModal();
            }
        });
    }
});

// Expose global functions for HTML onclick handlers
window.closeCart = closeCartModal;
window.addToCart = addToCart; // Ensure this is available

/**
 * Initialize cart from localStorage
 * Depends on currentAccount being set
 */
function initializeCart() {
    if (!currentAccount) {
        cart = [];
        updateCartUI();
        return;
    }
    const key = `${CART_STORAGE_KEY}_${currentAccount}`;
    const stored = localStorage.getItem(key);
    cart = stored ? JSON.parse(stored) : [];
    updateCartUI();
}

/**
 * Save cart to localStorage
 */
function saveCart() {
    if (!currentAccount) return;
    const key = `${CART_STORAGE_KEY}_${currentAccount}`;
    localStorage.setItem(key, JSON.stringify(cart));
}

/**
 * Checkout cart - purchase all items sequentially
 * (Since batch purchase was removed from contract)
 */
async function checkoutCart() {
    if (!checkConnection()) return;
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    try {
        showLoading(`Processing purchase of ${cart.length} items...`);
        
        // Process items sequentially
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const product = await contract.methods.products(item.productId).call();
            
            // Pre-checks
            if (!product.isActive) {
                throw new Error(`Product "${product.name}" is no longer active`);
            }
            if (parseInt(product.stock) < item.quantity) {
                throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
            }
            if (product.seller.toLowerCase() === currentAccount.toLowerCase()) {
                throw new Error(`You cannot buy your own product "${product.name}". Please switch to a different account.`);
            }

            const totalCost = BigInt(product.price) * BigInt(item.quantity);
            
            showLoading(`Purchasing item ${i + 1} of ${cart.length}: ${product.name}...`);
            
            // Simulate transaction first to get revert reason if any
            try {
                await contract.methods.purchaseProduct(item.productId, item.quantity)
                    .call({
                        from: currentAccount,
                        value: totalCost.toString()
                    });
            } catch (simError) {
                console.error("Simulation failed:", simError);
                // Extract reason if possible
                let reason = simError.message;
                if (simError.data && simError.data.message) {
                    reason = simError.data.message;
                } else if (simError.reason) {
                    reason = simError.reason;
                }
                throw new Error(`Transaction check failed: ${reason}`);
            }

            await contract.methods.purchaseProduct(item.productId, item.quantity)
                .send({
                    from: currentAccount,
                    value: totalCost.toString(),
                    gas: 3000000 // High gas limit to prevent out-of-gas errors
                });
        }
        
        hideLoading();
        showToast(`Successfully purchased all items!`, 'success');
        
        // Clear cart
        cart = [];
        saveCart();
        updateCartUI();
        closeCartModal();
        
        // Reload products/orders
        if (typeof loadProducts === 'function') loadProducts();
        if (typeof openOrders === 'function') setTimeout(openOrders, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Cart checkout error:', error);
        showToast('Purchase failed or cancelled: ' + error.message, 'error');
    }
}
