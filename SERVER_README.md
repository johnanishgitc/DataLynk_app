# 🚀 TallyCatalyst Local Proxy Server

This local server solves CORS issues when testing the web version of your mobile app.

## 🎯 **What It Does**

- **Acts as a proxy** between your web app and the Tally server
- **Handles CORS headers** automatically
- **Forwards all API requests** to `http://v63094.12105.tallyprimecloud.in:3001`
- **Provides detailed logging** for debugging

## 🚀 **Quick Start**

### 1. Install Dependencies
```bash
npm run server:install
```

### 2. Start the Proxy Server
```bash
npm run server:start
```

### 3. Start Your Expo App
```bash
npm start
# Then press 'w' for web
```

## 📡 **How It Works**

```
Web App (localhost:8081) → Local Proxy (localhost:3000) → Tally Server (v63094.12105.tallyprimecloud.in:3001)
```

- **Web Version**: Uses local proxy (localhost:3000) to avoid CORS
- **Mobile Version**: Uses direct API calls (no proxy needed)

## 🔧 **Configuration**

### **Ports**
- **Proxy Server**: `localhost:3000`
- **Expo Web**: `localhost:8081`
- **Expo Dev**: `localhost:19006`

### **CORS Origins Allowed**
- `http://localhost:8081` (Expo Web)
- `http://localhost:3000` (Proxy Server)
- `http://localhost:19006` (Expo Dev)

## 📊 **API Endpoints Proxied**

All `/api/*` requests are automatically forwarded:
- `POST /api/login` → `POST http://v63094.12105.tallyprimecloud.in:3001/api/login`
- `POST /api/signup` → `POST http://v63094.12105.tallyprimecloud.in:3001/api/signup`
- `POST /api/change-password` → `POST http://v63094.12105.tallyprimecloud.in:3001/api/change-password`

## 🧪 **Testing**

### **Health Check**
```bash
curl http://localhost:3000/health
```

### **Test API Call**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"test123"}'
```

## 🐛 **Troubleshooting**

### **Port Already in Use**
```bash
# Kill process on port 3000
npx kill-port 3000
# Then restart
npm run server:start
```

### **Proxy Not Working**
1. Check if proxy server is running: `http://localhost:3000/health`
2. Verify CORS origins in proxy-server.js
3. Check browser console for errors

### **Mobile vs Web**
- **Mobile**: Works without proxy (direct API calls)
- **Web**: Requires proxy server running

## 📝 **Logs**

The proxy server provides detailed logging:
- 🔄 Request proxying
- 📤 Request body details
- ✅ Response status
- 📥 Response headers
- ❌ Error handling

## 🎉 **Benefits**

✅ **No more CORS errors** on web  
✅ **Same API endpoints** for mobile and web  
✅ **Detailed logging** for debugging  
✅ **Easy development** workflow  
✅ **Production ready** (can be deployed)  

## 🚀 **Production Deployment**

For production, you can:
1. Deploy this proxy server to your hosting
2. Update the `LOCAL_PROXY` constant in `src/config/api.ts`
3. Or remove the proxy logic entirely and fix CORS on your main server

