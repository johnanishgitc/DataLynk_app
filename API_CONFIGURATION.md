# API Configuration

## Environment Variables

### EXPO_PUBLIC_API_BASE_URL
- **Purpose**: Base URL for the Tally API server
- **Default Value**: `https://itcatalystindia.com/Development/CustomerPortal_API`
- **Usage**: Used by the React Native/Expo app for API calls
- **Location**: `src/config/api.ts`

### API_BASE_URL
- **Purpose**: Base URL for the proxy server
- **Default Value**: `https://itcatalystindia.com/Development/CustomerPortal_API`
- **Usage**: Used by the local proxy server for development
- **Location**: `proxy-server.js` and `simple-proxy.js`

## How to Update the API Base URL

### For Production/Development
1. Set the environment variable `EXPO_PUBLIC_API_BASE_URL` in your deployment environment
2. The app will automatically use the new URL

### For Local Development
1. Create a `.env` file in the root directory
2. Add: `EXPO_PUBLIC_API_BASE_URL=https://your-new-api-url.com`
3. Restart your development server

### For Proxy Server
1. Set the environment variable `API_BASE_URL` when running the proxy server
2. Or update the default value in `proxy-server.js` and `simple-proxy.js`

## Current API Endpoints



y



All endpoints are relative to the base URL:

- `/api/login` - User authentication
- `/api/signup` - User registration
- `/api/forgot-password` - Password recovery
- `/api/change-password` - Password change
- `/api/tally/user-connections` - Get user's Tally connections
- `/api/tally/tallydata` - All Tally data operations (items, customers, orders)

## Example Usage

```bash
# Set environment variable for development
export EXPO_PUBLIC_API_BASE_URL=https://your-new-api-url.com

# Run the app
npm start
```

