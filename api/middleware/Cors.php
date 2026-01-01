<?php
/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */

require_once __DIR__ . '/../config/config.php';

class Cors {

    public static function handle(): void {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Check if origin is allowed
        if (in_array($origin, CORS_ALLOWED_ORIGINS)) {
            header("Access-Control-Allow-Origin: {$origin}");
        } else {
            header("Access-Control-Allow-Origin: *");
        }

        header("Access-Control-Allow-Methods: " . implode(', ', CORS_ALLOWED_METHODS));
        header("Access-Control-Allow-Headers: " . implode(', ', CORS_ALLOWED_HEADERS));
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 86400");

        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
