// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BlockMarket Token (BMT)
 * @dev Enhanced ERC20 Token for BlockMarket Ecosystem
 * 
 * Token Economics:
 * - Earned as rewards for purchases (10 BMT per purchase) and reviews (5 BMT per review)
 * - Used for discounts based on VIP tiers (5%-10% off based on holdings)
 * - Burned on transactions (1% burn rate) for deflationary pressure
 * - Staked by sellers for verification and enhanced features
 * - Used to feature products and access premium marketplace features
 * 
 * VIP Tiers:
 * - Bronze: 100+ BMT = 5% discount
 * - Silver: 500+ BMT = 7.5% discount  
 * - Gold: 1000+ BMT = 10% discount
 */
contract BlockToken is ERC20, Ownable {
    
    // ==================== Staking State ====================
    
    /// @dev Mapping of address to staked token amount
    mapping(address => uint256) private _stakedBalances;
    
    /// @dev Total tokens staked in the ecosystem
    uint256 private _totalStaked;
    
    // ==================== Events ====================
    
    /// @dev Emitted when tokens are staked
    event TokensStaked(address indexed account, uint256 amount);
    
    /// @dev Emitted when tokens are unstaked
    event TokensUnstaked(address indexed account, uint256 amount);
    
    /// @dev Emitted when tokens are burned
    event TokensBurned(address indexed from, uint256 amount);
    
    // ==================== Constructor ====================
    
    constructor() ERC20("BlockMarket Token", "BMT") {}

    // ==================== Minting ====================
    
    /**
     * @dev Mint new tokens. Only accessible by the owner (Marketplace contract).
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ==================== Burning ====================
    
    /**
     * @dev Burn tokens from caller's balance.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from specified account (requires allowance).
     * Used by Marketplace for token-based payments and penalties.
     * @param account The address to burn tokens from.
     * @param amount The amount of tokens to burn.
     */
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
        emit TokensBurned(account, amount);
    }

    // ==================== Staking ====================
    
    /**
     * @dev Stake tokens. Staked tokens are locked and cannot be transferred.
     * Used by sellers for verification and enhanced features.
     * @param amount The amount of tokens to stake.
     */
    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0 tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance to stake");
        
        _transfer(msg.sender, address(this), amount);
        _stakedBalances[msg.sender] += amount;
        _totalStaked += amount;
        
        emit TokensStaked(msg.sender, amount);
    }
    
    /**
     * @dev Unstake tokens. Returns staked tokens to user's balance.
     * Note: Marketplace contract enforces cooldown periods.
     * @param amount The amount of tokens to unstake.
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0 tokens");
        require(_stakedBalances[msg.sender] >= amount, "Insufficient staked balance");
        
        _stakedBalances[msg.sender] -= amount;
        _totalStaked -= amount;
        _transfer(address(this), msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount);
    }
    
    /**
     * @dev Slash staked tokens (only owner - Marketplace contract).
     * Used for penalizing fraudulent sellers.
     * @param account The address to slash tokens from.
     * @param amount The amount of tokens to slash.
     */
    function slashStake(address account, uint256 amount) external onlyOwner {
        require(_stakedBalances[account] >= amount, "Insufficient staked balance to slash");
        
        _stakedBalances[account] -= amount;
        _totalStaked -= amount;
        _burn(address(this), amount);
        
        emit TokensBurned(account, amount);
    }
    
    // ==================== View Functions ====================
    
    /**
     * @dev Get staked balance of an account.
     * @param account The address to check.
     * @return The amount of tokens staked by the account.
     */
    function stakedBalanceOf(address account) external view returns (uint256) {
        return _stakedBalances[account];
    }
    
    /**
     * @dev Get total amount of tokens staked in the ecosystem.
     * @return The total staked token amount.
     */
    function totalStaked() external view returns (uint256) {
        return _totalStaked;
    }
    
    /**
     * @dev Get available (non-staked) balance of an account.
     * @param account The address to check.
     * @return The amount of tokens available (not staked).
     */
    function availableBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account);
    }
    
    /**
     * @dev Get total balance including staked tokens.
     * @param account The address to check.
     * @return The total balance (available + staked).
     */
    function totalBalanceOf(address account) external view returns (uint256) {
        return balanceOf(account) + _stakedBalances[account];
    }
}
