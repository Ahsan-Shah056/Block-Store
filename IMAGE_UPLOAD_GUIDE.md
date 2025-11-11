# 📸 Image Upload Feature - User Guide

## Overview

Sellers can now upload product images directly from their computer OR use image URLs. The uploaded images are converted to base64 format and stored on the blockchain.

---

## How to Add Product Images

### Method 1: Upload Image File (Recommended) 📤

1. **Click "Add Product"** in your seller dashboard
2. **Fill in product details** (name, description, price, etc.)
3. **Click "Upload Image" button**
4. **Select an image file** from your computer (JPG, PNG, or GIF)
5. **Preview appears automatically** - verify your image looks correct
6. **Click "Save Product"** to add the product

**Requirements:**
- ✅ File types: JPG, JPEG, PNG, GIF
- ✅ Max file size: 2MB
- ✅ Recommended dimensions: 800x800px or similar square ratio

---

### Method 2: Use Image URL 🔗

1. **Click "Add Product"** in your seller dashboard
2. **Fill in product details**
3. **Click "Use Image URL" button**
4. **Enter the image URL** (must start with http:// or https://)
5. **Click "Preview URL"** to verify the image loads
6. **Click "Save Product"**

**Supported URLs:**
- ✅ Direct image links (ends with .jpg, .png, .gif)
- ✅ IPFS hashes (if using IPFS gateway)
- ✅ Any publicly accessible image URL

---

## Features

### ✨ Image Preview
- See exactly how your image will look before saving
- Preview updates instantly when you upload or paste a URL
- Hover effect on preview for better visualization

### 🗑️ Remove Image
- Click "Remove Image" button below preview
- Clears all image data (file or URL)
- Allows you to select a different image

### ✏️ Edit Product Images
- When editing a product, you can upload a new image
- Previous image URL is shown if it was a URL
- Upload a new file to replace the existing image

---

## Technical Details

### Base64 Storage
- Uploaded images are converted to base64 strings
- Stored directly in the smart contract
- No external image hosting required
- Images persist on the blockchain

### Gas Costs
- Larger images = higher gas costs
- Recommended: Keep images under 500KB for reasonable gas fees
- 2MB is the maximum but not recommended for gas efficiency

### Browser Support
- ✅ Chrome, Edge, Brave (recommended)
- ✅ Firefox
- ✅ Safari (may have size limitations)

---

## Best Practices

### 📏 Image Sizing
```
Recommended: 800x800px (1:1 ratio)
File size: 100-500KB
Format: JPG (best compression) or PNG (transparency)
```

### 🎨 Image Optimization
Before uploading, optimize your images:
1. **Resize** to 800x800px or smaller
2. **Compress** using tools like TinyPNG or Squoosh
3. **Remove** unnecessary metadata
4. **Use JPG** for photos, PNG for logos/graphics

### 💡 Tips
- Use clear, well-lit product photos
- White or neutral backgrounds work best
- Show product from multiple angles (add multiple products)
- Compress images before uploading to save gas

---

## Troubleshooting

### ❌ "Image size must be less than 2MB"
**Solution:** Compress your image using:
- https://tinypng.com/
- https://squoosh.app/
- Your photo editing software

### ❌ "Failed to load image from URL"
**Solution:**
- Verify the URL is correct and publicly accessible
- Try opening the URL in a new browser tab
- Ensure URL starts with http:// or https://
- Check if the image host allows external linking

### ❌ "Please select a valid image file"
**Solution:**
- Only JPG, PNG, and GIF files are supported
- File must have correct extension
- Try converting the file to JPG format

### ⚠️ Image preview not showing
**Solution:**
- Wait a few seconds for upload to complete
- Check browser console for errors (F12)
- Try a smaller image file
- Refresh the page and try again

---

## Example Workflow

### Adding a Product with Image Upload:

```
1. Navigate to Seller Dashboard
2. Click "Add Product" button
3. Enter product details:
   - Name: "Wireless Headphones"
   - Description: "Premium noise-canceling headphones"
   - Price: 0.15 ETH
   - Stock: 10
   - Category: Electronics
   
4. Click "Upload Image"
5. Select: headphones.jpg (256KB)
6. ✅ Preview shows the image
7. Click "Save Product"
8. ✅ MetaMask confirms transaction
9. ✅ Product appears in your products list with image!
```

---

## Sample Images for Testing

You can use these free stock image sites:
- **Unsplash**: https://unsplash.com/
- **Pexels**: https://pexels.com/
- **Pixabay**: https://pixabay.com/

Or use these sample product image URLs:
```
Electronics:
https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800

Clothing:
https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800

Books:
https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800
```

---

## Code Implementation

### Frontend Changes Made:

1. **seller.html**: 
   - Added file upload input
   - Added "Upload Image" and "Use Image URL" toggle buttons
   - Added image removal functionality
   - Enhanced preview display

2. **seller.js**:
   - `handleImageUpload()`: Converts image to base64
   - `toggleImageUrlInput()`: Shows/hides URL input
   - `previewImageUrl()`: Loads and previews URL images
   - `removeImage()`: Clears all image data

3. **style.css**:
   - Enhanced image preview styles
   - Added hover effects
   - Added slide-down animation for URL input

### Smart Contract:
- No changes needed! The `imageHash` field already supports both URLs and base64 strings

---

## Security Notes

- ✅ File validation on client-side
- ✅ Size limit enforcement (2MB)
- ✅ File type checking (images only)
- ✅ Base64 encoding for safe storage
- ⚠️ Large images increase gas costs
- ⚠️ Images are public on blockchain

---

## Future Enhancements (Optional)

- IPFS integration for decentralized storage
- Multiple images per product
- Image editing tools (crop, rotate)
- Automatic image optimization
- Image templates/filters

---

## Questions?

If you encounter issues:
1. Check the browser console (F12)
2. Verify your image meets size/format requirements
3. Try a different image or URL
4. Clear browser cache and reload

---

**Happy Selling! 🎉**
