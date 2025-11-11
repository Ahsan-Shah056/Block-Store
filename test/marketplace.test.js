const Marketplace = artifacts.require("Marketplace");

contract("Marketplace", (accounts) => {
    let marketplace;
    const owner = accounts[0];
    const seller1 = accounts[1];
    const seller2 = accounts[2];
    const buyer1 = accounts[3];
    const buyer2 = accounts[4];
    
    const productName = "iPhone 15 Pro";
    const productDescription = "Latest smartphone with advanced features";
    const productImage = "https://example.com/iphone.jpg";
    const productPrice = web3.utils.toWei("0.1", "ether");
    const productStock = 10;
    const productCategory = 0; // Electronics
    
    beforeEach(async () => {
        marketplace = await Marketplace.new({ from: owner });
    });
    
    describe("Deployment", () => {
        it("should deploy successfully", async () => {
            const address = marketplace.address;
            assert.notEqual(address, "");
            assert.notEqual(address, 0x0);
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });
        
        it("should set the correct platform owner", async () => {
            const platformOwner = await marketplace.platformOwner();
            assert.equal(platformOwner, owner, "Platform owner should be the deployer");
        });
        
        it("should set default commission rate to 2%", async () => {
            const commissionRate = await marketplace.platformCommissionRate();
            assert.equal(commissionRate.toString(), "2", "Default commission rate should be 2%");
        });
    });
    
    describe("Seller Registration", () => {
        it("should register a seller successfully", async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            
            const sellerInfo = await marketplace.sellers(seller1);
            assert.equal(sellerInfo.name, "Tech Store", "Seller name should match");
            assert.equal(sellerInfo.isRegistered, true, "Seller should be registered");
            assert.equal(sellerInfo.isActive, true, "Seller should be active");
        });
        
        it("should not allow duplicate registration", async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            
            try {
                await marketplace.registerSeller("Tech Store 2", { from: seller1 });
                assert.fail("Should not allow duplicate registration");
            } catch (error) {
                assert(error.message.includes("Already registered"), "Should throw already registered error");
            }
        });
        
        it("should increment seller counter", async () => {
            await marketplace.registerSeller("Store 1", { from: seller1 });
            await marketplace.registerSeller("Store 2", { from: seller2 });
            
            const sellerCounter = await marketplace.sellerCounter();
            assert.equal(sellerCounter.toString(), "2", "Seller counter should be 2");
        });
    });
    
    describe("Product Management", () => {
        beforeEach(async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
        });
        
        it("should add a product successfully", async () => {
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            
            const product = await marketplace.products(1);
            assert.equal(product.name, productName, "Product name should match");
            assert.equal(product.price.toString(), productPrice, "Product price should match");
            assert.equal(product.stock.toString(), productStock.toString(), "Product stock should match");
            assert.equal(product.seller, seller1, "Product seller should be correct");
            assert.equal(product.isActive, true, "Product should be active");
        });
        
        it("should not allow non-sellers to add products", async () => {
            try {
                await marketplace.addProduct(
                    productName,
                    productDescription,
                    productImage,
                    productPrice,
                    productStock,
                    productCategory,
                    { from: buyer1 }
                );
                assert.fail("Non-seller should not be able to add products");
            } catch (error) {
                assert(error.message.includes("registered seller"), "Should throw not registered error");
            }
        });
        
        it("should update product details", async () => {
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            
            const newPrice = web3.utils.toWei("0.15", "ether");
            const newStock = 20;
            
            await marketplace.updateProduct(
                1,
                "iPhone 15 Pro Max",
                "Updated description",
                productImage,
                newPrice,
                newStock,
                { from: seller1 }
            );
            
            const product = await marketplace.products(1);
            assert.equal(product.name, "iPhone 15 Pro Max", "Product name should be updated");
            assert.equal(product.price.toString(), newPrice, "Product price should be updated");
            assert.equal(product.stock.toString(), newStock.toString(), "Product stock should be updated");
        });
        
        it("should toggle product status", async () => {
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            
            await marketplace.toggleProductStatus(1, { from: seller1 });
            
            let product = await marketplace.products(1);
            assert.equal(product.isActive, false, "Product should be inactive");
            
            await marketplace.toggleProductStatus(1, { from: seller1 });
            
            product = await marketplace.products(1);
            assert.equal(product.isActive, true, "Product should be active again");
        });
    });
    
    describe("Product Purchase", () => {
        beforeEach(async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
        });
        
        it("should purchase a product successfully", async () => {
            const quantity = 2;
            const totalPrice = web3.utils.toBN(productPrice).mul(web3.utils.toBN(quantity));
            
            await marketplace.purchaseProduct(1, quantity, {
                from: buyer1,
                value: totalPrice
            });
            
            const product = await marketplace.products(1);
            assert.equal(product.stock.toString(), (productStock - quantity).toString(), "Stock should decrease");
            assert.equal(product.totalSales.toString(), quantity.toString(), "Total sales should increase");
            
            const orderCounter = await marketplace.orderCounter();
            assert.equal(orderCounter.toString(), "1", "Order should be created");
        });
        
        it("should calculate commission correctly", async () => {
            const quantity = 1;
            const totalPrice = productPrice;
            const expectedFee = web3.utils.toBN(totalPrice).mul(web3.utils.toBN(2)).div(web3.utils.toBN(100));
            
            await marketplace.purchaseProduct(1, quantity, {
                from: buyer1,
                value: totalPrice
            });
            
            const platformEarnings = await marketplace.totalPlatformEarnings();
            assert.equal(platformEarnings.toString(), expectedFee.toString(), "Commission should be 2%");
        });
        
        it("should not allow purchase with incorrect payment", async () => {
            try {
                await marketplace.purchaseProduct(1, 1, {
                    from: buyer1,
                    value: web3.utils.toWei("0.05", "ether") // Incorrect amount
                });
                assert.fail("Should not allow purchase with incorrect payment");
            } catch (error) {
                assert(error.message.includes("Incorrect payment"), "Should throw incorrect payment error");
            }
        });
        
        it("should not allow purchase of insufficient stock", async () => {
            try {
                await marketplace.purchaseProduct(1, 100, {
                    from: buyer1,
                    value: web3.utils.toWei("10", "ether")
                });
                assert.fail("Should not allow purchase exceeding stock");
            } catch (error) {
                assert(error.message.includes("Insufficient stock"), "Should throw insufficient stock error");
            }
        });
    });
    
    describe("Order Management", () => {
        beforeEach(async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            await marketplace.purchaseProduct(1, 1, {
                from: buyer1,
                value: productPrice
            });
        });
        
        it("should mark order as shipped", async () => {
            await marketplace.markOrderAsShipped(1, { from: seller1 });
            
            const order = await marketplace.orders(1);
            assert.equal(order.status.toString(), "1", "Order status should be Shipped");
        });
        
        it("should allow buyer to confirm delivery", async () => {
            await marketplace.markOrderAsShipped(1, { from: seller1 });
            
            const sellerBalanceBefore = await marketplace.sellers(seller1);
            const pendingBefore = sellerBalanceBefore.pendingWithdrawal;
            
            await marketplace.confirmDelivery(1, { from: buyer1 });
            
            const order = await marketplace.orders(1);
            assert.equal(order.status.toString(), "3", "Order status should be Completed");
            
            const sellerBalanceAfter = await marketplace.sellers(seller1);
            const pendingAfter = sellerBalanceAfter.pendingWithdrawal;
            
            assert(
                web3.utils.toBN(pendingAfter).gt(web3.utils.toBN(pendingBefore)),
                "Seller pending withdrawal should increase"
            );
        });
    });
    
    describe("Seller Withdrawal", () => {
        beforeEach(async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            await marketplace.purchaseProduct(1, 1, {
                from: buyer1,
                value: productPrice
            });
            await marketplace.markOrderAsShipped(1, { from: seller1 });
            await marketplace.confirmDelivery(1, { from: buyer1 });
        });
        
        it("should allow seller to withdraw earnings", async () => {
            const balanceBefore = await web3.eth.getBalance(seller1);
            
            const receipt = await marketplace.withdrawEarnings({ from: seller1 });
            
            const balanceAfter = await web3.eth.getBalance(seller1);
            
            assert(
                web3.utils.toBN(balanceAfter).gt(web3.utils.toBN(balanceBefore)),
                "Seller balance should increase after withdrawal"
            );
            
            const sellerInfo = await marketplace.sellers(seller1);
            assert.equal(sellerInfo.pendingWithdrawal.toString(), "0", "Pending withdrawal should be 0");
        });
    });
    
    describe("Reviews", () => {
        beforeEach(async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            await marketplace.purchaseProduct(1, 1, {
                from: buyer1,
                value: productPrice
            });
        });
        
        it("should allow buyer to review purchased product", async () => {
            const rating = 5;
            const comment = "Excellent product!";
            
            await marketplace.reviewProduct(1, rating, comment, { from: buyer1 });
            
            const reviews = await marketplace.getProductReviews(1);
            assert.equal(reviews.length, 1, "Should have 1 review");
            assert.equal(reviews[0].rating.toString(), rating.toString(), "Rating should match");
            assert.equal(reviews[0].comment, comment, "Comment should match");
        });
        
        it("should not allow review without purchase", async () => {
            try {
                await marketplace.reviewProduct(1, 5, "Great!", { from: buyer2 });
                assert.fail("Should not allow review without purchase");
            } catch (error) {
                assert(error.message.includes("purchase the product"), "Should throw purchase required error");
            }
        });
    });
    
    describe("Platform Owner Functions", () => {
        it("should allow owner to withdraw platform earnings", async () => {
            await marketplace.registerSeller("Tech Store", { from: seller1 });
            await marketplace.addProduct(
                productName,
                productDescription,
                productImage,
                productPrice,
                productStock,
                productCategory,
                { from: seller1 }
            );
            await marketplace.purchaseProduct(1, 1, {
                from: buyer1,
                value: productPrice
            });
            
            const balanceBefore = await web3.eth.getBalance(owner);
            
            await marketplace.withdrawPlatformEarnings({ from: owner });
            
            const balanceAfter = await web3.eth.getBalance(owner);
            
            assert(
                web3.utils.toBN(balanceAfter).gt(web3.utils.toBN(balanceBefore)),
                "Owner balance should increase"
            );
        });
        
        it("should allow owner to update commission rate", async () => {
            await marketplace.updateCommissionRate(5, { from: owner });
            
            const newRate = await marketplace.platformCommissionRate();
            assert.equal(newRate.toString(), "5", "Commission rate should be updated");
        });
        
        it("should not allow commission rate above 10%", async () => {
            try {
                await marketplace.updateCommissionRate(15, { from: owner });
                assert.fail("Should not allow commission rate above 10%");
            } catch (error) {
                assert(error.message.includes("cannot exceed 10"), "Should throw rate limit error");
            }
        });
    });
});
