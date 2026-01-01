/**
 * POS (Point of Sale) Page
 */

const POSPage = {
    cart: [],
    products: [],
    stockItems: [],
    discount: 0,
    activeCategory: 'all',
    qtyStep: 1, // integer step for double-tap increments

    async render() {
        return `
            <div class="flex flex-col lg:flex-row gap-6 h-[calc(100vh-130px)]">
                <!-- Products Grid -->
                <div class="lg:w-2/3 flex flex-col">
                    <!-- Category Tabs -->
                    <div class="flex space-x-2 mb-4 overflow-x-auto pb-2">
                        <button class="category-btn active" data-category="all">All</button>
                        <button class="category-btn" data-category="bakery">Bakery</button>
                        <button class="category-btn" data-category="other">Other Items</button>
                    </div>

                    <!-- Search -->
                    <div class="relative mb-4">
                        <input type="text" id="pos-search" placeholder="Search products..."
                            class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>

                    <!-- Products Grid -->
                    <div id="pos-products" class="flex-1 overflow-y-auto">
                        ${Components.spinner()}
                    </div>
                </div>

                <!-- Cart -->
                <div class="lg:w-1/3 bg-white rounded-xl shadow-sm flex flex-col">
                    <div class="p-4 border-b">
                        <h3 class="font-semibold text-gray-800">
                            <i class="fas fa-shopping-cart mr-2"></i>Cart
                            <span id="cart-count" class="ml-2 bg-primary-100 text-primary-600 px-2 py-1 rounded-full text-sm">0</span>
                        </h3>
                    </div>

                    <div id="cart-items" class="flex-1 overflow-y-auto p-4">
                        <div class="empty-state">
                            <i class="fas fa-shopping-basket"></i>
                            <p>Cart is empty</p>
                        </div>
                    </div>

                    <!-- Cart Footer -->
                    <div class="border-t p-4 space-y-3">
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-500">Subtotal</span>
                            <span id="cart-subtotal" class="font-medium">Rs. 0.00</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-gray-500 text-sm">Discount %</span>
                            <input type="number" id="discount-input" min="0" max="100" value="0"
                                class="w-20 px-2 py-1 border rounded text-center">
                            <span id="discount-amount" class="text-red-500 text-sm">- Rs. 0.00</span>
                        </div>
                        <div class="flex justify-between text-lg font-bold border-t pt-3">
                            <span>Total</span>
                            <span id="cart-total" class="text-primary-600">Rs. 0.00</span>
                        </div>

                        <button id="print-bill-btn" class="btn btn-primary w-full py-3" disabled>
                            <i class="fas fa-print mr-2"></i>Print Bill
                        </button>
                        <button id="clear-cart-btn" class="btn btn-outline w-full">
                            <i class="fas fa-trash mr-2"></i>Clear Cart
                        </button>
                    </div>
                </div>
            </div>

            <style>
                .category-btn {
                    padding: 0.5rem 1rem;
                    border-radius: 9999px;
                    font-weight: 500;
                    white-space: nowrap;
                    background: white;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                    transition: all 0.2s;
                }
                .category-btn.active {
                    background: #ee6906;
                    color: white;
                    border-color: #ee6906;
                }
                .category-btn:hover:not(.active) {
                    background: #f3f4f6;
                }
            </style>
        `;
    },

    async init() {
        this.cart = [];
        this.discount = 0;

        try {
            const response = await API.pos.getItems();
            this.products = response.data.products || [];
            this.stockItems = response.data.stock_items || [];

            this.renderProducts();
            this.bindEvents();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderProducts() {
        const container = document.getElementById('pos-products');
        let items = [];

        if (this.activeCategory === 'all' || this.activeCategory === 'bakery') {
            items = [...items, ...this.products.map(p => ({ ...p, type: 'product' }))];
        }
        if (this.activeCategory === 'all' || this.activeCategory === 'other') {
            items = [...items, ...this.stockItems.map(s => ({ ...s, type: 'stock_item' }))];
        }

        // Apply search filter
        const searchTerm = document.getElementById('pos-search')?.value?.toLowerCase() || '';
        if (searchTerm) {
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                (item.brand_name && item.brand_name.toLowerCase().includes(searchTerm))
            );
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No products found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="pos-grid">
                ${items.map(item => this.renderProductCard(item)).join('')}
            </div>
        `;

        // Bind click events
        container.querySelectorAll('.pos-item').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                const type = el.dataset.type;
                const stock = parseFloat(el.dataset.stock);

                if (stock <= 0) {
                    Components.toast('Out of stock!', 'warning');
                    return;
                }

                this.addToCart(id, type);
            });
        });
    },

    renderProductCard(item) {
        const inStock = (item.stock || 0) > 0;
        const price = item.current_price || item.price;

        return `
            <div class="pos-item ${!inStock ? 'out-of-stock' : ''}"
                 data-id="${item.id}" data-type="${item.type}" data-stock="${item.stock || 0}">
                <div class="item-image">
                    ${item.image
                        ? `<img src="images/${item.image}" alt="${Utils.escapeHtml(item.name)}">`
                        : `<i class="fas ${item.type === 'product' ? 'fa-birthday-cake' : 'fa-box'}"></i>`
                    }
                </div>
                <p class="font-medium text-sm text-gray-800 truncate">${Utils.escapeHtml(item.name)}</p>
                ${item.brand_name ? `<p class="text-xs text-gray-500">${Utils.escapeHtml(item.brand_name)}</p>` : ''}
                <p class="font-bold text-primary-600 mt-1">${Utils.formatCurrency(price)}</p>
                <p class="text-xs ${inStock ? 'text-green-600' : 'text-red-600'}">
                    ${inStock ? `Stock: ${item.stock}` : 'Out of Stock'}
                </p>
            </div>
        `;
    },

    addToCart(itemId, itemType) {
        const source = itemType === 'product' ? this.products : this.stockItems;
        const item = source.find(i => i.id === itemId);

        if (!item) return;
        const availableStock = parseFloat(item.stock || 0);
        if (availableStock <= 0) {
            Components.toast('Out of stock!', 'warning');
            return;
        }

        const existingIndex = this.cart.findIndex(c => c.id === itemId && c.type === itemType);

        if (existingIndex >= 0) {
            // Check stock for fractional increments
            const currentQty = this.cart[existingIndex].quantity;
            const nextQty = currentQty + this.qtyStep;
            if (nextQty - availableStock > 1e-6) {
                Components.toast('Not enough stock!', 'warning');
                return;
            }
            this.cart[existingIndex].quantity = parseFloat(nextQty.toFixed(3));
        } else {
            const initialQty = Math.min(this.qtyStep, availableStock);
            this.cart.push({
                id: item.id,
                type: itemType,
                name: item.name,
                price: parseFloat(item.current_price || item.price || 0),
                quantity: parseFloat(initialQty.toFixed(3)),
                maxStock: availableStock
            });
        }

        this.updateCart();
    },

    updateCart() {
        const container = document.getElementById('cart-items');
        const countEl = document.getElementById('cart-count');
        const subtotalEl = document.getElementById('cart-subtotal');
        const discountAmountEl = document.getElementById('discount-amount');
        const totalEl = document.getElementById('cart-total');
        const printBtn = document.getElementById('print-bill-btn');

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Cart is empty</p>
                </div>
            `;
            countEl.textContent = '0';
            subtotalEl.textContent = 'Rs. 0.00';
            discountAmountEl.textContent = '- Rs. 0.00';
            totalEl.textContent = 'Rs. 0.00';
            printBtn.disabled = true;
            return;
        }

        container.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item flex-col gap-2">
                <div class="flex items-start gap-3 w-full">
                    <div class="flex-1 double-tap-zone" data-index="${index}">
                        <p class="font-medium text-sm">${Utils.escapeHtml(item.name)}</p>
                        <p class="text-sm text-primary-600">${Utils.formatCurrency(item.price)}</p>
                        <p class="text-xs text-gray-500 mt-1">Double-tap here to add 1 (whole units)</p>
                    </div>
                    <div class="text-center">
                        <p class="text-xs text-gray-500 mb-1">Qty</p>
                        <p class="font-semibold">${this.formatQty(item.quantity)}</p>
                    </div>
                    <div class="ml-3 text-right">
                        <p class="font-medium">${Utils.formatCurrency(item.price * item.quantity)}</p>
                        <button class="text-red-500 text-sm hover:text-red-700" data-action="remove" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="w-full pl-1">
                    <p class="text-xs text-gray-500 mb-1">Add fractional quantity (e.g., 0.5, 1.5)</p>
                    <div class="flex items-center gap-2 flex-wrap">
                        <input type="number" step="0.1" min="0.1" placeholder="0.5" class="w-20 px-2 py-1 border rounded text-center fractional-input" data-index="${index}">
                        <button class="btn btn-outline btn-sm" data-action="add-decimal" data-index="${index}">Apply</button>
                        <button class="btn btn-outline btn-sm" data-action="add-half" data-index="${index}">+0.5</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Calculate totals with rounding to avoid float drift
        const subtotal = this.round(
            this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            2
        );
        const discountAmount = this.round(subtotal * (this.discount / 100), 2);
        const total = this.round(subtotal - discountAmount, 2);

        const itemCount = this.round(this.cart.reduce((sum, item) => sum + item.quantity, 0), 3);
        countEl.textContent = itemCount.toString();
        subtotalEl.textContent = Utils.formatCurrency(subtotal);
        discountAmountEl.textContent = `- ${Utils.formatCurrency(discountAmount)}`;
        totalEl.textContent = Utils.formatCurrency(total);
        printBtn.disabled = false;

        // Bind remove buttons
        container.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.handleCartAction('remove', index);
            });
        });

        // Bind double-tap (dblclick) for integer increments
        container.querySelectorAll('.double-tap-zone').forEach(zone => {
            const index = parseInt(zone.dataset.index);
            let lastTap = 0;
            zone.addEventListener('dblclick', () => this.handleCartAction('doubletap', index));
            zone.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTap < 300) {
                    e.preventDefault();
                    this.handleCartAction('doubletap', index);
                }
                lastTap = now;
            });
        });

        // Bind fractional input apply
        container.querySelectorAll('[data-action="add-decimal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const input = container.querySelector(`.fractional-input[data-index="${index}"]`);
                let value = parseFloat(input.value);
                if (isNaN(value) || value <= 0) {
                    Components.toast('Enter a valid fractional amount', 'warning');
                    return;
                }
                value = this.round(value, 3);
                const max = this.cart[index].maxStock || Infinity;
                const newQty = this.cart[index].quantity + value;
                if (newQty - max > 1e-6) {
                    Components.toast('Not enough stock for that amount', 'warning');
                    return;
                }
                this.cart[index].quantity = parseFloat(newQty.toFixed(3));
                input.value = '';
                this.updateCart();
            });
        });

        // Bind quick +0.5 button
        container.querySelectorAll('[data-action="add-half"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const increment = 0.5;
                const max = this.cart[index].maxStock || Infinity;
                const newQty = this.cart[index].quantity + increment;
                if (newQty - max > 1e-6) {
                    Components.toast('Not enough stock for that amount', 'warning');
                    return;
                }
                this.cart[index].quantity = parseFloat(this.round(newQty, 3));
                this.updateCart();
            });
        });
    },

    handleCartAction(action, index) {
        const step = this.qtyStep;
        if (action === 'doubletap') {
            const next = this.cart[index].quantity + step;
            if (next - (this.cart[index].maxStock || 0) > 1e-6) {
                Components.toast('Not enough stock!', 'warning');
            } else {
                this.cart[index].quantity = parseFloat(next.toFixed(3));
            }
        } else if (action === 'remove') {
            this.cart.splice(index, 1);
        }
        this.updateCart();
    },

    formatQty(value) {
        const fixed = parseFloat((value || 0).toFixed(3));
        return fixed % 1 === 0 ? fixed.toString() : fixed.toString();
    },

    round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round((parseFloat(value) || 0) * factor) / factor;
    },

    bindEvents() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeCategory = btn.dataset.category;
                this.renderProducts();
            });
        });

        // Search
        document.getElementById('pos-search').addEventListener('input',
            Utils.debounce(() => this.renderProducts(), 300)
        );

        // Discount input
        document.getElementById('discount-input').addEventListener('input', (e) => {
            this.discount = parseFloat(e.target.value) || 0;
            if (this.discount > 100) this.discount = 100;
            if (this.discount < 0) this.discount = 0;
            e.target.value = this.discount;
            this.updateCart();
        });

        // Clear cart
        document.getElementById('clear-cart-btn').addEventListener('click', () => {
            if (this.cart.length === 0) return;
            this.cart = [];
            this.discount = 0;
            document.getElementById('discount-input').value = 0;
            this.updateCart();
            Components.toast('Cart cleared', 'info');
        });

        // Print bill
        document.getElementById('print-bill-btn').addEventListener('click', () => this.processBill());
    },

    async processBill() {
        if (this.cart.length === 0) return;

        try {
            Utils.showLoading();

            const items = this.cart.map(item => ({
                id: item.id,
                type: item.type,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            const response = await API.pos.createBill({
                items,
                discount: this.discount
            });

            Utils.hideLoading();

            if (response.success) {
                Components.toast('Bill created successfully!', 'success');
                this.printReceipt(response.data);

                // Clear cart and refresh products
                this.cart = [];
                this.discount = 0;
                document.getElementById('discount-input').value = 0;
                this.updateCart();
                this.init(); // Refresh products to update stock
            }
        } catch (error) {
            Utils.hideLoading();
            Components.toast(error.message, 'error');
        }
    },

    printReceipt(billData) {
        const receiptWindow = window.open('', '_blank', 'width=300,height=600');
        const items = billData.items || [];
        const company = App.company || {};
        const companyName = Utils.escapeHtml(company.name || 'Bakery POS');
        const companyAddress = company.address ? Utils.escapeHtml(company.address).replace(/\n/g, '<br>') : '';
        const companyContact = [company.phone, company.email].filter(Boolean).join(' | ');
        const receiptFooter = company.receipt_footer
            ? Utils.escapeHtml(company.receipt_footer).replace(/\n/g, '<br>')
            : 'Thank you for your purchase!';
        const fmt = (v) => (parseFloat(v) || 0).toFixed(2);

        receiptWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt</title>
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
                    Bill No: ${billData.bill_number}<br>
                    Date: ${new Date().toLocaleString()}
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
                        const unit = parseFloat(item.unit_price) || 0;
                        const lineTotal = qty * unit;
                        return `
                        <tr>
                            <td>${item.item_name || item.name}</td>
                            <td class="right">${qty}</td>
                            <td class="right">${fmt(unit)}</td>
                            <td class="right">${fmt(lineTotal)}</td>
                        </tr>
                        `;
                    }).join('')}
                </table>
                <div class="divider"></div>
                <table>
                    <tr><td>Subtotal</td><td class="right">${fmt(parseFloat(billData.subtotal))}</td></tr>
                    <tr><td>Discount</td><td class="right">-${fmt(parseFloat(billData.discount_amount))}</td></tr>
                    <tr class="total"><td>TOTAL</td><td class="right">${fmt(parseFloat(billData.total))}</td></tr>
                </table>
                <div class="divider"></div>
                <div class="center" style="font-size: 11px;">${receiptFooter}</div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        receiptWindow.document.close();
    }
};
