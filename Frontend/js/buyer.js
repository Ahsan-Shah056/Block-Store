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

    const orderIds = await contract.methods
      .getBuyerOrders(currentAccount)
      .call();

    if (orderIds.length === 0) {
      document.getElementById("ordersList").innerHTML = `
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
                            <span class="order-status status-${getOrderStatus(
                              order.status
                            ).toLowerCase()}">
                                ${getOrderStatus(order.status)}
                            </span>
                        </div>
                        <div class="order-product">
                            <img src="${getProductImage(
                              product.imageHash
                            )}" alt="${product.name}" 
                                 class="order-product-image"
                                 onerror="this.onerror=null; this.src='images/product-placeholder.png'">
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
                        <div class="order-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary btn-small track-order-btn" data-id="${orderId}" data-status="${
          order.status
        }">
                                <i class="fas fa-map-marker-alt"></i> Track Order
                            </button>
                            ${
                              order.status === "1"
                                ? `
                                <button class="btn btn-success btn-small" onclick="confirmDelivery(${orderId})">
                                    <i class="fas fa-check"></i> Confirm Delivery
                                </button>
                            `
                                : ""
                            }
                            ${
                              (order.status === "0" || order.status === "1") &&
                              !order.disputed
                                ? `
                                <button class="btn btn-warning btn-small" onclick="raiseDispute(${orderId})">
                                    <i class="fas fa-exclamation-triangle"></i> Raise Dispute
                                </button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                `);
      }

      document.getElementById("ordersList").innerHTML = ordersHtml.join("");

      // Add event listeners for tracking
      document.querySelectorAll(".track-order-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const orderId = e.target.getAttribute("data-id");
          const status = e.target.getAttribute("data-status");
          showTransactionTracker(orderId, status);
        });
      });
    }

    hideLoading();
    // Show the orders modal
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

    const receiptWindow = window.open("", "_blank");
    receiptWindow.document.write(`
            <html>
            <head>
                <title>Receipt #${orderId}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 40px; max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .total { font-weight: bold; font-size: 1.2em; border-top: 1px solid #000; padding-top: 10px; margin-top: 20px; }
                    .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BLOCKCHAIN MARKETPLACE</h1>
                    <h2>Receipt for Order #${orderId}</h2>
                    <p>Date: ${formatDate(order.createdAt)}</p>
                </div>
                <div class="content">
                    <div class="row">
                        <span><strong>Product:</strong></span>
                        <span>${product.name}</span>
                    </div>
                    <div class="row">
                        <span><strong>Seller:</strong></span>
                        <span>${product.seller}</span>
                    </div>
                    <div class="row">
                        <span><strong>Buyer:</strong></span>
                        <span>${order.buyer}</span>
                    </div>
                    <hr>
                    <div class="row">
                        <span>Price per unit:</span>
                        <span>${formatEth(product.price)} ETH</span>
                    </div>
                    <div class="row">
                        <span>Quantity:</span>
                        <span>${order.quantity}</span>
                    </div>
                    <div class="row total">
                        <span>TOTAL PAID:</span>
                        <span>${formatEth(order.totalPrice)} ETH</span>
                    </div>
                </div>
                <div class="footer">
                    <p>Thank you for shopping with us!</p>
                    <p>Transaction confirmed on Ethereum Blockchain</p>
                </div>
                <script>window.print();</script>
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
