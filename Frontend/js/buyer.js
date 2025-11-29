/**
 * Buyer Interface JavaScript
 * Handles product browsing, shopping cart, and order management
 */

let allProducts = [];
// Cart is handled by shopping-cart.js
let currentProductId = null;

// ==================== INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Buyer interface loaded");

  // Initialize Theme
  initTheme();

  // Setup event listeners
  setupEventListeners();

  // Initialize web3 for read-only access (products can be browsed without wallet)
  if (typeof window.ethereum !== "undefined") {
    web3 = new Web3(window.ethereum);
    const initialized = await initWeb3();
    if (initialized) {
      console.log("📦 Loading products for browsing...");
      await loadProducts();
      await loadPlatformStats();
    }
  } else {
    console.log("❌ MetaMask not installed - cannot load products");
    showToast("Please install MetaMask to browse products!", "warning");
  }
});

function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    const icon = document.querySelector("#themeToggle i");
    if (icon) icon.classList.replace("fa-moon", "fa-sun");
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const icon = document.querySelector("#themeToggle i");
  if (icon) {
    if (isDark) {
      icon.classList.replace("fa-moon", "fa-sun");
    } else {
      icon.classList.replace("fa-sun", "fa-moon");
    }
  }
}

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", filterProducts);
  }

  // Filters
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const priceRange = document.getElementById("priceRange");

  if (categoryFilter) categoryFilter.addEventListener("change", filterProducts);
  if (sortFilter) sortFilter.addEventListener("change", filterProducts);
  if (priceRange) {
    priceRange.addEventListener("input", (e) => {
      document.getElementById(
        "priceValue"
      ).textContent = `${e.target.value} ETH`;
      filterProducts();
    });
  }

  // Theme Toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Cart buttons handled by shopping-cart.js

  // Orders
  const myOrdersLink = document.getElementById("myOrdersLink");
  if (myOrdersLink) {
    myOrdersLink.addEventListener("click", (e) => {
      e.preventDefault();
      openOrders();
    });
  }

  // Star rating
  const starRating = document.querySelector(".star-rating");
  if (starRating) {
    const stars = starRating.querySelectorAll("i");
    stars.forEach((star) => {
      star.addEventListener("click", () => {
        const rating = star.getAttribute("data-value");
        starRating.setAttribute("data-rating", rating);
        updateStarDisplay(starRating, rating);
      });

      star.addEventListener("mouseenter", () => {
        const rating = star.getAttribute("data-value");
        updateStarDisplay(starRating, rating);
      });
    });

    starRating.addEventListener("mouseleave", () => {
      const currentRating = starRating.getAttribute("data-rating");
      updateStarDisplay(starRating, currentRating);
    });
  }

  // Submit review
  const submitReviewBtn = document.getElementById("submitReviewBtn");
  if (submitReviewBtn) {
    submitReviewBtn.addEventListener("click", submitReview);
  }
}

function updateStarDisplay(container, rating) {
  const stars = container.querySelectorAll("i");
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.remove("far");
      star.classList.add("fas", "active");
    } else {
      star.classList.remove("fas", "active");
      star.classList.add("far");
    }
  });
}

// ==================== PLATFORM STATS ====================

async function loadPlatformStats() {
  try {
    const stats = await contract.methods.getPlatformStats().call();

    document.getElementById("totalProducts").textContent = stats.totalProducts;
    document.getElementById("totalOrders").textContent = stats.totalOrders;
    document.getElementById("totalSellers").textContent = stats.totalSellers;
  } catch (error) {
    console.error("Error loading platform stats:", error);
  }
}

// ==================== PRODUCTS ====================

async function loadProducts() {
  try {
    showSkeletonLoading();

    const products = await contract.methods.getActiveProducts().call();
    allProducts = products;

    displayProducts(products);
    // hideSkeletonLoading is handled by replacing innerHTML in displayProducts
  } catch (error) {
    console.error("Error loading products:", error);
    document.getElementById("productsGrid").innerHTML =
      '<p class="text-center">Failed to load products</p>';
    showToast("Failed to load products", "error");
  }
}

function showSkeletonLoading() {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = Array(4)
    .fill(0)
    .map(
      () => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div style="padding: 1.5rem;">
                <div class="skeleton skeleton-text title"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        </div>
    `
    )
    .join("");
}

function displayProducts(products) {
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <i class="fas fa-box-open"></i>
                <p>No products available</p>
            </div>
        `;
    return;
  }

  grid.innerHTML = products
    .map(
      (product) => `
        <div class="product-card" onclick="openProductDetails(${product.id})">
            <img src="${getProductImage(product.imageHash)}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.onerror=null; this.src='images/product-placeholder.png'">
            <div class="product-content">
                <span class="product-category">${getCategoryName(
                  product.category
                )}</span>
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
                        <span class="product-price">${formatEth(
                          product.price
                        )} ETH</span>
                        <p class="product-stock">
                            <i class="fas fa-box"></i> ${product.stock} in stock
                        </p>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart(${
                      product.id
                    })">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function filterProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const sortBy = document.getElementById("sortFilter").value;
  const maxPrice = parseFloat(document.getElementById("priceRange").value);

  let filtered = [...allProducts];

  // Filter by search
  if (searchTerm) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by category
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  // Filter by price
  filtered = filtered.filter(
    (p) => parseFloat(web3.utils.fromWei(p.price, "ether")) <= maxPrice
  );

  // Sort
  switch (sortBy) {
    case "price-low":
      filtered.sort((a, b) => parseInt(a.price) - parseInt(b.price));
      break;
    case "price-high":
      filtered.sort((a, b) => parseInt(b.price) - parseInt(a.price));
      break;
    case "rating":
      filtered.sort((a, b) => parseInt(b.rating) - parseInt(a.rating));
      break;
    case "newest":
      filtered.sort((a, b) => parseInt(b.createdAt) - parseInt(a.createdAt));
      break;
  }

  displayProducts(filtered);
}

// ==================== PRODUCT DETAILS MODAL ====================

async function openProductDetails(productId) {
  try {
    currentProductId = productId;

    const product = allProducts.find((p) => p.id == productId);
    if (!product) return;

    // Populate modal
    document.getElementById("modalProductName").textContent = product.name;
    document.getElementById("modalProductImage").src = getProductImage(
      product.imageHash
    );
    document.getElementById("modalProductDescription").textContent =
      product.description;
    document.getElementById("modalProductCategory").textContent =
      getCategoryName(product.category);
    document.getElementById("modalProductStock").textContent = product.stock;
    document.getElementById("modalProductPrice").textContent = `${formatEth(
      product.price
    )} ETH`;
    document.getElementById(
      "modalProductSeller"
    ).textContent = `${product.seller.substring(
      0,
      6
    )}...${product.seller.substring(38)}`;

    // Rating
    document.getElementById("modalProductRating").innerHTML =
      generateStarRating(product.rating);
    document.getElementById("modalProductRatingText").textContent = `${(
      product.rating / 100
    ).toFixed(1)} (${product.totalRatings} reviews)`;

    // Load reviews
    await loadProductReviews(productId);

    // Check if user can review
    const hasPurchased = await contract.methods
      .hasPurchased(currentAccount, productId)
      .call();
    const addReviewSection = document.getElementById("addReviewSection");
    if (hasPurchased) {
      addReviewSection.style.display = "block";
    } else {
      addReviewSection.style.display = "none";
    }

    // Setup add to cart button
    const addToCartBtn = document.getElementById("modalAddToCartBtn");
    addToCartBtn.onclick = () => addProductToCart(productId);

    // Reset quantity
    document.getElementById("modalQuantity").value = 1;
    document.getElementById("modalQuantity").max = product.stock;

    // Show modal
    document.getElementById("productModal").classList.add("active");
  } catch (error) {
    console.error("Error opening product details:", error);
    showToast("Failed to load product details", "error");
  }
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("active");
}

function increaseQty() {
  const input = document.getElementById("modalQuantity");
  const max = parseInt(input.max);
  const current = parseInt(input.value);
  if (current < max) {
    input.value = current + 1;
  }
}

function decreaseQty() {
  const input = document.getElementById("modalQuantity");
  const current = parseInt(input.value);
  if (current > 1) {
    input.value = current - 1;
  }
}

async function loadProductReviews(productId) {
  try {
    const reviews = await contract.methods.getProductReviews(productId).call();
    const reviewsContainer = document.getElementById("modalProductReviews");

    if (reviews.length === 0) {
      reviewsContainer.innerHTML =
        '<p class="text-center" style="color: var(--gray);">No reviews yet. Be the first to review!</p>';
      return;
    }

    reviewsContainer.innerHTML = reviews
      .map(
        (review) => `
            <div class="review-item">
                <div class="review-header">
                    <div>
                        <strong>${review.buyer.substring(
                          0,
                          6
                        )}...${review.buyer.substring(38)}</strong>
                        <div class="review-rating">
                            ${generateStarRating(review.rating * 100)}
                        </div>
                    </div>
                    <span class="review-date">${formatDate(
                      review.timestamp
                    )}</span>
                </div>
                <p class="review-comment">${review.comment}</p>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading reviews:", error);
  }
}

async function submitReview() {
  if (!checkConnection()) return;

  try {
    const rating = parseInt(
      document.querySelector(".star-rating").getAttribute("data-rating")
    );
    const comment = document.getElementById("reviewComment").value.trim();

    if (!rating || rating === 0) {
      showToast("Please select a rating", "error");
      return;
    }

    if (!comment) {
      showToast("Please write a comment", "error");
      return;
    }

    showLoading("Submitting review...");

    await contract.methods
      .reviewProduct(currentProductId, rating, comment)
      .send({ from: currentAccount });

    hideLoading();
    showToast("Review submitted successfully! You earned 5 BMT!", "success");

    // Update wallet UI to show new token balance
    await updateWalletUI();

    // Reload reviews
    await loadProductReviews(currentProductId);

    // Reset form
    document.getElementById("reviewComment").value = "";
    document.querySelector(".star-rating").setAttribute("data-rating", "0");
    updateStarDisplay(document.querySelector(".star-rating"), 0);
  } catch (error) {
    console.error("Error submitting review:", error);
    hideLoading();
    showToast("Failed to submit review", "error");
  }
}

// ==================== SHOPPING CART ====================

// getProductImage is now in web3-init.js

function addProductToCart(productId) {
  // Delegate to shopping-cart.js
  if (typeof window.addToCart === "function") {
    // Get quantity from modal if open
    let quantity = 1;
    const modal = document.getElementById("productModal");
    if (
      modal &&
      modal.classList.contains("active") &&
      currentProductId == productId
    ) {
      quantity = parseInt(document.getElementById("modalQuantity").value) || 1;
    }

    window.addToCart(productId, quantity);

    // Close product modal if open
    if (modal && modal.classList.contains("active")) {
      closeProductModal();
    }
  } else {
    console.error("shopping-cart.js not loaded");
    showToast("Shopping cart not available", "error");
  }
}

// Checkout handled by shopping-cart.js

// ==================== ORDERS ====================

async function openOrders() {
  if (!checkConnection()) return;

  try {
    showLoading("Loading your orders...");

    const orderIds = await contract.methods.getBuyerOrders(currentAccount).call();
    const tableBody = document.getElementById("ordersTableBody");
    
    if (!tableBody) return; // Safety check

    if (orderIds.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 2rem;">
                        <div class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <p>You haven't made any orders yet</p>
                        </div>
                    </td>
                </tr>
            `;
    } else {
      tableBody.innerHTML = ''; // Clear loading state

      // Reverse loop to show newest first
      for (let i = orderIds.length - 1; i >= 0; i--) {
        const orderId = orderIds[i];
        const order = await contract.methods.orders(orderId).call();
        const product = await contract.methods.products(order.productId).call();
        
        const statusClass = getStatusClass(order.status);
        const statusText = getOrderStatus(order.status);
        const date = formatDate(order.createdAt);
        const totalEth = formatEth(order.totalPrice);

        // Actions
        let actions = `
            <button class="btn btn-secondary btn-small track-order-btn" onclick="showTransactionTracker(${orderId}, '${order.status}')" title="Track Order">
                <i class="fas fa-map-marker-alt"></i>
            </button>
        `;

        if (order.status === "1") { // Shipped
            actions += `
                <button class="btn btn-success btn-small" onclick="confirmDelivery(${orderId})" title="Confirm Delivery">
                    <i class="fas fa-check"></i>
                </button>
            `;
        }

        if ((order.status === "0" || order.status === "1") && !order.disputed) {
            actions += `
                <button class="btn btn-warning btn-small" onclick="raiseDispute(${orderId})" title="Raise Dispute">
                    <i class="fas fa-exclamation-triangle"></i>
                </button>
            `;
        }

        const row = `
            <tr>
                <td>#${orderId}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${getProductImage(product.imageHash)}" 
                             alt="${product.name}" 
                             class="order-product-image"
                             style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;"
                             onerror="this.onerror=null; this.src='images/product-placeholder.png'">
                        <span style="font-weight: 600;">${product.name}</span>
                    </div>
                </td>
                <td>${product.seller.substring(0, 6)}...</td>
                <td>${order.quantity}</td>
                <td>${totalEth} ETH</td>
                <td>${date}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${actions}
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
      }
    }

    hideLoading();
    document.getElementById("ordersModal").classList.add("active");
  } catch (error) {
    console.error("Error loading orders:", error);
    hideLoading();
    showToast("Failed to load orders", "error");
  }
}


function showTransactionTracker(orderId, status) {
  const tracker = document.getElementById("transactionTracker");
  tracker.style.display = "block";
  tracker.scrollIntoView({ behavior: "smooth" });

  // Update stepper
  const steps = ["ordered", "shipped", "delivered", "completed"];
  const statusMap = { 0: 0, 1: 1, 2: 2, 3: 3 }; // Ordered, Shipped, Delivered, Refunded? Wait, check contract.
  // Assuming: 0=Ordered, 1=Shipped, 2=Delivered

  const currentStepIndex = statusMap[status] || 0;

  steps.forEach((step, index) => {
    const el = document.getElementById(`step-${step}`);
    if (el) {
      el.classList.remove("active", "completed");
      if (index < currentStepIndex) el.classList.add("completed");
      if (index === currentStepIndex) el.classList.add("active");
    }
  });

  // Setup receipt button
  const receiptBtn = document.getElementById("downloadReceiptBtn");
  receiptBtn.onclick = () => generateReceipt(orderId);
}

function closeTracker() {
  document.getElementById("transactionTracker").style.display = "none";
}

async function generateReceipt(orderId) {
  try {
    const order = await contract.methods.orders(orderId).call();
    const product = await contract.methods.products(order.productId).call();
    
    // Calculate values
    const priceEth = parseFloat(web3.utils.fromWei(product.price, 'ether'));
    const totalEth = parseFloat(web3.utils.fromWei(order.totalPrice, 'ether'));
    const subtotal = priceEth * order.quantity;
    const discount = subtotal - totalEth;
    
    const receiptWindow = window.open("", "_blank");
    receiptWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt #${orderId}</title>
                <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    
                    :root {
                        --primary: #4f46e5;
                        --text-dark: #111827;
                        --text-gray: #6b7280;
                        --bg-light: #f9fafb;
                        --border: #e5e7eb;
                    }
                    
                    body {
                        font-family: 'Inter', sans-serif;
                        background-color: #f3f4f6;
                        margin: 0;
                        padding: 40px;
                        color: var(--text-dark);
                        -webkit-print-color-adjust: exact;
                    }
                    
                    .receipt-card {
                        background: white;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        border-radius: 16px;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    }
                    
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid var(--bg-light);
                    }
                    
                    .brand {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .brand-icon {
                        width: 40px;
                        height: 40px;
                        background: var(--primary);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                    }
                    
                    .brand-name {
                        font-size: 24px;
                        font-weight: 800;
                        color: var(--text-dark);
                        letter-spacing: -0.5px;
                    }
                    
                    .receipt-meta {
                        text-align: right;
                    }
                    
                    .receipt-label {
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: var(--text-gray);
                        font-weight: 600;
                        margin-bottom: 4px;
                    }
                    
                    .receipt-id {
                        font-size: 18px;
                        font-weight: 700;
                        color: var(--text-dark);
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 40px;
                        margin-bottom: 40px;
                    }
                    
                    .info-group h3 {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: var(--text-gray);
                        margin-bottom: 8px;
                    }
                    
                    .info-group p {
                        margin: 0;
                        font-size: 14px;
                        font-weight: 500;
                        line-height: 1.5;
                    }
                    
                    .address-hash {
                        font-family: 'Monaco', 'Consolas', monospace;
                        font-size: 12px;
                        color: var(--text-gray);
                        background: var(--bg-light);
                        padding: 4px 8px;
                        border-radius: 4px;
                        display: inline-block;
                    }
                    
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    
                    .items-table th {
                        text-align: left;
                        padding: 12px 0;
                        font-size: 12px;
                        text-transform: uppercase;
                        color: var(--text-gray);
                        border-bottom: 2px solid var(--border);
                    }
                    
                    .items-table td {
                        padding: 20px 0;
                        border-bottom: 1px solid var(--border);
                        font-size: 14px;
                    }
                    
                    .product-cell {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .product-thumb {
                        width: 40px;
                        height: 40px;
                        border-radius: 6px;
                        object-fit: cover;
                        background: var(--bg-light);
                    }
                    
                    .text-right { text-align: right; }
                    
                    .summary-section {
                        display: flex;
                        justify-content: flex-end;
                        margin-bottom: 40px;
                    }
                    
                    .summary-box {
                        width: 300px;
                    }
                    
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        font-size: 14px;
                        color: var(--text-gray);
                    }
                    
                    .summary-row.total {
                        border-top: 2px solid var(--text-dark);
                        margin-top: 12px;
                        padding-top: 16px;
                        font-weight: 800;
                        font-size: 20px;
                        color: var(--text-dark);
                    }
                    
                    .discount { color: #10b981; }
                    
                    .footer {
                        text-align: center;
                        margin-top: 60px;
                        padding-top: 20px;
                        border-top: 1px solid var(--border);
                        color: var(--text-gray);
                        font-size: 12px;
                    }
                    
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        background: var(--bg-light);
                        color: var(--text-dark);
                    }
                    
                    .action-bar {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    
                    .btn-download {
                        background: var(--primary);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        transition: background 0.2s;
                    }
                    
                    .btn-download:hover {
                        background: #4338ca;
                    }
                    
                    @media print {
                        body { background: white; padding: 0; }
                        .receipt-card { box-shadow: none; padding: 20px; }
                        .action-bar { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="action-bar">
                    <button class="btn-download" onclick="downloadPDF()">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                </div>
                
                <div class="receipt-card" id="receipt-content">
                    <div class="header">
                        <div class="brand">
                            <div class="brand-icon"><i class="fas fa-cube"></i></div>
                            <div class="brand-name">BlockMarket</div>
                        </div>
                        <div class="receipt-meta">
                            <div class="receipt-label">Receipt</div>
                            <div class="receipt-id">#${orderId}</div>
                            <div class="status-badge" style="margin-top: 8px;">
                                ${getOrderStatus(order.status)}
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-group">
                            <h3>Billed To</h3>
                            <p>Ethereum Wallet</p>
                            <span class="address-hash">${order.buyer}</span>
                        </div>
                        <div class="info-group">
                            <h3>Order Details</h3>
                            <p>Date: ${formatDate(order.createdAt)}</p>
                            <p>Seller: ${product.seller.substring(0, 8)}...</p>
                        </div>
                    </div>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th width="50%">Item</th>
                                <th width="15%" class="text-right">Qty</th>
                                <th width="20%" class="text-right">Price</th>
                                <th width="15%" class="text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div class="product-cell">
                                        <img src="${getProductImage(product.imageHash)}" class="product-thumb" onerror="this.style.display='none'">
                                        <div>
                                            <strong>${product.name}</strong>
                                            <div style="font-size: 12px; color: #6b7280;">Category: ${getCategoryName(product.category)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="text-right">${order.quantity}</td>
                                <td class="text-right">${priceEth.toFixed(4)} ETH</td>
                                <td class="text-right">${subtotal.toFixed(4)} ETH</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="summary-section">
                        <div class="summary-box">
                            <div class="summary-row">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(4)} ETH</span>
                            </div>
                            ${discount > 0.0001 ? `
                            <div class="summary-row discount">
                                <span>VIP Discount</span>
                                <span>-${discount.toFixed(4)} ETH</span>
                            </div>
                            ` : ''}
                            <div class="summary-row">
                                <span>Platform Fee (Included)</span>
                                <span>${(totalEth * 0.02).toFixed(4)} ETH</span>
                            </div>
                            <div class="summary-row total">
                                <span>Total Paid</span>
                                <span>${totalEth.toFixed(4)} ETH</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for shopping with BlockMarket!</p>
                        <p style="margin-top: 5px;">This is a blockchain-verified transaction.</p>
                        <p style="font-family: monospace; margin-top: 5px;">Timestamp: ${new Date().toISOString()}</p>
                    </div>
                </div>
                <script>
                    function downloadPDF() {
                        const element = document.getElementById('receipt-content');
                        const opt = {
                            margin: 10,
                            filename: 'BlockMarket_Receipt_${orderId}.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2 },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        };
                        html2pdf().set(opt).from(element).save();
                    }
                    
                    // Auto-print removed, user can choose
                </script>
            </body>
            </html>
        `);
  } catch (error) {
    console.error("Error generating receipt:", error);
    showToast("Failed to generate receipt", "error");
  }
}

function closeOrders() {
  document.getElementById("ordersModal").classList.remove("active");
}

async function confirmDelivery(orderId) {
  if (!checkConnection()) return;

  try {
    showLoading("Confirming delivery...");

    await contract.methods
      .confirmDelivery(orderId)
      .send({ from: currentAccount });

    hideLoading();
    showToast("Delivery confirmed! Funds released to seller.", "success");

    // Reload orders
    closeOrders();
    setTimeout(() => openOrders(), 1000);
  } catch (error) {
    console.error("Error confirming delivery:", error);
    hideLoading();
    showToast("Failed to confirm delivery", "error");
  }
}

async function raiseDispute(orderId) {
  if (!checkConnection()) return;

  const reason = prompt("Please describe the issue with your order:");
  if (!reason || reason.trim() === "") {
    showToast("Dispute reason is required", "error");
    return;
  }

  try {
    showLoading("Raising dispute...");

    await contract.methods
      .raiseDispute(orderId, reason)
      .send({ from: currentAccount });

    hideLoading();
    showToast(
      "Dispute raised successfully. Platform will review your case.",
      "success"
    );

    // Reload orders
    closeOrders();
    setTimeout(() => openOrders(), 1000);
  } catch (error) {
    console.error("Error raising dispute:", error);
    hideLoading();
    showToast("Failed to raise dispute", "error");
  }
}

// Close modals on outside click
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.classList.remove("active");
  }
});
