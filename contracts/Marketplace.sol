// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

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
    
    uint256 public productCounter = 0;
    uint256 public orderCounter = 0;
    uint256 public sellerCounter = 0;
    
    // ==================== Enums ====================
    
    enum OrderStatus { Pending, Shipped, Delivered, Completed, Cancelled }
    enum ProductCategory { Electronics, Clothing, Books, Home, Sports, Other }
    
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
    }
    
    struct Review {
        address buyer;
        uint256 rating; // 1-5
        string comment;
        uint256 timestamp;
    }
    
    // ==================== Mappings ====================
    
    mapping(address => Seller) public sellers;
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => Review[]) public productReviews;
    mapping(address => uint256[]) public sellerProducts;
    mapping(address => uint256[]) public buyerOrders;
    mapping(address => mapping(uint256 => bool)) public hasPurchased; // buyer => productId => purchased
    
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
            registeredAt: block.timestamp
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
            completedAt: 0
        });
        
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
}
