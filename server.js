require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Import Routes
const marketRoutes = require('./routes/marketRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000; // Backend runs on 3000, React dev server uses next available port

// --- 1. CONNECT TO DATABASE ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is not defined in .env file');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
    });

const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// --- 2. MIDDLEWARE ---
app.set('trust proxy', 1); // Trust first proxy (required for rate limit in some envs)

app.use(compression()); // Compress all responses
app.use(helmet()); // Set secure HTTP headers
app.use(cors()); 

// Rate Limiting: 100 requests per 15 mins
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { message: "Too many requests, please try again later." }
});
app.use('/api', limiter);

// Increase limits to prevent 431 errors
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Error handling middleware for JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    next();
});

// --- 3. API ROUTES ---
app.use('/api', marketRoutes);
app.use('/api', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

// --- 4. STATIC FILES & REACT APP ---
// Serve React app in production, or static files in development
if (process.env.NODE_ENV === 'production') {
    // Serve static files from React build
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    // Serve React app for all non-API routes (SPA routing)
    // Serve React app for all non-API routes (SPA routing)
    app.get(/.*/, (req, res) => {
        // Don't serve React app for API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: "API endpoint not found" });
        }
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
} else {
    // In development mode:
    const reactBuildPath = path.join(__dirname, '../client/build');
    
    if (fs.existsSync(reactBuildPath)) {
        // If React build exists, serve it
        app.use(express.static(reactBuildPath));
        // Serve React app for all non-API routes (SPA routing)
        app.get((req, res,next) => {
            // Don't serve React app for API routes
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ message: "API endpoint not found" });
            }
            res.sendFile(path.join(reactBuildPath, 'index.html'));
        });
    } else {
        // No React build - only handle API routes
        app.get('/(.*)', (req, res, next) => {
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ message: "API endpoint not found" });
            }
            // Return helpful message for non-API routes
            res.status(404).send(`
                <html>
                    <head><title>React App Not Running</title></head>
                    <body style="font-family: Arial; padding: 40px; text-align: center;">
                        <h1>React Development Server Not Running</h1>
                        <p>Please start the React development server:</p>
                        <pre style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 5px;">
cd client
npm start
                        </pre>
                        <p style="margin-top: 20px;">
                            Or build the React app for production:
                        </p>
                        <pre style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 5px;">
cd client
npm run build
                        </pre>
                    </body>
                </html>
            `);
        });
    }
}

const globalErrorHandler = require('./middleware/errorMiddleware');
const AppError = require('./utils/AppError');

// Handle Unhandled Routes
// Handle Unhandled Routes
app.use((req, res, next) => {
    // If request path starts with /api, return JSON error
    if (req.path.startsWith('/api')) {
        next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    } else {
        // Otherwise serve React (handled above) or 404
        res.status(404).sendFile(path.join(__dirname, '../client/build', 'index.html'), (err) => {
             if (err) next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
        });
    }
});

// Global Error Handler
app.use(globalErrorHandler);

const { initSocket } = require('./sockets/notificationSocket');

// --- START SERVER ---
// Create HTTP server with increased header size limit to prevent 431 errors
const server = http.createServer({
    maxHeaderSize: 16384 // 16KB (default is 8KB)
}, app);

// Boot up WebSockets Engine
initSocket(server);

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});