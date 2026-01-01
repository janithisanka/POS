/**
 * Dashboard Page
 */

const DashboardPage = {
    async render() {
        return `
            <div id="dashboard-content">
                ${Components.spinner()}
            </div>
        `;
    },

    async init() {
        try {
            const [dashboardData, pendingOrders] = await Promise.all([
                API.reports.dashboard(),
                API.orders.getPending(5)
            ]);

            this.renderDashboard(dashboardData.data, pendingOrders.data);
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderDashboard(data, pendingData) {
        const container = document.getElementById('dashboard-content');

        const today = data.today || {};
        const month = data.month || {};
        const pendingCount = data.pending_orders || 0;
        const pendingOrders = pendingData.orders || [];
        const company = App.company || {};
        const companyName = Utils.escapeHtml(company.name || 'Bakery POS');
        const companyAddress = company.address ? `<p class="text-sm text-gray-500 whitespace-pre-line">${Utils.escapeHtml(company.address)}</p>` : '';
        const contactParts = [];
        if (company.phone) contactParts.push(Utils.escapeHtml(company.phone));
        if (company.email) contactParts.push(Utils.escapeHtml(company.email));
        const companyContact = contactParts.length ? `<p class="text-sm text-gray-500">${contactParts.join(' | ')}</p>` : '';
        const showTax = company.tax_rate !== null && company.tax_rate !== undefined && company.tax_rate !== '' && company.tax_rate !== 0;
        const companyCard = `
            <div class="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p class="text-xs uppercase text-gray-500 tracking-wide">Company</p>
                    <h3 class="text-lg font-semibold text-gray-800 mt-1">${companyName}</h3>
                    ${companyAddress}
                    ${companyContact}
                </div>
                <div class="text-sm text-gray-500 mt-3 sm:mt-0 sm:text-right">
                    <p>Currency: <span class="text-gray-800 font-medium">${Utils.escapeHtml(company.currency || 'Rs.')}</span></p>
                    ${showTax ? `<p>Tax Rate: <span class="text-gray-800 font-medium">${company.tax_rate}%</span></p>` : ''}
                    <a href="#" data-page="company" class="text-primary-600 font-medium inline-flex items-center mt-2">
                        <i class="fas fa-pen mr-2"></i>Update Details
                    </a>
                </div>
            </div>
        `;

        container.innerHTML = `
            <!-- Company Overview -->
            ${companyCard}

            <!-- Pending Orders Alert -->
            ${pendingCount > 0 ? `
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <div class="flex items-start justify-between">
                        <div>
                            <h4 class="font-semibold text-red-800 flex items-center">
                                <i class="fas fa-bell mr-2"></i>
                                You have ${pendingCount} pending order${pendingCount > 1 ? 's' : ''}!
                            </h4>
                            <ul class="mt-2 space-y-1">
                                ${pendingOrders.slice(0, 3).map(order => `
                                    <li class="text-sm text-red-700">
                                        <strong>${order.order_number}</strong> - ${Utils.escapeHtml(order.customer_name)}
                                        <span class="text-red-500">(${Utils.formatDate(order.order_date)})</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <a href="#" data-page="orders" class="btn btn-outline text-red-600 border-red-300 hover:bg-red-100">
                            <i class="fas fa-eye mr-2"></i> View Orders
                        </a>
                    </div>
                </div>
            ` : ''}

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                ${Components.statCard('fa-money-bill-wave', Utils.formatCurrency(today.sales), "Today's Sales", 'green')}
                ${Components.statCard('fa-receipt', today.bills || 0, "Today's Bills", 'blue')}
                ${Components.statCard('fa-box', today.items_sold || 0, 'Items Sold Today', 'yellow')}
                ${Components.statCard('fa-calendar-alt', Utils.formatCurrency(month.sales), 'This Month', 'purple')}
            </div>

            <!-- Quick Actions -->
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <a href="#" data-page="pos" class="card-hover bg-white rounded-xl p-6 text-center">
                    <div class="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-cash-register text-2xl text-primary-600"></i>
                    </div>
                    <p class="font-medium text-gray-800">POS Billing</p>
                </a>
                <a href="#" data-page="orders" class="card-hover bg-white rounded-xl p-6 text-center">
                    <div class="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-clipboard-list text-2xl text-blue-600"></i>
                    </div>
                    <p class="font-medium text-gray-800">New Order</p>
                </a>
                <a href="#" data-page="stock" class="card-hover bg-white rounded-xl p-6 text-center">
                    <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-plus-circle text-2xl text-green-600"></i>
                    </div>
                    <p class="font-medium text-gray-800">Add Stock</p>
                </a>
                <a href="#" data-page="reports" class="card-hover bg-white rounded-xl p-6 text-center">
                    <div class="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-chart-bar text-2xl text-purple-600"></i>
                    </div>
                    <p class="font-medium text-gray-800">View Reports</p>
                </a>
            </div>

            <!-- Modules Grid -->
            <h3 class="text-lg font-semibold text-gray-800 mb-4">All Modules</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <a href="#" data-page="users" class="card-hover bg-white rounded-xl p-6 text-center">
                    <i class="fas fa-users text-3xl text-gray-400 mb-3"></i>
                    <p class="font-medium text-gray-700">Users</p>
                </a>
                <a href="#" data-page="products" class="card-hover bg-white rounded-xl p-6 text-center">
                    <i class="fas fa-boxes-stacked text-3xl text-gray-400 mb-3"></i>
                    <p class="font-medium text-gray-700">Products</p>
                </a>
                <a href="#" data-page="stock" class="card-hover bg-white rounded-xl p-6 text-center">
                    <i class="fas fa-warehouse text-3xl text-gray-400 mb-3"></i>
                    <p class="font-medium text-gray-700">Inventory</p>
                </a>
                <a href="#" data-page="suppliers" class="card-hover bg-white rounded-xl p-6 text-center">
                    <i class="fas fa-truck text-3xl text-gray-400 mb-3"></i>
                    <p class="font-medium text-gray-700">Suppliers</p>
                </a>
            </div>
        `;

        // Bind navigation links
        container.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                App.navigateTo(link.dataset.page);
            });
        });
    }
};
