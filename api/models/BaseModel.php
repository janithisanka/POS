<?php
/**
 * Base Model
 * Provides common database operations for all models
 */

require_once __DIR__ . '/../config/database.php';

abstract class BaseModel {
    protected PDO $db;
    protected string $table;
    protected string $primaryKey = 'id';
    protected array $fillable = [];

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Find record by ID
     */
    public function find(int $id): ?array {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all records
     */
    public function all(array $conditions = [], string $orderBy = 'id DESC'): array {
        $sql = "SELECT * FROM {$this->table}";

        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "{$key} = :{$key}";
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }

        $sql .= " ORDER BY {$orderBy}";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($conditions);
        return $stmt->fetchAll();
    }

    /**
     * Paginated query
     */
    public function paginate(int $page = 1, int $perPage = DEFAULT_PAGE_SIZE, array $conditions = [], string $orderBy = 'id DESC'): array {
        $offset = ($page - 1) * $perPage;

        // Count total
        $countSql = "SELECT COUNT(*) as total FROM {$this->table}";
        $dataSql = "SELECT * FROM {$this->table}";

        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "{$key} = :{$key}";
            }
            $whereClause = " WHERE " . implode(' AND ', $where);
            $countSql .= $whereClause;
            $dataSql .= $whereClause;
        }

        $dataSql .= " ORDER BY {$orderBy} LIMIT :limit OFFSET :offset";

        // Get total count
        $countStmt = $this->db->prepare($countSql);
        $countStmt->execute($conditions);
        $total = (int)$countStmt->fetch()['total'];

        // Get data
        $dataStmt = $this->db->prepare($dataSql);
        foreach ($conditions as $key => $value) {
            $dataStmt->bindValue(":{$key}", $value);
        }
        $dataStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $dataStmt->execute();

        return [
            'data' => $dataStmt->fetchAll(),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }

    /**
     * Create new record
     */
    public function create(array $data): int {
        $fields = array_intersect_key($data, array_flip($this->fillable));

        $columns = implode(', ', array_keys($fields));
        $placeholders = ':' . implode(', :', array_keys($fields));

        $sql = "INSERT INTO {$this->table} ({$columns}) VALUES ({$placeholders})";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($fields);

        return (int)$this->db->lastInsertId();
    }

    /**
     * Update record
     */
    public function update(int $id, array $data): bool {
        $fields = array_intersect_key($data, array_flip($this->fillable));

        $set = [];
        foreach ($fields as $key => $value) {
            $set[] = "{$key} = :{$key}";
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $set) . " WHERE {$this->primaryKey} = :id";
        $fields['id'] = $id;

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($fields);
    }

    /**
     * Delete record
     */
    public function delete(int $id): bool {
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute(['id' => $id]);
    }

    /**
     * Find by custom field
     */
    public function findBy(string $field, $value): ?array {
        $sql = "SELECT * FROM {$this->table} WHERE {$field} = :value LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['value' => $value]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Find all by custom field
     */
    public function findAllBy(string $field, $value, string $orderBy = 'id DESC'): array {
        $sql = "SELECT * FROM {$this->table} WHERE {$field} = :value ORDER BY {$orderBy}";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['value' => $value]);
        return $stmt->fetchAll();
    }

    /**
     * Execute raw query
     */
    public function query(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Execute raw statement (for INSERT/UPDATE/DELETE)
     */
    public function execute(string $sql, array $params = []): bool {
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Begin transaction
     */
    public function beginTransaction(): void {
        $this->db->beginTransaction();
    }

    /**
     * Commit transaction
     */
    public function commit(): void {
        $this->db->commit();
    }

    /**
     * Rollback transaction
     */
    public function rollback(): void {
        $this->db->rollBack();
    }
}
