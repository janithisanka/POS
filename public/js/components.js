/**
 * UI Components
 */

const Components = {
    // Toast notification
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.className = `toast-enter ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-64`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span>${Utils.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Modal
    modal(options) {
        const { title, content, size = 'md', onClose, actions } = options;
        const container = document.getElementById('modal-container');

        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
            full: 'max-w-6xl'
        };

        const modalId = Utils.generateId();

        container.innerHTML = `
            <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="fixed inset-0 bg-black bg-opacity-50 modal-backdrop" data-modal-close></div>
                <div class="bg-white rounded-2xl shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden relative z-10">
                    <div class="flex items-center justify-between px-6 py-4 border-b">
                        <h3 class="text-lg font-semibold text-gray-800">${Utils.escapeHtml(title)}</h3>
                        <button data-modal-close class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <i class="fas fa-times text-gray-400"></i>
                        </button>
                    </div>
                    <div class="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
                        ${content}
                    </div>
                    ${actions ? `
                        <div class="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
                            ${actions}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Close handlers
        const closeModal = () => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
                if (onClose) onClose();
            }
        };

        container.querySelectorAll('[data-modal-close]').forEach(el => {
            el.addEventListener('click', closeModal);
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        return {
            close: closeModal,
            element: document.getElementById(modalId)
        };
    },

    // Close all modals
    closeModal() {
        document.getElementById('modal-container').innerHTML = '';
    },

    // Confirm dialog
    confirm(message, onConfirm, onCancel) {
        return this.modal({
            title: 'Confirm',
            content: `<p class="text-gray-600">${Utils.escapeHtml(message)}</p>`,
            size: 'sm',
            actions: `
                <button class="btn btn-outline" data-modal-close>Cancel</button>
                <button class="btn btn-danger" id="confirm-btn">Confirm</button>
            `,
            onClose: onCancel
        });

        document.getElementById('confirm-btn').addEventListener('click', () => {
            Components.closeModal();
            if (onConfirm) onConfirm();
        });
    },

    // Data table
    table(columns, data, options = {}) {
        const { actions, emptyMessage = 'No data available' } = options;

        if (!data || data.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>${Utils.escapeHtml(emptyMessage)}</p>
                </div>
            `;
        }

        const headerHtml = columns.map(col =>
            `<th class="${col.class || ''}">${Utils.escapeHtml(col.label)}</th>`
        ).join('');

        const rowsHtml = data.map(row => {
            const cellsHtml = columns.map(col => {
                let value = row[col.key];
                if (col.render) {
                    value = col.render(value, row);
                } else if (col.format === 'currency') {
                    value = Utils.formatCurrency(value);
                } else if (col.format === 'date') {
                    value = Utils.formatDate(value);
                } else if (col.format === 'badge') {
                    const badgeClass = Utils.getStatusBadgeClass(value);
                    value = `<span class="badge ${badgeClass}">${Utils.capitalize(value || '')}</span>`;
                } else {
                    value = Utils.escapeHtml(value ?? '-');
                }
                return `<td class="${col.class || ''}">${value}</td>`;
            }).join('');

            const actionsHtml = actions ? `<td class="text-right">${actions(row)}</td>` : '';

            return `<tr>${cellsHtml}${actionsHtml}</tr>`;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${headerHtml}
                            ${actions ? '<th class="text-right">Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Pagination
    pagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        const html = `
            <div class="flex items-center justify-center space-x-2 mt-6">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${pages.map(p => p === '...'
                    ? `<span class="px-3 py-2 text-gray-400">...</span>`
                    : `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
                ).join('')}
                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        // Return HTML and attach handlers after render
        setTimeout(() => {
            document.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.dataset.page);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        onPageChange(page);
                    }
                });
            });
        }, 0);

        return html;
    },

    // Stat card
    statCard(icon, value, label, color = 'primary') {
        const colors = {
            primary: 'bg-primary-100 text-primary-600',
            green: 'bg-green-100 text-green-600',
            blue: 'bg-blue-100 text-blue-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            red: 'bg-red-100 text-red-600',
            purple: 'bg-purple-100 text-purple-600'
        };

        return `
            <div class="stat-card">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-2xl font-bold text-gray-800">${value}</p>
                        <p class="text-sm text-gray-500 mt-1">${Utils.escapeHtml(label)}</p>
                    </div>
                    <div class="stat-icon ${colors[color]}">
                        <i class="fas ${icon}"></i>
                    </div>
                </div>
            </div>
        `;
    },

    // Form input
    input(name, label, type = 'text', options = {}) {
        const { value = '', required = false, placeholder = '', disabled = false } = options;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${Utils.escapeHtml(label)}
                    ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <input type="${type}" id="${name}" name="${name}"
                    class="form-input" value="${Utils.escapeHtml(value)}"
                    placeholder="${Utils.escapeHtml(placeholder)}"
                    ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>
            </div>
        `;
    },

    // Form select
    select(name, label, options, selectedValue = '', required = false) {
        const optionsHtml = options.map(opt =>
            `<option value="${opt.value}" ${opt.value == selectedValue ? 'selected' : ''}>${Utils.escapeHtml(opt.label)}</option>`
        ).join('');

        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${Utils.escapeHtml(label)}
                    ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <select id="${name}" name="${name}" class="form-select" ${required ? 'required' : ''}>
                    <option value="">Select...</option>
                    ${optionsHtml}
                </select>
            </div>
        `;
    },

    // Form textarea
    textarea(name, label, options = {}) {
        const { value = '', required = false, placeholder = '', rows = 3 } = options;
        return `
            <div class="form-group">
                <label class="form-label" for="${name}">
                    ${Utils.escapeHtml(label)}
                    ${required ? '<span class="text-red-500">*</span>' : ''}
                </label>
                <textarea id="${name}" name="${name}" rows="${rows}"
                    class="form-input" placeholder="${Utils.escapeHtml(placeholder)}"
                    ${required ? 'required' : ''}>${Utils.escapeHtml(value)}</textarea>
            </div>
        `;
    },

    // Loading spinner
    spinner(size = 'md') {
        const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
        return `
            <div class="flex justify-center py-8">
                <div class="spinner ${sizes[size]}"></div>
            </div>
        `;
    },

    // Card container
    card(title, content, actions = '') {
        return `
            <div class="bg-white rounded-xl shadow-sm">
                ${title ? `
                    <div class="px-6 py-4 border-b flex items-center justify-between">
                        <h3 class="font-semibold text-gray-800">${Utils.escapeHtml(title)}</h3>
                        ${actions}
                    </div>
                ` : ''}
                <div class="p-6">
                    ${content}
                </div>
            </div>
        `;
    },

    // Tabs
    tabs(tabsConfig, activeTab, onTabChange) {
        const tabsHtml = tabsConfig.map(tab =>
            `<button class="tab ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}">
                ${tab.icon ? `<i class="fas ${tab.icon} mr-2"></i>` : ''}${Utils.escapeHtml(tab.label)}
            </button>`
        ).join('');

        setTimeout(() => {
            document.querySelectorAll('.tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.dataset.tab;
                    onTabChange(tabId);
                });
            });
        }, 0);

        return `<div class="tabs">${tabsHtml}</div>`;
    }
};

// Add pagination button styles
const style = document.createElement('style');
style.textContent = `
    .pagination-btn {
        padding: 0.5rem 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background: white;
        color: #374151;
        font-weight: 500;
        transition: all 0.2s;
    }
    .pagination-btn:hover:not(:disabled) {
        background: #f3f4f6;
    }
    .pagination-btn.active {
        background: #ee6906;
        border-color: #ee6906;
        color: white;
    }
    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);
