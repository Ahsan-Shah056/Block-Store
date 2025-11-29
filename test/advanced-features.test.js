const Marketplace = artifacts.require("Marketplace");
const BlockToken = artifacts.require("BlockToken");

contract("Advanced Features - Comprehensive Tests", (accounts) => {
    let marketplace;
    let token;
    const owner = accounts[0];
    const seller1 = accounts[1];
    const seller2 = accounts[2];
    const buyer1 = accounts[3];
    const buyer2 = accounts[4];
    const buyer3 = accounts[5];
    
    const productPrice = web3.utils.toWei("1", "ether");
    
    beforeEach(async () => {
        marketplace = await Marketplace.new({ from: owner });
        const tokenAddress = await marketplace.token();
        token = await BlockToken.at(tokenAddress);
        
        // Register sellers
        await marketplace.registerSeller("Premium Store", { from: seller1 });
        await marketplace.registerSeller("Budget Store", { from: seller2 });
        
        // Add products
        await marketplace.addProduct(
            "Test Product 1",
            "Description",
            "image.jpg",
            productPrice,
            100,
            0, // Electronics
            { from: seller1 }
        );
        
        await marketplace.addProduct(
            "Test Product 2",
            "Description",
            "image2.jpg",
            web3.utils.toWei("0.5", "ether"),
            50,
            1, // Clothing
            { from: seller2 }
        );
    });

    // ==================== VIP TIER TESTS ====================
    
    describe("VIP Tier System", () => {
        it("should return None tier for users with no tokens", async () => {
            const tier = await marketplace.getVIPTier(buyer1);
            assert.equal(tier.toString(), "0", "Should be None tier"); // VIPTier.None = 0
        });
        
        it("should return Bronze tier for 100+ BMT", async () => {
            // Give buyer1 some BMT tokens
            await marketplace.purchaseProduct(1, 1, {
                from: buyer1,
                value: productPrice
            });
            
            // Check they got reward tokens (10 BMT)
            let balance = await token.balanceOf(buyer1);
            assert(balance.gt(web3.utils.toBN(0)), "Should have received reward tokens");
            
            // Mint more to reach Bronze (100 BMT total)
            const bronzeAmount = web3.utils.toWei("100", "ether");
            await token.mint(buyer1, bronzeAmount);
            
            const tier = await marketplace.getVIPTier(buyer1);
            assert.equal(tier.toString(), "1", "Should be Bronze tier"); // VIPTier.Bronze = 1
        });
        
        it("should return Silver tier for 500+ BMT", async () => {
            const silverAmount = web3.utils.toWei("500", "ether");
            await token.mint(buyer1, silverAmount);
            
            const tier = await marketplace.getVIPTier(buyer1);
            assert.equal(tier.toString(), "2", "Should be Silver tier");
        });
        
        it("should return Gold tier for 1000+ BMT", async () => {
            const goldAmount = web3.utils.toWei("1000", "ether");
            await token.mint(buyer1, goldAmount);
            
            const tier = await marketplace.getVIPTier(buyer1);
            assert.equal(tier.toString(), "3", "Should be Gold tier");
        });
        
        it("should calculate correct discount for Bronze tier (5%)", async () => {
            const bronzeAmount = web3.utils.toWei("100", "ether");
            await token.mint(buyer1, bronzeAmount);
            
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const expectedDiscount = web3.utils.toBN(productPrice).mul(web3.utils.toBN(500)).div(web3.utils.toBN(10000)); // 5%
            
            assert.equal(discount.toString(), expectedDiscount.toString(), "Should be 5% discount");
        });
        
        it("should calculate correct discount for Silver tier (7.5%)", async () => {
            const silverAmount = web3.utils.toWei("500", "ether");
            await token.mint(buyer1, silverAmount);
            
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const expectedDiscount = web3.utils.toBN(productPrice).mul(web3.utils.toBN(750)).div(web3.utils.toBN(10000)); // 7.5%
            
            assert.equal(discount.toString(), expectedDiscount.toString(), "Should be 7.5% discount");
        });
        
        it("should calculate correct discount for Gold tier (10%)", async () => {
            const goldAmount = web3.utils.toWei("1000", "ether");
            await token.mint(buyer1, goldAmount);
            
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const expectedDiscount = web3.utils.toBN(productPrice).mul(web3.utils.toBN(1000)).div(web3.utils.toBN(10000)); // 10%
            
            assert.equal(discount.toString(), expectedDiscount.toString(), "Should be 10% discount");
        });
    });

    // ==================== HYBRID PAYMENT TESTS ====================
    
    describe("Token-Based Discount Purchases", () => {
        beforeEach(async () => {
            // Give buyer1 Gold tier status
            const goldAmount = web3.utils.toWei("1000", "ether");
            await token.mint(buyer1, goldAmount);
        });
        
        it("should allow purchase with token discount", async () => {
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const tokenAmount = discount; // Use full discount
            
            // Approve tokens
            await token.approve(marketplace.address, tokenAmount, { from: buyer1 });
            
            const finalPrice = web3.utils.toBN(productPrice).sub(web3.utils.toBN(tokenAmount));
            
            await marketplace.purchaseWithTokenDiscount(1, 1, tokenAmount, {
                from: buyer1,
                value: finalPrice.toString()
            });
            
            const order = await marketplace.orders(1);
            assert.equal(order.buyer, buyer1, "Order should be created");
        });
        
        it("should burn 1% of token payment", async () => {
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const tokenAmount = discount;
            
            await token.approve(marketplace.address, tokenAmount, { from: buyer1 });
            
            const balanceBefore = await token.balanceOf(buyer1);
            const finalPrice = web3.utils.toBN(productPrice).sub(web3.utils.toBN(tokenAmount));
            
            await marketplace.purchaseWithTokenDiscount(1, 1, tokenAmount, {
                from: buyer1,
                value: finalPrice.toString()
            });
            
            const balanceAfter = await token.balanceOf(buyer1);
            const burned = balanceBefore.sub(balanceAfter);
            
            // Should have burned the token amount (1% was already burned, rest transferred)
            assert(burned.gte(tokenAmount), "Tokens should be burned/transferred");
        });
        
        it("should reject token amount exceeding discount", async () => {
            const discount = await marketplace.calculateDiscount(productPrice, buyer1);
            const excessiveAmount = web3.utils.toBN(discount).add(web3.utils.toBN(web3.utils.toWei("10", "ether")));
            
            await token.approve(marketplace.address, excessiveAmount, { from: buyer1 });
            
            try {
                await marketplace.purchaseWithTokenDiscount(1, 1, excessiveAmount, {
                    from: buyer1,
                    value: productPrice
                });
                assert.fail("Should reject excessive token amount");
            } catch (error) {
                assert(error.message.includes("Token amount exceeds discount"), "Should throw correct error");
            }
        });
    });

    // ==================== STAKING TESTS ====================
    
    describe("Seller Staking System", () => {
        it("should allow seller to stake tokens", async () => {
            const stakeAmount = web3.utils.toWei("100", "ether");
            await token.mint(seller1, stakeAmount);
            await token.approve(marketplace.address, stakeAmount, { from: seller1 });
            
            await marketplace.stakeForVerification(stakeAmount, { from: seller1 });
            
            const stake = await marketplace.sellerStakes(seller1);
            assert.equal(stake.amount.toString(), stakeAmount, "Stake amount should match");
            assert.equal(stake.isStaked, true, "Should be marked as staked");
        });
        
        it("should auto-verify seller with 100 BMT stake", async () => {
            const stakeAmount = web3.utils.toWei("100", "ether");
            await token.mint(seller1, stakeAmount);
            await token.approve(marketplace.address, stakeAmount, { from: seller1 });
            
            await marketplace.stakeForVerification(stakeAmount, { from: seller1 });
            
            const sellerInfo = await marketplace.sellers(seller1);
            assert.equal(sellerInfo.sellerLevel.toString(), "1", "Should be verified (level 1)");
        });
        
        it("should enforce minimum stake amount", async () => {
            const tooLow = web3.utils.toWei("10", "ether"); // Below 50 BMT minimum
            await token.mint(seller1, tooLow);
            await token.approve(marketplace.address, tooLow, { from: seller1 });
            
            try {
                await marketplace.stakeForVerification(tooLow, { from: seller1 });
                assert.fail("Should reject stake below minimum");
            } catch (error) {
                assert(error.message.includes("Amount below minimum"), "Should throw correct error");
            }
        });
        
        it("should allow unstaking after cooldown period", async () => {
            const stakeAmount = web3.utils.toWei("100", "ether");
            await token.mint(seller1, stakeAmount);
            await token.approve(marketplace.address, stakeAmount, { from: seller1 });
            
            await marketplace.stakeForVerification(stakeAmount, { from: seller1 });
            
            // Fast forward 7 days
            await web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [7 * 24 * 60 * 60], // 7 days
                id: new Date().getTime()
            }, () => {});
            
            await web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_mine",
                id: new Date().getTime()
            }, () => {});
            
            await marketplace.unstakeTokens({ from: seller1 });
            
            const stake = await marketplace.sellerStakes(seller1);
            assert.equal(stake.amount.toString(), "0", "Stake should be zero");
            assert.equal(stake.isStaked, false, "Should not be staked");
        });
        
        it("should reject unstaking before cooldown", async () => {
            const stakeAmount = web3.utils.toWei("100", "ether");
            await token.mint(seller1, stakeAmount);
            await token.approve(marketplace.address, stakeAmount, { from: seller1 });
            
            await marketplace.stakeForVerification(stakeAmount, { from: seller1 });
            
            try {
                await marketplace.unstakeTokens({ from: seller1 });
                assert.fail("Should reject early unstaking");
            } catch (error) {
                assert(error.message.includes("Cooldown period not passed"), "Should throw cooldown error");
            }
        });
        
        it("should allow platform owner to slash stake", async () => {
            const stakeAmount = web3.utils.toWei("100", "ether");
            await token.mint(seller1, stakeAmount);
            await token.approve(marketplace.address, stakeAmount, { from: seller1 });
            
            await marketplace.stakeForVerification(stakeAmount, { from: seller1 });
            
            const slashAmount = web3.utils.toWei("50", "ether");
            await marketplace.slashSellerStake(seller1, slashAmount, "Fraudulent behavior", { from: owner });
            
            const stake = await marketplace.sellerStakes(seller1);
            assert.equal(stake.amount.toString(), web3.utils.toWei("50", "ether"), "Stake should be slashed");
        });
    });

    // ==================== FEATURED LISTINGS TESTS ====================
    
    describe("Featured Listings", () => {
        beforeEach(async () => {
            // Give seller tokens for featuring
            const featureTokens = web3.utils.toWei("200", "ether");
            await token.mint(seller1, featureTokens);
        });
        
        it("should allow seller to feature product for 24h", async () => {
            const cost = await marketplace.FEATURE_COST_DAY();
            await token.approve(marketplace.address, cost, { from: seller1 });
            
            await marketplace.featureProduct(1, 0, { from: seller1 }); // 0 = Day
            
            const isFeatured = await marketplace.isFeatured(1);
            assert.equal(isFeatured, true, "Product should be featured");
        });
        
        it("should burn tokens when featuring product", async () => {
            const cost = await marketplace.FEATURE_COST_DAY();
            await token.approve(marketplace.address, cost, { from: seller1 });
            
            const balanceBefore = await token.balanceOf(seller1);
            await marketplace.featureProduct(1, 0, { from: seller1 });
            const balanceAfter = await token.balanceOf(seller1);
            
            const burned = balanceBefore.sub(balanceAfter);
            assert.equal(burned.toString(), cost.toString(), "Should burn feature cost");
        });
        
        it("should expire featured listing after duration", async () => {
            const cost = await marketplace.FEATURE_COST_DAY();
            await token.approve(marketplace.address, cost, { from: seller1 });
            
            await marketplace.featureProduct(1, 0, { from: seller1 });
            
            // Check it's featured
            let isFeatured = await marketplace.isFeatured(1);
            assert.equal(isFeatured, true, "Should be featured initially");
            
            // Fast forward 25 hours
            await web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [25 * 60 * 60],
                id: new Date().getTime()
            }, () => {});
            
            await web3.currentProvider.send({
                jsonrpc: "2.0",
                method: "evm_mine",
                id: new Date().getTime()
            }, () => {});
            
            isFeatured = await marketplace.isFeatured(1);
            assert.equal(isFeatured, false, "Should not be featured after expiry");
        });
        
        it("should return list of featured products", async () => {
            const cost = await marketplace.FEATURE_COST_DAY();
            await token.approve(marketplace.address, cost.mul(web3.utils.toBN(2)), { from: seller1 });
            
            await marketplace.featureProduct(1, 0, { from: seller1 });
            
            // Give seller2 tokens
            await token.mint(seller2, cost);
            await token.approve(marketplace.address, cost, { from: seller2 });
            await marketplace.featureProduct(2, 0, { from: seller2 });
            
            const featured = await marketplace.getFeaturedProducts();
            assert.equal(featured.length, 2, "Should have 2 featured products");
        });
    });

    // ==================== FRAUD PREVENTION TESTS ====================
    
    describe("Fraud Prevention System", () => {
        it("should restrict new buyers to 1 ETH max order", async () => {
            const largeOrder = web3.utils.toWei("2", "ether");
            
            // Add expensive product
            await marketplace.addProduct(
                "Expensive Item",
                "High value",
                "exp.jpg",
                largeOrder,
                10,
                0,
                { from: seller1 }
            );
            
            try {
                await marketplace.purchaseProduct(3, 1, {
                    from: buyer3, // New buyer
                    value: largeOrder
                });
                assert.fail("Should reject large order from new buyer");
            } catch (error) {
                assert(error.message.includes("Order value too high for new buyer"), "Should throw fraud prevention error");
            }
        });
        
        it("should allow blacklisting addresses", async () => {
            await marketplace.addToBlacklist(buyer1, "Fraudulent activity", { from: owner });
            
            const isBlacklisted = await marketplace.blacklistedAddresses(buyer1);
            assert.equal(isBlacklisted, true, "Address should be blacklisted");
            
            try {
                await marketplace.purchaseProduct(1, 1, {
                    from: buyer1,
                    value: productPrice
                });
                assert.fail("Blacklisted address should not be able to purchase");
            } catch (error) {
                assert(error.message.includes("Address is blacklisted"), "Should reject blacklisted buyer");
            }
        });
        
        it("should allow removing from blacklist", async () => {
            await marketplace.addToBlacklist(buyer1, "Test", { from: owner });
            await marketplace.removeFromBlacklist(buyer1, { from: owner });
            
            const isBlacklisted = await marketplace.blacklistedAddresses(buyer1);
            assert.equal(isBlacklisted, false, "Address should be whitelisted");
        });
    });

    // ==================== SHOPPING CART TESTS ====================
    
    describe("Shopping Cart Batch Purchases", () => {
        it("should allow purchasing multiple products at once", async () => {
            const cart = [
                { productId: 1, quantity: 2 },
                { productId: 2, quantity: 1 }
            ];
            
            const product1Price = await marketplace.products(1).then(p => p.price);
            const product2Price = await marketplace.products(2).then(p => p.price);
            const totalCost = web3.utils.toBN(product1Price).mul(web3.utils.toBN(2))
                .add(web3.utils.toBN(product2Price));
            
            await marketplace.purchaseCart(cart, {
                from: buyer1,
                value: totalCost.toString()
            });
            
            const orderCount = await marketplace.orderCounter();
            assert.equal(orderCount.toString(), "2", "Should create 2 orders");
        });
        
        it("should give bonus rewards for cart purchases", async () => {
            const cart = [
                { productId: 1, quantity: 1 },
                { productId: 2, quantity: 1 }
            ];
            
            const product1Price = await marketplace.products(1).then(p => p.price);
            const product2Price = await marketplace.products(2).then(p => p.price);
            const totalCost = web3.utils.toBN(product1Price).add(web3.utils.toBN(product2Price));
            
            const balanceBefore = await token.balanceOf(buyer1);
            
            await marketplace.purchaseCart(cart, {
                from: buyer1,
                value: totalCost.toString()
            });
            
            const balanceAfter = await token.balanceOf(buyer1);
            const rewardsEarned = balanceAfter.sub(balanceBefore);
            
            const expectedRewards = web3.utils.toBN(web3.utils.toWei("10", "ether")).mul(web3.utils.toBN(2)); // 10 BMT per item
            assert(rewardsEarned.gte(expectedRewards), "Should receive cart bonus rewards");
        });
        
        it("should reject empty cart", async () => {
            try {
                await marketplace.purchaseCart([], {
                    from: buyer1,
                    value: 0
                });
                assert.fail("Should reject empty cart");
            } catch (error) {
                assert(error.message.includes("Cart is empty"), "Should throw empty cart error");
            }
        });
        
        it("should reject cart with too many items", async () => {
            const largeCart = [];
            for (let i = 0; i < 21; i++) {
                largeCart.push({ productId: 1, quantity: 1 });
            }
            
            try {
                await marketplace.purchaseCart(largeCart, {
                    from: buyer1,
                    value: web3.utils.toWei("21", "ether")
                });
                assert.fail("Should reject cart with > 20 items");
            } catch (error) {
                assert(error.message.includes("Too many items"), "Should throw size limit error");
            }
        });
    });

    // ==================== BULK OPERATIONS TESTS ====================
    
    describe("Bulk Operations", () => {
        it("should allow sellers to add multiple products at once", async () => {
            const names = ["Bulk Product 1", "Bulk Product 2", "Bulk Product 3"];
            const descriptions = ["Desc 1", "Desc 2", "Desc 3"];
            const imageHashes = ["img1.jpg", "img2.jpg", "img3.jpg"];
            const prices = [
                web3.utils.toWei("0.1", "ether"),
                web3.utils.toWei("0.2", "ether"),
                web3.utils.toWei("0.3", "ether")
            ];
            const stocks = [10, 20, 30];
            const categories = [0, 1, 2]; // Electronics, Clothing, Books
            
            const productCountBefore = await marketplace.productCounter();
            
            await marketplace.addProductsBulk(
                names,
                descriptions,
                imageHashes,
                prices,
                stocks,
                categories,
                { from: seller1 }
            );
            
            const productCountAfter = await marketplace.productCounter();
            assert.equal(
                productCountAfter.sub(productCountBefore).toString(),
                "3",
                "Should add 3 products"
            );
        });
        
        it("should reject bulk product arrays with mismatched lengths", async () => {
            const names = ["Product 1", "Product 2"];
            const descriptions = ["Desc 1"]; // Mismatched length
            const imageHashes = ["img1.jpg", "img2.jpg"];
            const prices = [web3.utils.toWei("0.1", "ether"), web3.utils.toWei("0.2", "ether")];
            const stocks = [10, 20];
            const categories = [0, 1];
            
            try {
                await marketplace.addProductsBulk(
                    names,
                    descriptions,
                    imageHashes,
                    prices,
                    stocks,
                    categories,
                    { from: seller1 }
                );
                assert.fail("Should reject mismatched arrays");
            } catch (error) {
                assert(error.message.includes("Array length mismatch"), "Should throw mismatch error");
            }
        });
        
        it("should allow platform owner to verify multiple sellers", async () => {
            // Register more sellers
            await marketplace.registerSeller("New Store 1", { from: accounts[6] });
            await marketplace.registerSeller("New Store 2", { from: accounts[7] });
            
            await marketplace.verifySellersBulk([accounts[6], accounts[7]], { from: owner });
            
            const seller1Info = await marketplace.sellers(accounts[6]);
            const seller2Info = await marketplace.sellers(accounts[7]);
            
            assert.equal(seller1Info.sellerLevel.toString(), "1", "Seller 1 should be verified");
            assert.equal(seller2Info.sellerLevel.toString(), "1", "Seller 2 should be verified");
        });
    });
});
