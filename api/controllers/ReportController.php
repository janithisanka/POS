<?php
/**
 * Report Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Bill.php';
require_once __DIR__ . '/../models/Stock.php';
require_once __DIR__ . '/../models/Order.php';
require_once __DIR__ . '/../utils/Response.php';

class ReportController {
    private Bill $billModel;
    private Stock $stockModel;
    private Order $orderModel;

    public function __construct() {
        $this->billModel = new Bill();
        $this->stockModel = new Stock();
        $this->orderModel = new Order();
    }

    /**
     * Dashboard summary
     */
    public function dashboard(): void {
        Auth::requireAuth();

        $today = date('Y-m-d');

        // Today's sales
        $todaySales = $this->billModel->getDailySummary($today);

        // Pending orders
        $pendingOrders = $this->orderModel->getPendingCount();

        // This month's sales
        $monthStart = date('Y-m-01');
        $db = Database::getInstance()->getConnection();
        $monthSql = "SELECT COALESCE(SUM(total), 0) as total FROM bills
                     WHERE DATE(created_at) BETWEEN :start AND :end AND status = 'completed'";
        $monthStmt = $db->prepare($monthSql);
        $monthStmt->execute(['start' => $monthStart, 'end' => $today]);
        $monthTotal = (float)$monthStmt->fetch()['total'];

        Response::success([
            'today' => [
                'sales' => $todaySales['net_sales'] ?? 0,
                'bills' => $todaySales['total_bills'] ?? 0,
                'items_sold' => $todaySales['items_sold'] ?? 0,
                'discount' => $todaySales['total_discount'] ?? 0
            ],
            'month' => [
                'sales' => $monthTotal
            ],
            'pending_orders' => $pendingOrders
        ]);
    }

    /**
     * Daily sales report
     */
    public function dailySales(): void {
        Auth::requireAuth();

        $date = $_GET['date'] ?? date('Y-m-d');
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 10;

        // Get summary
        $summary = $this->billModel->getDailySummary($date);

        // Get bills
        $bills = $this->billModel->getBillsByDateRange($date, $date, $page, $perPage);

        Response::success([
            'date' => $date,
            'summary' => $summary,
            'bills' => $bills['data'],
            'pagination' => [
                'current_page' => $bills['page'],
                'per_page' => $bills['per_page'],
                'total' => $bills['total'],
                'total_pages' => ceil($bills['total'] / $bills['per_page'])
            ]
        ]);
    }

    /**
     * Monthly sales report
     */
    public function monthlySales(): void {
        Auth::requireAuth();

        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
        $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');

        // Get daily breakdown
        $dailyData = $this->billModel->getMonthlySummary($year, $month);

        // Calculate totals
        $totalBills = 0;
        $totalSales = 0;
        foreach ($dailyData as $day) {
            $totalBills += $day['total_bills'];
            $totalSales += $day['net_sales'];
        }

        Response::success([
            'year' => $year,
            'month' => $month,
            'month_name' => date('F', mktime(0, 0, 0, $month, 1)),
            'summary' => [
                'total_bills' => $totalBills,
                'total_sales' => $totalSales,
                'average_daily' => count($dailyData) > 0 ? $totalSales / count($dailyData) : 0
            ],
            'daily_data' => $dailyData
        ]);
    }

    /**
     * Sales by date range
     */
    public function salesByRange(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $db = Database::getInstance()->getConnection();

        // Get summary
        $summarySql = "SELECT
                        COUNT(*) as total_bills,
                        COALESCE(SUM(subtotal), 0) as gross_sales,
                        COALESCE(SUM(discount_amount), 0) as total_discount,
                        COALESCE(SUM(total), 0) as net_sales
                       FROM bills
                       WHERE DATE(created_at) BETWEEN :from_date AND :to_date
                       AND status = 'completed'";
        $stmt = $db->prepare($summarySql);
        $stmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        $summary = $stmt->fetch();

        // Get daily breakdown
        $dailySql = "SELECT
                        DATE(created_at) as date,
                        COUNT(*) as bills,
                        SUM(total) as sales
                     FROM bills
                     WHERE DATE(created_at) BETWEEN :from_date AND :to_date
                     AND status = 'completed'
                     GROUP BY DATE(created_at)
                     ORDER BY date";
        $dailyStmt = $db->prepare($dailySql);
        $dailyStmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        $dailyData = $dailyStmt->fetchAll();

        Response::success([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'summary' => $summary,
            'daily_data' => $dailyData
        ]);
    }

    /**
     * Stock report
     */
    public function stockReport(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $report = $this->stockModel->getStockReport($fromDate, $toDate);

        // Calculate totals
        $totalAdded = 0;
        $totalSold = 0;
        $totalRemaining = 0;
        foreach ($report as $item) {
            $totalAdded += $item['total_added'];
            $totalSold += $item['total_sold'];
            $totalRemaining += $item['total_remaining'];
        }

        Response::success([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'summary' => [
                'total_added' => $totalAdded,
                'total_sold' => $totalSold,
                'total_remaining' => $totalRemaining
            ],
            'products' => $report
        ]);
    }

    /**
     * Top selling products
     */
    public function topProducts(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;

        $db = Database::getInstance()->getConnection();

        $sql = "SELECT
                    bi.item_name as name,
                    bi.item_type as type,
                    SUM(bi.quantity) as total_quantity,
                    SUM(bi.total_price) as total_revenue,
                    COUNT(DISTINCT bi.bill_id) as times_sold
                FROM bill_items bi
                JOIN bills b ON bi.bill_id = b.id
                WHERE DATE(b.created_at) BETWEEN :from_date AND :to_date
                AND b.status = 'completed'
                GROUP BY bi.item_id, bi.item_name, bi.item_type
                ORDER BY total_quantity DESC
                LIMIT :limit";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':from_date', $fromDate);
        $stmt->bindValue(':to_date', $toDate);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        Response::success($stmt->fetchAll());
    }

    /**
     * Order statistics
     */
    public function orderStats(): void {
        Auth::requireAuth();

        $fromDate = $_GET['from'] ?? date('Y-m-01');
        $toDate = $_GET['to'] ?? date('Y-m-d');

        $db = Database::getInstance()->getConnection();

        $sql = "SELECT
                    status,
                    COUNT(*) as count,
                    COALESCE(SUM(total_amount), 0) as total_value
                FROM orders
                WHERE order_date BETWEEN :from_date AND :to_date
                GROUP BY status";

        $stmt = $db->prepare($sql);
        $stmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        $byStatus = $stmt->fetchAll();

        // Get total
        $totalSql = "SELECT
                        COUNT(*) as total_orders,
                        COALESCE(SUM(total_amount), 0) as total_value,
                        COALESCE(SUM(advance_amount), 0) as total_advance,
                        COALESCE(SUM(balance_amount), 0) as total_balance
                     FROM orders
                     WHERE order_date BETWEEN :from_date AND :to_date";
        $totalStmt = $db->prepare($totalSql);
        $totalStmt->execute(['from_date' => $fromDate, 'to_date' => $toDate]);
        $totals = $totalStmt->fetch();

        Response::success([
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'summary' => $totals,
            'by_status' => $byStatus
        ]);
    }
}
