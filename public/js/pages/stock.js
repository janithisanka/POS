/**
 * Stock/Inventory Page
 */

const StockPage = {
    stock: [],
    stockItems: [],
    products: [],
    suppliers: [],
    activeTab: 'daily',

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Inventory Management</h2>
                        <p class="text-sm text-gray-500">Manage your daily stock and other items</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="add-stock-btn" class="btn btn-primary">
                            <i class="fas fa-plus mr-2"></i>Add Stock
                        </button>
                        <button id="add-item-btn" class="btn btn-outline">
                            <i class="fas fa-plus mr-2"></i>Add Item
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div id="stock-tabs"></div>

                <!-- Content -->
                <div id="stock-content" class="bg-white rounded-xl shadow-sm">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        await this.loadData();
        this.bindEvents();
        this.renderTabs();
        this.renderContent();
    },

    async loadData() {
        try {
            const [stockRes, itemsRes, productsRes, suppliersRes] = await Promise.all([
                API.stock.getToday(),
                API.stock.getItems(),
                API.products.getAll('active'),
                API.suppliers.getAll()
            ]);
            this.stock = stockRes.data || [];
            this.stockItems = itemsRes.data || [];
            this.products = productsRes.data || [];
            this.suppliers = suppliersRes.data || [];
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderTabs() {
        const tabsContainer = document.getElementById('stock-tabs');
        tabsContainer.innerHTML = Components.tabs([
            { id: 'daily', label: 'Daily Stock', icon: 'fa-calendar-day' },
            { id: 'items', label: 'Other Items', icon: 'fa-boxes' }
        ], this.activeTab, (tab) => {
            this.activeTab = tab;
            this.renderTabs();
            this.renderContent();
        });
    },

    renderContent() {
        const container = document.getElementById('stock-content');

        if (this.activeTab === 'daily') {
            this.renderDailyStock(container);
        } else {
            this.renderStockItems(container);
        }
    },

    renderDailyStock(container) {
        const today = Utils.formatDate(Utils.getToday(), 'long');

        if (this.stock.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-warehouse"></i>
                    <p>No stock entries for today</p>
                    <button onclick="StockPage.showAddStockForm()" class="btn btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Add Stock
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="p-4 border-b">
                <h3 class="font-medium text-gray-800">Stock for ${today}</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="data-table">
                    <colgroup>
                        <col style="width:24%;">
                        <col style="width:18%;">
                        <col style="width:12%;">
                        <col style="width:12%;">
                        <col style="width:12%;">
                        <col style="width:12%;">
                        <col style="width:10%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Brand</th>
                            <th class="text-right">Added Qty</th>
                            <th class="text-right">Balance</th>
                            <th class="text-right">Sold</th>
                            <th>Added By</th>
                            <th class="text-right actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.stock.map(item => {
                            const sold = item.quantity - item.quantity_balance;
                            return `
                                <tr>
                                    <td class="font-medium">${Utils.escapeHtml(item.product_name)}</td>
                                    <td>${Utils.escapeHtml(item.brand_name || '-')}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">
                                        <span class="font-bold ${item.quantity_balance > 0 ? 'text-green-600' : 'text-red-600'}">
                                            ${item.quantity_balance}
                                        </span>
                                    </td>
                                    <td class="text-right text-blue-600">${sold}</td>
                                    <td>${item.added_by_name || '-'}</td>
                                    <td class="text-right actions-cell">
                                        <div class="actions-wrap">
                                            <button class="btn btn-outline btn-icon" onclick="StockPage.addMoreStock(${item.product_id})">
                                                <i class="fas fa-plus"></i>
                                            </button>
                                            ${item.quantity_balance > 0 ? `
                                                <button class="btn btn-danger btn-icon" onclick="StockPage.clearStock(${item.id})">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderStockItems(container) {
        if (this.stockItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-boxes"></i>
                    <p>No stock items found</p>
                    <button onclick="StockPage.showAddItemForm()" class="btn btn-primary mt-4">
                        <i class="fas fa-plus mr-2"></i>Add Item
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <colgroup>
                        <col style="width:28%;">
                        <col style="width:14%;" />
                        <col style="width:14%;" />
                        <col style="width:12%;" />
                        <col style="width:12%;" />
                        <col style="width:10%;" />
                        <col style="width:10%;" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Quantity</th>
                            <th>Unit</th>
                            <th>Sellable</th>
                            <th>Status</th>
                            <th class="text-right actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.stockItems.map(item => `
                            <tr>
                                <td class="font-medium">${Utils.escapeHtml(item.name)}</td>
                                <td class="text-right">${Utils.formatCurrency(item.unit_price)}</td>
                                <td class="text-right">
                                    <span class="${item.quantity <= 10 ? 'text-red-600 font-bold' : ''}">
                                        ${item.quantity}
                                    </span>
                                </td>
                                <td>${item.unit || 'pcs'}</td>
                                <td>
                                    <span class="badge ${item.is_sellable ? 'badge-success' : 'badge-gray'}">
                                        ${item.is_sellable ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${item.status === 'active' ? 'badge-success' : 'badge-gray'}">
                                        ${Utils.capitalize(item.status)}
                                    </span>
                                </td>
                                <td class="text-right actions-cell">
                                    <div class="actions-wrap">
                                        <button class="btn btn-outline btn-icon" onclick="StockPage.addQuantity(${item.id})">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                        <button class="btn btn-outline btn-icon" onclick="StockPage.editItem(${item.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-icon" onclick="StockPage.deleteItem(${item.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('add-stock-btn').addEventListener('click', () => this.showAddStockForm());
        document.getElementById('add-item-btn').addEventListener('click', () => this.showAddItemForm());
    },

    showAddStockForm() {
        const productOptions = this.products.map(p => ({ value: p.id, label: p.name }));

        const modal = Components.modal({
            title: 'Add Daily Stock',
            size: 'sm',
            content: `
                <form id="stock-form" class="space-y-4">
                    ${Components.select('product_id', 'Product', productOptions, '', true)}
                    ${Components.input('quantity', 'Quantity', 'number', { required: true })}
                    ${Components.input('date', 'Date', 'date', { value: Utils.getToday() })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="stock-form" class="btn btn-primary">
                    <i class="fas fa-plus mr-2"></i>Add Stock
                </button>
            `
        });

        document.getElementById('stock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                Utils.showLoading();
                await API.stock.add(
                    parseInt(formData.get('product_id')),
                    parseFloat(formData.get('quantity')),
                    formData.get('date')
                );
                Utils.hideLoading();
                modal.close();
                Components.toast('Stock added successfully!', 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    addMoreStock(productId) {
        const product = this.products.find(p => p.id === productId);

        const modal = Components.modal({
            title: `Add Stock - ${product?.name || 'Product'}`,
            size: 'sm',
            content: `
                <form id="add-more-form" class="space-y-4">
                    ${Components.input('quantity', 'Quantity to Add', 'number', { required: true })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="add-more-form" class="btn btn-primary">Add</button>
            `
        });

        document.getElementById('add-more-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const qty = parseFloat(document.getElementById('quantity').value);

            try {
                await API.stock.add(productId, qty);
                modal.close();
                Components.toast('Stock added!', 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Components.toast(error.message, 'error');
            }
        });
    },

    async clearStock(stockId) {
        if (!confirm('Are you sure you want to clear this stock balance?')) return;

        try {
            await API.stock.clear(stockId);
            Components.toast('Stock cleared!', 'success');
            await this.loadData();
            this.renderContent();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    showAddItemForm(item = null) {
        const isEdit = item !== null;
        const supplierOptions = this.suppliers.map(s => ({ value: s.id, label: s.name }));

        const modal = Components.modal({
            title: isEdit ? 'Edit Stock Item' : 'Add Stock Item',
            size: 'sm',
            content: `
                <form id="item-form" class="space-y-4">
                    ${Components.input('name', 'Item Name', 'text', { required: true, value: item?.name || '' })}
                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('unit_price', 'Unit Price', 'number', { required: true, value: item?.unit_price || '' })}
                        ${Components.input('quantity', 'Quantity', 'number', { value: item?.quantity || '0' })}
                    </div>
                    ${Components.input('unit', 'Unit (pcs, kg, etc)', 'text', { value: item?.unit || 'pcs' })}
                    ${Components.select('supplier_id', 'Supplier (optional)', supplierOptions)}
                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('total_amount', 'Purchase Total', 'number', { placeholder: '0.00' })}
                        ${Components.input('paid_amount', 'Paid Now', 'number', { placeholder: '0.00' })}
                    </div>
                    ${Components.input('notes', 'Reference / Notes (optional)', 'text', { placeholder: 'Invoice #123' })}
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="is_sellable" name="is_sellable"
                            ${item?.is_sellable !== 0 ? 'checked' : ''} class="rounded">
                        <label for="is_sellable" class="text-sm">Available for sale in POS</label>
                    </div>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="item-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'}
                </button>
            `
        });

        document.getElementById('item-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                unit_price: parseFloat(formData.get('unit_price')),
                quantity: parseFloat(formData.get('quantity')) || 0,
                unit: formData.get('unit'),
                supplier_id: formData.get('supplier_id') || null,
                total_amount: formData.get('total_amount') ? parseFloat(formData.get('total_amount')) : null,
                paid_amount: formData.get('paid_amount') ? parseFloat(formData.get('paid_amount')) : 0,
                notes: formData.get('notes') || '',
                is_sellable: document.getElementById('is_sellable').checked ? 1 : 0
            };

            try {
                Utils.showLoading();
                if (isEdit) {
                    await API.stock.updateItem(item.id, data);
                } else {
                    await API.stock.createItem(data);
                }
                Utils.hideLoading();
                modal.close();
                Components.toast(`Item ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    editItem(id) {
        const item = this.stockItems.find(i => i.id === id);
        if (item) {
            this.showAddItemForm(item);
        }
    },

    addQuantity(itemId) {
        const supplierOptions = this.suppliers.map(s => ({ value: s.id, label: s.name }));
        const modal = Components.modal({
            title: 'Add Quantity',
            size: 'sm',
            content: `
                <form id="qty-form" class="space-y-4">
                    ${Components.input('quantity', 'Quantity to Add', 'number', { required: true })}
                    ${Components.select('supplier_id', 'Supplier (optional)', supplierOptions)}
                    ${Components.input('total_amount', 'Purchase Total', 'number', { placeholder: '0.00' })}
                    ${Components.input('paid_amount', 'Paid Now', 'number', { placeholder: '0.00' })}
                    ${Components.input('notes', 'Reference/Notes', 'text', { placeholder: 'e.g., Invoice #123' })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="qty-form" class="btn btn-primary">Add</button>
            `
        });

        document.getElementById('qty-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const qty = parseFloat(document.getElementById('quantity').value);
            const supplierId = document.getElementById('supplier_id').value || null;
            const totalAmount = parseFloat(document.getElementById('total_amount').value) || null;
            const paidAmount = parseFloat(document.getElementById('paid_amount').value) || 0;
            const notes = document.getElementById('notes').value || '';

            try {
                await API.stock.addItemQuantity(itemId, qty, {
                    supplier_id: supplierId ? parseInt(supplierId) : null,
                    total_amount: totalAmount,
                    paid_amount: paidAmount,
                    notes
                });
                modal.close();
                Components.toast('Quantity added!', 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Components.toast(error.message, 'error');
            }
        });
    },

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await API.stock.deleteItem(id);
            Components.toast('Item deleted!', 'success');
            await this.loadData();
            this.renderContent();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    }
};
