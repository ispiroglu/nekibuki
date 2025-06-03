#!/bin/bash

# Generate sqlc code
echo "Generating sqlc code..."
sqlc generate

if [ $? -eq 0 ]; then
    echo "✅ sqlc generation completed successfully"
else
    echo "❌ sqlc generation failed"
    exit 1
fi 