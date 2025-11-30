<div align="center">

# 🛍️ BlockMarket

### The Future of Decentralized E-Commerce

<div align="center">

### 👨‍💻 Developed By

[![Muhammad Ahsan](https://img.shields.io/badge/Muhammad_Ahsan-23i--5010-4f46e5?style=for-the-badge&logo=github&logoColor=white)](#)
[![Haris Khan](https://img.shields.io/badge/Haris_Khan-23i--5558-4f46e5?style=for-the-badge&logo=github&logoColor=white)](#)
[![Khadija Aftab](https://img.shields.io/badge/Khadija_Aftab-23i--5035-4f46e5?style=for-the-badge&logo=github&logoColor=white)](#)

</div>

![BlockMarket Banner](https://placehold.co/1200x300/4f46e5/ffffff?text=BlockMarket+Decentralized+Marketplace)

[![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)](https://ethereum.org/)
[![Web3](https://img.shields.io/badge/Web3.js-F16822?style=for-the-badge&logo=web3.js&logoColor=white)](https://web3js.readthedocs.io/)
[![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)
[![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)](https://ipfs.io/)
[![Truffle](https://img.shields.io/badge/Truffle-5E464D?style=for-the-badge&logo=truffle&logoColor=white)](https://trufflesuite.com/)

<br />

**BlockMarket** is a secure, transparent, and fully decentralized marketplace application running on the Ethereum blockchain. It eliminates intermediaries, allowing buyers and sellers to trade directly with trust guaranteed by smart contracts.

[View Demo](#) • [Report Bug](#) • [Request Feature](#)

</div>

---

## 📑 Table of Contents

- [About The Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Usage Guide](#-usage-guide)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Project Structure](#-project-structure)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## 📖 About The Project

Traditional e-commerce platforms act as middlemen, charging high fees and controlling user data. **BlockMarket** disrupts this model by leveraging blockchain technology to create a peer-to-peer trading environment.

### Why BlockMarket?

- **Decentralized Trust**: Funds are held in a smart contract Escrow until the buyer confirms delivery.
- **Lower Fees**: No platform commissions (gas fees only).
- **Transparency**: All transactions and product history are immutable and verifiable on the blockchain.
- **Incentivized Participation**: Users earn **BlockMarket Tokens (BMT)** for buying products and leaving reviews.

---

## 🌟 Key Features

### 🛒 Buyer Interface

#### **Shop Tab**

The main storefront where you can discover products.

- **Search & Filter**: Use the search bar to find specific items or filter by categories like Electronics, Clothing, and Books.
- **Price Controls**: Sort products by price (Low to High / High to Low) or use the slider to set a budget range.
- **Product Cards**: View essential details like the product image, name, price in ETH (with real-time USD conversion), stock availability, and seller rating.

#### **Cart Tab**

Manage your selected items before purchasing.

- **Review Items**: See a list of all products you intend to buy.
- **Quantity Adjustment**: Easily increase or decrease the quantity of each item.
- **Real-time Total**: The total cost in ETH is automatically calculated as you adjust quantities.
- **Checkout**: Proceed to secure payment via your Web3 wallet.

#### **My Orders Tab**

Track the lifecycle of your purchases.

- **Order Status**: Monitor the state of your orders:
  - **Pending**: Order placed, funds locked in Escrow.
  - **Shipped**: Seller has dispatched the item.
  - **Delivered**: You have received the item.
  - **Disputed**: An issue has been raised.
- **Actions**:
  - **Confirm Delivery**: Release funds to the seller after receiving your item.
  - **Raise Dispute**: Freeze funds if there is an issue with the order.
  - **Leave Review**: Rate the product and seller to earn BMT rewards.

### 🏪 Seller Interface

#### **Dashboard Tab**

Your business command center.

- **Analytics**: View key metrics like Total Sales, Total Earnings, and Total Products listed.
- **Withdrawal**: Access your earnings. Once a buyer confirms delivery, funds move to your "Available to Withdraw" balance, which you can transfer to your wallet with a single click.

#### **My Products Tab**

Manage your inventory.

- **Add New Product**: Open the modern, 2-column modal to list a new item. You can upload an image or provide a URL, set the price in ETH, and define stock levels.
- **Edit Product**: Update details for existing listings.
- **Toggle Status**: Deactivate products to hide them from the shop without deleting them, or reactivate them when stock returns.

#### **Orders to Ship Tab**

Fulfill customer orders.

- **Order Filtering**: Use the dropdown to filter orders by status (Pending, Shipped, Disputed).
- **Fulfillment**: View buyer details and click "Mark as Shipped" to update the order status.
- **Dispute Management**: View details of any disputed orders, including the reason provided by the buyer. Note that disputes are resolved by the platform administrator.

---

## 🛠 Tech Stack

### Frontend

- **HTML5 / CSS3**: Modern, responsive UI with Glassmorphism design.
- **JavaScript (ES6+)**: Core logic and DOM manipulation.
- **Web3.js**: Interaction with the Ethereum blockchain.
- **Chart.js**: Visualizing sales data for sellers.

### Backend (Blockchain)

- **Solidity**: Smart contract programming language.
- **Truffle Suite**: Development environment, testing framework, and asset pipeline.
- **Ganache**: Personal blockchain for local development.

### Tools & Utilities

- **MetaMask**: Crypto wallet for browser interaction.
- **IPFS (Simulated)**: For decentralized storage of product images.

---

## 🏗 Smart Contract Architecture

The core logic resides in two main contracts:

### 1. Marketplace Contract

The heart of the application. It handles:

- **Product Registry**: Storing product details (price, stock, owner).
- **Order Lifecycle**: Purchase -> Ship -> Confirm Delivery -> Withdraw Funds.
- **Escrow Logic**: Holding funds securely during the transaction.
- **Reputation**: Tracking seller ratings and levels.

### 2. BlockToken Contract (ERC-20)

A standard ERC-20 token used for:

- **Loyalty Rewards**: Minted and sent to users upon successful interactions.
- **Future Governance**: Potential voting rights (roadmap).

---

## 🎮 Usage Guide

### Buying a Product

1.  **Connect Wallet**: Click the "Connect Wallet" button and select your Buyer account in MetaMask.
2.  **Shop**: Navigate to the **Shop Tab**. Use filters to find an item and click "Add to Cart".
3.  **Checkout**: Go to the **Cart Tab**. Review your total and click "Checkout". Confirm the transaction in MetaMask.
4.  **Track**: Go to the **My Orders Tab** to see your order status change to "Pending".

### Selling & Shipping

1.  **Switch Account**: In MetaMask, switch to your Seller account.
2.  **List Item**: Go to **Seller Dashboard** -> **My Products Tab**. Click "Add Product", fill in the details (Name, Price, Image), and submit.
3.  **Ship Order**: Go to the **Orders to Ship Tab**. Find a "Pending" order and click the "Mark as Shipped" button.

### Completing the Order

1.  **Confirm Receipt**: Switch back to the Buyer account. Go to the **My Orders Tab**. Once you receive the item (simulated), click "Confirm Delivery".
2.  **Rate**: A modal will appear asking you to rate the seller. Submit your rating to earn BMT tokens.

### Withdrawing Funds

1.  **Withdraw**: Switch back to the Seller account. On the **Dashboard Tab**, check your "Available to Withdraw" balance. Click the "Withdraw" button to transfer the ETH to your wallet.

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v14+ recommended)
- **Truffle Framework**
- **Ganache** (Personal Blockchain)
- **MetaMask** (Browser Extension)

### Installation

1.  **Clone the Repository**
    Download the project files to your local machine using git or by downloading the ZIP file.

2.  **Install Dependencies**
    Navigate to the project directory and install the required node modules using your package manager.

3.  **Start Ganache**
    Open Ganache and create a "Quickstart" workspace. Note the **RPC Server URL** and the **Network ID**.

4.  **Compile & Deploy Contracts**
    Use Truffle to compile the smart contracts and deploy them to your local Ganache blockchain. Ensure your configuration matches the Ganache port.

5.  **Configure Frontend**
    The application automatically detects the deployed contract address. Ensure you have a local server running to serve the HTML files.

6.  **Import Accounts to MetaMask**
    Import the private keys from Ganache into MetaMask to simulate different users (Buyer, Seller).

---

## 📂 Project Structure

The project is organized into the following main directories:

- **contracts/**: Contains the Solidity smart contracts (Marketplace, BlockToken).
- **migrations/**: Scripts to deploy the contracts to the blockchain.
- **test/**: Automated tests for the smart contracts.
- **Frontend/**: The user interface files.
  - **css/**: Stylesheets implementing the Glassmorphism design.
  - **js/**: JavaScript files for logic and Web3 integration.
  - **images/**: Static assets and product images.
  - **index.html**: The main storefront for buyers.
  - **seller.html**: The dashboard for sellers.

---

## 🔮 Future Roadmap

- [ ] **IPFS Integration**: Fully decentralized image storage.
- [ ] **Multi-Currency Support**: Accept stablecoins (USDT/USDC).
- [ ] **Auction System**: Bidding mechanism for rare items.
- [ ] **Mobile App**: React Native mobile interface.
- [ ] **DAO Governance**: Allow BMT holders to vote on platform fees.

---
