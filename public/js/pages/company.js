/**
 * Company Settings Page
 */

const CompanyPage = {
    data: null,
    previewLogoUrl: '',

    async render() {
        return `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Company Details</h2>
                        <p class="text-sm text-gray-500">Manage the company information shown on receipts and the app</p>
                    </div>
                </div>

                <div id="company-settings" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        await this.loadData();
        this.renderForm();
    },

    async loadData() {
        try {
            const response = API.company?.get
                ? await API.company.get()
                : await API.get('/company');
            this.data = response.data || {};
            if (App && typeof App.setCompany === 'function') {
                App.setCompany(this.data);
            }
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderForm() {
        const container = document.getElementById('company-settings');
        if (!container) return;

        const company = this.data || {};
        this.previewLogoUrl = company.logo ? `images/${company.logo}` : '';

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm p-6">
                <form id="company-form" class="space-y-4">
                    ${Components.input('name', 'Company Name', 'text', { required: true, value: company.name || '' })}
                    ${Components.textarea('address', 'Address', { rows: 3, value: company.address || '' })}

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('phone', 'Phone', 'text', { value: company.phone || '' })}
                        ${Components.input('email', 'Email', 'email', { value: company.email || '' })}
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('currency', 'Currency Symbol', 'text', { value: company.currency || 'Rs.', placeholder: 'Rs.' })}
                        ${Components.input('tax_rate', 'Tax Rate (%)', 'number', { value: company.tax_rate ?? 0, placeholder: '0' })}
                    </div>

                    <div class="space-y-2">
                        <label class="form-label">Logo (optional)</label>
                        <div class="flex items-center gap-3">
                            <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                                <img id="company-logo-thumb" src="${this.previewLogoUrl}" class="${this.previewLogoUrl ? '' : 'hidden'} w-full h-full object-cover" alt="Company logo preview">
                                <i class="fas fa-image text-gray-400 ${this.previewLogoUrl ? 'hidden' : ''}"></i>
                            </div>
                            <input type="file" id="company-logo" name="logo" accept="image/*" class="form-input text-sm" />
                        </div>
                        <p class="text-xs text-gray-500">JPG, PNG, GIF, WEBP (HEIC/HEIF supported) up to 5MB.</p>
                    </div>

                    ${Components.textarea('receipt_footer', 'Receipt Footer Note', { rows: 3, value: company.receipt_footer || '' })}

                    <div class="flex justify-end">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save mr-2"></i>Save Changes
                        </button>
                    </div>
                </form>
            </div>

            <div class="bg-white rounded-xl shadow-sm p-6">
                <h3 class="font-semibold text-gray-800 mb-4">Receipt Preview</h3>
                <div id="company-preview" class="border rounded-lg p-4 bg-gray-50 text-sm"></div>
            </div>
        `;

        document.getElementById('company-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Live preview updates
        container.querySelectorAll('#company-form input, #company-form textarea').forEach(el => {
            el.addEventListener('input', () => this.renderPreview());
        });

        // Logo preview updates
        const logoInput = document.getElementById('company-logo');
        if (logoInput) {
            logoInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        this.previewLogoUrl = reader.result;
                        this.updateLogoThumb();
                        this.renderPreview();
                    };
                    reader.readAsDataURL(file);
                } else {
                    this.previewLogoUrl = this.data?.logo ? `images/${this.data.logo}` : '';
                    this.updateLogoThumb();
                    this.renderPreview();
                }
            });
        }

        this.renderPreview();
    },

    getFormData() {
        const form = document.getElementById('company-form');
        const formData = new FormData(form);

        return {
            name: formData.get('name'),
            address: formData.get('address'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            currency: formData.get('currency') || 'Rs.',
            tax_rate: parseFloat(formData.get('tax_rate')) || 0,
            receipt_footer: formData.get('receipt_footer')
        };
    },

    renderPreview() {
        const preview = document.getElementById('company-preview');
        if (!preview) return;

        const formData = this.getFormData();
        const totalExample = Utils.formatCurrency(1250, formData.currency);

        preview.innerHTML = `
            <div class="text-center font-bold text-base">${Utils.escapeHtml(formData.name || 'Company Name')}</div>
            ${formData.address ? `<div class="text-center text-gray-600 whitespace-pre-line">${Utils.escapeHtml(formData.address)}</div>` : ''}
            ${formData.phone || formData.email ? `
                <div class="text-center text-gray-500 mt-1">
                    ${formData.phone ? Utils.escapeHtml(formData.phone) : ''}${formData.phone && formData.email ? ' | ' : ''}${formData.email ? Utils.escapeHtml(formData.email) : ''}
                </div>
            ` : ''}
            <div class="border-t border-dashed my-3"></div>
            <div class="flex justify-between">
                <span class="font-medium">Sample Total</span>
                <span class="font-bold text-primary-600">${totalExample}</span>
            </div>
            ${formData.receipt_footer ? `
                <div class="border-t border-dashed my-3"></div>
                <div class="text-center text-gray-600 whitespace-pre-line">${Utils.escapeHtml(formData.receipt_footer)}</div>
            ` : ''}
            ${this.previewLogoUrl ? `
                <div class="border-t border-dashed my-3"></div>
                <div class="flex justify-center">
                    <img src="${this.previewLogoUrl}" alt="Logo preview" class="h-12 object-contain">
                </div>
            ` : ''}
        `;
    },

    async handleSubmit(event) {
        event.preventDefault();
        const form = document.getElementById('company-form');
        const formData = new FormData(form);

        try {
            Utils.showLoading();
            const response = API.company?.update
                ? await API.upload('/company', formData, 'POST')
                : await API.upload('/company', formData, 'POST');
            Utils.hideLoading();

            this.data = response.data;
            this.previewLogoUrl = this.data?.logo ? `images/${this.data.logo}` : '';
            this.updateLogoThumb();
            this.renderPreview();

            if (App && typeof App.setCompany === 'function') {
                App.setCompany(response.data);
            }

            Components.toast('Company details updated', 'success');
        } catch (error) {
            Utils.hideLoading();
            Components.toast(error.message, 'error');
        }
    },

    updateLogoThumb() {
        const img = document.getElementById('company-logo-thumb');
        const icon = img?.nextElementSibling;
        if (!img || !icon) return;

        if (this.previewLogoUrl) {
            img.src = this.previewLogoUrl;
            img.classList.remove('hidden');
            icon.classList.add('hidden');
        } else {
            img.src = '';
            img.classList.add('hidden');
            icon.classList.remove('hidden');
        }
    }
};
