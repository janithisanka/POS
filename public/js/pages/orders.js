/**
 * Orders Page
 */

const OrdersPage = {
    orders: [],
    products: [],
    stockItems: [],
    currentPage: 1,
    filters: {},

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Orders</h2>
                        <p class="text-sm text-gray-500">Manage customer orders and pre-orders</p>
                    </div>
                    <button id="new-order-btn" class="btn btn-primary">
                        <i class="fas fa-plus mr-2"></i>New Order
                    </button>
                </div>

                <!-- Filters -->
                <div class="bg-white rounded-xl p-4 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="form-label">Status</label>
                            <select id="filter-status" class="form-select">
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="ready">Ready</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">From Date</label>
                            <input type="date" id="filter-from" class="form-input" value="${Utils.getMonthStart()}">
                        </div>
                        <div>
                            <label class="form-label">To Date</label>
                            <input type="date" id="filter-to" class="form-input" value="${Utils.getToday()}">
                        </div>
                        <div class="flex items-end">
                            <button id="filter-btn" class="btn btn-primary w-full">
                                <i class="fas fa-filter mr-2"></i>Filter
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Orders Table -->
                <div id="orders-container" class="bg-white rounded-xl shadow-sm">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        this.bindEvents();
        await this.loadOrders();
    },

    async loadOrders() {
        try {
            const params = {
                page: this.currentPage,
                ...this.filters
            };

            const response = await API.orders.getAll(params);
            this.orders = response.data || [];

            this.renderOrders(response);
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderOrders(response) {
        const container = document.getElementById('orders-container');
        const orders = response.data || [];
        const pagination = response.pagination || {};

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No orders found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Order #</th>
                            <th>Customer</th>
                            <th>Order Date</th>
                            <th>Total</th>
                            <th>Advance</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th class="actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td class="font-medium">${order.order_number}</td>
                                <td>${Utils.escapeHtml(order.customer_name)}</td>
                                <td>${Utils.formatDate(order.order_date)}</td>
                                <td>${Utils.formatCurrency(order.total_amount)}</td>
                                <td class="text-green-600">${Utils.formatCurrency(order.advance_amount)}</td>
                                <td class="text-red-600">${Utils.formatCurrency(order.balance_amount)}</td>
                                <td>
                                    <span class="badge ${Utils.getStatusBadgeClass(order.status)}">
                                        ${Utils.capitalize(order.status.replace('_', ' '))}
                                    </span>
                                </td>
                                <td class="actions-cell">
                                    <div class="actions-wrap">
                                        <button class="btn btn-outline btn-icon" onclick="OrdersPage.viewOrder(${order.id})" title="View">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${order.status !== 'completed' && order.status !== 'cancelled' ? `
                                            <button class="btn btn-success btn-icon" onclick="OrdersPage.updateStatus(${order.id}, '${order.status}')" title="Update Status">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-primary btn-icon" onclick="OrdersPage.addPayment(${order.id})" title="Add Payment">
                                                <i class="fas fa-money-bill"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${pagination.total_pages > 1 ? `
                <div class="p-4 border-t">
                    ${Components.pagination(pagination.current_page, pagination.total_pages, (page) => {
                        this.currentPage = page;
                        this.loadOrders();
                    })}
                </div>
            ` : ''}
        `;
    },

    bindEvents() {
        // New order button
        document.getElementById('new-order-btn').addEventListener('click', () => this.showOrderForm());

        // Filter button
        document.getElementById('filter-btn').addEventListener('click', () => {
            this.filters = {
                status: document.getElementById('filter-status').value,
                from_date: document.getElementById('filter-from').value,
                to_date: document.getElementById('filter-to').value
            };
            this.currentPage = 1;
            this.loadOrders();
        });
    },

    async showOrderForm(order = null) {
        // Load products and stock items for the form
        try {
            const posData = await API.pos.getItems();
            this.products = posData.data.products || [];
            this.stockItems = posData.data.stock_items || [];
        } catch (error) {
            Components.toast('Failed to load products', 'error');
            return;
        }

        const isEdit = order !== null;
        const modal = Components.modal({
            title: isEdit ? 'Edit Order' : 'New Order',
            size: 'lg',
            content: `
                <form id="order-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Components.input('customer_name', 'Customer Name', 'text', { required: true, value: order?.customer_name || '' })}
                        ${Components.input('customer_phone', 'Phone', 'tel', { value: order?.customer_phone || '' })}
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${Components.input('order_date', 'Order Date', 'date', { required: true, value: order?.order_date || Utils.getToday() })}
                        ${Components.input('delivery_date', 'Delivery Date', 'date', { value: order?.delivery_date || '' })}
                    </div>

                    <div class="border-t pt-4">
                        <h4 class="font-medium mb-3">Order Items</h4>
                        <div id="order-items-container" class="space-y-2">
                            <div class="order-item-row flex gap-2 items-end">
                                <div class="flex-1">
                                    <label class="form-label">Product</label>
                                    <select name="product_id[]" class="form-select product-select" required>
                                        <option value="">Select Product</option>
                                        <optgroup label="Bakery Products">
                                            ${this.products.map(p => `<option value="product-${p.id}" data-price="${p.current_price}">${p.name} (${Utils.formatCurrency(p.current_price)})</option>`).join('')}
                                        </optgroup>
                                        <optgroup label="Other Items">
                                            ${this.stockItems.map(s => `<option value="stock_item-${s.id}" data-price="${s.price}">${s.name} (${Utils.formatCurrency(s.price)})</option>`).join('')}
                                        </optgroup>
                                    </select>
                                </div>
                                <div class="w-24">
                                    <label class="form-label">Qty</label>
                                    <input type="number" name="quantity[]" class="form-input qty-input" min="1" value="1" required>
                                </div>
                                <div class="w-32">
                                    <label class="form-label">Price</label>
                                    <input type="number" name="unit_price[]" class="form-input price-input" step="0.01" required>
                                </div>
                                <button type="button" class="btn btn-danger remove-item-btn mb-1" style="display:none;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <button type="button" id="add-item-btn" class="btn btn-outline mt-2">
                            <i class="fas fa-plus mr-2"></i>Add Item
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <div>
                            <label class="form-label">Total Amount</label>
                            <input type="text" id="order-total" class="form-input bg-gray-100" readonly>
                        </div>
                        ${Components.input('advance_amount', 'Advance Amount', 'number', { value: order?.advance_amount || '0' })}
                    </div>

                    ${Components.textarea('notes', 'Notes', { value: order?.notes || '' })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="order-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'} Order
                </button>
            `
        });

        // Bind events
        this.bindOrderFormEvents();

        // Form submit
        document.getElementById('order-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveOrder(e.target, order?.id);
            modal.close();
        });
    },

    bindOrderFormEvents() {
        const container = document.getElementById('order-items-container');

        // Add item button
        document.getElementById('add-item-btn').addEventListener('click', () => {
            const firstRow = container.querySelector('.order-item-row');
            const newRow = firstRow.cloneNode(true);
            newRow.querySelector('.product-select').value = '';
            newRow.querySelector('.qty-input').value = 1;
            newRow.querySelector('.price-input').value = '';
            newRow.querySelector('.remove-item-btn').style.display = 'block';
            container.appendChild(newRow);
            this.bindRowEvents(newRow);
        });

        // Bind events on first row
        this.bindRowEvents(container.querySelector('.order-item-row'));
    },

    bindRowEvents(row) {
        const productSelect = row.querySelector('.product-select');
        const priceInput = row.querySelector('.price-input');
        const qtyInput = row.querySelector('.qty-input');
        const removeBtn = row.querySelector('.remove-item-btn');

        // Product change - auto-fill price
        productSelect.addEventListener('change', () => {
            const option = productSelect.selectedOptions[0];
            if (option && option.dataset.price) {
                priceInput.value = option.dataset.price;
            }
            this.calculateTotal();
        });

        // Quantity change
        qtyInput.addEventListener('input', () => this.calculateTotal());
        priceInput.addEventListener('input', () => this.calculateTotal());

        // Remove button
        removeBtn.addEventListener('click', () => {
            row.remove();
            this.calculateTotal();
        });
    },

    calculateTotal() {
        const rows = document.querySelectorAll('.order-item-row');
        let total = 0;

        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
            const price = parseFloat(row.querySelector('.price-input').value) || 0;
            total += qty * price;
        });

        document.getElementById('order-total').value = Utils.formatCurrency(total);
    },

    async saveOrder(form, orderId = null) {
        const formData = new FormData(form);

        // Build items array
        const items = [];
        const productIds = formData.getAll('product_id[]');
        const quantities = formData.getAll('quantity[]');
        const prices = formData.getAll('unit_price[]');

        for (let i = 0; i < productIds.length; i++) {
            if (!productIds[i]) continue;

            const [type, id] = productIds[i].split('-');
            const allProducts = [...this.products, ...this.stockItems];
            const product = allProducts.find(p => p.id == id);

            items.push({
                id: parseInt(id),
                type: type,
                name: product?.name || 'Unknown',
                quantity: parseFloat(quantities[i]),
                price: parseFloat(prices[i])
            });
        }

        const data = {
            customer_name: formData.get('customer_name'),
            customer_phone: formData.get('customer_phone'),
            order_date: formData.get('order_date'),
            delivery_date: formData.get('delivery_date'),
            advance_amount: parseFloat(formData.get('advance_amount')) || 0,
            notes: formData.get('notes'),
            items
        };

        try {
            Utils.showLoading();
            const response = await API.orders.create(data);
            Utils.hideLoading();
            Components.toast('Order created successfully!', 'success');

            // Print advance receipt if any advance was paid
            if (response.data?.advance_amount > 0) {
                await this.printPaymentReceipt(response.data, response.data.advance_amount, 'Advance Payment');
            }

            this.loadOrders();
        } catch (error) {
            Utils.hideLoading();
            Components.toast(error.message, 'error');
        }
    },

    async viewOrder(orderId) {
        try {
            const response = await API.orders.get(orderId);
            const order = response.data;

            Components.modal({
                title: `Order ${order.order_number}`,
                size: 'md',
                content: `
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <p class="text-sm text-gray-500">Customer</p>
                                <p class="font-medium">${Utils.escapeHtml(order.customer_name)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Phone</p>
                                <p class="font-medium">${order.customer_phone || '-'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Order Date</p>
                                <p class="font-medium">${Utils.formatDate(order.order_date)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Status</p>
                                <span class="badge ${Utils.getStatusBadgeClass(order.status)}">${Utils.capitalize(order.status)}</span>
                            </div>
                        </div>

                        <div class="border-t pt-4">
                            <h4 class="font-medium mb-2">Items</h4>
                            <table class="data-table">
                                <thead>
                                    <tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr>
                                </thead>
                                <tbody>
                                    ${order.items.map(item => `
                                        <tr>
                                            <td>${Utils.escapeHtml(item.item_name)}</td>
                                            <td class="text-right">${item.quantity}</td>
                                            <td class="text-right">${Utils.formatCurrency(item.unit_price)}</td>
                                            <td class="text-right">${Utils.formatCurrency(item.total_price)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div class="border-t pt-4 space-y-2">
                            <div class="flex justify-between"><span>Total</span><span class="font-bold">${Utils.formatCurrency(order.total_amount)}</span></div>
                            <div class="flex justify-between text-green-600"><span>Advance Paid</span><span>${Utils.formatCurrency(order.advance_amount)}</span></div>
                            <div class="flex justify-between text-red-600"><span>Balance Due</span><span class="font-bold">${Utils.formatCurrency(order.balance_amount)}</span></div>
                        </div>
                    </div>
                `
            });
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    async updateStatus(orderId, currentStatus) {
        const nextStatus = {
            'pending': 'in_progress',
            'in_progress': 'ready',
            'ready': 'completed'
        };

        const newStatus = nextStatus[currentStatus];
        if (!newStatus) return;

        // Keep a reference to current order data for receipt calculations
        const existingOrder = this.orders.find(o => o.id === orderId);
        const previousBalance = existingOrder ? parseFloat(existingOrder.balance_amount) || 0 : 0;

        try {
            const response = await API.orders.updateStatus(orderId, newStatus);
            Components.toast(`Order marked as ${newStatus.replace('_', ' ')}`, 'success');

            // If completed, print completion receipt (balance payment)
            if (newStatus === 'completed') {
                const orderData = response.data;
                const paidNow = previousBalance > 0
                    ? previousBalance
                    : parseFloat(orderData.balance_amount) || 0;
                await this.printPaymentReceipt(orderData, paidNow, 'Completion Receipt');
            }

            this.loadOrders();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    async addPayment(orderId) {
        Components.modal({
            title: 'Add Payment',
            size: 'sm',
            content: `
                <form id="payment-form" class="space-y-3">
                    ${Components.input('amount', 'Payment Amount', 'number', { required: true })}
                    <p class="text-xs text-gray-500">A receipt will be printed after saving.</p>
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="payment-form" class="btn btn-primary">Add Payment</button>
            `
        });

        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amount').value);

            try {
                const response = await API.orders.addPayment(orderId, amount);
                Components.closeModal();
                Components.toast('Payment added successfully!', 'success');

                // Print receipt (balance/advance)
                const paymentType = response.data?.balance_amount === 0 ? 'Balance Payment' : 'Additional Payment';
                await this.printPaymentReceipt(response.data, amount, paymentType);

                this.loadOrders();
            } catch (error) {
                Components.toast(error.message, 'error');
            }
        });
    },

    async printPaymentReceipt(orderData, paidAmount, paymentType = 'Payment') {
        if (!orderData) return;

        // Ensure we have items; fetch full order if needed
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            try {
                const details = await API.orders.get(orderData.order_id || orderData.id);
                orderData = details.data;
            } catch (e) {
                // continue with what we have
            }
        }

        const paidNow = parseFloat(paidAmount) || parseFloat(orderData.last_payment) || parseFloat(orderData.advance_amount) || 0;

        const company = App.company || {};
        const companyName = Utils.escapeHtml(company.name || 'Bakery POS');
        const companyAddress = company.address ? Utils.escapeHtml(company.address).replace(/\n/g, '<br>') : '';
        const companyContact = [company.phone, company.email].filter(Boolean).join(' | ');
        const now = new Date();
        const fmt = (v) => (parseFloat(v) || 0).toFixed(2);

        const items = orderData.items || [];
        const totalAmount = parseFloat(orderData.total_amount) || 0;
        const totalPaid = parseFloat(orderData.advance_amount) || 0;
        const balance = totalAmount - totalPaid;

        const receiptWindow = window.open('', '_blank', 'width=320,height=700');
        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${paymentType} Receipt</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-weight: bold; width: 80mm; margin: 0; padding: 10px; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 8px 0; }
                    table { width: 100%; font-size: 12px; }
                    .right { text-align: right; }
                    .total { font-size: 14px; font-weight: bold; }
                    td { padding: 2px 2px; overflow: hidden; }
                </style>
            </head>
            <body>
                <div class="center bold" style="margin-bottom:6px;">${companyName}</div>
                ${companyAddress ? `<div class="center" style="font-size: 11px; margin-bottom:4px;">${companyAddress}</div>` : ''}
                ${companyContact ? `<div class="center" style="font-size: 11px; margin-bottom:6px;">${Utils.escapeHtml(companyContact)}</div>` : ''}
                <div class="divider"></div>
                <div style="font-size: 11px; margin-bottom:8px;">
                    Receipt: ${paymentType}<br>
                    Order: ${orderData.order_number}<br>
                    Customer: ${Utils.escapeHtml(orderData.customer_name || '')}<br>
                    Date: ${now.toLocaleString()}
                </div>
                <div class="divider"></div>
                <table style="table-layout: fixed; width:100%;">
                    <colgroup>
                        <col style="width:45%;">
                        <col style="width:12%;">
                        <col style="width:18%;">
                        <col style="width:25%;">
                    </colgroup>
                    <tr>
                        <td>Item</td>
                        <td class="right">Qty</td>
                        <td class="right">Unit</td>
                        <td class="right">Amount</td>
                    </tr>
                </table>
                <div class="divider"></div>
                <table style="table-layout: fixed; width:100%;">
                    <colgroup>
                        <col style="width:45%;">
                        <col style="width:12%;">
                        <col style="width:18%;">
                        <col style="width:25%;">
                    </colgroup>
                    ${items.map(item => {
                        const qty = parseFloat(item.quantity) || 0;
                        const unit = parseFloat(item.unit_price) || parseFloat(item.price) || 0;
                        const lineTotal = qty * unit;
                        return `
                        <tr>
                            <td>${Utils.escapeHtml(item.item_name)}</td>
                            <td class="right">${qty}</td>
                            <td class="right">${fmt(unit)}</td>
                            <td class="right">${fmt(lineTotal)}</td>
                        </tr>
                        `;
                    }).join('')}
                </table>
                <div class="divider"></div>
                <table>
                    <tr><td>Order Total</td><td class="right">${fmt(totalAmount)}</td></tr>
                    ${paymentType === 'Completion Receipt' ? '' : `<tr><td>Paid Now (${paymentType})</td><td class="right">${fmt(paidNow)}</td></tr>`}
                    ${paymentType === 'Advance Payment' ? '' : `<tr><td>Total Paid</td><td class="right">${fmt(totalPaid)}</td></tr>`}
                    <tr class="total"><td>Balance</td><td class="right">${fmt(balance)}</td></tr>
                </table>
                <div class="divider"></div>
                <div class="center" style="font-size: 11px;">Thank you!</div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        receiptWindow.document.close();
    }
};
