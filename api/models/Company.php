<?php
/**
 * Company Model
 * Handles company profile/settings storage
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/BaseModel.php';

class Company extends BaseModel {
    protected string $table = 'company';
    protected array $fillable = [
        'name', 'address', 'phone', 'email', 'logo',
        'currency', 'tax_rate', 'receipt_footer'
    ];

    /**
     * Get company settings, creating a default row if missing
     */
    public function getSettings(): array {
        $sql = "SELECT * FROM {$this->table} ORDER BY id ASC LIMIT 1";
        $stmt = $this->db->query($sql);
        $settings = $stmt->fetch();

        if (!$settings) {
            $defaultId = $this->create([
                'name' => 'Bakery POS',
                'address' => '',
                'phone' => '',
                'email' => '',
                'currency' => CURRENCY_SYMBOL,
                'tax_rate' => 0,
                'receipt_footer' => null,
                'logo' => null
            ]);

            return $this->find($defaultId);
        }

        return $settings;
    }

    /**
     * Update settings and return latest record
     */
    public function updateSettings(array $data): array {
        $settings = $this->getSettings();
        $this->update((int)$settings['id'], $data);
        return $this->getSettings();
    }
}
