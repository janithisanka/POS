<?php
/**
 * Brand Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Brand.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class BrandController {
    private Brand $brandModel;

    public function __construct() {
        $this->brandModel = new Brand();
    }

    /**
     * Get all brands
     */
    public function index(): void {
        Auth::requireAuth();

        $brands = $this->brandModel->getAllWithProductCount();
        Response::success($brands);
    }

    /**
     * Get active brands (for dropdowns)
     */
    public function active(): void {
        Auth::requireAuth();

        $brands = $this->brandModel->getActive();
        Response::success($brands);
    }

    /**
     * Get single brand
     */
    public function show(int $id): void {
        Auth::requireAuth();

        $brand = $this->brandModel->find($id);
        if (!$brand) {
            Response::notFound('Brand not found');
        }
        Response::success($brand);
    }

    /**
     * Create brand
     */
    public function store(): void {
        Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = new Validator($data);
        $validator
            ->required('name')
            ->maxLength('name', 100)
            ->validate();

        // Handle image upload
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imagePath = $this->handleImageUpload($_FILES['image']);
        }

        $brandId = $this->brandModel->create([
            'name' => Validator::sanitizeString($data['name']),
            'description' => isset($data['description']) ? Validator::sanitizeString($data['description']) : null,
            'image' => $imagePath,
            'status' => 'active'
        ]);

        $brand = $this->brandModel->find($brandId);
        Response::success($brand, 'Brand created successfully', 201);
    }

    /**
     * Update brand
     */
    public function update(int $id): void {
        Auth::requireAuth();

        $brand = $this->brandModel->find($id);
        if (!$brand) {
            Response::notFound('Brand not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $updateData = [];

        if (isset($data['name'])) {
            $validator = new Validator($data);
            $validator->maxLength('name', 100)->validate();
            $updateData['name'] = Validator::sanitizeString($data['name']);
        }
        if (isset($data['description'])) {
            $updateData['description'] = Validator::sanitizeString($data['description']);
        }
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }

        // Handle image upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $updateData['image'] = $this->handleImageUpload($_FILES['image']);
            // Delete old image
            if ($brand['image']) {
                $oldPath = UPLOAD_PATH . 'brands/' . $brand['image'];
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
        }

        $this->brandModel->update($id, $updateData);

        $updatedBrand = $this->brandModel->find($id);
        Response::success($updatedBrand, 'Brand updated successfully');
    }

    /**
     * Delete brand
     */
    public function destroy(int $id): void {
        Auth::requireAuth();

        $brand = $this->brandModel->find($id);
        if (!$brand) {
            Response::notFound('Brand not found');
        }

        // Soft delete
        $this->brandModel->update($id, ['status' => 'inactive']);
        Response::success(null, 'Brand deleted successfully');
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
        $destination = UPLOAD_PATH . 'brands/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::serverError('Failed to upload image');
        }

        return $filename;
    }
}
