<?php
/**
 * Application Configuration
 * Bakery POS Modern
 */

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Timezone
date_default_timezone_set('Asia/Colombo');

// Application settings
define('APP_NAME', 'Bakery POS Modern');
define('APP_VERSION', '2.0.0');
define('APP_URL', 'http://localhost/BakeryPOS-Modern');
define('API_URL', APP_URL . '/api');

// Security settings
define('JWT_SECRET', 'bakery_pos_secret_key_change_in_production_2024');
define('JWT_EXPIRY', 86400); // 24 hours
define('SESSION_LIFETIME', 86400);
define('CSRF_TOKEN_NAME', 'csrf_token');

// File upload settings
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', [
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif'
]);
define('UPLOAD_PATH', dirname(__DIR__, 2) . '/public/images/');

// Pagination defaults
define('DEFAULT_PAGE_SIZE', 10);
define('MAX_PAGE_SIZE', 100);

// Business rules (from original system)
define('SPECIAL_PRICE_START_HOUR', 19); // 7 PM
define('SPECIAL_PRICE_AMOUNT', 50); // Rs. 50
define('CURRENCY_SYMBOL', 'Rs.');

// CORS settings
define('CORS_ALLOWED_ORIGINS', ['http://localhost', 'http://localhost:3000']);
define('CORS_ALLOWED_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
define('CORS_ALLOWED_HEADERS', ['Content-Type', 'Authorization', 'X-Requested-With']);
