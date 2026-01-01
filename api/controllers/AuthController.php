<?php
/**
 * Authentication Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class AuthController {
    private User $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    /**
     * User login
     */
    public function login(): void {
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        // Validate input
        $validator = new Validator($data);
        $validator
            ->required('username')
            ->required('password')
            ->validate();

        $username = Validator::sanitizeString($data['username']);
        $password = $data['password'];

        // Find user
        $user = $this->userModel->findByUsername($username);

        if (!$user) {
            Response::unauthorized('Invalid username or password');
        }

        // Check status
        if ($user['status'] !== 'active') {
            Response::unauthorized('Your account has been deactivated');
        }

        // Verify password
        if (!Auth::verifyPassword($password, $user['password'])) {
            Response::unauthorized('Invalid username or password');
        }

        // Update last login
        $this->userModel->updateLastLogin($user['id']);

        // Generate token
        $token = Auth::generateToken([
            'user_id' => $user['id'],
            'username' => $user['username'],
            'position' => $user['position_name'],
            'permissions' => json_decode($user['permissions'] ?? '{}', true)
        ]);

        // Return user data (excluding sensitive fields)
        unset($user['password']);

        Response::success([
            'token' => $token,
            'user' => $user
        ], 'Login successful');
    }

    /**
     * Get current user
     */
    public function me(): void {
        $payload = Auth::requireAuth();

        $user = $this->userModel->findWithPosition($payload['user_id']);

        if (!$user) {
            Response::notFound('User not found');
        }

        unset($user['password']);
        Response::success($user);
    }

    /**
     * Logout (client-side token removal)
     */
    public function logout(): void {
        // JWT is stateless, so we just return success
        // Client should remove the token
        Response::success(null, 'Logged out successfully');
    }

    /**
     * Change password
     */
    public function changePassword(): void {
        $payload = Auth::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator
            ->required('current_password')
            ->required('new_password')
            ->minLength('new_password', 6)
            ->validate();

        $user = $this->userModel->find($payload['user_id']);

        // Verify current password
        if (!Auth::verifyPassword($data['current_password'], $user['password'])) {
            Response::error('Current password is incorrect');
        }

        // Update password
        $newHash = Auth::hashPassword($data['new_password']);
        $this->userModel->update($payload['user_id'], ['password' => $newHash]);

        Response::success(null, 'Password changed successfully');
    }
}
