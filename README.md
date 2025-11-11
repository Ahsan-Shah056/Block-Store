# 🛍️ BlockMarket - Decentralized E-Commerce Marketplace

A full-featured decentralized marketplace built on Ethereum blockchain using Truffle Suite, Solidity, and modern Web3 technologies.

![Blockchain](https://img.shields.io/badge/Blockchain-Ethereum-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.21-green)
![Truffle](https://img.shields.io/badge/Truffle-v5.0-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Smart Contract Deployment](#-smart-contract-deployment)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Smart Contract Overview](#-smart-contract-overview)
- [Frontend Features](#-frontend-features)
- [Screenshots](#-screenshots)
- [Security Features](#-security-features)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🏪 **Multi-Vendor Marketplace**
- Multiple sellers can register and manage their stores
- Each seller has independent inventory and earnings management
- Platform commission system (2% default)

### 🛒 **Buyer Features**
- Browse products with advanced filtering (category, price, rating)
- Search functionality for quick product discovery
- Shopping cart with quantity management
- Order tracking with real-time status updates
- Product reviews and ratings system
- Order history and delivery confirmation

### 💼 **Seller Dashboard**
- Comprehensive seller registration system
- Product management (Add, Edit, Activate/Deactivate)
- **📸 Image Upload Feature**: Upload images directly from computer OR use URLs
  - Supports JPG, PNG, GIF formats (max 2MB)
  - Automatic base64 conversion and blockchain storage
  - Real-time image preview with remove functionality
  - Dual input method: file upload or URL input
- Real-time sales analytics
- Order fulfillment interface
- Earnings tracking and withdrawal
- Seller reputation based on ratings

### 🔐 **Security & Escrow**
- Funds held in escrow until delivery confirmation
- Reentrancy protection
- Role-based access control
- Input validation and sanitization
- SafeMath for integer operations

### 🎨 **Modern UI/UX**
- Beautiful gradient design with smooth animations
- Fully responsive (Desktop, Tablet, Mobile)
- Interactive toast notifications
- Loading states and skeleton screens
- Intuitive navigation and user flows

---

## 🛠️ Technology Stack

### Blockchain
- **Solidity** `^0.8.0` - Smart contract development
- **Truffle Suite** - Development framework
- **Ganache** - Local blockchain for testing
- **Web3.js** `1.8.0` - Ethereum JavaScript API

### Frontend
- **HTML5** - Structure
- **CSS3** - Modern styling with animations
- **Vanilla JavaScript** - No framework dependencies
- **Font Awesome** `6.4.0` - Icons

### Smart Contract Features
- Multi-vendor support
- Escrow payment system
- Order tracking (Pending → Shipped → Delivered → Completed)
- Product categories and ratings
- Seller reputation system
- Platform commission mechanism

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v14.0.0 or higher)
   ```bash
   node --version
   ```

2. **npm** (v6.0.0 or higher)
   ```bash
   npm --version
   ```

3. **Truffle Suite**
   ```bash
   npm install -g truffle
   ```

4. **Ganache** (GUI or CLI)
   - Download GUI: [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
   - Or install CLI: `npm install -g ganache`

5. **MetaMask Browser Extension**
   - Download: [https://metamask.io/download/](https://metamask.io/download/)

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd "I235010,Ft-b,assignment#3"
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required Truffle dependencies.

### Step 3: Start Ganache

**Option A: Using Ganache GUI**
1. Open Ganache application
2. Click "Quickstart" to create a new workspace
3. Ensure it's running on port **7545** (default)
4. Keep Ganache running throughout development

**Option B: Using Ganache CLI**
```bash
ganache-cli -p 7545
```

### Step 4: Configure MetaMask

1. Open MetaMask extension
2. Click on network dropdown (top center)
3. Select "Add Network" → "Add network manually"
4. Enter the following details:
   - **Network Name**: Ganache Local
   - **New RPC URL**: `http://127.0.0.1:7545`
   - **Chain ID**: `1337` or `5777`
   - **Currency Symbol**: ETH
5. Click "Save"

6. Import Ganache accounts to MetaMask:
   - Copy a private key from Ganache
   - In MetaMask: Click account icon → Import Account
   - Paste the private key
   - Import at least 2-3 accounts (for testing buyer/seller roles)

---

## 📝 Smart Contract Deployment

### Step 1: Compile the Smart Contract

```bash
truffle compile
```

Expected output:
```
Compiling your contracts...
===========================
✔ Compilation completed successfully
```

### Step 2: Deploy to Ganache

```bash
truffle migrate --network development
```

or simply:

```bash
truffle migrate
```

Expected output:
```
Starting migrations...
======================
> Network name:    'development'
> Network id:      5777
> Block gas limit: 6721975 (0x6691b7)

1_deploy_contracts.js
=====================

   Deploying 'Marketplace'
   -----------------------
   > transaction hash:    0x...
   > contract address:    0x...
   > block number:        1
   > block timestamp:     ...
   > account:             0x...
   > balance:             99.99...
   > gas used:            ...
   > gas price:           20 gwei
   > value sent:          0 ETH
   > total cost:          0.00... ETH

   ✅ Marketplace contract deployed successfully!
   📍 Contract Address: 0x...

   > Saving artifacts
   -------------------------------------
   > Total deployments:   1
   > Final cost:          0.00... ETH

Summary
=======
> Total deployments:   1
> Final cost:          0.00... ETH
```

**Important**: Note down the contract address from the output!

### Step 3: Verify Deployment

```bash
truffle console
```

Then in the console:
```javascript
let instance = await Marketplace.deployed()
let owner = await instance.platformOwner()
console.log("Platform Owner:", owner)
let commissionRate = await instance.platformCommissionRate()
console.log("Commission Rate:", commissionRate.toString() + "%")
```

---

## 🌐 Running the Application

### Method 1: Using VS Code Live Server (Recommended)

1. Install "Live Server" extension in VS Code
2. Navigate to `Frontend/index.html`
3. Right-click and select "Open with Live Server"
4. Application will open at `http://127.0.0.1:5500/Frontend/index.html`

### Method 2: Using Python HTTP Server

```bash
cd Frontend
python3 -m http.server 8000
```

Then open: `http://localhost:8000/index.html`

### Method 3: Using Node.js HTTP Server

```bash
cd Frontend
npx http-server -p 8000
```

Then open: `http://localhost:8000/index.html`

### Step 4: Connect MetaMask

1. Open the application in your browser
2. Click "Connect Wallet" button in the navigation
3. MetaMask will prompt for connection approval
4. Select the Ganache account you want to use
5. Click "Connect"

You should see your wallet address and balance in the header!

---

## 🧪 Testing

### Run All Tests

```bash
truffle test
```

Expected output:
```
Contract: Marketplace
  Deployment
    ✓ should deploy successfully
    ✓ should set the correct platform owner
    ✓ should set default commission rate to 2%
  Seller Registration
    ✓ should register a seller successfully
    ✓ should not allow duplicate registration
    ✓ should increment seller counter
  Product Management
    ✓ should add a product successfully
    ✓ should not allow non-sellers to add products
    ✓ should update product details
    ✓ should toggle product status
  Product Purchase
    ✓ should purchase a product successfully
    ✓ should calculate commission correctly
    ✓ should not allow purchase with incorrect payment
    ✓ should not allow purchase of insufficient stock
  Order Management
    ✓ should mark order as shipped
    ✓ should allow buyer to confirm delivery
  Seller Withdrawal
    ✓ should allow seller to withdraw earnings
  Reviews
    ✓ should allow buyer to review purchased product
    ✓ should not allow review without purchase
  Platform Owner Functions
    ✓ should allow owner to withdraw platform earnings
    ✓ should allow owner to update commission rate
    ✓ should not allow commission rate above 10%

  22 passing (2s)
```

### Run Specific Test File

```bash
truffle test ./test/marketplace.test.js
```

### Test Coverage

The test suite covers:
- ✅ Contract deployment
- ✅ Seller registration
- ✅ Product CRUD operations
- ✅ Purchase flow
- ✅ Order management
- ✅ Payment and commission calculations
- ✅ Withdrawal mechanisms
- ✅ Reviews and ratings
- ✅ Access control
- ✅ Edge cases and error handling

---

## 📁 Project Structure

```
I235010,Ft-b,assignment#3/
├── contracts/
│   └── Marketplace.sol           # Main smart contract
├── migrations/
│   └── 1_deploy_contracts.js     # Deployment script
├── test/
│   └── marketplace.test.js       # Comprehensive test suite
├── Frontend/
│   ├── index.html                # Buyer interface
│   ├── seller.html               # Seller dashboard
│   ├── css/
│   │   └── style.css             # Modern styling with animations
│   └── js/
│       ├── web3-init.js          # Web3 initialization
│       ├── buyer.js              # Buyer functionality
│       └── seller.js             # Seller functionality
├── build/
│   └── contracts/                # Compiled contract artifacts (auto-generated)
├── truffle-config.js             # Truffle configuration
├── package.json                  # Project dependencies
└── README.md                     # This file
```

---

## 📜 Smart Contract Overview

### Main Contract: `Marketplace.sol`

#### Key Features

**1. Seller Management**
```solidity
struct Seller {
    address sellerAddress;
    string name;
    bool isRegistered;
    bool isActive;
    uint256 totalSales;
    uint256 totalEarnings;
    uint256 pendingWithdrawal;
    uint256 rating;
    uint256 totalRatings;
    uint256 registeredAt;
}
```

**2. Product Structure**
```solidity
struct Product {
    uint256 id;
    string name;
    string description;
    string imageHash;
    uint256 price;
    uint256 stock;
    ProductCategory category;
    address seller;
    bool isActive;
    uint256 totalSales;
    uint256 rating;
    uint256 totalRatings;
    uint256 createdAt;
}
```

**3. Order Tracking**
```solidity
enum OrderStatus { Pending, Shipped, Delivered, Completed, Cancelled }

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
```

#### Main Functions

**Seller Functions**
- `registerSeller(string _name)` - Register as a seller
- `addProduct(...)` - Add new product
- `updateProduct(...)` - Update product details
- `toggleProductStatus(uint256 _productId)` - Activate/deactivate product
- `withdrawEarnings()` - Withdraw accumulated earnings
- `markOrderAsShipped(uint256 _orderId)` - Update order status

**Buyer Functions**
- `purchaseProduct(uint256 _productId, uint256 _quantity)` - Buy product
- `confirmDelivery(uint256 _orderId)` - Confirm order delivery
- `reviewProduct(uint256 _productId, uint256 _rating, string _comment)` - Submit review

**Platform Owner Functions**
- `withdrawPlatformEarnings()` - Withdraw platform commission
- `updateCommissionRate(uint256 _newRate)` - Update commission percentage

**View Functions**
- `getAllProducts()` - Get all products
- `getActiveProducts()` - Get active products only
- `getSellerProducts(address _seller)` - Get products by seller
- `getBuyerOrders(address _buyer)` - Get orders by buyer
- `getProductReviews(uint256 _productId)` - Get product reviews
- `getPlatformStats()` - Get platform statistics

---

## 🎨 Frontend Features

### Buyer Interface (`index.html`)

**1. Hero Section**
- Platform statistics (Total Products, Orders, Sellers)
- Animated statistics cards

**2. Product Browsing**
- Grid layout with product cards
- Search functionality
- Category filtering
- Price sorting
- Rating display

**3. Shopping Cart**
- Add/remove items
- Quantity adjustment
- Price calculation with platform fee
- Checkout flow

**4. Product Details Modal**
- Large product image
- Full description
- Stock availability
- Seller information
- Customer reviews
- Add to cart functionality

**5. Order Management**
- View all orders
- Order status tracking
- Delivery confirmation
- Order history

**6. Review System**
- Star rating (1-5)
- Written comments
- View all reviews

### Seller Dashboard (`seller.html`)

**1. Registration**
- Store name registration
- Animated registration card

**2. Dashboard Overview**
- Total products count
- Total sales
- Total earnings
- Available withdrawal amount

**3. Product Management**
- Add new products
- Edit existing products
- Activate/deactivate products
- Product table with sorting

**4. Order Fulfillment**
- View pending orders
- Mark orders as shipped
- Order details

**5. Earnings**
- Withdraw accumulated earnings
- Transaction history

---

## 📸 Screenshots

### Required Screenshots for Submission

**1. Smart Contract Compilation**
```bash
truffle compile
```
Screenshot showing successful compilation.

**2. Smart Contract Deployment**
```bash
truffle migrate
```
Screenshot showing contract address and deployment success.

**3. Ganache Blockchain**
Screenshot of Ganache showing:
- Accounts and balances
- Blocks created
- Transactions

**4. Buyer Interface**
- Homepage with products
- Product details modal
- Shopping cart
- Order placement

**5. Seller Dashboard**
- Seller registration
- Product management
- Add/Edit product
- Order fulfillment

**6. MetaMask Transactions**
- Connect wallet
- Transaction confirmations
- Balance changes

**7. Order Flow**
- Purchase confirmation
- Order tracking
- Delivery confirmation

**8. Testing Results**
```bash
truffle test
```
Screenshot showing all tests passing.

---

## 🔒 Security Features

### Smart Contract Security

1. **Access Control**
   - `onlyPlatformOwner` modifier
   - `onlyRegisteredSeller` modifier
   - `onlyProductOwner` modifier

2. **Input Validation**
   - Non-empty string checks
   - Positive value requirements
   - Stock availability verification
   - Payment amount verification

3. **Reentrancy Protection**
   - State changes before external calls
   - Pull payment pattern for withdrawals

4. **Integer Safety**
   - Solidity 0.8.x built-in overflow protection
   - Explicit calculations for commission

5. **Business Logic Security**
   - Sellers cannot buy their own products
   - Only buyers can confirm delivery
   - Reviews only after purchase
   - Funds released only after delivery confirmation

---

## 🐛 Troubleshooting

### Common Issues and Solutions

**1. MetaMask Not Connecting**
- Ensure Ganache is running
- Check MetaMask network is set to Ganache (port 7545)
- Try refreshing the page
- Clear browser cache

**2. "Contract Not Deployed" Error**
- Run `truffle migrate --reset`
- Ensure Ganache is running before migration
- Check `truffle-config.js` network settings

**3. Transaction Failing**
- Check account has sufficient ETH
- Ensure gas limit is adequate
- Verify contract function parameters
- Check MetaMask for error details

**4. Products Not Loading**
- Open browser console (F12)
- Check for JavaScript errors
- Verify contract ABI is loaded
- Ensure Web3 is initialized

**5. "Out of Gas" Error**
- Increase gas limit in MetaMask
- Check Ganache gas limit settings
- Optimize contract code if necessary

**6. CORS Error**
- Use Live Server or HTTP server (not file://)
- Check browser security settings
- Ensure proper CORS headers

---

## 🚀 Future Enhancements

### Planned Features

1. **IPFS Integration**
   - Store product images on IPFS
   - Decentralized file storage

2. **Advanced Search**
   - ElasticSearch integration
   - Fuzzy matching
   - Autocomplete

3. **Payment Options**
   - Multiple cryptocurrency support
   - Stablecoin payments (USDC, DAI)
   - Price oracle integration

4. **Social Features**
   - Seller profiles with social links
   - Buyer profiles
   - Wishlist functionality
   - Product recommendations

5. **Analytics Dashboard**
   - Sales charts and graphs
   - Revenue tracking
   - Customer analytics

6. **Mobile Application**
   - React Native app
   - WalletConnect integration

7. **Advanced Order Management**
   - Partial refunds
   - Dispute resolution
   - Automated shipping tracking

8. **NFT Marketplace**
   - Digital product sales
   - NFT minting
   - Royalty system

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Student ID**: I235010  
**Section**: FT-B  
**Course**: MG3012 - Blockchain Technology for Business  
**Semester**: 5th Semester (Fall 2025)  
**Instructor**: Dr. Usama Arshad

---

## 📞 Support

For any questions or issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Truffle documentation: [https://trufflesuite.com/docs/](https://trufflesuite.com/docs/)
3. Check Web3.js docs: [https://web3js.readthedocs.io/](https://web3js.readthedocs.io/)

---

## 🎓 Assignment Submission Checklist

- [x] Smart contract implemented with all required features
- [x] Migration scripts created
- [x] Truffle configuration completed
- [x] Contract compiled successfully
- [x] Contract deployed to Ganache
- [x] Comprehensive test suite (22+ tests)
- [x] Frontend with HTML/CSS/JavaScript
- [x] Web3 integration
- [x] MetaMask connectivity
- [x] Buyer interface functional
- [x] Seller interface functional
- [x] Screenshots included
- [x] README with setup instructions
- [x] Code well-documented
- [x] Production-ready code quality

---

## 🌟 Key Features Summary

✅ Multi-vendor marketplace  
✅ Escrow payment system  
✅ Order tracking (4 states)  
✅ Product reviews & ratings  
✅ Seller reputation system  
✅ Platform commission (2%)  
✅ Responsive design  
✅ Modern UI with animations  
✅ Comprehensive testing  
✅ Security best practices  
✅ Production-ready code  

---
