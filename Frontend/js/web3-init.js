/**
 * Web3 Initialization Module
 * Handles MetaMask connection and contract setup
 */

// Contract ABI and Address
let contractAddress = null;
let contractABI = null;
let tokenAddress = null;
let tokenABI = null;

// Web3 and Contract instances
let web3 = null;
let contract = null;
let tokenContract = null;
let currentAccount = null;

// Categories mapping
const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports', 'Other'];

/**
 * Initialize Web3 and load contract details
 */
async function initWeb3() {
    try {
        // Load Marketplace contract
        let contractData = await loadContractData('Marketplace.json');
        if (!contractData) {
            throw new Error('Could not find Marketplace.json');
        }

        contractABI = contractData.abi;

        // Get deployed network
        const networkId = await web3.eth.net.getId();
        console.log('🌐 Connected Network ID:', networkId);

        const deployedNetwork = contractData.networks[networkId];

        if (!deployedNetwork) {
            throw new Error(`Marketplace contract not deployed on network ${networkId}`);
        }

        contractAddress = deployedNetwork.address;
        contract = new web3.eth.Contract(contractABI, contractAddress);

        console.log('✅ Marketplace Contract initialized at:', contractAddress);

        // Load BlockToken contract
        try {
            let tokenData = await loadContractData('BlockToken.json');
            if (tokenData) {
                tokenABI = tokenData.abi;
                
                // Fetch token address from Marketplace contract since it was deployed internally
                try {
                    tokenAddress = await contract.methods.token().call();
                    console.log('📍 Token Address from Marketplace:', tokenAddress);
                    
                    if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
                        tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
                        console.log('✅ BlockToken Contract initialized at:', tokenAddress);
                    } else {
                        console.warn('⚠️ Token address not set in Marketplace');
                    }
                } catch (err) {
                    console.warn('⚠️ Failed to fetch token address from Marketplace:', err);
                    // Fallback to artifact if available (unlikely for internal deploy)
                    const tokenNetwork = tokenData.networks[networkId];
                    if (tokenNetwork) {
                        tokenAddress = tokenNetwork.address;
                        tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
                    }
                }
            }
        } catch (tokenError) {
            console.warn('⚠️ Failed to load BlockToken:', tokenError);
        }

        return true;
    } catch (error) {
        console.error('❌ Error initializing Web3:', error);
        showToast('Failed to load contract. ' + error.message, 'error');
        return false;
    }
}

async function loadContractData(filename) {
    const paths = [
        `contracts/${filename}`,
        `../build/contracts/${filename}`,
        `/build/contracts/${filename}`
    ];

    for (const path of paths) {
        try {
            const response = await fetch(path);
            if (response.ok) {
                console.log(`✅ Loaded ${filename} from: ${path}`);
                return await response.json();
            }
        } catch (err) {
            continue;
        }
    }
    return null;
}

/**
 * Connect to MetaMask wallet
 */
async function connectWallet() {
    try {
        console.log('🔌 Attempting to connect wallet...');

        if (typeof window.ethereum === 'undefined') {
            showToast('Please install MetaMask!', 'error');
            window.open('https://metamask.io/download/', '_blank');
            return false;
        }

        web3 = new Web3(window.ethereum);

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }

        currentAccount = web3.utils.toChecksumAddress(accounts[0]);
        console.log('✅ Connected account:', currentAccount);

        // Initialize contracts
        const initialized = await initWeb3();
        if (!initialized) return false;

        // Save to localStorage
        localStorage.setItem('lastConnectedAccount', currentAccount);

        // Update UI
        await updateWalletUI();

        // Initialize cart for this account
        if (typeof initializeCart === 'function') {
            initializeCart();
        }

        // Setup listeners
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        showToast('Wallet connected successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast('Failed to connect wallet', 'error');
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
        walletStatus.style.display = 'block';

        // Display address
        walletAddress.textContent = `${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;

        // Display ETH balance
        const balanceWei = await web3.eth.getBalance(currentAccount);
        const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
        let balanceText = `${parseFloat(balanceEth).toFixed(4)} ETH`;

        // Display BMT balance if available
        if (tokenContract) {
            try {
                const tokenBalance = await tokenContract.methods.balanceOf(currentAccount).call();
                const tokenSymbol = await tokenContract.methods.symbol().call();
                const tokenDecimals = await tokenContract.methods.decimals().call();
                const formattedTokenBalance = tokenBalance / (10 ** tokenDecimals);
                balanceText += ` | ${formattedTokenBalance} ${tokenSymbol}`;
            } catch (err) {
                console.warn('Error fetching token balance:', err);
            }
        }

        walletBalance.textContent = balanceText;

        // Update button
        connectBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
        connectBtn.disabled = true;
        connectBtn.style.background = 'var(--success)';

        // Trigger page-specific loads
        if (typeof loadProducts === 'function') {
            await loadPlatformStats();
            await loadProducts();
        }

        if (typeof checkSellerStatus === 'function') {
            await checkSellerStatus();
        }
    }
}

/**
 * Handle account change
 */
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        window.location.reload();
    }
}

/**
 * Handle chain change
 */
function handleChainChanged() {
    window.location.reload();
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    currentAccount = null;
    web3 = null;
    contract = null;
    tokenContract = null;
    localStorage.removeItem('lastConnectedAccount');
    window.location.reload();
}

/**
 * Get current account (non-cached)
 */
async function getCurrentAccount() {
    if (typeof window.ethereum === 'undefined') return null;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    const icon = toast.querySelector('i');

    if (type === 'error') {
        if (icon) icon.className = 'fas fa-exclamation-circle';
        toast.classList.add('error');
    } else {
        if (icon) icon.className = 'fas fa-check-circle';
        toast.classList.remove('error');
    }

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    if (overlay && loadingMessage) {
        loadingMessage.textContent = message;
        overlay.classList.add('active');
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Format ETH value
 */
function formatEth(weiValue) {
    if (!web3) return '0';
    return parseFloat(web3.utils.fromWei(weiValue.toString(), 'ether')).toFixed(4);
}

/**
 * Convert ETH to Wei
 */
function toWei(ethValue) {
    if (!web3) return '0';
    return web3.utils.toWei(ethValue.toString(), 'ether');
}

/**
 * Get category name
 */
function getCategoryName(categoryId) {
    return CATEGORIES[parseInt(categoryId)] || 'Other';
}

/**
 * Get order status name
 */
function getOrderStatus(statusId) {
    const statuses = ['Pending', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Disputed', 'Refunded'];
    return statuses[parseInt(statusId)] || 'Unknown';
}

/**
 * Get status class for styling
 */
function getStatusClass(statusId) {
    const status = parseInt(statusId);
    switch (status) {
        case 0: return 'status-pending';
        case 1: return 'status-shipped';
        case 2: return 'status-delivered';
        case 3: return 'status-completed';
        case 4: return 'status-cancelled';
        case 5: return 'status-disputed';
        case 6: return 'status-refunded';
        default: return '';
    }
}

/**
 * Format date
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
    for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
    if (hasHalfStar) html += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';

    return html;
}

/**
 * Check connection
 */
function checkConnection() {
    if (!currentAccount || !contract) {
        showToast('Please connect your wallet first!', 'error');
        return false;
    }
    return true;
}

/**
 * Get product image
 */
function getProductImage(imageHash) {
    if (!imageHash) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (imageHash.startsWith('http')) return imageHash;
    // Handle fake hashes from sample data
    if (imageHash.startsWith('QmHash')) {
        return `https://via.placeholder.com/300x200?text=Product+${imageHash.substring(6)}`;
    }
    if (imageHash.startsWith('ipfs://')) {
        return imageHash.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    // If it's just the hash
    return `https://ipfs.io/ipfs/${imageHash}`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);

    // Check for account changes
    if (typeof window.ethereum !== 'undefined') {
        const current = await getCurrentAccount();
        const cached = localStorage.getItem('lastConnectedAccount');

        if (cached && current && cached.toLowerCase() !== current.toLowerCase()) {
            localStorage.removeItem('lastConnectedAccount');
            showToast('Account changed. Please reconnect.', 'info');
        }
    }
});
