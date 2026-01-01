<?php
/**
 * Input Validator
 * Secure input validation and sanitization
 */

class Validator {
    private array $errors = [];
    private array $data = [];

    public function __construct(array $data) {
        $this->data = $data;
    }

    public function required(string $field, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (!isset($this->data[$field]) || trim($this->data[$field]) === '') {
            $this->errors[$field] = "{$label} is required";
        }
        return $this;
    }

    public function email(string $field, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && !empty($this->data[$field])) {
            if (!filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
                $this->errors[$field] = "{$label} must be a valid email address";
            }
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && strlen($this->data[$field]) < $min) {
            $this->errors[$field] = "{$label} must be at least {$min} characters";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && strlen($this->data[$field]) > $max) {
            $this->errors[$field] = "{$label} must not exceed {$max} characters";
        }
        return $this;
    }

    public function numeric(string $field, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && !empty($this->data[$field])) {
            if (!is_numeric($this->data[$field])) {
                $this->errors[$field] = "{$label} must be a number";
            }
        }
        return $this;
    }

    public function min(string $field, float $min, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && is_numeric($this->data[$field])) {
            if ((float)$this->data[$field] < $min) {
                $this->errors[$field] = "{$label} must be at least {$min}";
            }
        }
        return $this;
    }

    public function max(string $field, float $max, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && is_numeric($this->data[$field])) {
            if ((float)$this->data[$field] > $max) {
                $this->errors[$field] = "{$label} must not exceed {$max}";
            }
        }
        return $this;
    }

    public function in(string $field, array $values, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && !in_array($this->data[$field], $values)) {
            $this->errors[$field] = "{$label} must be one of: " . implode(', ', $values);
        }
        return $this;
    }

    public function date(string $field, string $format = 'Y-m-d', string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && !empty($this->data[$field])) {
            $d = DateTime::createFromFormat($format, $this->data[$field]);
            if (!$d || $d->format($format) !== $this->data[$field]) {
                $this->errors[$field] = "{$label} must be a valid date ({$format})";
            }
        }
        return $this;
    }

    public function phone(string $field, string $label = null): self {
        $label = $label ?? ucfirst(str_replace('_', ' ', $field));

        if (isset($this->data[$field]) && !empty($this->data[$field])) {
            $cleaned = preg_replace('/[\s\-\(\)]/', '', $this->data[$field]);
            if (!preg_match('/^\+?[0-9]{7,15}$/', $cleaned)) {
                $this->errors[$field] = "{$label} must be a valid phone number";
            }
        }
        return $this;
    }

    public function isValid(): bool {
        return empty($this->errors);
    }

    public function getErrors(): array {
        return $this->errors;
    }

    public function validate(): void {
        if (!$this->isValid()) {
            Response::validationError($this->errors);
        }
    }

    // Sanitization methods
    public static function sanitizeString(?string $value): string {
        return htmlspecialchars(trim($value ?? ''), ENT_QUOTES, 'UTF-8');
    }

    public static function sanitizeInt($value): int {
        return (int)filter_var($value, FILTER_SANITIZE_NUMBER_INT);
    }

    public static function sanitizeFloat($value): float {
        return (float)filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
    }

    public static function sanitizeEmail(?string $value): string {
        return filter_var(trim($value ?? ''), FILTER_SANITIZE_EMAIL);
    }
}
