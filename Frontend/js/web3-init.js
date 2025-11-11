/**
 * Web3 Initialization Module
 * Handles MetaMask connection and contract setup
 */

// Contract ABI and Address (will be set after deployment)
let contractAddress = null;
let contractABI = null;

// Web3 and Contract instances
let web3 = null;
let contract = null;
let currentAccount = null;

// Categories mapping
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'];

/**
 * Initialize Web3 and load contract details
 */
async function initWeb3() {
    try {
        // Load contract details from JSON - try multiple paths
        let contractData;
        let response;
        
        // Try different paths based on where the server is running from
        const paths = [
            'contracts/Marketplace.json',      // When server runs from Frontend/
            '../build/contracts/Marketplace.json',
            '/build/contracts/Marketplace.json'
        ];
        
        for (const path of paths) {
            try {
                response = await fetch(path);
                if (response.ok) {
                    contractData = await response.json();
                    console.log(`✅ Contract loaded from: ${path}`);
                    break;
                }
            } catch (err) {
                console.log(`❌ Failed to load from: ${path}`);
                continue;
            }
        }
        
        if (!contractData) {
            throw new Error('Could not find Marketplace.json. Please ensure the contract is compiled and deployed.');
        }
        
        contractABI = contractData.abi;
        
        // Get deployed network
        const networkId = await web3.eth.net.getId();
        console.log('🌐 Connected Network ID:', networkId);
        console.log('📋 Available networks in contract:', Object.keys(contractData.networks));
        
        const deployedNetwork = contractData.networks[networkId];
        
        if (!deployedNetwork) {
            // Provide helpful error message
            const availableNetworks = Object.keys(contractData.networks);
            if (availableNetworks.length === 0) {
                throw new Error('Contract not deployed on any network. Please run: truffle migrate');
            }
            
            let errorMsg = `Wrong network! MetaMask is connected to network ${networkId}.\n\n`;
            errorMsg += `The contract is deployed on network ${availableNetworks[0]}.\n\n`;
            errorMsg += `Please:\n`;
            errorMsg += `1. Open MetaMask\n`;
            errorMsg += `2. Switch to "Ganache Local" network\n`;
            errorMsg += `3. Or add it with:\n`;
            errorMsg += `   - RPC URL: http://127.0.0.1:7545\n`;
            errorMsg += `   - Chain ID: ${availableNetworks[0]}\n`;
            errorMsg += `   - Currency: ETH`;
            
            throw new Error(errorMsg);
        }
        
        contractAddress = deployedNetwork.address;
        
        // Initialize contract
        contract = new web3.eth.Contract(contractABI, contractAddress);
        
        console.log('✅ Web3 initialized successfully');
        console.log('📍 Contract Address:', contractAddress);
        console.log('📝 Contract has', Object.keys(contract.methods).length, 'methods');
        
        return true;
    } catch (error) {
        console.error('❌ Error initializing Web3:', error);
        showToast('Failed to load contract. ' + error.message, 'error');
        return false;
    }
}

/**
 * Connect to MetaMask wallet
 */
async function connectWallet() {
    try {
        console.log('🔌 Attempting to connect wallet...');
        
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            console.error('❌ MetaMask not found');
            showToast('Please install MetaMask to use this dApp!', 'error');
            window.open('https://metamask.io/download/', '_blank');
            return false;
        }
        
        console.log('✅ MetaMask detected');
        
        // Initialize Web3
        web3 = new Web3(window.ethereum);
        console.log('✅ Web3 instance created');
        
        // Check network before requesting accounts
        const chainId = await web3.eth.getChainId();
        console.log('🔗 Current Chain ID:', chainId);
        
        // Ganache default is 1337 (0x539) or 5777 (0x1691)
        const expectedChainIds = [1337, 5777];
        
        if (!expectedChainIds.includes(Number(chainId))) {
            const shouldSwitch = confirm(
                `⚠️ Wrong Network!\n\n` +
                `You're connected to Chain ID: ${chainId}\n` +
                `Expected: 5777 or 1337 (Ganache Local)\n\n` +
                `Would you like to switch to the Ganache network?\n` +
                `(You may need to add it manually in MetaMask)`
            );
            
            if (shouldSwitch) {
                try {
                    // Try to switch to Ganache network
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x1691' }], // 5777 in hex
                    });
                } catch (switchError) {
                    // If network doesn't exist, try to add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x1691',
                                chainName: 'Ganache Local',
                                rpcUrls: ['http://127.0.0.1:7545'],
                                nativeCurrency: {
                                    name: 'Ether',
                                    symbol: 'ETH',
                                    decimals: 18
                                }
                            }]
                        });
                    } else {
                        throw switchError;
                    }
                }
            } else {
                showToast('Please switch to Ganache network in MetaMask', 'error');
                return false;
            }
        }
        
        console.log('📡 Requesting account access...');
        
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        console.log('✅ Account access granted:', accounts[0]);
        currentAccount = accounts[0];
        
        console.log('🔄 Initializing contract...');
        
        // Initialize contract
        const initialized = await initWeb3();
        if (!initialized) {
            console.error('❌ Contract initialization failed');
            return false;
        }
        
        console.log('✅ Contract initialized successfully');
        
        // Update UI
        updateWalletUI();
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        console.log('🎉 Wallet connected successfully!');
        
        showToast('Wallet connected successfully!', 'success');
        
        return true;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast('Failed to connect wallet. Please try again.', 'error');
        return false;
    }
}

/**
 * Update wallet UI with current account info
 */
async function updateWalletUI() {
    const walletStatus = document.getElementById('walletStatus');
    const walletAddress = document.getElementById('walletAddress');
    const walletBalance = document.getElementById('walletBalance');
    const connectBtn = document.getElementById('connectWalletBtn');
    
    if (currentAccount) {
        // Show wallet status
        walletStatus.style.display = 'block';
        
        // Display shortened address
        const shortAddress = `${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
        walletAddress.textContent = shortAddress;
        
        // Get and display balance
        const balanceWei = await web3.eth.getBalance(currentAccount);
        const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
        walletBalance.textContent = parseFloat(balanceEth).toFixed(4);
        
        // Update connect button
        connectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
        connectBtn.disabled = true;
        connectBtn.style.background = 'var(--success)';
    }
}

/**
 * Handle account change
 */
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        showToast('Please connect to MetaMask.', 'error');
        location.reload();
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        showToast('Account changed. Reloading...', 'success');
        setTimeout(() => location.reload(), 1500);
    }
}

/**
 * Handle chain change
 */
function handleChainChanged() {
    showToast('Network changed. Reloading...', 'success');
    setTimeout(() => location.reload(), 1500);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // Update icon based on type
    const icon = toast.querySelector('i');
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        toast.classList.add('error');
    } else {
        icon.className = 'fas fa-check-circle';
        toast.classList.remove('error');
    }
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    loadingMessage.textContent = message;
    overlay.classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

/**
 * Format ETH value for display
 */
function formatEth(weiValue) {
    return parseFloat(web3.utils.fromWei(weiValue.toString(), 'ether')).toFixed(4);
}

/**
 * Convert ETH to Wei
 */
function toWei(ethValue) {
    return web3.utils.toWei(ethValue.toString(), 'ether');
}

/**
 * Get category name from enum value
 */
function getCategoryName(categoryId) {
    return CATEGORIES[parseInt(categoryId)] || 'Other';
}

/**
 * Get order status name
 */
function getOrderStatus(statusId) {
    const statuses = ['Pending', 'Shipped', 'Delivered', 'Completed', 'Cancelled'];
    return statuses[parseInt(statusId)] || 'Unknown';
}

/**
 * Format date from timestamp
 */
function formatDate(timestamp) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Generate star rating HTML
 */
function generateStarRating(rating) {
    const fullStars = Math.floor(rating / 100);
    const hasHalfStar = (rating % 100) >= 50;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let html = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        html += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        html += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        html += '<i class="far fa-star"></i>';
    }
    
    return html;
}

/**
 * Check if user is connected
 */
function checkConnection() {
    if (!currentAccount || !contract) {
        showToast('Please connect your wallet first!', 'error');
        return false;
    }
    return true;
}

/**
 * Get default product image
 */
function getProductImage(imageHash) {
    // If it's a full URL, return it
    if (imageHash.startsWith('http://') || imageHash.startsWith('https://')) {
        return imageHash;
    }
    
    // If it's an IPFS hash, construct gateway URL
    if (imageHash.startsWith('Qm') || imageHash.startsWith('bafy')) {
        return `https://ipfs.io/ipfs/${imageHash}`;
    }
    
    // Default placeholder
    return `https://via.placeholder.com/300x200/667eea/ffffff?text=Product`;
}

// Initialize wallet connection on page load
document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
});
