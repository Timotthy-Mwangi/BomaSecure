import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join apartment room
  joinApartment(apartmentId) {
    this.socket?.emit('join:apartment', apartmentId);
  }

  // Join tenant room
  joinTenant(tenantId) {
    this.socket?.emit('join:tenant', tenantId);
  }

  // Join guard room
  joinGuard(guardId) {
    this.socket?.emit('join:guard', guardId);
  }

  // Subscribe to visitor events
  onVisitorArrived(callback) {
    this.addListener('visitor:arrived', callback);
  }

  // Subscribe to delivery events
  onDeliveryArrived(callback) {
    this.addListener('delivery:arrived', callback);
  }

  // Subscribe to access granted events
  onAccessGranted(callback) {
    this.addListener('access:granted', callback);
  }

  // Subscribe to access denied events
  onAccessDenied(callback) {
    this.addListener('access:denied', callback);
  }

  // Subscribe to delivery confirmed
  onDeliveryConfirmed(callback) {
    this.addListener('delivery:confirmed', callback);
  }

  // Subscribe to real-time notifications
  onNotification(callback) {
    this.addListener('notification:new', callback);
  }

  // Subscribe to status updates
  onStatusUpdate(callback) {
    this.addListener('status:update', callback);
  }

  // Subscribe to access log events
  onAccessNew(callback) {
    this.addListener('access:new', callback);
  }

  // Subscribe to visitor checked in events
  onVisitorCheckedIn(callback) {
    this.addListener('visitor:checked_in', callback);
  }

  // Subscribe to visitor checked out events
  onVisitorCheckedOut(callback) {
    this.addListener('visitor:checked_out', callback);
  }

  // Subscribe to delivery returned events
  onDeliveryReturned(callback) {
    this.addListener('delivery:returned', callback);
  }

  // Subscribe to delivery ready for pickup
  onDeliveryReady(callback) {
    this.addListener('delivery:ready_for_pickup', callback);
  }

  // Subscribe to delivery collected events
  onDeliveryCollected(callback) {
    this.addListener('delivery:collected', callback);
  }

  // Subscribe to visitor approved events
  onVisitorApproved(callback) {
    this.addListener('visitor:approved', callback);
  }

  // Subscribe to visitor denied events
  onVisitorDenied(callback) {
    this.addListener('visitor:denied', callback);
  }

  // Subscribe to visitor created events
  onVisitorCreated(callback) {
    this.addListener('visitor:created', callback);
  }

  // Subscribe to visitor new events (for guards)
  onVisitorNew(callback) {
    this.addListener('visitor:new', callback);
  }

  // Subscribe to settings updated events
  onSettingsUpdated(callback) {
    this.addListener('settings:updated', callback);
  }

  // Subscribe to subscription updated events
  onSubscriptionUpdated(callback) {
    this.addListener('subscription:updated', callback);
  }

  // Subscribe to emergency chat events
  onEmergencyChat(callback) {
    this.addListener('emergency:chat', callback);
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Subscribe to user created events
  onUserCreated(callback) {
    this.addListener('user:created', callback);
  }

  // Subscribe to user updated events
  onUserUpdated(callback) {
    this.addListener('user:updated', callback);
  }

  // Subscribe to user deleted events
  onUserDeleted(callback) {
    this.addListener('user:deleted', callback);
  }

  // Subscribe to apartment created events
  onApartmentCreated(callback) {
    this.addListener('apartment:created', callback);
  }

  // Subscribe to apartment updated events
  onApartmentUpdated(callback) {
    this.addListener('apartment:updated', callback);
  }

  // Subscribe to emergency events
  onEmergencyNew(callback) {
    this.addListener('emergency:new', callback);
  }

  // Subscribe to emergency resolved events
  onEmergencyResolved(callback) {
    this.addListener('emergency:resolved', callback);
  }

  // Subscribe to announcement events
  onAnnouncementNew(callback) {
    this.addListener('announcement:new', callback);
  }

  // Subscribe to apartment deleted events
  onApartmentDeleted(callback) {
    this.addListener('apartment:deleted', callback);
  }

  // Subscribe to account deleted events (when admin deletes a user)
  onAccountDeleted(callback) {
    this.addListener('account:deleted', callback);
  }

  // Subscribe to account deactivated events
  onAccountDeactivated(callback) {
    this.addListener('account:deactivated', callback);
  }

  // Subscribe to payment update events
  onPaymentUpdate(callback) {
    this.addListener('payment:update', callback);
  }

  // Subscribe to new payment events (for admins)
  onPaymentNew(callback) {
    this.addListener('payment:new', callback);
  }

  // Subscribe to rent paid events (for tenant)
  onRentPaid(callback) {
    this.addListener('rent:paid', callback);
  }

  // Subscribe to rent received events (for admin)
  onRentReceived(callback) {
    this.addListener('rent:received', callback);
  }

  // Subscribe to rent update events (for apartment)
  onRentUpdate(callback) {
    this.addListener('rent:update', callback);
  }

  // Subscribe to rent status events
  onRentStatus(callback) {
    this.addListener('rent:status', callback);
  }

  // Subscribe to tenant rent status events (for admin)
  onTenantRentStatus(callback) {
    this.addListener('tenant:rentStatus', callback);
  }

  // Subscribe to maintenance created events
  onMaintenanceCreated(callback) {
    this.addListener('maintenance:created', callback);
  }

  // Subscribe to maintenance new events (for staff/admin dashboard)
  onMaintenanceNew(callback) {
    this.addListener('maintenance:new', callback);
  }

  // Subscribe to maintenance updated events
  onMaintenanceUpdated(callback) {
    this.addListener('maintenance:updated', callback);
  }

  // Subscribe to maintenance deleted events
  onMaintenanceDeleted(callback) {
    this.addListener('maintenance:deleted', callback);
  }

  // Subscribe to maintenance contact messages (when tenant contacts maintenance)
  onMaintenanceContact(callback) {
    this.addListener('maintenance:contact', callback);
  }

  // Subscribe to maintenance images (when tenant sends image to maintenance)
  onMaintenanceImage(callback) {
    this.addListener('maintenance:image', callback);
  }

  // Emit account deleted event
  emitAccountDeleted(userId) {
    this.socket?.emit('account:deleted', { userId });
  }

  // Join admin room
  joinAdmin() {
    this.socket?.emit('join:admin');
  }

  // Join superadmin room
  joinSuperAdmin() {
    this.socket?.emit('join:superadmin');
  }

  // Join guards room
  joinGuards() {
    this.socket?.emit('join:guards');
  }

  // Join tenants room
  joinTenants() {
    this.socket?.emit('join:tenants');
  }

  // Add listener
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    this.socket?.on(event, callback);
  }

  // Remove listener
  removeListener(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      this.socket?.off(event, callback);
    }
  }

  // Remove all listeners
  removeAllListeners() {
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.off(event, callback);
      });
    });
    this.listeners.clear();
  }

  // Check connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
