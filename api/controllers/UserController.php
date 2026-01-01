<?php
/**
 * User Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class UserController {
    private User $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    /**
     * Get all users
     */
    public function index(): void {
        Auth::requireAuth();

        $status = $_GET['status'] ?? null;
        $users = $this->userModel->getAllWithPositions($status);

        Response::success($users);
    }

    /**
     * Get single user
     */
    public function show(int $id): void {
        Auth::requireAuth();

        $user = $this->userModel->findWithPosition($id);
        if (!$user) {
            Response::notFound('User not found');
        }

        unset($user['password']);
        Response::success($user);
    }

    /**
     * Create user
     */
    public function store(): void {
        Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        // Validate
        $validator = new Validator($data);
        $validator
            ->required('username')
            ->minLength('username', 3)
            ->maxLength('username', 50)
            ->required('password')
            ->minLength('password', 6)
            ->required('first_name')
            ->required('last_name')
            ->email('email')
            ->phone('phone')
            ->validate();

        // Check if username exists
        if ($this->userModel->usernameExists($data['username'])) {
            Response::error('Username already exists');
        }

        // Handle image upload
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imagePath = $this->handleImageUpload($_FILES['image']);
        }

        $userId = $this->userModel->create([
            'username' => Validator::sanitizeString($data['username']),
            'password' => Auth::hashPassword($data['password']),
            'email' => isset($data['email']) ? Validator::sanitizeEmail($data['email']) : null,
            'first_name' => Validator::sanitizeString($data['first_name']),
            'last_name' => Validator::sanitizeString($data['last_name']),
            'title' => isset($data['title']) ? Validator::sanitizeString($data['title']) : null,
            'phone' => isset($data['phone']) ? Validator::sanitizeString($data['phone']) : null,
            'position_id' => isset($data['position_id']) ? (int)$data['position_id'] : null,
            'image' => $imagePath,
            'status' => 'active'
        ]);

        $user = $this->userModel->findWithPosition($userId);
        unset($user['password']);

        Response::success($user, 'User created successfully', 201);
    }

    /**
     * Update user
     */
    public function update(int $id): void {
        Auth::requireAuth();

        $user = $this->userModel->find($id);
        if (!$user) {
            Response::notFound('User not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $updateData = [];

        if (isset($data['username'])) {
            // Check if new username exists (excluding current user)
            if ($this->userModel->usernameExists($data['username'], $id)) {
                Response::error('Username already exists');
            }
            $updateData['username'] = Validator::sanitizeString($data['username']);
        }
        if (isset($data['email'])) {
            $updateData['email'] = Validator::sanitizeEmail($data['email']);
        }
        if (isset($data['first_name'])) {
            $updateData['first_name'] = Validator::sanitizeString($data['first_name']);
        }
        if (isset($data['last_name'])) {
            $updateData['last_name'] = Validator::sanitizeString($data['last_name']);
        }
        if (isset($data['title'])) {
            $updateData['title'] = Validator::sanitizeString($data['title']);
        }
        if (isset($data['phone'])) {
            $updateData['phone'] = Validator::sanitizeString($data['phone']);
        }
        if (isset($data['position_id'])) {
            $updateData['position_id'] = (int)$data['position_id'];
        }
        if (isset($data['password']) && !empty($data['password'])) {
            $validator = new Validator($data);
            $validator->minLength('password', 6)->validate();
            $updateData['password'] = Auth::hashPassword($data['password']);
        }

        // Handle image upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $updateData['image'] = $this->handleImageUpload($_FILES['image']);
            // Delete old image
            if ($user['image']) {
                $oldPath = UPLOAD_PATH . 'users/' . $user['image'];
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
        }

        $this->userModel->update($id, $updateData);

        $updatedUser = $this->userModel->findWithPosition($id);
        unset($updatedUser['password']);

        Response::success($updatedUser, 'User updated successfully');
    }

    /**
     * Toggle user status
     */
    public function toggleStatus(int $id): void {
        Auth::requireAuth();

        $user = $this->userModel->find($id);
        if (!$user) {
            Response::notFound('User not found');
        }

        $this->userModel->toggleStatus($id);

        $updatedUser = $this->userModel->find($id);
        $newStatus = $updatedUser['status'];

        Response::success(['status' => $newStatus], "User {$newStatus}");
    }

    /**
     * Delete user (soft delete - set inactive)
     */
    public function destroy(int $id): void {
        Auth::requireAuth();

        $user = $this->userModel->find($id);
        if (!$user) {
            Response::notFound('User not found');
        }

        $this->userModel->update($id, ['status' => 'inactive']);
        Response::success(null, 'User deactivated successfully');
    }

    /**
     * Get positions
     */
    public function positions(): void {
        Auth::requireAuth();

        $sql = "SELECT * FROM positions ORDER BY name";
        $stmt = Database::getInstance()->getConnection()->prepare($sql);
        $stmt->execute();

        Response::success($stmt->fetchAll());
    }

    /**
     * Handle image upload
     */
    private function handleImageUpload(array $file): string {
        if (!in_array($file['type'], ALLOWED_IMAGE_TYPES)) {
            Response::error('Invalid image type');
        }

        if ($file['size'] > UPLOAD_MAX_SIZE) {
            Response::error('Image size exceeds maximum allowed');
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $destination = UPLOAD_PATH . 'users/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::serverError('Failed to upload image');
        }

        return $filename;
    }
}
