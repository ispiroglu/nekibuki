#!/bin/bash

# Script to install swag CLI for Swagger documentation generation

echo "Installing swag CLI for Swagger documentation generation..."

# Check if swag is already installed
if command -v swag &> /dev/null; then
    echo "✅ swag CLI is already installed"
    swag --version
    exit 0
fi

echo "📦 Installing swag CLI..."

# Install swag
go install github.com/swaggo/swag/cmd/swag@latest

# Verify installation
if command -v swag &> /dev/null; then
    echo "✅ swag CLI installed successfully!"
    swag --version
    echo ""
    echo "You can now use:"
    echo "  - 'make swagger' to generate docs"
    echo "  - 'make run-swagger' to run server with fresh docs"
else
    echo "❌ Failed to install swag CLI"
    echo "Please ensure Go is properly installed and GOPATH/bin is in your PATH"
    exit 1
fi 