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
    let totalWei = BigInt(0);
    
    try {
        for (const item of cart) {
            const product = await contract.methods.products(item.productId).call();
            const itemTotalWei = BigInt(product.price) * BigInt(item.quantity);
            totalWei += itemTotalWei;
            
            const productTotalEth = parseFloat(web3.utils.fromWei(itemTotalWei.toString(), 'ether'));
            
            html += `
                <div class="cart-item">
                    <img src="${getProductImage(product.imageHash, product.name)}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;" onerror="this.src='images/product-placeholder.png'">
                    <div class="cart-item-info">
                        <h4>${product.name}</h4>
                        <p class="price">${formatEth(product.price)} ETH <small>${formatUSD(formatEth(product.price))}</small> each</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button onclick="updateCartQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="cart-item-total">
                        ${productTotalEth.toFixed(4)} ETH<br><small style="font-size: 0.8em; color: var(--text-muted);">${formatUSD(productTotalEth)}</small>
                    </div>
                    <button class="btn-remove" onclick="removeFromCart(${item.productId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        cartItemsContainer.innerHTML = html;
        
        // Calculate Discount
        let discountWei = BigInt(0);
        try {
            discountWei = BigInt(await contract.methods.calculateDiscount(totalWei.toString(), currentAccount).call());
        } catch (err) {
            console.warn("Error checking discount:", err);
        }

        const finalPriceWei = totalWei - discountWei;
        const totalEth = parseFloat(web3.utils.fromWei(totalWei.toString(), 'ether'));
        const discountEth = parseFloat(web3.utils.fromWei(discountWei.toString(), 'ether'));
        const finalEth = parseFloat(web3.utils.fromWei(finalPriceWei.toString(), 'ether'));
        
        // Update Summary
        const subtotalElement = document.getElementById('cartSubtotal');
        const feeElement = document.getElementById('cartFee');
        
        if (subtotalElement) subtotalElement.innerHTML = `${totalEth.toFixed(4)} ETH <small>${formatUSD(totalEth)}</small>`;
        if (feeElement) feeElement.textContent = 'Included'; 
        
        // Inject Discount Row if applicable
        const summaryContainer = document.querySelector('.cart-summary');
        const existingDiscountRow = document.getElementById('cartDiscountRow');
        if (existingDiscountRow) existingDiscountRow.remove();

        if (discountWei > 0) {
            const discountRow = document.createElement('div');
            discountRow.id = 'cartDiscountRow';
            discountRow.className = 'summary-row discount';
            discountRow.style.color = '#10b981';
            discountRow.style.display = 'flex';
            discountRow.style.justifyContent = 'space-between';
            discountRow.style.marginBottom = '10px';
            discountRow.innerHTML = `
                <span>VIP Discount:</span>
                <span>-${discountEth.toFixed(4)} ETH <small>${formatUSD(discountEth)}</small></span>
            `;
            // Insert before total (which is usually the last element or close to it)
            // We need to find where to insert. 
            // Assuming structure: Subtotal -> Fee -> HR -> Total
            // We can insert after Fee.
            if (feeElement && feeElement.parentElement) {
                feeElement.parentElement.after(discountRow);
            }
        }
        
        cartTotalElement.innerHTML = `${finalEth.toFixed(4)} ETH <br><small style="font-size: 0.6em; color: var(--text-muted); font-weight: normal;">${formatUSD(finalEth)}</small>`;
        
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

            // Call purchaseProduct (which handles VIP discounts)
            // We pass the product object (from contract call) and quantity
            // Note: product object from contract has string values, purchaseProduct expects that.
            const success = await purchaseProduct(product, item.quantity);
            
            if (!success) {
                throw new Error(`Failed to purchase "${product.name}"`);
            }
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

async function purchaseProduct(product, quantity) {
    try {
        const totalPriceWei = BigInt(product.price) * BigInt(quantity);
        let finalPriceWei = totalPriceWei;
        let useDiscountFunction = false;

        try {
            const discountWei = await contract.methods.calculateDiscount(totalPriceWei.toString(), currentAccount).call();
            if (BigInt(discountWei) > BigInt(0)) {
                console.log(`🎉 VIP Discount found: ${web3.utils.fromWei(discountWei, 'ether')} ETH`);
                finalPriceWei = totalPriceWei - BigInt(discountWei);
                useDiscountFunction = true;
                showToast(`Applying VIP Discount! New Price: ${web3.utils.fromWei(finalPriceWei.toString(), 'ether')} ETH`, 'info');
            }
        } catch (err) {
            console.warn("Error checking discount:", err);
        }

        // Simulate transaction first
        try {
            if (useDiscountFunction) {
                await contract.methods.purchaseWithTokenDiscount(product.id, quantity, 0)
                    .call({ from: currentAccount, value: finalPriceWei.toString() });
            } else {
                await contract.methods.purchaseProduct(product.id, quantity)
                    .call({ from: currentAccount, value: totalPriceWei.toString() });
            }
        } catch (simError) {
            console.error("Simulation failed:", simError);
            let errorMessage = "Transaction simulation failed";
            if (simError.message && simError.message.includes("Internal JSON-RPC error")) {
                 errorMessage = "Transaction failed: Check if you have enough funds or if the product is still available.";
            } else {
                 errorMessage = simError.message || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Send Transaction
        if (useDiscountFunction) {
            await contract.methods.purchaseWithTokenDiscount(product.id, quantity, 0)
                .send({ from: currentAccount, value: finalPriceWei.toString(), gas: 3000000 });
        } else {
            await contract.methods.purchaseProduct(product.id, quantity)
                .send({ from: currentAccount, value: totalPriceWei.toString(), gas: 3000000 });
        }
        
        return true;

    } catch (error) {
        console.error("Purchase error:", error);
        // Don't throw here, return false so checkoutCart can handle it
        return false;
    }
}
