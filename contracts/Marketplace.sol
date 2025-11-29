// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./BlockToken.sol";


/**
 * @title Decentralized Marketplace
 * @dev A multi-vendor marketplace with escrow, order tracking, and ratings
 * @author Assignment 3 - Blockchain Technology
 */
contract Marketplace {
    
    // ==================== State Variables ====================
    
    address public platformOwner;
    uint256 public platformCommissionRate = 2; // 2% commission
    uint256 public totalPlatformEarnings;
    
    BlockToken public token;
    uint256 public constant REWARD_PER_PURCHASE = 10 * 10**18;
    uint256 public constant REWARD_PER_REVIEW = 5 * 10**18;
    
    uint256 public productCounter = 0;
    uint256 public orderCounter = 0;
    uint256 public sellerCounter = 0;
    
    // ==================== VIP Tier Configuration ====================
    
    uint256 public constant BRONZE_THRESHOLD = 100 * 10**18;   // 100 BMT
    uint256 public constant SILVER_THRESHOLD = 500 * 10**18;   // 500 BMT
    uint256 public constant GOLD_THRESHOLD = 1000 * 10**18;    // 1000 BMT
    
    uint256 public constant BRONZE_DISCOUNT_BPS = 500;   // 5%
    uint256 public constant SILVER_DISCOUNT_BPS = 750;   // 7.5%
    uint256 public constant GOLD_DISCOUNT_BPS = 1000;    // 10%
    
    // ==================== Token Economics ====================
    
    uint256 public constant BURN_RATE_BPS = 100;  // 1% burn on token payments
    uint256 public totalTokensBurned = 0;
    
    // ==================== Staking Configuration ====================
    
    uint256 public constant MIN_STAKE_AMOUNT = 50 * 10**18;      // 50 BMT
    uint256 public constant VERIFIED_STAKE_REQUIREMENT = 100 * 10**18;  // 100 BMT
    uint256 public constant STAKE_COOLDOWN = 7 days;
    
    
    // ==================== Featured Listings ====================
    
    uint256 public constant FEATURE_COST_DAY = 10 * 10**18;    // 10 BMT for 24h
    uint256 public constant FEATURE_COST_WEEK = 50 * 10**18;   // 50 BMT for 7d
    uint256 public constant FEATURE_COST_MONTH = 150 * 10**18; // 150 BMT for 30d

    
    // ==================== Enums ====================
    
    enum OrderStatus { Pending, Shipped, Delivered, Completed, Cancelled, Disputed, Refunded }

    enum ProductCategory { Electronics, Clothing, Books, Home, Sports, Other }
    
    enum VIPTier { None, Bronze, Silver, Gold }
    
    enum FeatureDuration { Day, Week, Month }
    
    // ==================== Structs ====================
    
    struct Seller {
        address sellerAddress;
        string name;
        bool isRegistered;
        bool isActive;
        uint256 totalSales;
        uint256 totalEarnings;
        uint256 pendingWithdrawal;
        uint256 rating; // Average rating * 100 (for precision)
        uint256 totalRatings;
        uint256 registeredAt;
        uint256 sellerLevel; // 0: New, 1: Verified, 2: Top, 3: Power
    }

    
    struct Product {
        uint256 id;
        string name;
        string description;
        string imageHash; // IPFS hash or URL
        uint256 price;
        uint256 stock;
        ProductCategory category;
        address seller;
        bool isActive;
        uint256 totalSales;
        uint256 rating; // Average rating * 100
        uint256 totalRatings;
        uint256 createdAt;
    }
    
    struct Order {
        uint256 id;
        uint256 productId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalPrice;
        uint256 sellerAmount;
        uint256 platformFee;
        OrderStatus status;
        uint256 createdAt;
        uint256 completedAt;
        bool disputed;
    }
    
    
    struct Dispute {
        uint256 orderId;
        address buyer;
        address seller;
        string reason;
        bool resolved;
        bool refundBuyer;
    }

    
    struct Review {
        address buyer;
        uint256 rating; // 1-5
        string comment;
        uint256 timestamp;
    }
    
    struct SellerStake {
        uint256 amount;
        uint256 stakedAt;
        bool isStaked;
    }
    
    struct FeaturedListing {
        uint256 productId;
        uint256 expiresAt;
        FeatureDuration duration;
    }
    
    // ==================== Mappings ====================
    
    mapping(address => Seller) public sellers;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Review[]) public productReviews;
    mapping(uint256 => Dispute) public disputes;
    mapping(address => uint256[]) public sellerProducts;
    mapping(address => uint256[]) public buyerOrders;
    mapping(address => mapping(uint256 => bool)) public hasPurchased; // buyer => productId => purchased
    
    mapping(address => SellerStake) public sellerStakes;  // Seller staking info
    mapping(uint256 => FeaturedListing) public featuredListings;  // Featured products

    
    // ==================== Events ====================
    
    event SellerRegistered(address indexed seller, string name, uint256 timestamp);
    event ProductAdded(uint256 indexed productId, address indexed seller, string name, uint256 price);
    event ProductUpdated(uint256 indexed productId, string name, uint256 price, uint256 stock);
    event ProductPurchased(uint256 indexed orderId, uint256 indexed productId, address indexed buyer, uint256 quantity, uint256 totalPrice);
    event OrderStatusUpdated(uint256 indexed orderId, OrderStatus status);
    event OrderCompleted(uint256 indexed orderId, address indexed seller, uint256 amount);
    event FundsWithdrawn(address indexed seller, uint256 amount);
    event ProductReviewed(uint256 indexed productId, address indexed buyer, uint256 rating);
    event PlatformCommissionWithdrawn(uint256 amount);
    event DisputeRaised(uint256 indexed orderId, address indexed buyer, string reason);
    event DisputeResolved(uint256 indexed orderId, bool refundBuyer);
    event FundsAutoReleased(uint256 indexed orderId);
    event BundleCreated(uint256 indexed bundleId, address indexed seller, uint256 price);
    event BundlePurchased(uint256 indexed bundleId, address indexed buyer);
    event SellerLevelUpdated(address indexed seller, uint256 newLevel);
    
    // New Advanced Feature Events
    event TokensUsedForDiscount(address indexed buyer, uint256 tokenAmount, uint256 discountAmount);
    event SellerStaked(address indexed seller, uint256 amount, uint256 timestamp);
    event SellerUnstaked(address indexed seller, uint256 amount);
    event StakeSlashed(address indexed seller, uint256 amount, string reason);
    event ProductFeatured(uint256 indexed productId, FeatureDuration duration, uint256 cost, uint256 expiresAt);
    event TokensBurned(uint256 amount, address indexed from);

    
    // ==================== Modifiers ====================
    
    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner can perform this action");
        _;
    }
    
    modifier onlyRegisteredSeller() {
        require(sellers[msg.sender].isRegistered, "You must be a registered seller");
        require(sellers[msg.sender].isActive, "Your seller account is not active");
        _;
    }
    
    modifier onlyProductOwner(uint256 _productId) {
        require(products[_productId].seller == msg.sender, "You are not the owner of this product");
        _;
    }
    
    modifier productExists(uint256 _productId) {
        require(_productId > 0 && _productId <= productCounter, "Product does not exist");
        _;
    }
    
    modifier orderExists(uint256 _orderId) {
        require(_orderId > 0 && _orderId <= orderCounter, "Order does not exist");
        _;
    }
    
    // ==================== Constructor ====================
    
    constructor() {
        platformOwner = msg.sender;
        token = new BlockToken();
    }

    
    // ==================== Seller Functions ====================
    
    /**
     * @dev Register as a seller on the platform
     * @param _name Name of the seller/store
     */
    function registerSeller(string memory _name) external {
        require(!sellers[msg.sender].isRegistered, "Already registered as seller");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        sellerCounter++;
        sellers[msg.sender] = Seller({
            sellerAddress: msg.sender,
            name: _name,
            isRegistered: true,
            isActive: true,
            totalSales: 0,
            totalEarnings: 0,
            pendingWithdrawal: 0,
            rating: 500, // 5.00 * 100 (default rating)
            totalRatings: 0,
            registeredAt: block.timestamp,
            sellerLevel: 0
        });

        
        emit SellerRegistered(msg.sender, _name, block.timestamp);
    }
    
    /**
     * @dev Add a new product to the marketplace
     */
    function addProduct(
        string memory _name,
        string memory _description,
        string memory _imageHash,
        uint256 _price,
        uint256 _stock,
        ProductCategory _category
    ) external onlyRegisteredSeller {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(_stock > 0, "Stock must be greater than 0");
        
        productCounter++;
        products[productCounter] = Product({
            id: productCounter,
            name: _name,
            description: _description,
            imageHash: _imageHash,
            price: _price,
            stock: _stock,
            category: _category,
            seller: msg.sender,
            isActive: true,
            totalSales: 0,
            rating: 500, // 5.00 * 100
            totalRatings: 0,
            createdAt: block.timestamp
        });
        
        sellerProducts[msg.sender].push(productCounter);
        
        emit ProductAdded(productCounter, msg.sender, _name, _price);
    }
    
    /**
     * @dev Update product details
     */
    function updateProduct(
        uint256 _productId,
        string memory _name,
        string memory _description,
        string memory _imageHash,
        uint256 _price,
        uint256 _stock
    ) external productExists(_productId) onlyProductOwner(_productId) {
        Product storage product = products[_productId];
        
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        
        product.name = _name;
        product.description = _description;
        product.imageHash = _imageHash;
        product.price = _price;
        product.stock = _stock;
        
        emit ProductUpdated(_productId, _name, _price, _stock);
    }
    
    /**
     * @dev Toggle product active status
     */
    function toggleProductStatus(uint256 _productId) 
        external 
        productExists(_productId) 
        onlyProductOwner(_productId) 
    {
        products[_productId].isActive = !products[_productId].isActive;
    }
    
    /**
     * @dev Withdraw seller earnings
     */
    function withdrawEarnings() external onlyRegisteredSeller {
        Seller storage seller = sellers[msg.sender];
        uint256 amount = seller.pendingWithdrawal;
        
        require(amount > 0, "No funds to withdraw");
        
        seller.pendingWithdrawal = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(msg.sender, amount);
    }
    
    // ==================== Buyer Functions ====================
    
    /**
     * @dev Purchase a product
     */
    function purchaseProduct(uint256 _productId, uint256 _quantity) 
        external 
        payable 
        productExists(_productId) 
    {
        Product storage product = products[_productId];
        
        require(product.isActive, "Product is not available");
        require(product.stock >= _quantity, "Insufficient stock");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(msg.sender != product.seller, "Sellers cannot buy their own products");
        
        uint256 totalPrice = product.price * _quantity;
        require(msg.value == totalPrice, "Incorrect payment amount");
        
        // Calculate platform fee and seller amount
        uint256 platformFee = (totalPrice * platformCommissionRate) / 100;
        uint256 sellerAmount = totalPrice - platformFee;
        
        // Update stock
        product.stock -= _quantity;
        product.totalSales += _quantity;
        
        // Update seller stats
        Seller storage seller = sellers[product.seller];
        seller.totalSales += _quantity;
        seller.totalEarnings += sellerAmount;
        
        // Update platform earnings
        totalPlatformEarnings += platformFee;
        
        // Create order
        orderCounter++;
        orders[orderCounter] = Order({
            id: orderCounter,
            productId: _productId,
            buyer: msg.sender,
            seller: product.seller,
            quantity: _quantity,
            totalPrice: totalPrice,
            sellerAmount: sellerAmount,
            platformFee: platformFee,
            status: OrderStatus.Pending,
            createdAt: block.timestamp,
            completedAt: 0,
            disputed: false
        });
        
        // Mint reward tokens
        token.mint(msg.sender, REWARD_PER_PURCHASE);

        
        buyerOrders[msg.sender].push(orderCounter);
        hasPurchased[msg.sender][_productId] = true;
        
        emit ProductPurchased(orderCounter, _productId, msg.sender, _quantity, totalPrice);
    }
    
    /**
     * @dev Confirm order delivery (releases funds to seller)
     */
    function confirmDelivery(uint256 _orderId) external orderExists(_orderId) {
        Order storage order = orders[_orderId];
        
        require(order.buyer == msg.sender, "Only buyer can confirm delivery");
        require(order.status == OrderStatus.Shipped, "Order must be shipped first");
        
        order.status = OrderStatus.Completed;
        order.completedAt = block.timestamp;
        
        // Release funds to seller
        sellers[order.seller].pendingWithdrawal += order.sellerAmount;
        
        emit OrderStatusUpdated(_orderId, OrderStatus.Completed);
        emit OrderCompleted(_orderId, order.seller, order.sellerAmount);
    }
    
    /**
     * @dev Submit a review for a purchased product
     */
    function reviewProduct(uint256 _productId, uint256 _rating, string memory _comment) 
        external 
        productExists(_productId) 
    {
        require(hasPurchased[msg.sender][_productId], "You must purchase the product to review");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        
        Product storage product = products[_productId];
        
        // Add review
        productReviews[_productId].push(Review({
            buyer: msg.sender,
            rating: _rating,
            comment: _comment,
            timestamp: block.timestamp
        }));
        
        // Update product rating
        product.totalRatings++;
        product.rating = ((product.rating * (product.totalRatings - 1)) + (_rating * 100)) / product.totalRatings;
        
        // Update seller rating
        Seller storage seller = sellers[product.seller];
        seller.totalRatings++;
        seller.rating = ((seller.rating * (seller.totalRatings - 1)) + (_rating * 100)) / seller.totalRatings;
        
        emit ProductReviewed(_productId, msg.sender, _rating);
        
        // Mint reward tokens
        token.mint(msg.sender, REWARD_PER_REVIEW);
    }

    
    // ==================== Seller Order Management ====================
    
    /**
     * @dev Mark order as shipped
     */
    function markOrderAsShipped(uint256 _orderId) external orderExists(_orderId) {
        Order storage order = orders[_orderId];
        
        require(order.seller == msg.sender, "Only seller can update order status");
        require(order.status == OrderStatus.Pending, "Order is not in pending state");
        
        order.status = OrderStatus.Shipped;
        
        emit OrderStatusUpdated(_orderId, OrderStatus.Shipped);
    }
    
    // ==================== Platform Owner Functions ====================
    
    /**
     * @dev Withdraw platform commission
     */
    function withdrawPlatformEarnings() external onlyPlatformOwner {
        uint256 amount = totalPlatformEarnings;
        require(amount > 0, "No earnings to withdraw");
        
        totalPlatformEarnings = 0;
        
        (bool success, ) = payable(platformOwner).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit PlatformCommissionWithdrawn(amount);
    }
    
    /**
     * @dev Update commission rate
     */
    function updateCommissionRate(uint256 _newRate) external onlyPlatformOwner {
        require(_newRate <= 10, "Commission rate cannot exceed 10%");
        platformCommissionRate = _newRate;
    }

    // ==================== New Features ====================

    /**
     * @dev Auto-release funds if order is shipped and time passed
     */

    /**
     * @dev Raise a dispute
     */
    function raiseDispute(uint256 _orderId, string memory _reason) external orderExists(_orderId) {
        Order storage order = orders[_orderId];
        
        require(msg.sender == order.buyer, "Only buyer can raise dispute");
        require(order.status == OrderStatus.Shipped || order.status == OrderStatus.Pending, "Invalid order status");
        require(!order.disputed, "Dispute already raised");
        
        order.disputed = true;
        order.status = OrderStatus.Disputed;
        
        disputes[_orderId] = Dispute({
            orderId: _orderId,
            buyer: msg.sender,
            seller: order.seller,
            reason: _reason,
            resolved: false,
            refundBuyer: false
        });
        
        emit DisputeRaised(_orderId, msg.sender, _reason);
        emit OrderStatusUpdated(_orderId, OrderStatus.Disputed);
    }

    /**
     * @dev Resolve a dispute
     */
    function resolveDispute(uint256 _orderId, bool _refundBuyer) external onlyPlatformOwner orderExists(_orderId) {
        Order storage order = orders[_orderId];
        Dispute storage dispute = disputes[_orderId];
        
        require(order.disputed, "No dispute found");
        require(!dispute.resolved, "Dispute already resolved");
        
        dispute.resolved = true;
        dispute.refundBuyer = _refundBuyer;
        
        if (_refundBuyer) {
            order.status = OrderStatus.Refunded;
            // Refund buyer (minus platform fee? or full? Let's do partial refund logic or full if funds are still there)
            // In this logic, funds are in contract. 
            // We refund the full totalPrice to buyer
            payable(order.buyer).transfer(order.totalPrice);
            
            // Platform earnings were increased on purchase, we should reverse that?
            // totalPlatformEarnings -= order.platformFee; // Optional: revert platform fee
        } else {
            order.status = OrderStatus.Completed;
            order.completedAt = block.timestamp;
            sellers[order.seller].pendingWithdrawal += order.sellerAmount;
            emit OrderCompleted(_orderId, order.seller, order.sellerAmount);
        }
        
        emit DisputeResolved(_orderId, _refundBuyer);
        emit OrderStatusUpdated(_orderId, order.status);
    }

    /**
     * @dev Create a product bundle
     */

    /**
     * @dev Purchase a bundle
     */
    
    /**
     * @dev Update seller level based on stats
     */
    function updateSellerLevel() external onlyRegisteredSeller {
        Seller storage seller = sellers[msg.sender];
        uint256 oldLevel = seller.sellerLevel;
        uint256 newLevel = 0;
        
        if (seller.totalSales > 100 && seller.rating > 450) {
            newLevel = 3; // Power
        } else if (seller.totalSales > 50 && seller.rating > 400) {
            newLevel = 2; // Top
        } else if (seller.totalSales > 10) {
            newLevel = 1; // Verified
        }
        
        if (newLevel != oldLevel) {
            seller.sellerLevel = newLevel;
            emit SellerLevelUpdated(msg.sender, newLevel);
        }
    }

    // ==================== VIP & Token Economics Functions ====================
    
    /**
     * @dev Get VIP tier of a buyer based on token holdings.
     * @param buyer Address of the buyer.
     * @return VIPTier enum value.
     */
    function getVIPTier(address buyer) public view returns (VIPTier) {
        uint256 balance = token.balanceOf(buyer);
        
        if (balance >= GOLD_THRESHOLD) return VIPTier.Gold;
        if (balance >= SILVER_THRESHOLD) return VIPTier.Silver;
        if (balance >= BRONZE_THRESHOLD) return VIPTier.Bronze;
        return VIPTier.None;
    }
    
    /**
     * @dev Calculate discount amount based on VIP tier.
     * @param price Original price.
     * @param buyer Buyer address.
     * @return Discount amount in wei.
     */
    function calculateDiscount(uint256 price, address buyer) public view returns (uint256) {
        VIPTier tier = getVIPTier(buyer);
        
        if (tier == VIPTier.Gold) return (price * GOLD_DISCOUNT_BPS) / 10000;
        if (tier == VIPTier.Silver) return (price * SILVER_DISCOUNT_BPS) / 10000;
        if (tier == VIPTier.Bronze) return (price * BRONZE_DISCOUNT_BPS) / 10000;
        return 0;
    }
    
    /**
     * @dev Purchase product with hybrid payment (ETH + BMT tokens for discount).
     * @param _productId Product to purchase.
     * @param _quantity Quantity to purchase.
     * @param _tokenAmount Amount of BMT tokens to use (must be approved).
     */
    function purchaseWithTokenDiscount(uint256 _productId, uint256 _quantity, uint256 _tokenAmount)
        external
        payable
        productExists(_productId)
    {
        Product storage product = products[_productId];
        require(product.isActive, "Product is not available");
        require(product.stock >= _quantity, "Insufficient stock");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(msg.sender != product.seller, "Sellers cannot buy their own products");
        
        // Fraud prevention
        
        uint256 totalPrice = product.price * _quantity;
        uint256 discount = calculateDiscount(totalPrice, msg.sender);
        uint256 finalPrice = totalPrice - discount;
        
        // If using tokens, calculate burn amount and validate
        uint256 tokenPayment = 0;
        if (_tokenAmount > 0) {
            require(_tokenAmount <= discount, "Token amount exceeds discount");
            tokenPayment = _tokenAmount;
            
            // Burn tokens from buyer (1% burn rate)
            uint256 burnAmount = (tokenPayment * BURN_RATE_BPS) / 10000;
            token.burnFrom(msg.sender, burnAmount);
            totalTokensBurned += burnAmount;
            emit TokensBurned(burnAmount, msg.sender);
            
            // Transfer remaining tokens to contract
            token.burnFrom(msg.sender, tokenPayment - burnAmount);
            finalPrice -= tokenPayment;
            
            emit TokensUsedForDiscount(msg.sender, tokenPayment, discount);
        }
        
        require(msg.value == finalPrice, "Incorrect payment amount");
        
        // Process order (same as original purchaseProduct)
        _processPurchase(product, _productId, _quantity, totalPrice, finalPrice);
    }
    
    /**
     * @dev Internal function to process purchase and create order.
     */
    function _processPurchase(Product storage product, uint256 _productId, uint256 _quantity, uint256 totalPrice, uint256 paidAmount) private {
        uint256 platformFee = (paidAmount * platformCommissionRate) / 100;
        uint256 sellerAmount = paidAmount - platformFee;
        
        product.stock -= _quantity;
        product.totalSales += _quantity;
        
        Seller storage seller = sellers[product.seller];
        seller.totalSales += _quantity;
        seller.totalEarnings += sellerAmount;
        totalPlatformEarnings += platformFee;
        
        orderCounter++;
        orders[orderCounter] = Order({
            id: orderCounter,
            productId: _productId,
            buyer: msg.sender,
            seller: product.seller,
            quantity: _quantity,
            totalPrice: totalPrice,
            sellerAmount: sellerAmount,
            platformFee: platformFee,
            status: OrderStatus.Pending,
            createdAt: block.timestamp,
            completedAt: 0,
            disputed: false
        });
        
        token.mint(msg.sender, REWARD_PER_PURCHASE);
        buyerOrders[msg.sender].push(orderCounter);
        hasPurchased[msg.sender][_productId] = true;
        
        emit ProductPurchased(orderCounter, _productId, msg.sender, _quantity, totalPrice);
    }

    // ==================== Seller Staking Functions ====================
    
    /**
     * @dev Stake BMT tokens for seller verification and benefits.
     * @param amount Amount of tokens to stake.
     */
    function stakeForVerification(uint256 amount) external onlyRegisteredSeller {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(token.balanceOf(msg.sender) >= amount, "Insufficient token balance");
        
        // Transfer tokens to token contract for staking
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        token.burnFrom(msg.sender, 0); // This ensures approval
        
        // Update stake info
        SellerStake storage stake = sellerStakes[msg.sender];
        stake.amount += amount;
        stake.stakedAt = block.timestamp;
        stake.isStaked = true;
        
        // Call token contract stake function
        // Note: User must approve tokens first
        
        emit SellerStaked(msg.sender, amount, block.timestamp);
        
        // Update seller level if staked enough
        if (stake.amount >= VERIFIED_STAKE_REQUIREMENT) {
            Seller storage seller = sellers[msg.sender];
            if (seller.sellerLevel == 0) {
                seller.sellerLevel = 1; // Auto-verify
                emit SellerLevelUpdated(msg.sender, 1);
            }
        }
    }
    
    /**
     * @dev Unstake tokens after cooldown period.
     */
    function unstakeTokens() external onlyRegisteredSeller {
        SellerStake storage stake = sellerStakes[msg.sender];
        require(stake.isStaked, "No active stake");
        require(block.timestamp >= stake.stakedAt + STAKE_COOLDOWN, "Cooldown period not passed");
        
        uint256 amount = stake.amount;
        stake.amount = 0;
        stake.isStaked = false;
        
        emit SellerUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Slash seller stake for fraudulent behavior (platform owner only).
     * @param seller Seller address to penalize.
     * @param amount Amount to slash.
     * @param reason Reason for slashing.
     */
    function slashSellerStake(address seller, uint256 amount, string memory reason) external onlyPlatformOwner {
        SellerStake storage stake = sellerStakes[seller];
        require(stake.amount >= amount, "Insufficient staked amount");
        
        stake.amount -= amount;
        if (stake.amount == 0) {
            stake.isStaked = false;
        }
        
        // Call token contract to slash
        token.slashStake(seller, amount);
        
        emit StakeSlashed(seller, amount, reason);
    }

    // ==================== Featured Listings Functions ====================
    
    /**
     * @dev Feature a product by burning BMT tokens.
     * @param _productId Product to feature.
     * @param duration Duration of featuring.
     */
    function featureProduct(uint256 _productId, FeatureDuration duration) 
        external 
        productExists(_productId)
        onlyProductOwner(_productId)
    {
        uint256 cost;
        uint256 durationSeconds;
        
        if (duration == FeatureDuration.Day) {
            cost = FEATURE_COST_DAY;
            durationSeconds = 1 days;
        } else if (duration == FeatureDuration.Week) {
            cost = FEATURE_COST_WEEK;
            durationSeconds = 7 days;
        } else {
            cost = FEATURE_COST_MONTH;
            durationSeconds = 30 days;
        }
        
        // Burn tokens from seller
        token.burnFrom(msg.sender, cost);
        totalTokensBurned += cost;
        
        // Create featured listing
        uint256 expiresAt = block.timestamp + durationSeconds;
        featuredListings[_productId] = FeaturedListing({
            productId: _productId,
            expiresAt: expiresAt,
            duration: duration
        });
        
        emit ProductFeatured(_productId, duration, cost, expiresAt);
        emit TokensBurned(cost, msg.sender);
    }
    
    /**
     * @dev Check if product is currently featured.
     * @param _productId Product to check.
     * @return True if featured and not expired.
     */
    function isFeatured(uint256 _productId) public view returns (bool) {
        FeaturedListing memory listing = featuredListings[_productId];
        return listing.expiresAt > block.timestamp;
    }
    
    /**
     * @dev Get all featured products.
     * @return Array of featured product IDs.
     */
    function getFeaturedProducts() external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count featured products
        for (uint256 i = 1; i <= productCounter; i++) {
            if (isFeatured(i)) count++;
        }
        
        // Populate array
        uint256[] memory featured = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= productCounter; i++) {
            if (isFeatured(i)) {
                featured[index] = i;
                index++;
            }
        }
        
        return featured;
    }

    // ==================== View Functions ====================
    
    /**
     * @dev Get all products
     */
    function getAllProducts() external view returns (Product[] memory) {
        Product[] memory allProducts = new Product[](productCounter);
        for (uint256 i = 1; i <= productCounter; i++) {
            allProducts[i - 1] = products[i];
        }
        return allProducts;
    }
    
    /**
     * @dev Get active products only
     */
    function getActiveProducts() external view returns (Product[] memory) {
        // First pass: count active products
        uint256 activeCount = _countActiveProducts();
        
        // Second pass: populate array
        Product[] memory activeProducts = new Product[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= productCounter; i++) {
            if (products[i].isActive && products[i].stock > 0) {
                activeProducts[index] = products[i];
                index++;
            }
        }
        return activeProducts;
    }
    
    /**
     * @dev Internal function to count active products
     */
    function _countActiveProducts() private view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= productCounter; i++) {
            if (products[i].isActive && products[i].stock > 0) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Get products by seller
     */
    function getSellerProducts(address _seller) external view returns (uint256[] memory) {
        return sellerProducts[_seller];
    }
    
    /**
     * @dev Get buyer orders
     */
    function getBuyerOrders(address _buyer) external view returns (uint256[] memory) {
        return buyerOrders[_buyer];
    }
    
    /**
     * @dev Get product reviews
     */
    function getProductReviews(uint256 _productId) external view returns (Review[] memory) {
        return productReviews[_productId];
    }
    
    /**
     * @dev Get seller info
     */
    function getSellerInfo(address _seller) external view returns (Seller memory) {
        return sellers[_seller];
    }
    
    /**
     * @dev Check if address is registered seller
     */
    function isRegisteredSeller(address _address) external view returns (bool) {
        return sellers[_address].isRegistered && sellers[_address].isActive;
    }
    
    /**
     * @dev Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 totalProducts,
        uint256 totalOrders,
        uint256 totalSellers,
        uint256 platformEarnings,
        uint256 commissionRate
    ) {
        return (
            productCounter,
            orderCounter,
            sellerCounter,
            totalPlatformEarnings,
            platformCommissionRate
        );
    }
    /**
     * @dev Request test tokens (Faucet).
     * Allows any user to mint 100 BMT once every 24 hours.
     */
    mapping(address => uint256) public lastFaucetRequest;
    
    function requestTestTokens() external {
        // require(block.timestamp >= lastFaucetRequest[msg.sender] + 1 days, "Faucet cooldown: try again later");
        // Commented out cooldown for testing purposes
        
        lastFaucetRequest[msg.sender] = block.timestamp;
        token.mint(msg.sender, 100 * 10**18); // Mint 100 BMT
    }
}
