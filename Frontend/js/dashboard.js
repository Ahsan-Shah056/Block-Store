/**
 * Dashboard Logic for BlockMarket
 * Handles VIP status, Staking, and Token Management
 */

// Dashboard State
let dashboardData = {
    vipTier: 0,
    tokenBalance: '0',
    stakedAmount: '0',
    isSeller: false
};

const VIP_TIERS = ['None', 'Bronze', 'Silver', 'Gold'];
const VIP_DISCOUNTS = ['0%', '5%', '7.5%', '10%'];

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    if (!contract || !currentAccount) return;
    
    await loadDashboardData();
    updateDashboardUI();
    
    // Setup event listeners
    const mintBtn = document.getElementById('mintTokensBtn');
    if (mintBtn) mintBtn.addEventListener('click', mintTestTokens);
    
    const testOrderBtn = document.getElementById('createTestOrderBtn');
    if (testOrderBtn) testOrderBtn.addEventListener('click', createTestOrder);
    
    const stakeBtn = document.getElementById('stakeBtn');
    if (stakeBtn) stakeBtn.addEventListener('click', stakeTokens);
    
    const unstakeBtn = document.getElementById('unstakeBtn');
    if (unstakeBtn) unstakeBtn.addEventListener('click', unstakeTokens);
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        // Get VIP Tier
        const tier = await contract.methods.getVIPTier(currentAccount).call();
        dashboardData.vipTier = parseInt(tier);
        
        // Get Token Balance
        if (tokenContract) {
            const balance = await tokenContract.methods.balanceOf(currentAccount).call();
            dashboardData.tokenBalance = web3.utils.fromWei(balance, 'ether');
        }
        
        // Get Seller Info (for staking)
        const seller = await contract.methods.sellers(currentAccount).call();
        if (seller && seller.exists) {
            dashboardData.isSeller = true;
            // Get stake info
            const stake = await contract.methods.sellerStakes(currentAccount).call();
            dashboardData.stakedAmount = web3.utils.fromWei(stake.amount, 'ether');
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Update Dashboard UI
 */
function updateDashboardUI() {
    // Update VIP Card
    const vipTierEl = document.getElementById('dashVipTier');
    const vipDiscountEl = document.getElementById('dashVipDiscount');
    const vipIconEl = document.getElementById('dashVipIcon');
    
    if (vipTierEl) {
        vipTierEl.textContent = VIP_TIERS[dashboardData.vipTier];
        vipTierEl.className = `vip-badge vip-${VIP_TIERS[dashboardData.vipTier].toLowerCase()}`;
    }
    
    if (vipDiscountEl) vipDiscountEl.textContent = VIP_DISCOUNTS[dashboardData.vipTier] + ' Discount';
    
    // Update Token Balance
    const tokenBalEl = document.getElementById('dashTokenBalance');
    if (tokenBalEl) tokenBalEl.textContent = parseFloat(dashboardData.tokenBalance).toFixed(2) + ' BMT';
    
    // Update Staking (only for sellers)
    const stakingSection = document.getElementById('stakingSection');
    if (stakingSection) {
        if (dashboardData.isSeller) {
            stakingSection.style.display = 'block';
            document.getElementById('dashStakedAmount').textContent = parseFloat(dashboardData.stakedAmount).toFixed(2) + ' BMT';
        } else {
            stakingSection.style.display = 'none';
        }
    }
}

/**
 * Mint Test Tokens (Faucet)
 */
async function mintTestTokens() {
    if (!tokenContract) return;
    
    try {
        showLoading('Minting 100 BMT...');
        
        // Call faucet on Marketplace contract
        await contract.methods.requestTestTokens().send({ from: currentAccount });
        
        hideLoading();
        showToast('Successfully minted 100 BMT!', 'success');
        
        await loadDashboardData();
        updateDashboardUI();
        
    } catch (error) {
        console.error('Minting failed:', error);
        hideLoading();
        showToast('Minting failed: ' + error.message, 'error');
    }
}

/**
 * Stake Tokens
 */
async function stakeTokens() {
    if (!contract || !tokenContract) return;
    
    const amountStr = prompt('Enter amount to stake (BMT):');
    if (!amountStr) return;
    
    try {
        showLoading('Staking tokens...');
        const amount = web3.utils.toWei(amountStr, 'ether');
        
        // Approve first
        await tokenContract.methods.approve(contract._address, amount).send({ from: currentAccount });
        
        // Stake
        await contract.methods.stakeForVerification(amount).send({ from: currentAccount });
        
        hideLoading();
        showToast('Successfully staked tokens!', 'success');
        
        await loadDashboardData();
        updateDashboardUI();
        
    } catch (error) {
        console.error('Staking failed:', error);
        hideLoading();
        showToast('Staking failed: ' + error.message, 'error');
    }
}

/**
 * Unstake Tokens
 */
async function unstakeTokens() {
    if (!contract) return;
    
    if (!confirm('Are you sure you want to unstake? This may affect your seller status.')) return;
    
    try {
        showLoading('Unstaking tokens...');
        
        await contract.methods.unstakeTokens().send({ from: currentAccount });
        
        hideLoading();
        showToast('Successfully unstaked tokens!', 'success');
        
        await loadDashboardData();
        updateDashboardUI();
        
    } catch (error) {
        console.error('Unstaking failed:', error);
        hideLoading();
        showToast('Unstaking failed: ' + error.message, 'error');
    }
}

/**
 * Create Test Order
 */
async function createTestOrder() {
    if (!contract) return;
    
    try {
        showLoading('Creating test order...');
        
        // Get first product
        const product = await contract.methods.products(1).call();
        
        if (!product.isActive) {
            throw new Error('Test product (ID 1) is not active');
        }

        // Check for self-purchase
        if (product.seller.toLowerCase() === currentAccount.toLowerCase()) {
            hideLoading();
            showToast('You cannot buy your own product! Switch accounts to test.', 'warning');
            return;
        }
        
        const totalPrice = BigInt(product.price); // Quantity 1
        
        // Purchase
        await contract.methods.purchaseProduct(1, 1)
            .send({
                from: currentAccount,
                value: totalPrice.toString(),
                gas: 3000000
            });
            
        hideLoading();
        showToast('Test order created! Check "My Orders".', 'success');
        
        // Refresh orders if modal is open
        if (typeof openOrders === 'function') {
            openOrders();
        }
        
    } catch (error) {
        console.error('Test order failed:', error);
        hideLoading();
        showToast('Failed to create test order: ' + error.message, 'error');
    }
}

// Open Dashboard Modal
function openDashboard() {
    const modal = document.getElementById('dashboardModal');
    if (modal) {
        modal.classList.add('active');
        initDashboard();
    }
}

// Close Dashboard Modal
function closeDashboard() {
    const modal = document.getElementById('dashboardModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add dashboard button to nav if not exists
    const nav = document.querySelector('.nav-links');
    if (nav && !document.getElementById('dashboardLink')) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="#" id="dashboardLink"><i class="fas fa-user-circle"></i> Dashboard</a>';
        nav.appendChild(li);
        
        document.getElementById('dashboardLink').addEventListener('click', (e) => {
            e.preventDefault();
            openDashboard();
        });
    }
    
    // Close modal on background click
    const modal = document.getElementById('dashboardModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDashboard();
        });
    }
});
