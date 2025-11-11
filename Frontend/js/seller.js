/**
 * Seller Interface JavaScript
 * Handles seller registration, product management, and order fulfillment
 */

let sellerInfo = null;
let sellerProducts = [];
let pendingOrders = [];
let currentEditProductId = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Seller dashboard loaded');
    
    // Setup event listeners
    setupEventListeners();
    
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        console.log('❌ MetaMask not installed');
        showToast('Please install MetaMask to access seller dashboard!', 'error');
    } else {
        console.log('✅ MetaMask detected. Click "Connect Wallet" to access your dashboard.');
        showToast('Please connect your wallet to access seller features', 'info');
    }
});

function setupEventListeners() {
    // Registration
    const registerBtn = document.getElementById('registerSellerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerSeller);
    }
    
    // Withdraw
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', withdrawEarnings);
    }
    
    // Save product
    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'products') {
        document.getElementById('productsTab').classList.add('active');
    } else if (tabName === 'orders') {
        document.getElementById('ordersTab').classList.add('active');
        loadPendingOrders();
    }
}

// ==================== SELLER STATUS ====================

async function checkSellerStatus() {
    try {
        const isRegistered = await contract.methods.isRegisteredSeller(currentAccount).call();
        
        if (isRegistered) {
            // Load seller info
            sellerInfo = await contract.methods.sellers(currentAccount).call();
            showDashboard();
            await loadSellerData();
        } else {
            showRegistration();
        }
    } catch (error) {
        console.error('Error checking seller status:', error);
        showToast('Failed to load seller status', 'error');
    }
}

function showRegistration() {
    document.getElementById('registrationSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
    document.getElementById('registrationSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

// ==================== SELLER REGISTRATION ====================

async function registerSeller() {
    if (!checkConnection()) return;
    
    const storeName = document.getElementById('storeName').value.trim();
    
    if (!storeName) {
        showToast('Please enter a store name', 'error');
        return;
    }
    
    try {
        showLoading('Registering as seller...');
        
        await contract.methods.registerSeller(storeName)
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Successfully registered as seller!', 'success');
        
        // Reload page to show dashboard
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('Error registering seller:', error);
        hideLoading();
        showToast('Failed to register as seller', 'error');
    }
}

// ==================== LOAD SELLER DATA ====================

async function loadSellerData() {
    try {
        // Update seller name
        document.getElementById('sellerName').textContent = sellerInfo.name;
        
        // Update statistics
        document.getElementById('sellerTotalEarnings').textContent = 
            formatEth(sellerInfo.totalEarnings);
        document.getElementById('sellerPendingWithdrawal').textContent = 
            formatEth(sellerInfo.pendingWithdrawal);
        document.getElementById('sellerTotalSales').textContent = 
            sellerInfo.totalSales;
        
        // Load products
        await loadSellerProducts();
        
        // Disable withdraw button if no funds
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (sellerInfo.pendingWithdrawal === '0') {
            withdrawBtn.disabled = true;
            withdrawBtn.innerHTML = '<i class="fas fa-ban"></i> No Funds';
        }
        
    } catch (error) {
        console.error('Error loading seller data:', error);
        showToast('Failed to load seller data', 'error');
    }
}

async function loadSellerProducts() {
    try {
        const productIds = await contract.methods.getSellerProducts(currentAccount).call();
        
        document.getElementById('sellerTotalProducts').textContent = productIds.length;
        
        if (productIds.length === 0) {
            document.getElementById('productsTableBody').innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray); margin-bottom: 10px;"></i>
                        <p style="color: var(--gray);">No products yet. Click "Add New Product" to get started!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        sellerProducts = [];
        const rows = [];
        
        for (const productId of productIds) {
            const product = await contract.methods.products(productId).call();
            sellerProducts.push(product);
            
            rows.push(`
                <tr>
                    <td><strong>#${product.id}</strong></td>
                    <td>
                        <img src="${getProductImage(product.imageHash)}" 
                             alt="${product.name}" 
                             class="product-table-image"
                             onerror="this.src='https://via.placeholder.com/60/667eea/ffffff?text=Product'">
                    </td>
                    <td><strong>${product.name}</strong></td>
                    <td>${formatEth(product.price)}</td>
                    <td>${product.stock}</td>
                    <td>${product.totalSales}</td>
                    <td>
                        <div class="stars" style="font-size: 0.85rem;">
                            ${generateStarRating(product.rating)}
                        </div>
                        <small>${(product.rating / 100).toFixed(1)} (${product.totalRatings})</small>
                    </td>
                    <td>
                        <span class="badge badge-${product.isActive ? 'success' : 'danger'}">
                            ${product.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-small btn-secondary" 
                                onclick="editProduct(${product.id})"
                                style="margin-bottom: 5px;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-small ${product.isActive ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleProduct(${product.id})">
                            <i class="fas fa-${product.isActive ? 'eye-slash' : 'eye'}"></i>
                            ${product.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                </tr>
            `);
        }
        
        document.getElementById('productsTableBody').innerHTML = rows.join('');
        
    } catch (error) {
        console.error('Error loading seller products:', error);
        showToast('Failed to load products', 'error');
    }
}

// ==================== PRODUCT MANAGEMENT ====================

function openAddProductModal() {
    currentEditProductId = null;
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add New Product';
    document.getElementById('productForm').reset();
    
    // Reset image inputs
    document.getElementById('imageFileInput').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('imageUrlContainer').style.display = 'none';
    
    // Hide preview
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('removeImageBtn').style.display = 'none';
    
    document.getElementById('productModal').classList.add('active');
}

function editProduct(productId) {
    currentEditProductId = productId;
    const product = sellerProducts.find(p => p.id == productId);
    
    if (!product) return;
    
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = formatEth(product.price);
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.imageHash;
    
    // Reset file input (can't edit uploaded files directly)
    document.getElementById('imageFileInput').value = '';
    
    // If it's a URL, show in URL input
    if (product.imageHash && !product.imageHash.startsWith('data:image')) {
        document.getElementById('productImageUrl').value = product.imageHash;
    }
    
    // Show preview
    const preview = document.getElementById('previewImg');
    preview.src = getProductImage(product.imageHash);
    preview.style.display = 'block';
    document.getElementById('removeImageBtn').style.display = 'block';
    
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentEditProductId = null;
}

async function saveProduct() {
    if (!checkConnection()) return;
    
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const category = document.getElementById('productCategory').value;
    const priceEth = document.getElementById('productPrice').value;
    const stock = document.getElementById('productStock').value;
    const imageHash = document.getElementById('productImage').value.trim();
    
    // Validation
    if (!name || !description || !priceEth || !stock || !imageHash) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (parseFloat(priceEth) <= 0) {
        showToast('Price must be greater than 0', 'error');
        return;
    }
    
    if (parseInt(stock) <= 0) {
        showToast('Stock must be greater than 0', 'error');
        return;
    }
    
    try {
        const priceWei = toWei(priceEth);
        
        if (currentEditProductId) {
            // Update existing product
            showLoading('Updating product...');
            
            await contract.methods.updateProduct(
                currentEditProductId,
                name,
                description,
                imageHash,
                priceWei,
                stock
            ).send({ from: currentAccount });
            
            showToast('Product updated successfully!', 'success');
        } else {
            // Add new product
            showLoading('Adding product...');
            
            await contract.methods.addProduct(
                name,
                description,
                imageHash,
                priceWei,
                stock,
                category
            ).send({ from: currentAccount });
            
            showToast('Product added successfully!', 'success');
        }
        
        hideLoading();
        closeProductModal();
        
        // Reload products
        await loadSellerData();
        
    } catch (error) {
        console.error('Error saving product:', error);
        hideLoading();
        showToast('Failed to save product', 'error');
    }
}

async function toggleProduct(productId) {
    if (!checkConnection()) return;
    
    try {
        showLoading('Updating product status...');
        
        await contract.methods.toggleProductStatus(productId)
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Product status updated!', 'success');
        
        // Reload products
        await loadSellerData();
        
    } catch (error) {
        console.error('Error toggling product:', error);
        hideLoading();
        showToast('Failed to update product status', 'error');
    }
}

// ==================== ORDERS MANAGEMENT ====================

async function loadPendingOrders() {
    try {
        showLoading('Loading pending orders...');
        
        // Get all orders and filter for this seller
        const totalOrders = await contract.methods.orderCounter().call();
        const orders = [];
        
        for (let i = 1; i <= totalOrders; i++) {
            const order = await contract.methods.orders(i).call();
            
            // Only show pending orders for this seller
            if (order.seller.toLowerCase() === currentAccount.toLowerCase() && 
                order.status === '0') {
                const product = await contract.methods.products(order.productId).call();
                orders.push({ orderId: i, order, product });
            }
        }
        
        hideLoading();
        
        const ordersList = document.getElementById('pendingOrdersList');
        
        if (orders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <p>No pending orders</p>
                </div>
            `;
            return;
        }
        
        ordersList.innerHTML = orders.map(({ orderId, order, product }) => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">Order #${orderId}</span>
                    <span class="order-status status-pending">Pending</span>
                </div>
                <div class="order-product">
                    <img src="${getProductImage(product.imageHash)}" 
                         alt="${product.name}" 
                         class="order-product-image"
                         onerror="this.src='https://via.placeholder.com/80/667eea/ffffff?text=Product'">
                    <div style="flex: 1;">
                        <h4>${product.name}</h4>
                        <p>Quantity: ${order.quantity}</p>
                        <p style="color: var(--primary); font-weight: 600;">
                            Your Earning: ${formatEth(order.sellerAmount)} ETH
                        </p>
                        <p style="font-size: 0.85rem; color: var(--gray);">
                            Buyer: ${order.buyer.substring(0, 10)}...${order.buyer.substring(38)}
                        </p>
                        <p style="font-size: 0.85rem; color: var(--gray);">
                            Ordered: ${formatDate(order.createdAt)}
                        </p>
                    </div>
                </div>
                <div class="order-actions">
                    <button class="btn btn-success" onclick="markAsShipped(${orderId})">
                        <i class="fas fa-shipping-fast"></i> Mark as Shipped
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading pending orders:', error);
        hideLoading();
        showToast('Failed to load orders', 'error');
    }
}

async function markAsShipped(orderId) {
    if (!checkConnection()) return;
    
    try {
        showLoading('Marking order as shipped...');
        
        await contract.methods.markOrderAsShipped(orderId)
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Order marked as shipped!', 'success');
        
        // Reload orders
        await loadPendingOrders();
        
    } catch (error) {
        console.error('Error marking order as shipped:', error);
        hideLoading();
        showToast('Failed to mark order as shipped', 'error');
    }
}

// ==================== WITHDRAW EARNINGS ====================

async function withdrawEarnings() {
    if (!checkConnection()) return;
    
    if (sellerInfo.pendingWithdrawal === '0') {
        showToast('No funds available to withdraw', 'error');
        return;
    }
    
    try {
        showLoading('Withdrawing earnings...');
        
        await contract.methods.withdrawEarnings()
            .send({ from: currentAccount });
        
        hideLoading();
        showToast('Earnings withdrawn successfully!', 'success');
        
        // Reload seller data
        sellerInfo = await contract.methods.sellers(currentAccount).call();
        await loadSellerData();
        await updateWalletUI();
        
    } catch (error) {
        console.error('Error withdrawing earnings:', error);
        hideLoading();
        showToast('Failed to withdraw earnings', 'error');
    }
}

// ==================== IMAGE UPLOAD FUNCTIONS ====================

/**
 * Handle image file upload and convert to base64
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (JPG, PNG, GIF)', 'error');
        return;
    }
    
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
        showToast('Image size must be less than 2MB', 'error');
        return;
    }
    
    // Show loading
    const preview = document.getElementById('previewImg');
    preview.style.display = 'none';
    
    // Read file as base64
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        
        // Store in hidden input
        document.getElementById('productImage').value = base64Image;
        
        // Show preview
        preview.src = base64Image;
        preview.style.display = 'block';
        document.getElementById('removeImageBtn').style.display = 'block';
        
        // Hide URL input if shown
        document.getElementById('imageUrlContainer').style.display = 'none';
        
        showToast('Image uploaded successfully!', 'success');
    };
    
    reader.onerror = function() {
        showToast('Failed to read image file', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Toggle image URL input visibility
 */
function toggleImageUrlInput() {
    const urlContainer = document.getElementById('imageUrlContainer');
    const isVisible = urlContainer.style.display !== 'none';
    
    if (isVisible) {
        urlContainer.style.display = 'none';
    } else {
        urlContainer.style.display = 'block';
        document.getElementById('productImageUrl').focus();
    }
}

/**
 * Preview image from URL
 */
function previewImageUrl() {
    const url = document.getElementById('productImageUrl').value.trim();
    
    if (!url) {
        showToast('Please enter an image URL', 'error');
        return;
    }
    
    const preview = document.getElementById('previewImg');
    
    // Store URL in hidden input
    document.getElementById('productImage').value = url;
    
    // Show preview
    preview.src = getProductImage(url);
    preview.style.display = 'block';
    document.getElementById('removeImageBtn').style.display = 'block';
    
    preview.onload = () => {
        showToast('Image preview loaded!', 'success');
    };
    
    preview.onerror = () => {
        preview.style.display = 'none';
        showToast('Failed to load image from URL. Please check the URL.', 'error');
    };
}

/**
 * Remove selected image
 */
function removeImage() {
    // Clear file input
    const fileInput = document.getElementById('imageFileInput');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Clear URL input
    const urlInput = document.getElementById('productImageUrl');
    if (urlInput) {
        urlInput.value = '';
    }
    
    // Clear hidden input
    document.getElementById('productImage').value = '';
    
    // Hide preview
    const preview = document.getElementById('previewImg');
    preview.src = '';
    preview.style.display = 'none';
    document.getElementById('removeImageBtn').style.display = 'none';
    
    showToast('Image removed', 'info');
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
