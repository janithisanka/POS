/**
 * Main Application
 * Bakery POS Modern
 */

const App = {
    currentPage: 'dashboard',
    company: null,
    pages: {
        dashboard: DashboardPage,
        pos: POSPage,
        orders: OrdersPage,
        products: ProductsPage,
        stock: StockPage,
        users: UsersPage,
        suppliers: SuppliersPage,
        reports: ReportsPage,
        company: CompanyPage
    },

    pageTitles: {
        dashboard: 'Dashboard',
        pos: 'POS Billing',
        orders: 'Orders',
        products: 'Products',
        stock: 'Inventory',
        users: 'Users',
        suppliers: 'Suppliers',
        reports: 'Reports',
        company: 'Company'
    },

    async init() {
        await this.loadCompanyDetails();

        // Check if logged in
        const token = API.getToken();
        const user = API.getUser();

        if (token && user) {
            this.showApp(user);
        } else {
            this.showLogin();
        }

        // Bind login form
        this.bindLoginForm();

        // Bind logout
        this.bindLogout();

        // Bind mobile menu
        this.bindMobileMenu();

        // Bind navigation
        this.bindNavigation();

        // Check for pending orders periodically
        this.startOrderCheck();
    },

    showLogin() {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        this.applyCompanyBranding();
    },

    showApp(user) {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');

        this.applyCompanyBranding();

        // Set user info
        document.getElementById('user-name').textContent = `${user.first_name} ${user.last_name}`;
        document.getElementById('user-role').textContent = user.position_name || 'User';

        // Load default page
        this.navigateTo('dashboard');
    },

    bindLoginForm() {
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');

            try {
                Utils.showLoading();
                const response = await API.auth.login(username, password);

                if (response.success) {
                    API.setToken(response.data.token);
                    API.setUser(response.data.user);
                    Utils.hideLoading();
                    this.showApp(response.data.user);
                    Components.toast('Welcome back!', 'success');
                }
            } catch (error) {
                Utils.hideLoading();
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('hidden');
            }
        });
    },

    bindLogout() {
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await API.auth.logout();
            } catch (e) {
                // Ignore logout errors
            }

            API.removeToken();
            API.removeUser();
            this.showLogin();
            Components.toast('Logged out successfully', 'info');
        });
    },

    bindMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const menuBtn = document.getElementById('mobile-menu-btn');

        menuBtn.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    },

    bindNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);

                // Close mobile menu
                document.getElementById('sidebar').classList.add('-translate-x-full');
                document.getElementById('sidebar-overlay').classList.add('hidden');
            });
        });
    },

    async navigateTo(page) {
        if (!this.pages[page]) {
            Components.toast('Page not found', 'error');
            return;
        }

        this.currentPage = page;

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-gray-800', 'text-white');
            link.classList.add('text-gray-300', 'hover:bg-gray-800', 'hover:text-white');

            if (link.dataset.page === page) {
                link.classList.add('bg-gray-800', 'text-white');
                link.classList.remove('text-gray-300', 'hover:bg-gray-800', 'hover:text-white');
            }
        });

        // Update page title
        document.getElementById('page-title').textContent = this.pageTitles[page] || 'Page';

        // Load page content
        const pageContent = document.getElementById('page-content');
        const pageHandler = this.pages[page];

        try {
            // Render page HTML
            pageContent.innerHTML = await pageHandler.render();

            // Initialize page
            if (pageHandler.init) {
                await pageHandler.init();
            }
        } catch (error) {
            console.error('Page load error:', error);
            pageContent.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle text-red-500"></i>
                        <p>Failed to load page</p>
                        <button onclick="App.navigateTo('${page}')" class="btn btn-primary mt-4">
                            <i class="fas fa-redo mr-2"></i>Retry
                        </button>
                    </div>
                </div>
            `;
        }
    },

    async loadCompanyDetails() {
        try {
            const response = API.company?.get
                ? await API.company.get()
                : await API.get('/company');
            this.setCompany(response.data);
        } catch (error) {
            // Keep defaults if company data fails to load
            console.warn('Failed to load company details', error);
        }
    },

    setCompany(data) {
        this.company = data;
        window.COMPANY_SETTINGS = data;
        this.applyCompanyBranding();
    },

    applyCompanyBranding() {
        const name = this.company?.name || 'Bakery POS';
        const tagline = this.company?.tagline || '';
        const logo = this.company?.logo ? `images/${this.company.logo}` : '';

        document.title = `${name} - POS`;

        document.querySelectorAll('[data-company-name]').forEach(el => {
            el.textContent = name;
        });
        document.querySelectorAll('[data-company-tagline]').forEach(el => {
            el.textContent = tagline;
        });

        const loginContact = document.getElementById('company-contact-login');
        if (loginContact) {
            loginContact.textContent = '';
            loginContact.classList.add('hidden');
        }

        // Logo handling
        const logoTargets = [
            { img: document.getElementById('company-logo-login'), fallback: document.querySelector('#company-logo-login + .fallback-logo') },
            { img: document.getElementById('company-logo-sidebar'), fallback: document.querySelector('#company-logo-sidebar + .fallback-logo') },
        ];

        logoTargets.forEach(target => {
            if (!target.img || !target.fallback) return;

            if (logo) {
                target.img.src = logo;
                target.img.classList.remove('hidden');
                target.fallback.classList.add('hidden');
            } else {
                target.img.src = '';
                target.img.classList.add('hidden');
                target.fallback.classList.remove('hidden');
            }
        });
    },

    async startOrderCheck() {
        // Check for pending orders every 60 seconds
        const checkOrders = async () => {
            try {
                const response = await API.orders.getPending(10);
                const count = response.data?.count || 0;
                const badge = document.getElementById('order-badge');

                if (count > 0) {
                    badge.textContent = count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            } catch (e) {
                // Silently fail
            }
        };

        // Initial check
        if (API.getToken()) {
            await checkOrders();
        }

        // Periodic check
        setInterval(() => {
            if (API.getToken()) {
                checkOrders();
            }
        }, 60000);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
