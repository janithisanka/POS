/**
 * Reports Page
 */

const ReportsPage = {
    activeReport: 'daily',

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Reports & Analytics</h2>
                        <p class="text-sm text-gray-500">View sales, stock, and business insights</p>
                    </div>
                </div>

                <!-- Report Tabs -->
                <div id="report-tabs"></div>

                <!-- Report Content -->
                <div id="report-content">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        this.renderTabs();
        await this.loadReport();
    },

    renderTabs() {
        const tabsContainer = document.getElementById('report-tabs');
        tabsContainer.innerHTML = Components.tabs([
            { id: 'daily', label: 'Daily Sales', icon: 'fa-calendar-day' },
            { id: 'monthly', label: 'Monthly Sales', icon: 'fa-calendar-alt' },
            { id: 'stock', label: 'Stock Report', icon: 'fa-warehouse' },
            { id: 'top', label: 'Top Products', icon: 'fa-trophy' }
        ], this.activeReport, async (tab) => {
            this.activeReport = tab;
            this.renderTabs();
            await this.loadReport();
        });
    },

    async loadReport() {
        const container = document.getElementById('report-content');
        container.innerHTML = Components.spinner();

        try {
            switch (this.activeReport) {
                case 'daily':
                    await this.loadDailyReport();
                    break;
                case 'monthly':
                    await this.loadMonthlyReport();
                    break;
                case 'stock':
                    await this.loadStockReport();
                    break;
                case 'top':
                    await this.loadTopProducts();
                    break;
            }
        } catch (error) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle text-red-500"></i>
                        <p>Failed to load report</p>
                    </div>
                </div>
            `;
            Components.toast(error.message, 'error');
        }
    },

    async loadDailyReport() {
        const container = document.getElementById('report-content');
        const today = Utils.getToday();

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm">
                <!-- Filter -->
                <div class="p-4 border-b">
                    <div class="flex items-center gap-4">
                        <input type="date" id="daily-date" class="form-input w-48" value="${today}">
                        <button id="daily-filter-btn" class="btn btn-primary">
                            <i class="fas fa-filter mr-2"></i>Filter
                        </button>
                    </div>
                </div>

                <div id="daily-report-data">
                    ${Components.spinner()}
                </div>
            </div>
        `;

        document.getElementById('daily-filter-btn').addEventListener('click', () => this.fetchDailyData());
        await this.fetchDailyData();
    },

    async fetchDailyData() {
        const date = document.getElementById('daily-date').value;
        const dataContainer = document.getElementById('daily-report-data');

        try {
            const response = await API.reports.dailySales(date);
            const data = response.data;
            const summary = data.summary || {};
            const bills = data.bills || [];

            dataContainer.innerHTML = `
                <!-- Summary Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600">${Utils.formatCurrency(summary.net_sales || 0)}</p>
                        <p class="text-sm text-gray-500">Total Sales</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-blue-600">${summary.total_bills || 0}</p>
                        <p class="text-sm text-gray-500">Total Bills</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-purple-600">${summary.items_sold || 0}</p>
                        <p class="text-sm text-gray-500">Items Sold</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-red-600">${Utils.formatCurrency(summary.total_discount || 0)}</p>
                        <p class="text-sm text-gray-500">Discounts</p>
                    </div>
                </div>

                <!-- Bills Table -->
                ${bills.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Bill #</th>
                                    <th>Time</th>
                                    <th class="text-right">Subtotal</th>
                                    <th class="text-right">Discount</th>
                                    <th class="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bills.map(bill => `
                                    <tr>
                                        <td class="font-medium">${bill.bill_number}</td>
                                        <td>${Utils.formatDate(bill.created_at, 'datetime')}</td>
                                        <td class="text-right">${Utils.formatCurrency(bill.subtotal)}</td>
                                        <td class="text-right text-red-600">${Utils.formatCurrency(bill.discount_amount)}</td>
                                        <td class="text-right font-bold">${Utils.formatCurrency(bill.total)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state py-12">
                        <i class="fas fa-receipt"></i>
                        <p>No sales for this date</p>
                    </div>
                `}
            `;
        } catch (error) {
            dataContainer.innerHTML = `<div class="p-6 text-red-500">Error loading data</div>`;
        }
    },

    async loadMonthlyReport() {
        const container = document.getElementById('report-content');
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm">
                <!-- Filter -->
                <div class="p-4 border-b">
                    <div class="flex items-center gap-4">
                        <select id="monthly-year" class="form-select w-32">
                            ${Array.from({ length: 5 }, (_, i) => currentYear - i).map(y =>
                                `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
                            ).join('')}
                        </select>
                        <select id="monthly-month" class="form-select w-40">
                            ${Array.from({ length: 12 }, (_, i) => i + 1).map(m =>
                                `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>
                                    ${new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                                </option>`
                            ).join('')}
                        </select>
                        <button id="monthly-filter-btn" class="btn btn-primary">
                            <i class="fas fa-filter mr-2"></i>Filter
                        </button>
                    </div>
                </div>

                <div id="monthly-report-data">
                    ${Components.spinner()}
                </div>
            </div>
        `;

        document.getElementById('monthly-filter-btn').addEventListener('click', () => this.fetchMonthlyData());
        await this.fetchMonthlyData();
    },

    async fetchMonthlyData() {
        const year = document.getElementById('monthly-year').value;
        const month = document.getElementById('monthly-month').value;
        const dataContainer = document.getElementById('monthly-report-data');

        try {
            const response = await API.reports.monthlySales(year, month);
            const data = response.data;
            const summary = data.summary || {};
            const dailyData = data.daily_data || [];

            dataContainer.innerHTML = `
                <!-- Summary Cards -->
                <div class="grid grid-cols-3 gap-4 p-6 border-b">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600">${Utils.formatCurrency(summary.total_sales || 0)}</p>
                        <p class="text-sm text-gray-500">Total Sales</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-blue-600">${summary.total_bills || 0}</p>
                        <p class="text-sm text-gray-500">Total Bills</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-purple-600">${Utils.formatCurrency(summary.average_daily || 0)}</p>
                        <p class="text-sm text-gray-500">Daily Average</p>
                    </div>
                </div>

                <!-- Daily Breakdown -->
                ${dailyData.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th class="text-right">Bills</th>
                                    <th class="text-right">Sales</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyData.map(day => `
                                    <tr>
                                        <td>${Utils.formatDate(day.date)}</td>
                                        <td class="text-right">${day.total_bills}</td>
                                        <td class="text-right font-bold">${Utils.formatCurrency(day.net_sales)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state py-12">
                        <i class="fas fa-calendar-times"></i>
                        <p>No sales data for this month</p>
                    </div>
                `}
            `;
        } catch (error) {
            dataContainer.innerHTML = `<div class="p-6 text-red-500">Error loading data</div>`;
        }
    },

    async loadStockReport() {
        const container = document.getElementById('report-content');
        const monthStart = Utils.getMonthStart();
        const today = Utils.getToday();

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm">
                <!-- Filter -->
                <div class="p-4 border-b">
                    <div class="flex items-center gap-4">
                        <input type="date" id="stock-from" class="form-input w-40" value="${monthStart}">
                        <span>to</span>
                        <input type="date" id="stock-to" class="form-input w-40" value="${today}">
                        <button id="stock-filter-btn" class="btn btn-primary">
                            <i class="fas fa-filter mr-2"></i>Filter
                        </button>
                    </div>
                </div>

                <div id="stock-report-data">
                    ${Components.spinner()}
                </div>
            </div>
        `;

        document.getElementById('stock-filter-btn').addEventListener('click', () => this.fetchStockData());
        await this.fetchStockData();
    },

    async fetchStockData() {
        const from = document.getElementById('stock-from').value;
        const to = document.getElementById('stock-to').value;
        const dataContainer = document.getElementById('stock-report-data');

        try {
            const response = await API.reports.stock(from, to);
            const data = response.data;
            const summary = data.summary || {};
            const products = data.products || [];

            dataContainer.innerHTML = `
                <!-- Summary Cards -->
                <div class="grid grid-cols-3 gap-4 p-6 border-b">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-blue-600">${summary.total_added || 0}</p>
                        <p class="text-sm text-gray-500">Total Added</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600">${summary.total_sold || 0}</p>
                        <p class="text-sm text-gray-500">Total Sold</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-orange-600">${summary.total_remaining || 0}</p>
                        <p class="text-sm text-gray-500">Remaining</p>
                    </div>
                </div>

                <!-- Products Table -->
                ${products.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Brand</th>
                                    <th class="text-right">Added</th>
                                    <th class="text-right">Sold</th>
                                    <th class="text-right">Remaining</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(p => `
                                    <tr>
                                        <td class="font-medium">${Utils.escapeHtml(p.product_name)}</td>
                                        <td>${Utils.escapeHtml(p.brand_name || '-')}</td>
                                        <td class="text-right">${p.total_added || 0}</td>
                                        <td class="text-right text-green-600">${p.total_sold || 0}</td>
                                        <td class="text-right font-bold">${p.total_remaining || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state py-12">
                        <i class="fas fa-boxes"></i>
                        <p>No stock data for this period</p>
                    </div>
                `}
            `;
        } catch (error) {
            dataContainer.innerHTML = `<div class="p-6 text-red-500">Error loading data</div>`;
        }
    },

    async loadTopProducts() {
        const container = document.getElementById('report-content');
        const monthStart = Utils.getMonthStart();
        const today = Utils.getToday();

        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-sm">
                <!-- Filter -->
                <div class="p-4 border-b">
                    <div class="flex items-center gap-4">
                        <input type="date" id="top-from" class="form-input w-40" value="${monthStart}">
                        <span>to</span>
                        <input type="date" id="top-to" class="form-input w-40" value="${today}">
                        <button id="top-filter-btn" class="btn btn-primary">
                            <i class="fas fa-filter mr-2"></i>Filter
                        </button>
                    </div>
                </div>

                <div id="top-report-data">
                    ${Components.spinner()}
                </div>
            </div>
        `;

        document.getElementById('top-filter-btn').addEventListener('click', () => this.fetchTopProducts());
        await this.fetchTopProducts();
    },

    async fetchTopProducts() {
        const from = document.getElementById('top-from').value;
        const to = document.getElementById('top-to').value;
        const dataContainer = document.getElementById('top-report-data');

        try {
            const response = await API.reports.topProducts(from, to, 10);
            const products = response.data || [];

            dataContainer.innerHTML = products.length > 0 ? `
                <div class="p-6">
                    <div class="space-y-4">
                        ${products.map((p, index) => `
                            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-600">
                                    ${index + 1}
                                </div>
                                <div class="flex-1">
                                    <p class="font-medium">${Utils.escapeHtml(p.name)}</p>
                                    <p class="text-sm text-gray-500">${p.times_sold} sales</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold text-green-600">${Utils.formatCurrency(p.total_revenue)}</p>
                                    <p class="text-sm text-gray-500">${p.total_quantity} units</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : `
                <div class="empty-state py-12">
                    <i class="fas fa-trophy"></i>
                    <p>No sales data for this period</p>
                </div>
            `;
        } catch (error) {
            dataContainer.innerHTML = `<div class="p-6 text-red-500">Error loading data</div>`;
        }
    }
};
