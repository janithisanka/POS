/**
 * API Client
 * Handles all API communications
 */

const API = {
    baseUrl: '/BakeryPOS-Modern/api',

    // Get stored token
    getToken() {
        return localStorage.getItem('auth_token');
    },

    // Set token
    setToken(token) {
        localStorage.setItem('auth_token', token);
    },

    // Remove token
    removeToken() {
        localStorage.removeItem('auth_token');
    },

    // Get stored user
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Set user
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Remove user
    removeUser() {
        localStorage.removeItem('user');
    },

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle 401 - Unauthorized
                if (response.status === 401) {
                    this.removeToken();
                    this.removeUser();
                    window.location.reload();
                }
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Form data request (for file uploads)
    async upload(endpoint, formData, method = 'POST') {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {};

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            return data;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        login(username, password) {
            return API.post('/auth/login', { username, password });
        },
        me() {
            return API.get('/auth/me');
        },
        logout() {
            return API.post('/auth/logout', {});
        },
        changePassword(currentPassword, newPassword) {
            return API.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
        }
    },

    // Products endpoints
    products: {
        getAll(status = null) {
            const query = status ? `?status=${status}` : '';
            return API.get(`/products${query}`);
        },
        get(id) {
            return API.get(`/products/${id}`);
        },
        create(data) {
            return API.post('/products', data);
        },
        update(id, data) {
            return API.put(`/products/${id}`, data);
        },
        delete(id) {
            return API.delete(`/products/${id}`);
        },
        forPOS() {
            return API.get('/products/pos');
        },
        search(query) {
            return API.get(`/products/search?q=${encodeURIComponent(query)}`);
        }
    },

    // Brands endpoints
    brands: {
        getAll() {
            return API.get('/brands');
        },
        getActive() {
            return API.get('/brands/active');
        },
        get(id) {
            return API.get(`/brands/${id}`);
        },
        create(data) {
            return API.post('/brands', data);
        },
        update(id, data) {
            return API.put(`/brands/${id}`, data);
        },
        delete(id) {
            return API.delete(`/brands/${id}`);
        }
    },

    // Stock endpoints
    stock: {
        getCurrent() {
            return API.get('/stock/current');
        },
        getToday() {
            return API.get('/stock/today');
        },
        add(productId, quantity, date = null) {
            return API.post('/stock/add', { product_id: productId, quantity, date });
        },
        clear(id) {
            return API.post(`/stock/${id}/clear`, {});
        },
        getReport(from, to) {
            return API.get(`/stock/report?from=${from}&to=${to}`);
        },
        getItems() {
            return API.get('/stock/items');
        },
        getSellableItems() {
            return API.get('/stock/items/sellable');
        },
        createItem(data) {
            return API.post('/stock/items', data);
        },
        updateItem(id, data) {
            return API.put(`/stock/items/${id}`, data);
        },
        deleteItem(id) {
            return API.delete(`/stock/items/${id}`);
        },
        addItemQuantity(id, quantity, options = {}) {
            return API.post(`/stock/items/${id}/add-quantity`, {
                quantity,
                supplier_id: options.supplier_id,
                total_amount: options.total_amount,
                paid_amount: options.paid_amount,
                notes: options.notes
            });
        }
    },

    // POS endpoints
    pos: {
        getItems() {
            return API.get('/pos/items');
        },
        createBill(data) {
            return API.post('/pos/bills', data);
        },
        getBills(from, to, page = 1) {
            return API.get(`/pos/bills?from=${from}&to=${to}&page=${page}`);
        },
        getBill(id) {
            return API.get(`/pos/bills/${id}`);
        },
        cancelBill(id) {
            return API.post(`/pos/bills/${id}/cancel`, {});
        },
        getDailySummary(date) {
            return API.get(`/pos/daily-summary?date=${date}`);
        }
    },

    // Orders endpoints
    orders: {
        getAll(filters = {}) {
            const params = new URLSearchParams(filters);
            return API.get(`/orders?${params}`);
        },
        getPending(limit = 10) {
            return API.get(`/orders/pending?limit=${limit}`);
        },
        get(id) {
            return API.get(`/orders/${id}`);
        },
        create(data) {
            return API.post('/orders', data);
        },
        updateStatus(id, status) {
            return API.put(`/orders/${id}/status`, { status });
        },
        addPayment(id, amount) {
            return API.post(`/orders/${id}/payment`, { amount });
        },
        delete(id) {
            return API.delete(`/orders/${id}`);
        }
    },

    // Users endpoints
    users: {
        getAll(status = null) {
            const query = status ? `?status=${status}` : '';
            return API.get(`/users${query}`);
        },
        get(id) {
            return API.get(`/users/${id}`);
        },
        create(data) {
            return API.post('/users', data);
        },
        update(id, data) {
            return API.put(`/users/${id}`, data);
        },
        delete(id) {
            return API.delete(`/users/${id}`);
        },
        toggleStatus(id) {
            return API.post(`/users/${id}/toggle-status`, {});
        },
        getPositions() {
            return API.get('/users/positions');
        }
    },

    // Suppliers endpoints
    suppliers: {
        getAll() {
            return API.get('/suppliers');
        },
        get(id) {
            return API.get(`/suppliers/${id}`);
        },
        create(data) {
            return API.post('/suppliers', data);
        },
        update(id, data) {
            return API.put(`/suppliers/${id}`, data);
        },
        delete(id) {
            return API.delete(`/suppliers/${id}`);
        },
        addPayment(id, data) {
            return API.post(`/suppliers/${id}/payments`, data);
        },
        getPayments(from, to) {
            return API.get(`/suppliers/payments?from=${from}&to=${to}`);
        }
    },

    // Reports endpoints
    reports: {
        dashboard() {
            return API.get('/reports/dashboard');
        },
        dailySales(date, page = 1) {
            return API.get(`/reports/daily-sales?date=${date}&page=${page}`);
        },
        monthlySales(year, month) {
            return API.get(`/reports/monthly-sales?year=${year}&month=${month}`);
        },
        salesByRange(from, to) {
            return API.get(`/reports/sales-by-range?from=${from}&to=${to}`);
        },
        stock(from, to) {
            return API.get(`/reports/stock?from=${from}&to=${to}`);
        },
        topProducts(from, to, limit = 10) {
            return API.get(`/reports/top-products?from=${from}&to=${to}&limit=${limit}`);
        },
        orders(from, to) {
            return API.get(`/reports/orders?from=${from}&to=${to}`);
        }
    },

    // Company endpoints
    company: {
        get() {
            return API.get('/company');
        },
        update(data) {
            return API.put('/company', data);
        }
    }
};
