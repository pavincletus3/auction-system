const app = {
    token: localStorage.getItem('token'),
    user: null,
    socket: io(),

    init() {
        this.cacheDom();
        this.bindEvents();
        this.checkAuth();
        this.loadHome();
    },

    cacheDom() {
        this.$main = document.getElementById('main-content');
        this.$homeLink = document.getElementById('home-link');
        this.$loginLink = document.getElementById('login-link');
        this.$registerLink = document.getElementById('register-link');
        this.$profileLink = document.getElementById('profile-link');
        this.$createItemLink = document.getElementById('create-item-link');
    },

    bindEvents() {
        this.$homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadHome();
        });
        this.$loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadLogin();
        });
        this.$registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadRegister();
        });
        this.$profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadProfile();
        });
        this.$createItemLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadCreateItem();
        });
        this.socket.on('newBid', (data) => {
            this.updateItemPrice(data.itemId, data.newPrice);
        });
    },
    checkAuth() {
        if (this.token) {
            this.fetchUser();
        }
    },

    async fetchUser() {
        try {
            const response = await fetch('/api/users/me', {
                headers: {
                    'x-auth-token': this.token
                }
            });
            if (response.ok) {
                this.user = await response.json();
                this.updateNavigation();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            this.logout();
        }
    },

    updateNavigation() {
        if (this.user) {
            this.$loginLink.style.display = 'none';
            this.$registerLink.style.display = 'none';
            this.$profileLink.style.display = 'inline';
            this.$createItemLink.style.display = 'inline';
        } else {
            this.$loginLink.style.display = 'inline';
            this.$registerLink.style.display = 'inline';
            this.$profileLink.style.display = 'none';
            this.$createItemLink.style.display = 'none';
        }
    },

    async loadHome() {
        try {
            const response = await fetch('/api/items');
            const items = await response.json();
            let html = '<h2>Active Auctions</h2>';
            items.forEach(item => {
                html += `
                    <div class="item" data-id="${item._id}">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                        <p>Current Price: $<span class="current-price">${item.currentPrice}</span></p>
                        <p>End Time: ${new Date(item.endTime).toLocaleString()}</p>
                        <button onclick="app.loadItem('${item._id}')">View Details</button>
                    </div>
                `;
            });
            this.$main.innerHTML = html;
        } catch (error) {
            console.error('Error loading items:', error);
        }
    },

    loadLogin() {
        this.$main.innerHTML = `
            <h2>Login</h2>
            <form id="login-form">
                <input type="email" id="login-email" placeholder="Email" required>
                <input type="password" id="login-password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        `;
        document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
    },

    loadRegister() {
        this.$main.innerHTML = `
            <h2>Register</h2>
            <form id="register-form">
                <input type="text" id="register-username" placeholder="Username" required>
                <input type="email" id="register-email" placeholder="Email" required>
                <input type="password" id="register-password" placeholder="Password" required>
                <button type="submit">Register</button>
            </form>
        `;
        document.getElementById('register-form').addEventListener('submit', this.handleRegister.bind(this));
    },

    loadProfile() {
        if (!this.user) {
            this.loadLogin();
            return;
        }
        this.$main.innerHTML = `
            <h2>Profile</h2>
            <p>Username: ${this.user.username}</p>
            <p>Email: ${this.user.email}</p>
            <p>Balance: $${this.user.balance}</p>
            <button onclick="app.logout()">Logout</button>
        `;
    },

    loadCreateItem() {
        if (!this.user) {
            this.loadLogin();
            return;
        }
        this.$main.innerHTML = `
            <h2>Create Auction Item</h2>
            <form id="create-item-form">
                <input type="text" id="item-name" placeholder="Item Name" required>
                <textarea id="item-description" placeholder="Item Description" required></textarea>
                <input type="number" id="item-starting-price" placeholder="Starting Price" required>
                <input type="datetime-local" id="item-end-time" required>
                <button type="submit">Create Item</button>
            </form>
        `;
        document.getElementById('create-item-form').addEventListener('submit', this.handleCreateItem.bind(this));
    },

    async loadItem(itemId) {
        try {
            const response = await fetch(`/api/items/${itemId}`);
            const item = await response.json();
            let html = `
                <h2>${item.name}</h2>
                <p>${item.description}</p>
                <p>Current Price: $<span id="item-current-price">${item.currentPrice}</span></p>
                <p>End Time: ${new Date(item.endTime).toLocaleString()}</p>
            `;
            if (this.user && new Date() < new Date(item.endTime)) {
                html += `
                    <form id="bid-form">
                        <input type="number" id="bid-amount" placeholder="Bid Amount" required>
                        <button type="submit">Place Bid</button>
                    </form>
                `;
            }
            html += '<h3>Bid History</h3><ul id="bid-history"></ul>';
            this.$main.innerHTML = html;

            if (this.user && new Date() < new Date(item.endTime)) {
                document.getElementById('bid-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handlePlaceBid(itemId, document.getElementById('bid-amount').value);
                });
            }

            this.loadBidHistory(itemId);
        } catch (error) {
            console.error('Error loading item:', error);
        }
    },

    async loadBidHistory(itemId) {
        try {
            const response = await fetch(`/api/items/${itemId}/bids`);
            const bids = await response.json();
            const bidHistoryElement = document.getElementById('bid-history');
            bidHistoryElement.innerHTML = '';
            bids.forEach(bid => {
                const li = document.createElement('li');
                li.textContent = `$${bid.amount} at ${new Date(bid.createdAt).toLocaleString()}`;
                bidHistoryElement.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading bid history:', error);
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.fetchUser();
                this.loadHome();
            } else {
                alert('Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            if (response.ok) {
                const data = await response.json();
                this.token = data.token;
                localStorage.setItem('token', this.token);
                this.fetchUser();
                this.loadHome();
            } else {
                alert('Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
        }
    },

    async handleCreateItem(e) {
        e.preventDefault();
        const name = document.getElementById('item-name').value;
        const description = document.getElementById('item-description').value;
        const startingPrice = document.getElementById('item-starting-price').value;
        const endTime = document.getElementById('item-end-time').value;
        try {
            const response = await fetch('/api/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': this.token
                },
                body: JSON.stringify({ name, description, startingPrice, endTime })
            });
            if (response.ok) {
                this.loadHome();
            } else {
                alert('Failed to create item');
            }
        } catch (error) {
            console.error('Create item error:', error);
        }
    },

    async handlePlaceBid(itemId, amount) {
        try {
            const response = await fetch(`/api/items/${itemId}/bid`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': this.token
                },
                body: JSON.stringify({ amount })
            });
            if (response.ok) {
                this.loadItem(itemId);
            } else {
                const error = await response.json();
                alert(error.message);
            }
        } catch (error) {
            console.error('Place bid error:', error);
        }
    },

    updateItemPrice(itemId, newPrice) {
        const priceElement = document.querySelector(`.item[data-id="${itemId}"] .current-price`);
        if (priceElement) {
            priceElement.textContent = newPrice;
        }
        if (document.getElementById('item-current-price')) {
            document.getElementById('item-current-price').textContent = newPrice;
        }
    },

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        this.updateNavigation();
        this.loadHome();
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());