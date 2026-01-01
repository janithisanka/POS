<?php
/**
 * Product Controller
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Product.php';
require_once __DIR__ . '/../models/Brand.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class ProductController {
    private Product $productModel;
    private Brand $brandModel;

    public function __construct() {
        $this->productModel = new Product();
        $this->brandModel = new Brand();
    }

    /**
     * Get all products
     */
    public function index(): void {
        Auth::requireAuth();

        $status = $_GET['status'] ?? null;
        $products = $this->productModel->getAllWithBrand($status);
        Response::success($products);
    }

    /**
     * Get products for POS (with stock and current price)
     */
    public function forPOS(): void {
        Auth::requireAuth();

        $products = $this->productModel->getAllForPOS();
        Response::success($products);
    }

    /**
     * Get single product
     */
    public function show(int $id): void {
        Auth::requireAuth();

        $product = $this->productModel->getWithStock($id);
        if (!$product) {
            Response::notFound('Product not found');
        }
        Response::success($product);
    }

    /**
     * Create product
     */
    public function store(): void {
        Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = new Validator($data);
        $validator
            ->required('name')
            ->required('price')
            ->numeric('price')
            ->min('price', 0)
            ->validate();

        // Handle image upload
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $imagePath = $this->handleImageUpload($_FILES['image'], 'products');
        }

        $productId = $this->productModel->create([
            'name' => Validator::sanitizeString($data['name']),
            'brand_id' => isset($data['brand_id']) ? (int)$data['brand_id'] : null,
            'price' => Validator::sanitizeFloat($data['price']),
            'special_price' => isset($data['special_price']) ? Validator::sanitizeFloat($data['special_price']) : null,
            'size' => isset($data['size']) ? Validator::sanitizeString($data['size']) : null,
            'description' => isset($data['description']) ? Validator::sanitizeString($data['description']) : null,
            'image' => $imagePath,
            'is_special_pricing' => isset($data['is_special_pricing']) ? (int)$data['is_special_pricing'] : 0,
            'status' => 'active'
        ]);

        $product = $this->productModel->find($productId);
        Response::success($product, 'Product created successfully', 201);
    }

    /**
     * Update product
     */
    public function update(int $id): void {
        Auth::requireAuth();

        $product = $this->productModel->find($id);
        if (!$product) {
            Response::notFound('Product not found');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $updateData = [];

        if (isset($data['name'])) {
            $updateData['name'] = Validator::sanitizeString($data['name']);
        }
        if (isset($data['brand_id'])) {
            $updateData['brand_id'] = (int)$data['brand_id'];
        }
        if (isset($data['price'])) {
            $updateData['price'] = Validator::sanitizeFloat($data['price']);
        }
        if (isset($data['special_price'])) {
            $updateData['special_price'] = Validator::sanitizeFloat($data['special_price']);
        }
        if (isset($data['size'])) {
            $updateData['size'] = Validator::sanitizeString($data['size']);
        }
        if (isset($data['description'])) {
            $updateData['description'] = Validator::sanitizeString($data['description']);
        }
        if (isset($data['is_special_pricing'])) {
            $updateData['is_special_pricing'] = (int)$data['is_special_pricing'];
        }
        if (isset($data['status'])) {
            $updateData['status'] = $data['status'];
        }

        // Handle image upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $updateData['image'] = $this->handleImageUpload($_FILES['image'], 'products');
            // Delete old image if exists
            if ($product['image']) {
                $oldPath = UPLOAD_PATH . $product['image'];
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
        }

        $this->productModel->update($id, $updateData);

        $updatedProduct = $this->productModel->find($id);
        Response::success($updatedProduct, 'Product updated successfully');
    }

    /**
     * Delete product
     */
    public function destroy(int $id): void {
        Auth::requireAuth();

        $product = $this->productModel->find($id);
        if (!$product) {
            Response::notFound('Product not found');
        }

        // Soft delete by setting status to inactive
        $this->productModel->update($id, ['status' => 'inactive']);
        Response::success(null, 'Product deleted successfully');
    }

    /**
     * Search products
     */
    public function search(): void {
        Auth::requireAuth();

        $query = $_GET['q'] ?? '';
        if (empty($query)) {
            Response::success([]);
        }

        $products = $this->productModel->search($query);
        Response::success($products);
    }

    /**
     * Handle image upload
     */
    private function handleImageUpload(array $file, string $folder): string {
        if (!in_array($file['type'], ALLOWED_IMAGE_TYPES)) {
            Response::error('Invalid image type. Allowed: JPG, PNG, GIF, WEBP');
        }

        if ($file['size'] > UPLOAD_MAX_SIZE) {
            Response::error('Image size exceeds maximum allowed (5MB)');
        }

        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $destination = UPLOAD_PATH . $folder . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::serverError('Failed to upload image');
        }

        return $folder . '/' . $filename;
    }
}
