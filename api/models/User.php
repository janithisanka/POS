<?php
/**
 * User Model
 */

require_once __DIR__ . '/BaseModel.php';

class User extends BaseModel {
    protected string $table = 'users';
    protected array $fillable = [
        'username', 'password', 'email', 'first_name', 'last_name',
        'title', 'phone', 'position_id', 'image', 'status', 'last_login'
    ];

    /**
     * Find user by username
     */
    public function findByUsername(string $username): ?array {
        $sql = "SELECT u.*, p.name as position_name, p.permissions
                FROM users u
                LEFT JOIN positions p ON u.position_id = p.id
                WHERE u.username = :username
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['username' => $username]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get user with position info
     */
    public function findWithPosition(int $id): ?array {
        $sql = "SELECT u.*, p.name as position_name, p.permissions
                FROM users u
                LEFT JOIN positions p ON u.position_id = p.id
                WHERE u.id = :id
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all users with positions
     */
    public function getAllWithPositions(string $status = null): array {
        $sql = "SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                       u.title, u.phone, u.image, u.status, u.last_login, u.created_at,
                       p.name as position_name
                FROM users u
                LEFT JOIN positions p ON u.position_id = p.id";

        $params = [];
        if ($status !== null) {
            $sql .= " WHERE u.status = :status";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY u.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Update last login
     */
    public function updateLastLogin(int $id): bool {
        $sql = "UPDATE users SET last_login = NOW() WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(int $id): bool {
        $sql = "UPDATE users SET status = IF(status = 'active', 'inactive', 'active') WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Check if username exists
     */
    public function usernameExists(string $username, int $excludeId = null): bool {
        $sql = "SELECT COUNT(*) as count FROM users WHERE username = :username";
        $params = ['username' => $username];

        if ($excludeId !== null) {
            $sql .= " AND id != :id";
            $params['id'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetch()['count'] > 0;
    }
}
