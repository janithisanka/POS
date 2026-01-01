/**
 * Users Page
 */

const UsersPage = {
    users: [],
    positions: [],

    async render() {
        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">User Management</h2>
                        <p class="text-sm text-gray-500">Manage system users and their roles</p>
                    </div>
                    <button id="add-user-btn" class="btn btn-primary">
                        <i class="fas fa-user-plus mr-2"></i>Add User
                    </button>
                </div>

                <!-- Users Table -->
                <div id="users-container" class="bg-white rounded-xl shadow-sm">
                    ${Components.spinner()}
                </div>
            </div>
        `;
    },

    async init() {
        await this.loadData();
        this.bindEvents();
        this.renderUsers();
    },

    async loadData() {
        try {
            const [usersRes, positionsRes] = await Promise.all([
                API.users.getAll(),
                API.users.getPositions()
            ]);
            this.users = usersRes.data || [];
            this.positions = positionsRes.data || [];
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    renderUsers() {
        const container = document.getElementById('users-container');

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-12">
                    <i class="fas fa-users"></i>
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Username</th>
                            <th>Position</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th class="actions-header">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.users.map(user => `
                            <tr>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                            ${user.image
                                                ? `<img src="images/users/${user.image}" alt="" class="w-full h-full object-cover rounded-full">`
                                                : `<span class="text-primary-600 font-medium">${user.first_name[0]}${user.last_name[0]}</span>`
                                            }
                                        </div>
                                        <div>
                                            <p class="font-medium">${user.title || ''} ${Utils.escapeHtml(user.first_name)} ${Utils.escapeHtml(user.last_name)}</p>
                                            <p class="text-sm text-gray-500">${user.email || '-'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>${Utils.escapeHtml(user.username)}</td>
                                <td>${Utils.escapeHtml(user.position_name || '-')}</td>
                                <td>${user.phone || '-'}</td>
                                <td>
                                    <button onclick="UsersPage.toggleStatus(${user.id})"
                                        class="badge ${user.status === 'active' ? 'badge-success' : 'badge-gray'} cursor-pointer hover:opacity-80">
                                        ${Utils.capitalize(user.status)}
                                    </button>
                                </td>
                                <td>${user.last_login ? Utils.formatDate(user.last_login, 'datetime') : 'Never'}</td>
                                <td class="actions-cell">
                                    <div class="actions-wrap">
                                        <button class="btn btn-outline btn-icon" onclick="UsersPage.editUser(${user.id})" title="Edit">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-danger btn-icon" onclick="UsersPage.deleteUser(${user.id})" title="Delete">
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
        document.getElementById('add-user-btn').addEventListener('click', () => this.showUserForm());
    },

    showUserForm(user = null) {
        const isEdit = user !== null;
        const positionOptions = this.positions.map(p => ({ value: p.id, label: p.name }));
        const titleOptions = [
            { value: 'Mr.', label: 'Mr.' },
            { value: 'Mrs.', label: 'Mrs.' },
            { value: 'Ms.', label: 'Ms.' },
            { value: 'Dr.', label: 'Dr.' }
        ];

        const modal = Components.modal({
            title: isEdit ? 'Edit User' : 'Add User',
            size: 'md',
            content: `
                <form id="user-form" class="space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                        ${Components.select('title', 'Title', titleOptions, user?.title || '')}
                        ${Components.input('first_name', 'First Name', 'text', { required: true, value: user?.first_name || '' })}
                        ${Components.input('last_name', 'Last Name', 'text', { required: true, value: user?.last_name || '' })}
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('username', 'Username', 'text', { required: true, value: user?.username || '' })}
                        ${Components.input('password', 'Password', 'password', { required: !isEdit, placeholder: isEdit ? 'Leave blank to keep current' : '' })}
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        ${Components.input('email', 'Email', 'email', { value: user?.email || '' })}
                        ${Components.input('phone', 'Phone', 'tel', { value: user?.phone || '' })}
                    </div>

                    ${Components.select('position_id', 'Position', positionOptions, user?.position_id || '')}
                </form>
            `,
            actions: `
                <button type="button" class="btn btn-outline" data-modal-close>Cancel</button>
                <button type="submit" form="user-form" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>${isEdit ? 'Update' : 'Create'}
                </button>
            `
        });

        document.getElementById('user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
                title: formData.get('title'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                username: formData.get('username'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                position_id: formData.get('position_id') || null
            };

            const password = formData.get('password');
            if (password) {
                data.password = password;
            }

            try {
                Utils.showLoading();
                if (isEdit) {
                    await API.users.update(user.id, data);
                } else {
                    await API.users.create(data);
                }
                Utils.hideLoading();
                modal.close();
                Components.toast(`User ${isEdit ? 'updated' : 'created'} successfully!`, 'success');
                await this.loadData();
                this.renderUsers();
            } catch (error) {
                Utils.hideLoading();
                Components.toast(error.message, 'error');
            }
        });
    },

    async editUser(id) {
        const user = this.users.find(u => u.id === id);
        if (user) {
            this.showUserForm(user);
        }
    },

    async toggleStatus(id) {
        try {
            await API.users.toggleStatus(id);
            Components.toast('User status updated!', 'success');
            await this.loadData();
            this.renderUsers();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    },

    async deleteUser(id) {
        if (!confirm('Are you sure you want to deactivate this user?')) return;

        try {
            await API.users.delete(id);
            Components.toast('User deactivated!', 'success');
            await this.loadData();
            this.renderUsers();
        } catch (error) {
            Components.toast(error.message, 'error');
        }
    }
};
