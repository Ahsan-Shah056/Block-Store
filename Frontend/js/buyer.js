/**
 * Buyer Interface JavaScript
 * Handles product browsing, shopping cart, and order management
 */

let allProducts = [];
let cart = [];
let currentProductId = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Buyer interface loaded');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load products without requiring wallet connection first
    console.log('📦 Loading products for browsing (wallet connection not required)');
    
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        console.log('❌ MetaMask not installed');
        showToast('Please install MetaMask to make purchases!', 'warning');
    } else {
        console.log('✅ MetaMask detected. Click "Connect Wallet" to make purchases.');
    }
});

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    
    // Filters
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    if (sortFilter) sortFilter.addEventListener('change', filterProducts);
    
    // Cart
    const viewCartBtn = document.getElementById('viewCartBtn');
    if (viewCartBtn) {
        viewCartBtn.addEventListener('click', openCart);
    }
    
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    
    // Orders
    const myOrdersLink = document.getElementById('myOrdersLink');
    if (myOrdersLink) {
        myOrdersLink.addEventListener('click', (e) => {
            e.preventDefault();
            openOrders();
        });
    }
    
    // Star rating
    const starRating = document.querySelector('.star-rating');
    if (starRating) {
        const stars = starRating.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', () => {
                const rating = star.getAttribute('data-value');
                starRating.setAttribute('data-rating', rating);
                updateStarDisplay(starRating, rating);
            });
            
            star.addEventListener('mouseenter', () => {
                const rating = star.getAttribute('data-value');
                updateStarDisplay(starRating, rating);
            });
        });
        
        starRating.addEventListener('mouseleave', () => {
            const currentRating = starRating.getAttribute('data-rating');
            updateStarDisplay(starRating, currentRating);
        });
    }
    
    // Submit review
    const submitReviewBtn = document.getElementById('submitReviewBtn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', submitReview);
    }
}

function updateStarDisplay(container, rating) {
    const stars = container.querySelectorAll('i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'active');
        } else {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        }
    });
}

// ==================== PLATFORM STATS ====================

async function loadPlatformStats() {
    try {
        const stats = await contract.methods.getPlatformStats().call();
        
        document.getElementById('totalProducts').textContent = stats.totalProducts;
        document.getElementById('totalOrders').textContent = stats.totalOrders;
        document.getElementById('totalSellers').textContent = stats.totalSellers;
    } catch (error) {
        console.error('Error loading platform stats:', error);
    }
}

// ==================== PRODUCTS ====================

async function loadProducts() {
    try {
        showLoading('Loading products...');
        
        const products = await contract.methods.getActiveProducts().call();
        allProducts = products;
        
        displayProducts(products);
        hideLoading();
    } catch (error) {
        console.error('Error loading products:', error);
        hideLoading();
        showToast('Failed to load products', 'error');
    }
}

function displayProducts(products) {
    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-box-open"></i>
                <p>No products available</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="openProductDetails(${product.id})">
            <img src="${getProductImage(product.imageHash)}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=Product'">
            <div class="product-content">
                <span class="product-category">${getCategoryName(product.category)}</span>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStarRating(product.rating)}
                    </div>
                    <span>(${product.totalRatings} reviews)</span>
                </div>
                <div class="product-meta">
                    <div>
                        <span class="product-price">${formatEth(product.price)} ETH</span>
                        <p class="product-stock">
                            <i class="fas fa-box"></i> ${product.stock} in stock
                        </p>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortFilter').value;
    
    let filtered = [...allProducts];
    
    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by category
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    // Sort
    switch (sortBy) {
        case 'price-low':
            filtered.sort((a, b) => parseInt(a.price) - parseInt(b.price));
            break;
        case 'price-high':
            filtered.sort((a, b) => parseInt(b.price) - parseInt(a.price));
            break;
        case 'rating':
            filtered.sort((a, b) => parseInt(b.rating) - parseInt(a.rating));
            break;
        case 'newest':
            filtered.sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
            break;
    }
    
    displayProducts(filtered);
}

// ==================== PRODUCT DETAILS MODAL ====================

async function openProductDetails(productId) {
    try {
        currentProductId = productId;
        
        const product = allProducts.find(p => p.id == productId);
        if (!product) return;
        
        // Populate modal
        document.getElementById('modalProductName').textContent = product.name;
        document.getElementById('modalProductImage').src = getProductImage(product.imageHash);
        document.getElementById('modalProductDescription').textContent = product.description;
        document.getElementById('modalProductCategory').textContent = getCategoryName(product.category);
        document.getElementById('modalProductStock').textContent = product.stock;
        document.getElementById('modalProductPrice').textContent = `${formatEth(product.price)} ETH`;
        document.getElementById('modalProductSeller').textContent = `${product.seller.substring(0, 6)}...${product.seller.substring(38)}`;
        
        // Rating
        document.getElementById('modalProductRating').innerHTML = generateStarRating(product.rating);
        document.getElementById('modalProductRatingText').textContent = `${(product.rating / 100).toFixed(1)} (${product.totalRatings} reviews)`;
        
        // Load reviews
        await loadProductReviews(productId);
        
        // Check if user can review
        const hasPurchased = await contract.methods.hasPurchased(currentAccount, productId).call();
        const addReviewSection = document.getElementById('addReviewSection');
        if (hasPurchased) {
            addReviewSection.style.display = 'block';
        } else {
            addReviewSection.style.display = 'none';
        }
        
        // Setup add to cart button
        const addToCartBtn = document.getElementById('modalAddToCartBtn');
        addToCartBtn.onclick = () => addToCart(productId);
        
        // Reset quantity
        document.getElementById('modalQuantity').value = 1;
        document.getElementById('modalQuantity').max = product.stock;
        
        // Show modal
        document.getElementById('productModal').classList.add('active');
    } catch (error) {
        console.error('Error opening product details:', error);
        showToast('Failed to load product details', 'error');
    }
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function increaseQty() {
    const input = document.getElementById('modalQuantity');
    const max = parseInt(input.max);
    const current = parseInt(input.value);
    if (current < max) {
        input.value = current + 1;
    }
}

function decreaseQty() {
    const input = document.getElementById('modalQuantity');
    const current = parseInt(input.value);
    if (current > 1) {
        input.value = current - 1;
    }
}

async function loadProductReviews(productId) {
    try {
        const reviews = await contract.methods.getProductReviews(productId).call();
        const reviewsContainer = document.getElementById('modalProductReviews');
        
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="text-center" style="color: var(--gray);">No reviews yet. Be the first to review!</p>';
            return;
        }
        
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <div>
                        <strong>${review.buyer.substring(0, 6)}...${review.buyer.substring(38)}</strong>
                        <div class="review-rating">
                            ${generateStarRating(review.rating * 100)}
                        </div>
                    </div>
                    <span class="review-date">${formatDate(review.timestamp)}</span>
                </div>
                <p class="review-comment">${review.comment}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

async function submitReview() {
    if (!checkConnection()) return;
    
    try {
        const rating = parseInt(document.querySelector('.star-rating').getAttribute('data-rating'));
        const comment = document.getElementById('reviewComment').value.trim();
        
        if (!rating || rating === 0) {
            showToast('Please select a rating', 'error');
            return;
        }
        
        if (!comment) {
            showToast('Please write a comment', 'error');
            return;
        }
        
        showLoading('Submitting review...');
        
        await contract.methods.reviewProduct(currentProductId, rating, comment)
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Review submitted successfully!', 'success');
        
        // Reload reviews
        await loadProductReviews(currentProductId);
        
        // Reset form
        document.getElementById('reviewComment').value = '';
        document.querySelector('.star-rating').setAttribute('data-rating', '0');
        updateStarDisplay(document.querySelector('.star-rating'), 0);
        
    } catch (error) {
        console.error('Error submitting review:', error);
        hideLoading();
        showToast('Failed to submit review', 'error');
    }
}

// ==================== SHOPPING CART ====================

function addToCart(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
    
    let quantity = 1;
    if (currentProductId === productId) {
        quantity = parseInt(document.getElementById('modalQuantity').value);
    }
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
            showToast('Not enough stock available', 'error');
            return;
        }
        existingItem.quantity = newQuantity;
    } else {
        if (quantity > product.stock) {
            showToast('Not enough stock available', 'error');
            return;
        }
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.imageHash,
            quantity: quantity,
            maxStock: product.stock
        });
    }
    
    updateCartCount();
    showToast(`${product.name} added to cart!`, 'success');
    
    // Close product modal if open
    if (document.getElementById('productModal').classList.contains('active')) {
        closeProductModal();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    updateCartCount();
    displayCart();
    showToast('Item removed from cart', 'success');
}

function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id == productId);
    if (!item) return;
    
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        showToast('Not enough stock available', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    displayCart();
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalItems;
}

function openCart() {
    displayCart();
    document.getElementById('cartModal').classList.add('active');
}

function closeCart() {
    document.getElementById('cartModal').classList.remove('active');
}

function displayCart() {
    const cartItems = document.getElementById('cartItems');
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        document.getElementById('cartSubtotal').textContent = '0 ETH';
        document.getElementById('cartFee').textContent = '0 ETH';
        document.getElementById('cartTotal').textContent = '0 ETH';
        document.getElementById('checkoutBtn').disabled = true;
        return;
    }
    
    // Calculate totals using BigNumber for accuracy
    let total = web3.utils.toBN(0);
    cart.forEach(item => {
        const itemPrice = web3.utils.toBN(item.price);
        const quantity = web3.utils.toBN(item.quantity);
        const itemTotal = itemPrice.mul(quantity);
        total = total.add(itemTotal);
    });
    
    // Display items
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${getProductImage(item.image)}" alt="${item.name}" class="cart-item-image"
                 onerror="this.src='https://via.placeholder.com/100/667eea/ffffff?text=Product'">
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${formatEth(item.price)} ETH each</p>
                <div class="quantity-selector" style="margin-top: 10px;">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxStock}" 
                           onchange="updateCartQuantity(${item.id}, parseInt(this.value))" 
                           style="width: 60px;">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
            </div>
            <div>
                <p style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">
                    ${formatEth(web3.utils.toBN(item.price).mul(web3.utils.toBN(item.quantity)).toString())} ETH
                </p>
                <button class="btn btn-danger btn-small" onclick="removeFromCart(${item.id})" 
                        style="margin-top: 10px;">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
    
    // Update summary (note: platform fee is deducted by contract internally from seller's earnings)
    document.getElementById('cartSubtotal').textContent = formatEth(total.toString()) + ' ETH';
    document.getElementById('cartFee').textContent = '2% (deducted from seller)';
    document.getElementById('cartTotal').textContent = formatEth(total.toString()) + ' ETH';
    document.getElementById('checkoutBtn').disabled = false;
}

async function checkout() {
    if (!checkConnection()) return;
    
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    
    try {
        showLoading('Processing checkout...');
        
        console.log('🛒 Starting checkout with cart:', cart);
        console.log('👤 Current account:', currentAccount);
        console.log('📍 Contract address:', contract._address);
        
        // Verify connection and get fresh account
        const accounts = await web3.eth.getAccounts();
        console.log('🔍 All available accounts:', accounts);
        
        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask.');
        }
        
        // Always use the checksummed address from getAccounts
        // Compare using lowercase to avoid case mismatch issues
        if (accounts[0].toLowerCase() !== currentAccount.toLowerCase()) {
            console.warn('⚠️ Account mismatch! Updating to:', accounts[0]);
        }
        
        // Use the checksummed address for the transaction
        currentAccount = web3.utils.toChecksumAddress(accounts[0]);
        console.log('📝 Using checksummed address:', currentAccount);
        
        // Check balance
        const balance = await web3.eth.getBalance(currentAccount);
        console.log('💰 Account balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
        
        // Process each item in cart
        for (const item of cart) {
            console.log('📦 Processing item:', item);
            
            // Use Web3 BigNumber to handle large numbers properly
            const itemPrice = web3.utils.toBN(item.price);
            const quantity = web3.utils.toBN(item.quantity);
            const totalPrice = itemPrice.mul(quantity);
            
            console.log('💰 Total price for item:', totalPrice.toString(), 'wei');
            console.log('💰 Total price in ETH:', web3.utils.fromWei(totalPrice.toString(), 'ether'), 'ETH');
            console.log('📝 Calling purchaseProduct with:', {
                productId: item.id,
                quantity: item.quantity,
                value: totalPrice.toString(),
                from: currentAccount
            });
            
            // First, let's verify the product details from the contract
            try {
                const product = await contract.methods.products(item.id).call();
                console.log('📦 Product details from contract:', {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    stock: product.stock,
                    seller: product.seller,
                    isActive: product.isActive
                });
                
                // Check if trying to buy own product
                if (product.seller.toLowerCase() === currentAccount.toLowerCase()) {
                    throw new Error('⚠️ You cannot buy your own products! Current account: ' + currentAccount + ' is the seller of this product.');
                }
                
                // Check if product is active
                if (!product.isActive) {
                    throw new Error('Product is not active');
                }
                
                // Check stock
                if (parseInt(product.stock) < item.quantity) {
                    throw new Error(`Not enough stock. Available: ${product.stock}, Requested: ${item.quantity}`);
                }
                
                // Verify price matches
                if (product.price !== item.price) {
                    console.warn('⚠️ Price mismatch! Cart:', item.price, 'Contract:', product.price);
                    // Update with contract price
                    const correctPrice = web3.utils.toBN(product.price);
                    const correctTotal = correctPrice.mul(quantity);
                    console.log('🔄 Using correct price:', correctTotal.toString(), 'wei');
                    
                    const receipt = await contract.methods.purchaseProduct(item.id, item.quantity)
                        .send({ 
                            from: currentAccount,
                            value: correctTotal.toString(),
                            gas: 300000
                        });
                    console.log('✅ Purchase successful for item', item.id, '- Receipt:', receipt);
                    return;
                }
                
            } catch (verifyError) {
                console.error('❌ Pre-purchase verification failed:', verifyError);
                throw verifyError;
            }
            
            // First, try to estimate gas and catch any revert errors
            console.log('🧪 Testing transaction with estimateGas...');
            let gasEstimate;
            try {
                gasEstimate = await contract.methods.purchaseProduct(item.id, item.quantity)
                    .estimateGas({
                        from: currentAccount,
                        value: totalPrice.toString()
                    });
                console.log('✅ Gas estimate:', gasEstimate);
            } catch (estimateError) {
                console.error('❌ Gas estimation failed (transaction would revert):', estimateError);
                throw new Error('Transaction simulation failed: ' + (estimateError.message || 'Unknown reason'));
            }
            
            try {
                console.log('📤 Sending transaction...');
                console.log('Transaction params:', {
                    from: currentAccount,
                    value: totalPrice.toString(),
                    gas: Math.ceil(gasEstimate * 1.5) // Add 50% buffer to estimated gas
                });
                
                const receipt = await contract.methods.purchaseProduct(item.id, item.quantity)
                    .send({ 
                        from: currentAccount,
                        value: totalPrice.toString(),
                        gas: Math.ceil(gasEstimate * 1.5) // Use estimated gas + 50% buffer
                    });
                    
                console.log('✅ Purchase successful for item', item.id, '- Receipt:', receipt);
            } catch (itemError) {
                console.error('❌ Error purchasing item:', item.id, itemError);
                console.error('Full error object:', JSON.stringify(itemError, null, 2));
                
                // Try to extract revert reason
                let revertReason = 'Unknown error';
                
                if (itemError.message) {
                    console.log('Error message:', itemError.message);
                    revertReason = itemError.message;
                }
                
                if (itemError.data && itemError.data.message) {
                    console.log('Error data message:', itemError.data.message);
                    revertReason = itemError.data.message;
                }
                
                // Try to decode revert reason from data
                if (itemError.data && typeof itemError.data === 'string') {
                    try {
                        // Remove '0x' and 'Reverted ' prefix if present
                        let errorData = itemError.data.replace('0x', '').replace('Reverted ', '');
                        console.log('Error data (hex):', errorData);
                        
                        // Try to decode as string
                        if (errorData.length > 8) {
                            const reason = web3.utils.hexToAscii('0x' + errorData);
                            console.log('Decoded revert reason:', reason);
                            revertReason = reason;
                        }
                    } catch (decodeError) {
                        console.log('Could not decode error data:', decodeError);
                    }
                }
                
                // Show more specific error
                let errorMessage = 'Purchase failed';
                if (revertReason.includes('insufficient funds')) {
                    errorMessage = 'Insufficient funds in your wallet';
                } else if (revertReason.includes('Not enough stock') || revertReason.includes('Insufficient stock')) {
                    errorMessage = `Not enough stock for ${item.name}`;
                } else if (revertReason.includes('Product not active') || revertReason.includes('not available')) {
                    errorMessage = `${item.name} is no longer available`;
                } else if (revertReason.includes('Sellers cannot buy their own products') || revertReason.includes('own products')) {
                    errorMessage = '⚠️ You cannot buy your own products! Current account: ' + currentAccount;
                } else if (revertReason.includes('user rejected') || revertReason.includes('User denied')) {
                    errorMessage = 'Transaction rejected by user';
                } else if (revertReason.includes('Incorrect payment amount')) {
                    errorMessage = 'Payment amount mismatch. Please try again.';
                } else if (revertReason.includes('execution reverted')) {
                    errorMessage = 'Transaction reverted: ' + revertReason.substring(revertReason.indexOf(':') + 1).trim();
                } else {
                    errorMessage = revertReason.substring(0, 150);
                }
                
                console.log('📢 User-friendly error:', errorMessage);
                
                hideLoading();
                showToast(errorMessage, 'error');
                throw itemError;
            }
        }
        
        hideLoading();
        showToast('Purchase successful! Check "My Orders" to track delivery.', 'success');
        
        // Clear cart
        cart = [];
        updateCartCount();
        closeCart();
        
        // Reload products
        await loadProducts();
        await loadPlatformStats();
        
    } catch (error) {
        console.error('❌ Error during checkout:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            data: error.data
        });
        hideLoading();
        
        // Don't show duplicate error if already shown
        if (!error.message || !error.message.includes('Purchase failed')) {
            showToast('Purchase failed. Check console for details.', 'error');
        }
    }
}

// ==================== ORDERS ====================

async function openOrders() {
    if (!checkConnection()) return;
    
    try {
        showLoading('Loading your orders...');
        
        const orderIds = await contract.methods.getBuyerOrders(currentAccount).call();
        
        if (orderIds.length === 0) {
            document.getElementById('ordersList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>You haven't made any orders yet</p>
                </div>
            `;
        } else {
            const ordersHtml = [];
            
            for (const orderId of orderIds) {
                const order = await contract.methods.orders(orderId).call();
                const product = await contract.methods.products(order.productId).call();
                
                ordersHtml.push(`
                    <div class="order-card">
                        <div class="order-header">
                            <span class="order-id">Order #${orderId}</span>
                            <span class="order-status status-${getOrderStatus(order.status).toLowerCase()}">
                                ${getOrderStatus(order.status)}
                            </span>
                        </div>
                        <div class="order-product">
                            <img src="${getProductImage(product.imageHash)}" alt="${product.name}" 
                                 class="order-product-image"
                                 onerror="this.src='https://via.placeholder.com/80/667eea/ffffff?text=Product'">
                            <div>
                                <h4>${product.name}</h4>
                                <p>Quantity: ${order.quantity}</p>
                                <p style="color: var(--primary); font-weight: 600;">
                                    Total: ${formatEth(order.totalPrice)} ETH
                                </p>
                                <p style="font-size: 0.85rem; color: var(--gray);">
                                    Ordered on: ${formatDate(order.createdAt)}
                                </p>
                            </div>
                        </div>
                        ${order.status === '1' ? `
                            <div class="order-actions">
                                <button class="btn btn-success" onclick="confirmDelivery(${orderId})">
                                    <i class="fas fa-check"></i> Confirm Delivery
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `);
            }
            
            document.getElementById('ordersList').innerHTML = ordersHtml.join('');
        }
        
        hideLoading();
        document.getElementById('ordersModal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading orders:', error);
        hideLoading();
        showToast('Failed to load orders', 'error');
    }
}

function closeOrders() {
    document.getElementById('ordersModal').classList.remove('active');
}

async function confirmDelivery(orderId) {
    if (!checkConnection()) return;
    
    try {
        showLoading('Confirming delivery...');
        
        await contract.methods.confirmDelivery(orderId)
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Delivery confirmed! Funds released to seller.', 'success');
        
        // Reload orders
        closeOrders();
        setTimeout(() => openOrders(), 1000);
        
    } catch (error) {
        console.error('Error confirming delivery:', error);
        hideLoading();
        showToast('Failed to confirm delivery', 'error');
    }
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
