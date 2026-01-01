<?php
/**
 * Company Controller
 * Manage company profile/settings
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../models/Company.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Validator.php';

class CompanyController {
    private Company $companyModel;

    public function __construct() {
        $this->companyModel = new Company();
    }

    /**
     * Public endpoint to fetch company details
     */
    public function info(): void {
        $company = $this->companyModel->getSettings();
        Response::success($company);
    }

    /**
     * Update company details (requires auth)
     */
    public function update(): void {
        Auth::requireAuth();

        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $validator = new Validator($data);
        $validator
            ->required('name')
            ->maxLength('name', 200);

        if (isset($data['email'])) {
            $validator->email('email');
        }
        if (isset($data['phone'])) {
            $validator->phone('phone');
        }
        if (isset($data['currency'])) {
            $validator->maxLength('currency', 10, 'Currency');
        }
        if (isset($data['tax_rate'])) {
            $validator->numeric('tax_rate', 'Tax Rate')->min('tax_rate', 0, 'Tax Rate');
        }
        $validator->validate();

        $current = $this->companyModel->getSettings();

        $updateData = [
            'name' => Validator::sanitizeString($data['name']),
            'address' => isset($data['address']) ? Validator::sanitizeString($data['address']) : null,
            'phone' => isset($data['phone']) ? Validator::sanitizeString($data['phone']) : null,
            'email' => isset($data['email']) ? Validator::sanitizeEmail($data['email']) : null,
            'currency' => isset($data['currency']) ? Validator::sanitizeString($data['currency']) : $current['currency'],
            'tax_rate' => isset($data['tax_rate']) ? Validator::sanitizeFloat($data['tax_rate']) : $current['tax_rate'],
            'receipt_footer' => isset($data['receipt_footer']) ? Validator::sanitizeString($data['receipt_footer']) : $current['receipt_footer']
        ];

        // Handle logo upload
        if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
            $updateData['logo'] = $this->handleLogoUpload($_FILES['logo'], $current['logo'] ?? null);
        }

        $updated = $this->companyModel->updateSettings($updateData);
        Response::success($updated, 'Company details updated successfully');
    }

    /**
     * Upload logo image and remove old logo if exists
     */
    private function handleLogoUpload(array $file, ?string $oldLogo = null): string {
        $mime = $file['type'] ?? '';
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $isImageMime = strpos($mime, 'image/') === 0;
        $allowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];

        if (!$isImageMime && !in_array($mime, ALLOWED_IMAGE_TYPES)) {
            Response::error('Invalid logo type. Allowed: JPG, PNG, GIF, WEBP, HEIC/HEIF');
        }
        if (!in_array($ext, $allowedExt)) {
            Response::error('Invalid logo file extension.');
        }

        if ($file['size'] > UPLOAD_MAX_SIZE) {
            Response::error('Logo size exceeds maximum allowed (5MB)');
        }

        $filename = uniqid('logo_') . '_' . time() . '.' . $ext;
        $folder = UPLOAD_PATH . 'company/';

        if (!is_dir($folder)) {
            mkdir($folder, 0755, true);
        }

        $destination = $folder . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            Response::serverError('Failed to upload logo');
        }

        // Delete old logo
        if ($oldLogo) {
            $oldPath = UPLOAD_PATH . $oldLogo;
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        // Save relative path (e.g., company/filename.png)
        return 'company/' . $filename;
    }
}
