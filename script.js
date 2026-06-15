// ============ DATOS DE LA BASE DE DATOS ============
const vuelos = [
    { id: 1, codigo: "AV101", origen: "Caracas", destino: "Maracaibo", fecha_salida: "2026-07-15T08:00:00", fecha_llegada: "2026-07-15T09:30:00", estado: "Programado", puerta: "B12", precio: 150, duracion: "1h 30m" },
    { id: 2, codigo: "AV202", origen: "Caracas", destino: "Barcelona", fecha_salida: "2026-07-15T10:00:00", fecha_llegada: "2026-07-15T11:15:00", estado: "Programado", puerta: "A05", precio: 120, duracion: "1h 15m" },
    { id: 3, codigo: "LA303", origen: "Caracas", destino: "Bogotá", fecha_salida: "2026-07-16T14:00:00", fecha_llegada: "2026-07-16T16:30:00", estado: "Programado", puerta: "C08", precio: 280, duracion: "2h 30m" },
    { id: 4, codigo: "CM404", origen: "Maracaibo", destino: "Panamá", fecha_salida: "2026-07-17T07:30:00", fecha_llegada: "2026-07-17T10:00:00", estado: "Programado", puerta: "D12", precio: 350, duracion: "2h 30m" },
    { id: 5, codigo: "IB505", origen: "Barcelona", destino: "Madrid", fecha_salida: "2026-07-20T20:00:00", fecha_llegada: "2026-07-21T10:00:00", estado: "Programado", puerta: "E03", precio: 650, duracion: "8h 00m" }
];

const asientosDisponibles = {
    1: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    2: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    3: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    4: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C"],
    5: ["5A", "5B", "5C", "6A", "6B", "6C", "7A", "7B", "7C", "8A", "8B", "8C"]
};

// ============ VARIABLES GLOBALES ============
let currentUser = null;
let selectedFlight = null;
let selectedSeat = null;
let currentBookingFilter = 'all';

// ============ INICIALIZACIÓN ============
function init() {
    loadCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    updateNavbarUser();
    loadPageSpecificData();
}

function loadCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        // Cargar tickets del usuario
        const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
        const userFromDB = users.find(u => u.id === currentUser.id);
        if (userFromDB && userFromDB.tickets) {
            currentUser.tickets = userFromDB.tickets;
        } else {
            currentUser.tickets = currentUser.tickets || [];
        }
    }
}

function saveUserData() {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('aerodash_users', JSON.stringify(users));
    }
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
}

function updateNavbarUser() {
    const userNameSpan = document.getElementById('userNameNav');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    }
}

function loadPageSpecificData() {
    const page = window.location.pathname.split('/').pop();
    
    if (page === 'dashboard.html' || page === '') {
        loadDashboard();
    } else if (page === 'flights.html') {
        loadFlightsPage();
    } else if (page === 'my-bookings.html') {
        loadMyBookings();
    } else if (page === 'profile.html') {
        loadProfile();
    }
    
    // Actualizar fecha
    const dateElements = document.querySelectorAll('#currentDateDashboard, #currentDate');
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    dateElements.forEach(el => { if(el) el.textContent = dateStr; });
}

// ============ DASHBOARD ============
function loadDashboard() {
    // Stats
    document.getElementById('totalFlights').textContent = vuelos.length;
    document.getElementById('myTicketsCount').textContent = currentUser.tickets.length;
    
    const totalSpent = currentUser.tickets.reduce((sum, t) => sum + t.precio, 0);
    document.getElementById('totalSpent').textContent = `$${totalSpent}`;
    
    const upcoming = currentUser.tickets.filter(t => new Date(t.fecha_salida) > new Date()).length;
    document.getElementById('upcomingFlights').textContent = upcoming;
    
    document.getElementById('welcomeName').textContent = currentUser.nombre;
    
    // Próximos vuelos (los 3 más cercanos)
    const upcomingFlights = vuelos.filter(v => new Date(v.fecha_salida) > new Date()).slice(0, 3);
    renderFlightsGrid(upcomingFlights, 'upcomingFlightsList', true);
    
    // Reservas recientes
    const recentTickets = [...currentUser.tickets].reverse().slice(0, 3);
    renderRecentBookings(recentTickets);
    
    // Vuelos destacados
    const featured = vuelos.filter(v => v.precio <= 200).slice(0, 3);
    renderFlightsGrid(featured, 'featuredFlights', true);
}

function renderFlightsGrid(flights, containerId, showBuyButton = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!flights || flights.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay vuelos disponibles</p></div>';
        return;
    }
    
    container.innerHTML = flights.map(flight => `
        <div class="flight-card">
            <div class="flight-header">
                <span class="flight-code">${flight.codigo}</span>
                <span class="flight-status status-${flight.estado}">${flight.estado}</span>
            </div>
            <div class="flight-route">
                <i class="fas fa-plane-departure"></i> ${flight.origen} → ${flight.destino}
            </div>
            <div class="flight-time">
                <i class="far fa-calendar-alt"></i> ${formatDate(flight.fecha_salida)}
            </div>
            <div class="flight-time">
                <i class="far fa-clock"></i> ${flight.duracion}
            </div>
            <div class="flight-price">$${flight.precio}</div>
            ${showBuyButton ? `<button class="btn-primary" style="width:100%" onclick="selectFlightForBooking(${flight.id})">Reservar</button>` : ''}
        </div>
    `).join('');
}

function renderRecentBookings(tickets) {
    const container = document.getElementById('recentBookings');
    if (!container) return;
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tienes reservas recientes</p></div>';
        return;
    }
    
    container.innerHTML = tickets.map(ticket => {
        const vuelo = vuelos.find(v => v.id === ticket.vueloId);
        if (!vuelo) return '';
        return `
            <div class="booking-card">
                <div class="booking-info">
                    <h4>${vuelo.codigo} - ${vuelo.origen} → ${vuelo.destino}</h4>
                    <p><i class="far fa-calendar-alt"></i> ${formatDate(vuelo.fecha_salida)}</p>
                    <p><i class="fas fa-chair"></i> Asiento: ${ticket.asiento} | Pagado: $${ticket.precio}</p>
                </div>
                <div class="booking-actions">
                    <button class="btn-view" onclick="viewTicket(${ticket.id})">Ver Ticket</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============ FLIGHTS PAGE ============
function loadFlightsPage() {
    renderAllFlights(vuelos);
    
    document.getElementById('searchFlightsBtn').addEventListener('click', searchFlights);
}

function renderAllFlights(flightsList) {
    const container = document.getElementById('flightsList');
    const countSpan = document.getElementById('resultsCount');
    
    if (!flightsList || flightsList.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron vuelos</p></div>';
        if (countSpan) countSpan.textContent = '0 vuelos';
        return;
    }
    
    if (countSpan) countSpan.textContent = `${flightsList.length} vuelos`;
    
    container.innerHTML = flightsList.map(flight => `
        <div class="flight-card">
            <div class="flight-header">
                <span class="flight-code">${flight.codigo}</span>
                <span class="flight-status status-${flight.estado}">${flight.estado}</span>
            </div>
            <div class="flight-route">
                <i class="fas fa-plane-departure"></i> ${flight.origen} → ${flight.destino}
            </div>
            <div class="flight-time">
                <i class="far fa-calendar-alt"></i> ${formatDate(flight.fecha_salida)}
            </div>
            <div class="flight-time">
                <i class="far fa-clock"></i> ${flight.duracion} | Puerta: ${flight.puerta}
            </div>
            <div class="flight-price">$${flight.precio}</div>
            <button class="btn-primary" style="width:100%" onclick="selectFlightForBooking(${flight.id})">
                <i class="fas fa-shopping-cart"></i> Reservar Ahora
            </button>
        </div>
    `).join('');
}

function searchFlights() {
    const origen = document.getElementById('filterOrigen').value.toLowerCase();
    const destino = document.getElementById('filterDestino').value.toLowerCase();
    const fecha = document.getElementById('filterFecha').value;
    
    let filtered = [...vuelos];
    
    if (origen) filtered = filtered.filter(v => v.origen.toLowerCase().includes(origen));
    if (destino) filtered = filtered.filter(v => v.destino.toLowerCase().includes(destino));
    if (fecha) filtered = filtered.filter(v => v.fecha_salida.startsWith(fecha));
    
    renderAllFlights(filtered);
}

// ============ BOOKING ============
function selectFlightForBooking(flightId) {
    selectedFlight = vuelos.find(v => v.id === flightId);
    selectedSeat = null;
    
    const modal = document.getElementById('bookingModal');
    const modalContent = document.getElementById('modalFlightInfo');
    
    // Mostrar información del vuelo
    modalContent.innerHTML = `
        <div class="ticket-details">
            <h3>${selectedFlight.codigo} - ${selectedFlight.origen} → ${selectedFlight.destino}</h3>
            <p><i class="far fa-calendar-alt"></i> ${formatDate(selectedFlight.fecha_salida)}</p>
            <p><i class="fas fa-tag"></i> Precio: $${selectedFlight.precio}</p>
        </div>
    `;
    
    // Mostrar asientos disponibles
    const asientosVuelo = asientosDisponibles[selectedFlight.id] || [];
    const occupiedSeats = currentUser.tickets
        .filter(t => t.vueloId === selectedFlight.id)
        .map(t => t.asiento);
    
    const seatContainer = document.getElementById('seatSelector');
    seatContainer.innerHTML = asientosVuelo.map(seat => `
        <div class="seat ${occupiedSeats.includes(seat) ? 'occupied' : 'available'}" 
             data-seat="${seat}"
             onclick="${occupiedSeats.includes(seat) ? '' : 'selectSeat(\'' + seat + '\')'}">
            ${seat}
            ${occupiedSeats.includes(seat) ? '<br><small>Ocupado</small>' : '<br><small>Disponible</small>'}
        </div>
    `).join('');
    
    modal.classList.add('active');
}

function selectSeat(seat) {
    selectedSeat = seat;
    // Limpiar selección anterior
    document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
    // Marcar el asiento seleccionado
    const seats = document.querySelectorAll('.seat');
    seats.forEach(s => {
        if (s.getAttribute('data-seat') === seat) {
            s.classList.add('selected');
        }
    });
}

function confirmBooking() {
    if (!selectedSeat) {
        alert('Por favor selecciona un asiento');
        return;
    }
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    // Crear ticket
    const newTicket = {
        id: Date.now(),
        vueloId: selectedFlight.id,
        vuelo: selectedFlight.codigo,
        origen: selectedFlight.origen,
        destino: selectedFlight.destino,
        fecha_salida: selectedFlight.fecha_salida,
        asiento: selectedSeat,
        precio: selectedFlight.precio,
        estado: 'Confirmado',
        fecha_compra: new Date().toISOString(),
        metodo_pago: paymentMethod
    };
    
    currentUser.tickets.push(newTicket);
    saveUserData();
    
    closeBookingModal();
    alert('🎉 ¡Reserva confirmada! Ticket #' + newTicket.id);
    
    // Redirigir a mis reservas si es necesario
    if (window.location.pathname.includes('flights.html')) {
        setTimeout(() => {
            window.location.href = 'my-bookings.html';
        }, 1500);
    } else {
        loadDashboard();
    }
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.classList.remove('active');
    selectedFlight = null;
    selectedSeat = null;
}

// ============ MY BOOKINGS ============
function loadMyBookings() {
    filterBookings(currentBookingFilter);
}

function filterBookings(filter) {
    currentBookingFilter = filter;
    
    // Actualizar tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter)) {
            btn.classList.add('active');
        }
    });
    
    let filteredTickets = [...currentUser.tickets];
    const now = new Date();
    
    if (filter === 'active') {
        filteredTickets = filteredTickets.filter(t => new Date(t.fecha_salida) > now);
    } else if (filter === 'completed') {
        filteredTickets = filteredTickets.filter(t => new Date(t.fecha_salida) < now);
    } else if (filter === 'cancelled') {
        filteredTickets = filteredTickets.filter(t => t.estado === 'Cancelado');
    }
    
    renderBookingsList(filteredTickets);
}

function renderBookingsList(tickets) {
    const container = document.getElementById('bookingsList');
    const emptyDiv = document.getElementById('emptyBookings');
    
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '';
        emptyDiv.style.display = 'block';
        return;
    }
    
    emptyDiv.style.display = 'none';
    
    container.innerHTML = tickets.map(ticket => {
        const isPast = new Date(ticket.fecha_salida) < new Date();
        return `
            <div class="booking-card">
                <div class="booking-info">
                    <h4>${ticket.vuelo} - ${ticket.origen} → ${ticket.destino}</h4>
                    <p><i class="far fa-calendar-alt"></i> ${formatDate(ticket.fecha_salida)}</p>
                    <p><i class="fas fa-chair"></i> Asiento: ${ticket.asiento} | Pagado: $${ticket.precio}</p>
                    <p><i class="fas fa-credit-card"></i> Pagado con: ${ticket.metodo_pago}</p>
                    <p><i class="fas fa-tag"></i> Estado: <strong style="color: ${ticket.estado === 'Confirmado' ? '#16a34a' : '#dc2626'}">${ticket.estado}</strong></p>
                </div>
                <div class="booking-actions">
                    <button class="btn-view" onclick="viewTicket(${ticket.id})">Ver Ticket</button>
                    ${!isPast && ticket.estado !== 'Cancelado' ? `<button class="btn-cancel" onclick="cancelTicket(${ticket.id})">Cancelar</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function viewTicket(ticketId) {
    const ticket = currentUser.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    
    const vueloCompleto = vuelos.find(v => v.id === ticket.vueloId);
    
    const modal = document.getElementById('ticketModal');
    const ticketDetails = document.getElementById('ticketDetails');
    
    ticketDetails.innerHTML = `
        <div class="ticket-details">
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-plane-departure" style="font-size: 2rem; color: #667eea;"></i>
                <h2>AeroDash Airlines</h2>
                <p>${ticket.estado === 'Confirmado' ? '✓ TICKET CONFIRMADO' : 'TICKET CANCELADO'}</p>
            </div>
            <div style="display: grid; gap: 12px;">
                <div><strong>N° Ticket:</strong> ${ticket.id}</div>
                <div><strong>Pasajero:</strong> ${currentUser.nombre} ${currentUser.apellido}</div>
                <div><strong>Documento:</strong> ${currentUser.documento || 'No registrado'}</div>
                <hr>
                <div><strong>Vuelo:</strong> ${ticket.vuelo}</div>
                <div><strong>Ruta:</strong> ${ticket.origen} → ${ticket.destino}</div>
                <div><strong>Fecha:</strong> ${formatDate(ticket.fecha_salida)}</div>
                <div><strong>Asiento:</strong> ${ticket.asiento}</div>
                <div><strong>Puerta de embarque:</strong> ${vueloCompleto?.puerta || 'N/A'}</div>
                <hr>
                <div><strong>Total pagado:</strong> $${ticket.precio}</div>
                <div><strong>Método de pago:</strong> ${ticket.metodo_pago}</div>
                <div><strong>Fecha de compra:</strong> ${new Date(ticket.fecha_compra).toLocaleString()}</div>
            </div>
            <div style="margin-top: 20px; padding: 10px; background: #f1f5f9; border-radius: 12px; text-align: center;">
                <i class="fas fa-qrcode" style="font-size: 2rem;"></i>
                <p>Código: #${ticket.id}${ticket.vuelo}${ticket.asiento}</p>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) modal.classList.remove('active');
}

function downloadTicket() {
    alert('Función de descarga de PDF disponible próximamente.\nPor ahora puedes capturar pantalla de tu ticket.');
}

function cancelTicket(ticketId) {
    if (confirm('¿Estás seguro de cancelar esta reserva?')) {
        const ticketIndex = currentUser.tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1) {
            currentUser.tickets[ticketIndex].estado = 'Cancelado';
            saveUserData();
            filterBookings(currentBookingFilter);
            alert('Reserva cancelada exitosamente');
        }
    }
}

// ============ PROFILE ============
function loadProfile() {
    document.getElementById('profileName').textContent = `${currentUser.nombre} ${currentUser.apellido}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileTickets').textContent = currentUser.tickets.length;
    
    const totalSpent = currentUser.tickets.reduce((sum, t) => sum + t.precio, 0);
    document.getElementById('profileSpent').textContent = `$${totalSpent}`;
    
    document.getElementById('profileNombre').value = currentUser.nombre;
    document.getElementById('profileApellido').value = currentUser.apellido;
    document.getElementById('profileEmailInput').value = currentUser.email;
    document.getElementById('profileDocumento').value = currentUser.documento || '';
    document.getElementById('profileTelefono').value = currentUser.telefono || '';
    
    document.getElementById('profileForm').addEventListener('submit', updateProfile);
}

function updateProfile(e) {
    e.preventDefault();
    
    currentUser.nombre = document.getElementById('profileNombre').value;
    currentUser.apellido = document.getElementById('profileApellido').value;
    currentUser.email = document.getElementById('profileEmailInput').value;
    currentUser.documento = document.getElementById('profileDocumento').value;
    currentUser.telefono = document.getElementById('profileTelefono').value;
    
    saveUserData();
    updateNavbarUser();
    
    const messageDiv = document.getElementById('profileMessage');
    messageDiv.className = 'message success';
    messageDiv.textContent = 'Perfil actualizado correctamente';
    
    setTimeout(() => {
        messageDiv.className = 'message';
        messageDiv.style.display = 'none';
    }, 3000);
    
    loadProfile(); // Recargar datos
}

// ============ AUTENTICACIÓN ============
function loginUser(email, password) {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        return { success: true };
    }
    return { success: false, message: 'Correo o contraseña incorrectos' };
}

function registerUser(nombre, apellido, email, password, documento, telefono) {
    const users = JSON.parse(localStorage.getItem('aerodash_users')) || [];
    
    if (users.some(u => u.email === email)) {
        return { success: false, message: 'El correo ya está registrado' };
    }
    
    const newUser = {
        id: Date.now(),
        nombre,
        apellido,
        email,
        password,
        documento: documento || '',
        telefono: telefono || '',
        rol: 'USER',
        tickets: [],
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('aerodash_users', JSON.stringify(users));
    return { success: true };
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ============ UTILIDADES ============
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Switch tabs en login
function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach((t, i) => {
        if ((tab === 'login' && i === 0) || (tab === 'register' && i === 1)) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}

function fillDemo(email, password) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
}

// ============ EVENT LISTENERS ============
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar usuarios demo si no existen
    const users = localStorage.getItem('aerodash_users');
    if (!users) {
        const demoUsers = [
            { id: 1, nombre: 'Christopher', apellido: 'Medina', email: 'christopher@email.com', password: '123456', documento: '12345678', telefono: '04141234567', rol: 'USER', tickets: [], createdAt: new Date().toISOString() },
            { id: 2, nombre: 'Yalimar', apellido: 'Morillo', email: 'yalimar@email.com', password: '123456', documento: '87654321', telefono: '04147654321', rol: 'USER', tickets: [], createdAt: new Date().toISOString() },
            { id: 3, nombre: 'Rebeca', apellido: 'Sánchez', email: 'rebeca@email.com', password: '123456', documento: '11122233', telefono: '04141112233', rol: 'USER', tickets: [], createdAt: new Date().toISOString() }
        ];
        localStorage.setItem('aerodash_users', JSON.stringify(demoUsers));
    }
    
    // Inicializar según la página
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Página de login
        document.getElementById('loginFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const result = loginUser(email, password);
            
            const messageDiv = document.getElementById('loginMessage');
            if (result.success) {
                messageDiv.className = 'message success';
                messageDiv.textContent = '¡Bienvenido! Redirigiendo...';
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                messageDiv.className = 'message error';
                messageDiv.textContent = result.message;
            }
        });
        
        document.getElementById('registerFormElement')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value;
            const apellido = document.getElementById('regApellido').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;
            const documento = document.getElementById('regDocumento').value;
            const telefono = document.getElementById('regTelefono').value;
            
            if (password !== confirmPassword) {
                const msgDiv = document.getElementById('registerMessage');
                msgDiv.className = 'message error';
                msgDiv.textContent = 'Las contraseñas no coinciden';
                return;
            }
            
            const result = registerUser(nombre, apellido, email, password, documento, telefono);
            const msgDiv = document.getElementById('registerMessage');
            
            if (result.success) {
                msgDiv.className = 'message success';
                msgDiv.textContent = 'Registro exitoso. Ahora inicia sesión';
                setTimeout(() => switchTab('login'), 1500);
                document.getElementById('registerFormElement').reset();
            } else {
                msgDiv.className = 'message error';
                msgDiv.textContent = result.message;
            }
        });
    } else {
        // Otras páginas - verificar autenticación
        init();
    }
});

// Exponer funciones globales
window.switchTab = switchTab;
window.fillDemo = fillDemo;
window.logout = logout;
window.selectFlightForBooking = selectFlightForBooking;
window.selectSeat = selectSeat;
window.confirmBooking = confirmBooking;
window.closeBookingModal = closeBookingModal;
window.filterBookings = filterBookings;
window.viewTicket = viewTicket;
window.closeTicketModal = closeTicketModal;
window.downloadTicket = downloadTicket;
window.cancelTicket = cancelTicket;