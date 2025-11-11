#!/bin/bash

# Post-deployment script to copy contract ABI to Frontend
echo "📦 Copying contract artifacts to Frontend..."

# Create contracts directory if it doesn't exist
mkdir -p Frontend/contracts

# Copy the Marketplace contract JSON
cp build/contracts/Marketplace.json Frontend/contracts/

echo "✅ Contract artifacts copied successfully!"
echo "📍 Location: Frontend/contracts/Marketplace.json"
