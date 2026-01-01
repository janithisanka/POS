/**
 * Suppliers Page
 */

const SuppliersPage = {
    suppliers: [],

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Supplier Management</h2>
                        <p class="text-sm text-gray-500">Manage your suppliers and payments</p>
                    </div>
                    <button id="add-supplier-btn" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>Add Supplier
                    </button>
                </div>

                <!-- Suppliers Grid -->
                <div id="suppliers-container">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        await this.loadData();
        this.bindEvents();
        this.renderSuppliers();
    },

    async loadData() {
        try {
            const response = await API.suppliers.getAll();
            this.suppliers = response.data || [];
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderSuppliers() {
        const container = document.getElementById('suppliers-container');

        if (this.suppliers.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm">
                    <div class="empty-state py-12">
                        <i class="fas fa-truck"></i>
                        <p>No suppliers found</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${this.suppliers.map(supplier => `
                    <div class="bg-white rounded-xl shadow-sm p-6">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <i class="fas fa-building text-blue-600"></i>
                                </div>
                                <div>
                                    <h3 class="font-semibold">${Utils.escapeHtml(supplier.name)}</h3>
                                    <p class="text-sm text-gray-500">${supplier.contact_person || '-'}</p>
                                </div>
                            </div>
                            <span class="badge ${supplier.status === 'active' ? 'badge-success' : 'badge-gray'}">
                                ${Utils.capitalize(supplier.status)}
                            </span>
                        </div>

                        <div class="space-y-2 text-sm mb-4">
                            <div class="flex items-center gap-2 text-gray-600">
                                <i class="fas fa-phone w-5"></i>
                                <span>${supplier.phone || '-'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-gray-600">
                                <i class="fas fa-envelope w-5"></i>
                                <span>${supplier.email || '-'}</span>
                            </div>
                            <div class="flex items-start gap-2 text-gray-600">
                                <i class="fas fa-map-marker-alt w-5 mt-1"></i>
                                <span>${Utils.truncate(supplier.address || '-', 50)}</span>
                            </div>
                        </div>

                        <div class="border-t pt-4 mb-4 space-y-1">
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Total Paid</span>
                                <span class="font-semibold text-green-600">${Utils.formatCurrency(supplier.total_paid || 0)}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Outstanding</span>
                                <span class="font-semibold text-red-600">${Utils.formatCurrency(
                                    supplier.outstanding !== undefined
                                        ? supplier.outstanding
                                        : Math.max((supplier.total_purchases || 0) - (supplier.total_paid || 0), 0)
                                )}</span>
                            </div>
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-500">Payments</span>
                                <span class="text-gray-700">${supplier.payment_count || 0}</span>
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <button class="btn btn-outline btn-sm flex-1" onclick="SuppliersPage.viewPayments(${supplier.id})">
                                <i class="fas fa-history mr-1"></i> History
                            </button>
                            <button class="btn btn-primary btn-sm flex-1" onclick="SuppliersPage.addPayment(${supplier.id})">
                                <i class="fas fa-plus mr-1"></i> Payment
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="SuppliersPage.editSupplier(${supplier.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('add-supplier-btn').addEventListener('click', () => this.showSupplierForm());
    },

    showSupplierForm(supplier = null) {
        const isEdit = supplier !== null;

        const modal = Components.modal({
            title: isEdit ? 'Edit Supplier' : 'Add Supplier',
            size: 'md',
            content: `
                <form id="supplier-form" class="space-y-4">
                    ${Components.input('name', 'Supplier Name', 'text', { required: true, value: supplier?.name || '' })}
                    ${Components.input('contact_person', 'Contact Person', 'text', { value: supplier?.contact_person || '' })}

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('phone', 'Phone', 'tel', { value: supplier?.phone || '' })}
                        ${Components.input('email', 'Email', 'email', { value: supplier?.email || '' })}
                    </div>

                    ${Components.textarea('address', 'Address', { value: supplier?.address || '' })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="supplier-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'}
                </button>
            `
        });

        document.getElementById('supplier-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                contact_person: formData.get('contact_person'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address')
            };

            try {
                Utils.showLoading();
                if (isEdit) {
                    await API.suppliers.update(supplier.id, data);
                } else {
                    await API.suppliers.create(data);
                }
                Utils.hideLoading();
                modal.close();
                Components.toast(`Supplier ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                await this.loadData();
                this.renderSuppliers();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    async editSupplier(id) {
        const supplier = this.suppliers.find(s => s.id === id);
        if (supplier) {
            this.showSupplierForm(supplier);
        }
    },

    addPayment(supplierId) {
        const modal = Components.modal({
            title: 'Add Payment',
            size: 'sm',
            content: `
                <form id="payment-form" class="space-y-4">
                    ${Components.input('amount', 'Amount', 'number', { required: true })}
                    ${Components.input('payment_date', 'Payment Date', 'date', { required: true, value: Utils.getToday() })}
                    ${Components.select('payment_method', 'Payment Method', [
                        { value: 'cash', label: 'Cash' },
                        { value: 'bank', label: 'Bank Transfer' },
                        { value: 'cheque', label: 'Cheque' }
                    ], 'cash')}
                    ${Components.input('reference', 'Reference / Cheque No', 'text')}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="payment-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>Add Payment
                </button>
            `
        });

        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                amount: parseFloat(formData.get('amount')),
                payment_date: formData.get('payment_date'),
                payment_method: formData.get('payment_method'),
                reference: formData.get('reference')
            };

            try {
                Utils.showLoading();
                await API.suppliers.addPayment(supplierId, data);
                Utils.hideLoading();
                modal.close();
                Components.toast('Payment added successfully!', 'success');
                await this.loadData();
                this.renderSuppliers();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    async viewPayments(supplierId) {
        try {
            const response = await API.suppliers.get(supplierId);
            const supplier = response.data;
            const payments = supplier.payments || [];
            const totalPaid = supplier.total_paid || 0;
            const totalPurchases = supplier.total_purchases || 0;
            const outstanding = supplier.outstanding !== undefined
                ? supplier.outstanding
                : Math.max(totalPurchases - totalPaid, 0);

            Components.modal({
                title: `Payment History - ${supplier.name}`,
                size: 'md',
                content: `
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg space-y-1">
                        <div class="flex justify-between">
                            <span>Total Paid</span>
                            <span class="font-bold text-green-600">${Utils.formatCurrency(totalPaid)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Outstanding</span>
                            <span class="font-bold text-red-600">${Utils.formatCurrency(outstanding)}</span>
                        </div>
                    </div>

                    ${payments.length === 0 ? `
                        <div class="empty-state py-8">
                            <i class="fas fa-receipt"></i>
                            <p>No payments recorded</p>
                        </div>
                    ` : `
                        <div class="overflow-x-auto">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th class="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${payments.map(p => `
                                        <tr>
                                            <td>${Utils.formatDate(p.payment_date)}</td>
                                            <td>${Utils.capitalize(p.payment_method)}</td>
                                            <td>${p.reference || '-'}</td>
                                            <td class="text-right font-medium">${Utils.formatCurrency(p.amount)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                `
            });
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    }
};
