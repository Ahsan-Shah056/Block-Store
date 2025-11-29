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

    // Initialize Theme
    initTheme();

    // Setup event listeners
    setupEventListeners();

    // Initialize Dashboard Charts
    initDashboard();

    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        console.log('❌ MetaMask not installed');
        showToast('Please install MetaMask to access seller dashboard!', 'error');
    } else {
        console.log('✅ MetaMask detected. Click "Connect Wallet" to access your dashboard.');
        showToast('Please connect your wallet to access seller features', 'info');
    }
});

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.classList.replace('fa-moon', 'fa-sun');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        if (isDark) {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    }
}

let salesChartInstance = null;
let categoryChartInstance = null;

async function initDashboard() {
    if (!currentAccount) return;
    await loadDashboardData();
}

async function loadDashboardData() {
    try {
        console.log("📊 Loading dashboard data...");
        const totalOrders = await contract.methods.orderCounter().call();
        console.log(`Total orders in contract: ${totalOrders}`);
        
        const salesByMonth = new Array(12).fill(0);
        const salesByCategory = new Array(6).fill(0); 
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        let escrowAmount = BigInt(0);

        const productSales = {}; // Map: productId -> {name, sales}

        // Iterate all orders
        for (let i = 1; i <= totalOrders; i++) {
            const order = await contract.methods.orders(i).call();
            
            if (order.seller.toLowerCase() === currentAccount.toLowerCase()) {
                console.log(`✅ Match found: Order #${i}`);
                
                // Sales stats
                const date = new Date(parseInt(order.createdAt) * 1000);
                const month = date.getMonth();
                const amountEth = parseFloat(web3.utils.fromWei(order.sellerAmount, 'ether'));
                
                salesByMonth[month] += amountEth;
                
                // Top Products Logic
                const product = await contract.methods.products(order.productId).call();
                if (!productSales[product.id]) {
                    productSales[product.id] = { name: product.name, sales: 0 };
                }
                productSales[product.id].sales += parseInt(order.quantity); // Count units sold

                // Calculate Escrow
                if (order.status !== '3' && order.status !== '4') {
                    escrowAmount += BigInt(order.sellerAmount);
                }
            }
        }
        
        // Prepare Top Products Data
        const sortedProducts = Object.values(productSales).sort((a, b) => b.sales - a.sales).slice(0, 5);
        const topProductLabels = sortedProducts.map(p => p.name);
        const topProductData = sortedProducts.map(p => p.sales);

        // Update Sales Chart (Bar Chart is better for monthly revenue)
        const salesCtx = document.getElementById('salesChart');
        if (salesCtx) {
            if (salesChartInstance) salesChartInstance.destroy();
            
            salesChartInstance = new Chart(salesCtx, {
                type: 'bar', // Changed to Bar
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Revenue (ETH)',
                        data: salesByMonth,
                        backgroundColor: '#4f46e5',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }

        // Update Top Products Chart (Horizontal Bar)
        const topProductsCtx = document.getElementById('topProductsChart');
        if (topProductsCtx) {
            if (categoryChartInstance) categoryChartInstance.destroy(); // Reuse var name or rename

            categoryChartInstance = new Chart(topProductsCtx, {
                type: 'bar',
                indexAxis: 'y', // Horizontal
                data: {
                    labels: topProductLabels,
                    datasets: [{
                        label: 'Units Sold',
                        data: topProductData,
                        backgroundColor: ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'],
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }
        
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

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

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
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

        // Display seller level/reputation
        const levelNames = ['New Seller', 'Verified Seller', 'Top Seller', 'Power Seller'];
        const sellerLevelElement = document.getElementById('sellerLevel');
        if (sellerLevelElement) {
            sellerLevelElement.textContent = levelNames[parseInt(sellerInfo.sellerLevel) || 0];
        }

        // Load products
        await loadSellerProducts();

        // Disable withdraw button if no funds
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (sellerInfo.pendingWithdrawal === '0') {
            withdrawBtn.disabled = true;
            withdrawBtn.innerHTML = '<i class="fas fa-ban"></i> No Funds';
        }

        // Load Dashboard Charts
        await loadDashboardData();

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
                             onerror="this.onerror=null; this.src='images/product-placeholder.png'">
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
    let imageHash = document.getElementById('productImage').value.trim();

    // Use placeholder if no image provided
    if (!imageHash) {
        imageHash = 'images/product-placeholder.png';
    }

    // Validation
    if (!name || !description || !priceEth || !stock) {
        showToast('Please fill in all required fields', 'error');
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
    const ordersList = document.getElementById('pendingOrdersTableBody');
    if (!ordersList) return;

    try {
        const totalOrders = await contract.methods.orderCounter().call();
        let hasOrders = false;
        ordersList.innerHTML = '';

        for (let i = 1; i <= totalOrders; i++) {
            const order = await contract.methods.orders(i).call();

            // Show orders that are NOT Completed and NOT Refunded (so Pending, Shipped, Disputed)
            if (order.seller.toLowerCase() === currentAccount.toLowerCase() && 
                (order.status === '0' || order.status === '1' || order.status === '5')) { 
                
                hasOrders = true;
                const product = await contract.methods.products(order.productId).call();
                const status = getOrderStatus(order.status);
                const statusClass = getStatusClass(order.status);
                const date = new Date(parseInt(order.createdAt) * 1000).toLocaleDateString();
                const sellerEth = web3.utils.fromWei(order.sellerAmount, 'ether');

                let actionBtn = '';
                if (order.status === '0') { // Pending
                    actionBtn = `<button class="btn btn-small btn-primary" onclick="shipOrder(${order.id})">
                                    <i class="fas fa-shipping-fast"></i> Ship
                                 </button>`;
                } else if (order.status === '1') { // Shipped
                    actionBtn = `<span class="text-muted"><i class="fas fa-clock"></i> Awaiting Delivery</span>`;
                } else if (order.status === '5') { // Disputed
                    actionBtn = `<button class="btn btn-small btn-danger" onclick="viewDispute(${order.id})">
                                    <i class="fas fa-exclamation-triangle"></i> View Dispute
                                 </button>`;
                }

                const row = `
                    <tr>
                        <td>#${order.id}</td>
                        <td>
                            <div style="display: flex; align-items: center;">
                                <img src="${getProductImage(product.imageHash)}" 
                                     alt="${product.name}" 
                                     class="order-product-image"
                                     onerror="this.onerror=null; this.src='images/product-placeholder.png'">
                                <span style="font-weight: 600;">${product.name}</span>
                            </div>
                        </td>
                        <td>
                            <span title="${order.buyer}">${order.buyer.substring(0, 6)}...${order.buyer.substring(38)}</span>
                        </td>
                        <td>${order.quantity}</td>
                        <td>${sellerEth} ETH</td>
                        <td>${date}</td>
                        <td><span class="status-badge ${statusClass}">${status}</span></td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
                ordersList.innerHTML += row;
            }
        }

        if (!hasOrders) {
            ordersList.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 2rem;">No pending orders found.</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading pending orders:", error);
        ordersList.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error loading orders.</td></tr>`;
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

    reader.onload = function (e) {
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

    reader.onerror = function () {
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

// ==================== SELLER REPUTATION ====================

async function upgradeSellerLevel() {
    if (!checkConnection()) return;

    try {
        showLoading('Updating seller level...');

        await contract.methods.updateSellerLevel()
            .send({ from: currentAccount });

        hideLoading();
        showToast('Seller level updated successfully!', 'success');

        // Reload seller data
        sellerInfo = await contract.methods.sellers(currentAccount).call();
        await loadSellerData();

    } catch (error) {
        console.error('Error updating seller level:', error);
        hideLoading();
        showToast('Failed to update seller level', 'error');
    }
}

// ==================== AUTO-RELEASE ESCROW ====================

async function autoReleaseFunds(orderId) {
    if (!checkConnection()) return;

    try {
        showLoading('Auto-releasing funds...');

        await contract.methods.autoReleaseFunds(orderId)
            .send({ from: currentAccount });

        hideLoading();
        showToast('Funds auto-released successfully!', 'success');

        // Reload pending orders
        await loadPendingOrders();

    } catch (error) {
        console.error('Error auto-releasing funds:', error);
        hideLoading();
        showToast('Failed to auto-release funds. Order may not be eligible yet.', 'error');
    }
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
