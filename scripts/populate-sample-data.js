/**
 * Quick Sample Data Population
 * Adds products and basic transactions without complex seller setup
 */

const Marketplace = artifacts.require("Marketplace");
const BlockToken = artifacts.require("BlockToken");

module.exports = async function(callback) {
    try {
        console.log('\n🌱 Starting quick sample data population...\n');
        
        const accounts = await web3.eth.getAccounts();
        const marketplace = await Marketplace.deployed();
        const tokenAddress = await marketplace.token();
        const token = await BlockToken.at(tokenAddress);
        
        console.log('📍 Marketplace:', marketplace.address);
        console.log('🪙 Token:', tokenAddress);

        // Use first 4 accounts as sellers
        const sellers = accounts.slice(1, 5);
        
        // Register sellers  
        console.log('\n� Registering sellers...');
        const sellerNames = ['TechGear Pro', 'Fashion Hub', 'Book Store', 'Home Essentials'];
        for (let i = 0; i < sellers.length; i++) {
            try {
                await marketplace.registerSeller(sellerNames[i], { from: sellers[i], gas: 200000 });
                console.log(`✅ ${sellerNames[i]}: ${sellers[i]}`);
                
                // Mint BMT tokens (from owner)
                await token.mint(sellers[i], web3.utils.toWei('500', 'ether'), { from: accounts[0] });
            } catch (e) {
                console.log(`⚠️ ${sellerNames[i]} already registered`);
            }
        }

        // Add 16 products (4 per seller)
        console.log('\n📦 Adding products...');
        const products = [
            // Seller 1 - Electronics
            ['Wireless Headphones', 'Premium noise-cancelling', '0.5', 50, 0],
            ['Smart Watch', 'Fitness tracking watch', '0.8', 30, 0],
            ['Gaming Mouse', 'RGB gaming mouse', '0.15', 100, 0],
            ['4K Webcam', 'HD webcam for streaming', '0.3', 40, 0],
            // Seller 2 - Clothing  
            ['Denim Jacket', 'Vintage style jacket', '0.4', 25, 1],
            ['Summer Dress', 'Floral print dress', '0.25', 50, 1],
            ['Leather Boots', 'Handcrafted boots', '0.6', 20, 1],
            ['Cashmere Scarf', 'Luxury scarf', '0.2', 35, 1],
            // Seller 3 - Books
            ['Blockchain Guide', 'Complete blockchain guide', '0.1', 100, 2],
            ['Smart Contracts', 'Security best practices', '0.12', 75, 2],
            ['DeFi Handbook', 'DeFi explained', '0.08', 120, 2],
            ['NFT Guide', 'NFT creation guide', '0.09', 90, 2],
            // Seller 4 - Home
            ['Smart LED Bulbs', 'WiFi bulbs 4-pack', '0.18', 60, 3],
            ['Coffee Maker', 'Programmable maker', '0.35', 40, 3],
            ['Air Purifier', 'HEPA filter purifier', '0.7', 25, 3],
            ['Robot Vacuum', 'Smart vacuum', '1.2', 15, 3]
        ];

        // Helper function for delay
        const delay = ms => new Promise(res => setTimeout(res, ms));

        for (let i = 0; i < products.length; i++) {
            const sellerIndex = Math.floor(i / 4);
            const [name, desc, price, stock, cat] = products[i];
            
            try {
                await marketplace.addProduct(
                    name, desc, `ipfs://QmHash${i}`,
                    web3.utils.toWei(price, 'ether'),
                    stock, cat,
                    { from: sellers[sellerIndex], gas: 500000 }
                );
                console.log(`  ✅ Product ${i + 1}: ${name}`);
                await delay(100); // Small delay to prevent overwhelming the node
            } catch (e) {
                console.log(`  ⚠️ Failed to add ${name}: ${e.message}`);
            }
        }

        // Create 100 sample transactions
        console.log('\n🛒 Creating sample transactions...');
        const buyers = accounts.slice(5, 15); // Use accounts 5-14 as buyers
        let successCount = 0;

        for (let i = 0; i < 100; i++) {
            try {
                const buyer = buyers[i % buyers.length];
                const productId = (i % 16) + 1;
                const quantity = (i % 2) + 1;
                const product = products[(productId - 1)];
                const totalPrice = web3.utils.toWei((parseFloat(product[2]) * quantity).toString(), 'ether');
                
                // Purchase
                await marketplace.purchaseProduct(productId, quantity, {
                    from: buyer,
                    value: totalPrice,
                    gas: 500000
                });
                
                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`  ✅ ${successCount} transactions completed...`);
                }
                await delay(50); // Small delay
            } catch (err) {
                // Skip errors
                // console.log(`  ⚠️ Transaction failed: ${err.message}`);
            }
        }

        console.log(`\n✅ Created ${successCount} sample transactions!`);
        console.log('\n🎉 Sample data population complete!');
        console.log('\n📊 Summary:');
        console.log(`  - Sellers: 4`);
        console.log(`  - Products: 16`);
        console.log(`  - Transactions: ${successCount}`);
        
        callback();
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        callback(error);
    }
};
