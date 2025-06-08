# Development Commands

## Backend (Go)
- `make run` - Start backend server with live reload
- `make build` - Build the Go binary
- `make test` - Run unit tests
- `make itest` - Run integration tests
- `make swagger` - Generate API documentation
- `make docker-run` - Start database container
- `go test ./internal/package -v` - Run single package tests

## Mobile (React Native/Expo)
- `cd mobile/Nekibuki && npx expo start --clear` - Start Expo dev server
- `cd mobile/Nekibuki && npm run ios` - Start iOS simulator
- `cd mobile/Nekibuki && npm run android` - Start Android emulator

# Code Style Guidelines

- Use TypeScript interfaces with PascalCase naming
- Export interfaces separately from components: `export type { ApiResponse }`
- Components use `React.FC<Props>` pattern with destructured props
- Private class members use camelCase with explicit typing
- Import order: React/libraries → internal modules → theme/constants
- Error handling: try-catch blocks with detailed logging and user-friendly messages
- File structure: Group related functionality in services/ and screens/ directories
