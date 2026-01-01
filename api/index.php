<?php
/**
 * API Router
 * Bakery POS Modern - RESTful API Entry Point
 */

// Load configuration
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/Cors.php';
require_once __DIR__ . '/utils/Response.php';

// Handle CORS
Cors::handle();

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove base path
$basePath = '/BakeryPOS-Modern/api';
$path = str_replace($basePath, '', $uri);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

// Simple router
try {
    $resource = $segments[0] ?? '';
    $id = isset($segments[1]) && is_numeric($segments[1]) ? (int)$segments[1] : null;
    $action = $segments[1] ?? null;
    $subAction = $segments[2] ?? null;

    switch ($resource) {
        // Authentication
        case 'auth':
            require_once __DIR__ . '/controllers/AuthController.php';
            $controller = new AuthController();

            if ($action === 'login' && $method === 'POST') {
                $controller->login();
            } elseif ($action === 'me' && $method === 'GET') {
                $controller->me();
            } elseif ($action === 'logout' && $method === 'POST') {
                $controller->logout();
            } elseif ($action === 'change-password' && $method === 'POST') {
                $controller->changePassword();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Products
        case 'products':
            require_once __DIR__ . '/controllers/ProductController.php';
            $controller = new ProductController();

            if ($action === 'pos' && $method === 'GET') {
                $controller->forPOS();
            } elseif ($action === 'search' && $method === 'GET') {
                $controller->search();
            } elseif ($id && $method === 'GET') {
                $controller->show($id);
            } elseif ($id && $method === 'PUT') {
                $controller->update($id);
            } elseif ($id && $method === 'DELETE') {
                $controller->destroy($id);
            } elseif (!$action && $method === 'GET') {
                $controller->index();
            } elseif (!$action && $method === 'POST') {
                $controller->store();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Brands
        case 'brands':
            require_once __DIR__ . '/controllers/BrandController.php';
            $controller = new BrandController();

            if ($action === 'active' && $method === 'GET') {
                $controller->active();
            } elseif ($id && $method === 'GET') {
                $controller->show($id);
            } elseif ($id && $method === 'PUT') {
                $controller->update($id);
            } elseif ($id && $method === 'DELETE') {
                $controller->destroy($id);
            } elseif (!$action && $method === 'GET') {
                $controller->index();
            } elseif (!$action && $method === 'POST') {
                $controller->store();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Stock
        case 'stock':
            require_once __DIR__ . '/controllers/StockController.php';
            $controller = new StockController();

            if ($action === 'current' && $method === 'GET') {
                $controller->current();
            } elseif ($action === 'today' && $method === 'GET') {
                $controller->today();
            } elseif ($action === 'add' && $method === 'POST') {
                $controller->addStock();
            } elseif ($action === 'report' && $method === 'GET') {
                $controller->report();
            } elseif ($action === 'history' && $id && $method === 'GET') {
                $controller->history((int)$segments[2]);
            } elseif ($id && $action === 'clear' && $method === 'POST') {
                $controller->clearStock($id);
            } elseif ($action === 'items' && $method === 'GET') {
                $controller->items();
            } elseif ($action === 'items' && $subAction === 'sellable' && $method === 'GET') {
                $controller->sellableItems();
            } elseif ($action === 'items' && $method === 'POST') {
                $controller->createItem();
            } elseif ($action === 'items' && is_numeric($subAction) && $method === 'PUT') {
                $controller->updateItem((int)$subAction);
            } elseif ($action === 'items' && is_numeric($subAction) && $method === 'DELETE') {
                $controller->deleteItem((int)$subAction);
            } elseif ($action === 'items' && is_numeric($subAction) && isset($segments[3]) && $segments[3] === 'add-quantity' && $method === 'POST') {
                $controller->addItemQuantity((int)$subAction);
            } elseif ($action === 'low-stock' && $method === 'GET') {
                $controller->lowStock();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // POS
        case 'pos':
            require_once __DIR__ . '/controllers/POSController.php';
            $controller = new POSController();

            if ($action === 'items' && $method === 'GET') {
                $controller->getItems();
            } elseif ($action === 'bills' && $method === 'GET') {
                $controller->getBills();
            } elseif ($action === 'bills' && $method === 'POST') {
                $controller->createBill();
            } elseif ($action === 'bills' && is_numeric($subAction) && $method === 'GET') {
                $controller->getBill((int)$subAction);
            } elseif ($action === 'bills' && is_numeric($subAction) && isset($segments[3]) && $segments[3] === 'cancel' && $method === 'POST') {
                $controller->cancelBill((int)$subAction);
            } elseif ($action === 'bills' && is_numeric($subAction) && isset($segments[3]) && $segments[3] === 'reprint' && $method === 'GET') {
                $controller->reprintBill((int)$subAction);
            } elseif ($action === 'daily-summary' && $method === 'GET') {
                $controller->dailySummary();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Orders
        case 'orders':
            require_once __DIR__ . '/controllers/OrderController.php';
            $controller = new OrderController();

            if ($action === 'pending' && $method === 'GET') {
                $controller->pending();
            } elseif ($id && $subAction === 'status' && $method === 'PUT') {
                $controller->updateStatus($id);
            } elseif ($id && $subAction === 'payment' && $method === 'POST') {
                $controller->addPayment($id);
            } elseif ($id && $method === 'GET') {
                $controller->show($id);
            } elseif ($id && $method === 'DELETE') {
                $controller->destroy($id);
            } elseif (!$action && $method === 'GET') {
                $controller->index();
            } elseif (!$action && $method === 'POST') {
                $controller->store();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Users
        case 'users':
            require_once __DIR__ . '/controllers/UserController.php';
            $controller = new UserController();

            if ($action === 'positions' && $method === 'GET') {
                $controller->positions();
            } elseif ($id && $subAction === 'toggle-status' && $method === 'POST') {
                $controller->toggleStatus($id);
            } elseif ($id && $method === 'GET') {
                $controller->show($id);
            } elseif ($id && $method === 'PUT') {
                $controller->update($id);
            } elseif ($id && $method === 'DELETE') {
                $controller->destroy($id);
            } elseif (!$action && $method === 'GET') {
                $controller->index();
            } elseif (!$action && $method === 'POST') {
                $controller->store();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Suppliers
        case 'suppliers':
            require_once __DIR__ . '/controllers/SupplierController.php';
            $controller = new SupplierController();

            if ($action === 'payments' && $method === 'GET') {
                $controller->payments();
            } elseif ($id && $subAction === 'payments' && $method === 'POST') {
                $controller->addPayment($id);
            } elseif ($id && $method === 'GET') {
                $controller->show($id);
            } elseif ($id && $method === 'PUT') {
                $controller->update($id);
            } elseif ($id && $method === 'DELETE') {
                $controller->destroy($id);
            } elseif (!$action && $method === 'GET') {
                $controller->index();
            } elseif (!$action && $method === 'POST') {
                $controller->store();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Reports
        case 'reports':
            require_once __DIR__ . '/controllers/ReportController.php';
            $controller = new ReportController();

            if ($action === 'dashboard' && $method === 'GET') {
                $controller->dashboard();
            } elseif ($action === 'daily-sales' && $method === 'GET') {
                $controller->dailySales();
            } elseif ($action === 'monthly-sales' && $method === 'GET') {
                $controller->monthlySales();
            } elseif ($action === 'sales-by-range' && $method === 'GET') {
                $controller->salesByRange();
            } elseif ($action === 'stock' && $method === 'GET') {
                $controller->stockReport();
            } elseif ($action === 'top-products' && $method === 'GET') {
                $controller->topProducts();
            } elseif ($action === 'orders' && $method === 'GET') {
                $controller->orderStats();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // Company Settings
        case 'company':
            require_once __DIR__ . '/controllers/CompanyController.php';
            $controller = new CompanyController();

            if (!$action && $method === 'GET') {
                $controller->info();
            } elseif (!$action && ($method === 'PUT' || $method === 'POST')) {
                $controller->update();
            } else {
                Response::notFound('Endpoint not found');
            }
            break;

        // API Info
        case '':
            Response::success([
                'name' => APP_NAME,
                'version' => APP_VERSION,
                'endpoints' => [
                    'auth' => '/api/auth/login, /api/auth/me, /api/auth/logout',
                    'products' => '/api/products',
                    'brands' => '/api/brands',
                    'stock' => '/api/stock',
                    'pos' => '/api/pos',
                    'orders' => '/api/orders',
                    'users' => '/api/users',
                    'suppliers' => '/api/suppliers',
                    'reports' => '/api/reports',
                    'company' => '/api/company'
                ]
            ]);
            break;

        default:
            Response::notFound('Endpoint not found');
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    Response::serverError('An error occurred');
}
