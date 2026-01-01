/**
 * Products Page
 */

const ProductsPage = {
    products: [],
    brands: [],
    activeTab: 'products',

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Products & Brands</h2>
                        <p class="text-sm text-gray-500">Manage your bakery products and categories</p>
                    </div>
                    <div class="flex gap-2">
                        <button id="add-brand-btn" class="btn btn-outline">
                            <i class="fas fa-tag mr-2"></i>Add Brand
                        </button>
                        <button id="add-product-btn" class="btn btn-primary">
                            <i class="fas fa-plus mr-2"></i>Add Product
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div id="products-tabs"></div>

                <!-- Content -->
                <div id="products-content" class="bg-white rounded-xl shadow-sm">
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
            const [productsRes, brandsRes] = await Promise.all([
                API.products.getAll(),
                API.brands.getAll()
            ]);
            this.products = productsRes.data || [];
            this.brands = brandsRes.data || [];
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderTabs() {
        const tabsContainer = document.getElementById('products-tabs');
        tabsContainer.innerHTML = Components.tabs([
            { id: 'products', label: 'Products', icon: 'fa-box' },
            { id: 'brands', label: 'Brands', icon: 'fa-tags' }
        ], this.activeTab, (tab) => {
            this.activeTab = tab;
            this.renderTabs();
            this.renderContent();
        });
    },

    renderContent() {
        const container = document.getElementById('products-content');

        if (this.activeTab === 'products') {
            this.renderProducts(container);
        } else {
            this.renderBrands(container);
        }
    },

    renderProducts(container) {
        if (this.products.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-box-open"></i>
                    <p>No products found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Brand</th>
                            <th>Price</th>
                            <th>Size</th>
                            <th>Status</th>
                            <th class="actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.products.map(product => `
                            <tr>
                                <td>
                                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                        ${product.image
                                            ? `<img src="images/${product.image}" alt="" class="w-full h-full object-cover">`
                                            : `<i class="fas fa-birthday-cake text-gray-400"></i>`
                                        }
                                    </div>
                                </td>
                                <td class="font-medium">${Utils.escapeHtml(product.name)}</td>
                                <td>${Utils.escapeHtml(product.brand_name || '-')}</td>
                                <td>${Utils.formatCurrency(product.price)}</td>
                                <td>${product.size || '-'}</td>
                                <td>
                                    <span class="badge ${product.status === 'active' ? 'badge-success' : 'badge-gray'}">
                                        ${Utils.capitalize(product.status)}
                                    </span>
                                </td>
                                <td class="actions-cell">
                                    <div class="actions-wrap">
                                        <button class="btn btn-outline btn-icon" onclick="ProductsPage.editProduct(${product.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-icon" onclick="ProductsPage.deleteProduct(${product.id})" title="Delete">
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

    renderBrands(container) {
        if (this.brands.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-tags"></i>
                    <p>No brands found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                ${this.brands.map(brand => `
                    <div class="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                                ${brand.image
                                    ? `<img src="images/brands/${brand.image}" alt="" class="w-full h-full object-cover rounded-lg">`
                                    : `<i class="fas fa-tag text-gray-400"></i>`
                                }
                            </div>
                            <div>
                                <p class="font-medium">${Utils.escapeHtml(brand.name)}</p>
                                <p class="text-sm text-gray-500">${brand.product_count || 0} products</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button class="btn btn-outline btn-sm" onclick="ProductsPage.editBrand(${brand.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="ProductsPage.deleteBrand(${brand.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('add-product-btn').addEventListener('click', () => this.showProductForm());
        document.getElementById('add-brand-btn').addEventListener('click', () => this.showBrandForm());
    },

    showProductForm(product = null) {
        const isEdit = product !== null;
        const brandOptions = this.brands.map(b => ({ value: b.id, label: b.name }));

        const modal = Components.modal({
            title: isEdit ? 'Edit Product' : 'Add Product',
            size: 'md',
            content: `
                <form id="product-form" class="space-y-4">
                    ${Components.input('name', 'Product Name', 'text', { required: true, value: product?.name || '' })}

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.select('brand_id', 'Brand', brandOptions, product?.brand_id || '')}
                        ${Components.input('size', 'Size', 'text', { value: product?.size || '' })}
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('price', 'Price', 'number', { required: true, value: product?.price || '' })}
                        ${Components.input('special_price', 'Special Price (After 7PM)', 'number', { value: product?.special_price || '' })}
                    </div>

                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="is_special_pricing" name="is_special_pricing"
                            ${product?.is_special_pricing ? 'checked' : ''} class="rounded">
                        <label for="is_special_pricing" class="text-sm">Enable special pricing after 7 PM</label>
                    </div>

                    ${Components.textarea('description', 'Description', { value: product?.description || '' })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="product-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'}
                </button>
            `
        });

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                brand_id: formData.get('brand_id') || null,
                price: parseFloat(formData.get('price')),
                special_price: parseFloat(formData.get('special_price')) || null,
                size: formData.get('size'),
                description: formData.get('description'),
                is_special_pricing: document.getElementById('is_special_pricing').checked ? 1 : 0
            };

            try {
                Utils.showLoading();
                if (isEdit) {
                    await API.products.update(product.id, data);
                } else {
                    await API.products.create(data);
                }
                Utils.hideLoading();
                modal.close();
                Components.toast(`Product ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    async editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.showProductForm(product);
        }
    },

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await API.products.delete(id);
            Components.toast('Product deleted successfully!', 'success');
            await this.loadData();
            this.renderContent();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    showBrandForm(brand = null) {
        const isEdit = brand !== null;

        const modal = Components.modal({
            title: isEdit ? 'Edit Brand' : 'Add Brand',
            size: 'sm',
            content: `
                <form id="brand-form" class="space-y-4">
                    ${Components.input('name', 'Brand Name', 'text', { required: true, value: brand?.name || '' })}
                    ${Components.textarea('description', 'Description', { value: brand?.description || '' })}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="brand-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'}
                </button>
            `
        });

        document.getElementById('brand-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                name: formData.get('name'),
                description: formData.get('description')
            };

            try {
                Utils.showLoading();
                if (isEdit) {
                    await API.brands.update(brand.id, data);
                } else {
                    await API.brands.create(data);
                }
                Utils.hideLoading();
                modal.close();
                Components.toast(`Brand ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                await this.loadData();
                this.renderContent();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    async editBrand(id) {
        const brand = this.brands.find(b => b.id === id);
        if (brand) {
            this.showBrandForm(brand);
        }
    },

    async deleteBrand(id) {
        if (!confirm('Are you sure you want to delete this brand?')) return;

        try {
            await API.brands.delete(id);
            Components.toast('Brand deleted successfully!', 'success');
            await this.loadData();
            this.renderContent();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    }
};
