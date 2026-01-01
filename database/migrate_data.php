<?php
/**
 * Data Migration Script
 * Migrates data from the old posdb to bakerypos_modern
 *
 * Run this script after creating the new database schema:
 * 1. First run: mysql -u root < schema.sql
 * 2. Then run: php migrate_data.php
 */

echo "===========================================\n";
echo "Bakery POS - Data Migration Script\n";
echo "===========================================\n\n";

// Old database connection
$oldConn = new mysqli('localhost', 'root', '', 'posdb', 3306);
if ($oldConn->connect_error) {
    die("Old database connection failed: " . $oldConn->connect_error . "\n");
}

// New database connection
$newConn = new mysqli('localhost', 'root', '', 'bakerypos_modern', 3306);
if ($newConn->connect_error) {
    die("New database connection failed: " . $newConn->connect_error . "\n");
}

echo "Connected to both databases.\n\n";

// Disable foreign key checks
$newConn->query("SET FOREIGN_KEY_CHECKS = 0");

// Helper function to check if table exists
function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '{$tableName}'");
    return $result->num_rows > 0;
}

try {
    // 1. Migrate Positions
    echo "Migrating positions...\n";
    if (tableExists($oldConn, 'position')) {
        $result = $oldConn->query("SELECT * FROM position");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("INSERT INTO positions (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)");
            $stmt->bind_param("is", $row['posi_id'], $row['posi_name']);
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} positions.\n";
    } else {
        echo "  Skipped - table 'position' not found.\n";
    }

    // 2. Migrate Users
    echo "Migrating users...\n";
    if (tableExists($oldConn, 'user')) {
        $result = $oldConn->query("
            SELECT u.*, l.user_name, l.password
            FROM user u
            LEFT JOIN login l ON u.user_id = l.user_id
        ");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            // Convert SHA1 to bcrypt (users will need to reset passwords)
            $newPassword = password_hash('password123', PASSWORD_BCRYPT);

            $stmt = $newConn->prepare("
                INSERT INTO users (id, username, password, first_name, last_name, title, position_id, image, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name)
            ");

            $status = ($row['user_status'] ?? 'Active') === 'Active' ? 'active' : 'inactive';
            $stmt->bind_param(
                "isssssiis",
                $row['user_id'],
                $row['user_name'],
                $newPassword,
                $row['user_f_name'],
                $row['user_l_name'],
                $row['user_title'],
                $row['user_position'],
                $row['user_image'],
                $status
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} users.\n";
        echo "  NOTE: All passwords have been reset to 'password123'. Users should change their passwords.\n";
    } else {
        echo "  Skipped - table 'user' not found.\n";
    }

    // 3. Migrate Brands
    echo "Migrating brands...\n";
    if (tableExists($oldConn, 'brand')) {
        $result = $oldConn->query("SELECT * FROM brand");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("
                INSERT INTO brands (id, name, image, status)
                VALUES (?, ?, ?, 'active')
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            ");
            $stmt->bind_param("iss", $row['brand_id'], $row['brand_name'], $row['brand_image']);
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} brands.\n";
    } else {
        echo "  Skipped - table 'brand' not found.\n";
    }

    // 4. Migrate Products
    echo "Migrating products...\n";
    if (tableExists($oldConn, 'product')) {
        $result = $oldConn->query("SELECT * FROM product");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("
                INSERT INTO products (id, name, brand_id, price, size, image, is_special_pricing, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    price = VALUES(price)
            ");

            $isSpecial = $row['status'] == 1 ? 1 : 0;
            $stmt->bind_param(
                "isidssi",
                $row['prd_id'],
                $row['prd_name'],
                $row['brand_id'],
                $row['prd_price'],
                $row['prd_size'],
                $row['prd_image'],
                $isSpecial
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} products.\n";
    } else {
        echo "  Skipped - table 'product' not found.\n";
    }

    // 5. Migrate Stock Items (stock_name)
    echo "Migrating stock items...\n";
    if (tableExists($oldConn, 'stock_name')) {
        $result = $oldConn->query("
            SELECT sn.*, rsb.stk_qty
            FROM stock_name sn
            LEFT JOIN row_stock_balance rsb ON sn.stk_id = rsb.ref_stk_id
        ");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("
                INSERT INTO stock_items (id, name, unit_price, quantity, is_sellable, status)
                VALUES (?, ?, ?, ?, ?, 'active')
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            ");

            $isSellable = ($row['is_sell'] ?? 1) == 1 ? 1 : 0;
            $qty = $row['stk_qty'] ?? 0;
            $stmt->bind_param("isddi", $row['stk_id'], $row['stk_name'], $row['unit_price'], $qty, $isSellable);
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} stock items.\n";
    } else {
        echo "  Skipped - table 'stock_name' not found.\n";
    }

    // 6. Migrate Suppliers
    echo "Migrating suppliers...\n";
    if (tableExists($oldConn, 'supplier')) {
        $result = $oldConn->query("SELECT * FROM supplier");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("
                INSERT INTO suppliers (id, name, phone, address, status)
                VALUES (?, ?, ?, ?, 'active')
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            ");
            $stmt->bind_param("isss", $row['sup_id'], $row['sup_name'], $row['sup_phone'], $row['sup_add']);
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} suppliers.\n";
    } else {
        echo "  Skipped - table 'supplier' not found.\n";
    }

    // 7. Migrate Supplier Payments
    echo "Migrating supplier payments...\n";
    if (tableExists($oldConn, 'payment')) {
        $result = $oldConn->query("SELECT * FROM payment");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $stmt = $newConn->prepare("
                INSERT INTO supplier_payments (supplier_id, amount, payment_date)
                VALUES (?, ?, ?)
            ");
            $stmt->bind_param("ids", $row['sup_id'], $row['amount'], $row['pay_date']);
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} supplier payments.\n";
    } else {
        echo "  Skipped - table 'payment' not found.\n";
    }

    // 8. Migrate Bills
    echo "Migrating bills...\n";
    if (tableExists($oldConn, 'bills')) {
        $result = $oldConn->query("SELECT * FROM bills ORDER BY bill_id");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $billNumber = 'INV-' . date('Ymd', strtotime($row['created_at'])) . str_pad($row['bill_id'], 4, '0', STR_PAD_LEFT);

            $stmt = $newConn->prepare("
                INSERT INTO bills (id, bill_number, subtotal, discount_percent, discount_amount, total, created_at, status)
                VALUES (?, ?, ?, 0, ?, ?, ?, 'completed')
                ON DUPLICATE KEY UPDATE total = VALUES(total)
            ");
            $stmt->bind_param(
                "isddds",
                $row['bill_id'],
                $billNumber,
                $row['subtotal'],
                $row['discount'],
                $row['total'],
                $row['created_at']
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} bills.\n";
    } else {
        echo "  Skipped - table 'bills' not found.\n";
    }

    // 9. Migrate Bill Items
    echo "Migrating bill items...\n";
    if (tableExists($oldConn, 'bill_items')) {
        $result = $oldConn->query("SELECT * FROM bill_items");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $itemType = ($row['status'] ?? 'P') === 'P' ? 'product' : 'stock_item';
            $totalPrice = $row['qty'] * $row['price'];

            $stmt = $newConn->prepare("
                INSERT INTO bill_items (bill_id, item_type, item_id, item_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                "isissdd",
                $row['bill_id'],
                $itemType,
                $row['prd_id'],
                $row['prd_name'],
                $row['qty'],
                $row['price'],
                $totalPrice
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} bill items.\n";
    } else {
        echo "  Skipped - table 'bill_items' not found.\n";
    }

    // 10. Migrate Orders
    echo "Migrating orders...\n";
    if (tableExists($oldConn, 'orders')) {
        $result = $oldConn->query("SELECT * FROM orders");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $orderNumber = 'ORD-' . date('Ymd', strtotime($row['order_date'])) . str_pad($row['order_id'], 4, '0', STR_PAD_LEFT);
            $status = $row['status'] == 1 ? 'completed' : 'pending';
            $paymentStatus = $row['payment_status'] ?? 'pending';

            $stmt = $newConn->prepare("
                INSERT INTO orders (id, order_number, customer_name, order_date, total_amount, advance_amount, status, payment_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)
            ");
            $stmt->bind_param(
                "isssddss",
                $row['order_id'],
                $orderNumber,
                $row['customer_name'],
                $row['order_date'],
                $row['total_amount'],
                $row['advance_amount'],
                $status,
                $paymentStatus
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} orders.\n";
    } else {
        echo "  Skipped - table 'orders' not found.\n";
    }

    // 11. Migrate Order Items
    echo "Migrating order items...\n";
    if (tableExists($oldConn, 'order_items')) {
        $result = $oldConn->query("SELECT * FROM order_items");
        $count = 0;
        while ($row = $result->fetch_assoc()) {
            $itemType = ($row['type'] ?? 'P') === 'P' ? 'product' : 'stock_item';
            $totalPrice = $row['quantity'] * $row['amount'];

            // Get item name
            $itemName = 'Unknown';
            if ($itemType === 'product' && tableExists($oldConn, 'product')) {
                $nameResult = $oldConn->query("SELECT prd_name FROM product WHERE prd_id = " . intval($row['product_id']));
                $nameRow = $nameResult->fetch_assoc();
                if ($nameRow) $itemName = $nameRow['prd_name'];
            } elseif (tableExists($oldConn, 'stock_name')) {
                $nameResult = $oldConn->query("SELECT stk_name FROM stock_name WHERE stk_id = " . intval($row['product_id']));
                $nameRow = $nameResult->fetch_assoc();
                if ($nameRow) $itemName = $nameRow['stk_name'];
            }

            $stmt = $newConn->prepare("
                INSERT INTO order_items (order_id, item_type, item_id, item_name, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param(
                "isissdd",
                $row['order_id'],
                $itemType,
                $row['product_id'],
                $itemName,
                $row['quantity'],
                $row['amount'],
                $totalPrice
            );
            $stmt->execute();
            $count++;
        }
        echo "  Migrated {$count} order items.\n";
    } else {
        echo "  Skipped - table 'order_items' not found.\n";
    }

    // Re-enable foreign key checks
    $newConn->query("SET FOREIGN_KEY_CHECKS = 1");

    echo "\n===========================================\n";
    echo "Migration completed successfully!\n";
    echo "===========================================\n";
    echo "\nIMPORTANT NOTES:\n";
    echo "1. All user passwords have been reset to 'password123'\n";
    echo "2. Users should change their passwords after first login\n";
    echo "3. Review the migrated data for accuracy\n";

} catch (Exception $e) {
    echo "\nERROR: " . $e->getMessage() . "\n";
    $newConn->query("SET FOREIGN_KEY_CHECKS = 1");
}

$oldConn->close();
$newConn->close();
