import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { authAPI, apartmentsAPI, paymentsAPI } from '../../services/api';
import socketService from '../../services/socket';
import { COLORS } from '../../config';
import BuildingVisualizer from './BuildingVisualizer';
import CurrencySelector from '../common/CurrencySelector';

// Flatten a building+units document into card-friendly rows
const flattenApartment = (apt) => {
  if (apt.units && apt.units.length > 0) {
    return apt.units.map((unit) => {
      const tenantId = unit.tenantId;
      let tenant = null;
      if (tenantId) {
        if (typeof tenantId === 'object' && tenantId !== null && tenantId.name) {
          tenant = tenantId;
        } else if (typeof tenantId === 'object' && tenantId !== null) {
          tenant = { _id: tenantId._id || tenantId, name: 'Loading...', phone: '' };
        }
      }
      return {
        _id: apt._id,
        unitId: unit._id,
        number: unit.number,
        floor: unit.floor,
        bedrooms: unit.type === 'studio' ? 0 : unit.type === '1bed' ? 1 : unit.type === '2bed' ? 2 : unit.type === '3bed' ? 3 : 4,
        area: unit.size || 0,
        status: unit.isOccupied ? 'occupied' : 'vacant',
        buildingName: apt.buildingName,
        tenant: tenant,
        tenantId: unit.tenantId,
        tenantIds: unit.tenantIds || [],
        rent: unit.rent || 0,
        rentDueDay: unit.rentDueDay || null,
      };
    });
  }
  return [{
    _id: apt._id,
    unitId: null,
    number: apt.buildingName,
    floor: '-',
    bedrooms: '-',
    area: '-',
    status: apt.units?.some(u => u.isOccupied) ? 'occupied' : 'vacant',
    buildingName: apt.buildingName,
    tenant: null,
    tenantId: null,
    tenantIds: [],
  }];
};

const Apartments = ({ showNewModal = false }) => {
  const [apartments, setApartments] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [buildingFilter] = useState('all');
  const [showModal, setShowModal] = useState(showNewModal);
  const [editingApartment, setEditingApartment] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantApartment, setTenantApartment] = useState(null);
  const [tenantError, setTenantError] = useState('');
  const [tenantSaving, setTenantSaving] = useState(false);
  const [existingTenants, setExistingTenants] = useState([]);
  const [tenantMode, setTenantMode] = useState('existing'); // 'existing' | 'new'
  const [selectedTenants, setSelectedTenants] = useState([]); // Array of selected tenant IDs
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [guardApartment, setGuardApartment] = useState(null);
  const [guardError, setGuardError] = useState('');
  const [guardSaving, setGuardSaving] = useState(false);
  const [existingGuards, setExistingGuards] = useState([]);
  const [guardMode, setGuardMode] = useState('existing'); // 'existing' | 'new'
  const [viewMode, setViewMode] = useState('units'); // 'units' | 'buildings' | 'unitsTable' | '3d'
  const [showBuildingDetails, setShowBuildingDetails] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showRoomModal, setShowRoomModal] = useState(false); // Separate modal for adding room
  const [showBulkAddModal, setShowBulkAddModal] = useState(false); // Bulk add rooms modal
  const [showAddFloorModal, setShowAddFloorModal] = useState(false); // Add floor modal
  const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm }
  const [tenantPaymentStatus, setTenantPaymentStatus] = useState({});
  const [selectedCurrency, setSelectedCurrency] = useState('KES');
  const [roomCurrency, setRoomCurrency] = useState('KES');

  const fetchTenantPaymentStatus = async () => {
    try {
      const response = await paymentsAPI.getAdminTenantsFinance();
      const statusMap = {};
      response.data.tenants.forEach(tenant => {
        statusMap[tenant.id] = tenant.rentStatus;
      });
      setTenantPaymentStatus(statusMap);
    } catch (error) {
      console.error('Error fetching tenant payment status:', error);
    }
  };

  useEffect(() => {
    if (showNewModal) setShowModal(true);
  }, [showNewModal]);

  useEffect(() => {
    fetchApartments();
    fetchTenantPaymentStatus();

    const handleApartmentCreated = () => {
      fetchApartments();
      fetchTenantPaymentStatus();
    };
    const handleApartmentUpdated = () => {
      fetchApartments();
      fetchTenantPaymentStatus();
    };
    const handleApartmentDeleted = (data) => {
      setApartments(prev => prev.filter(a => a._id !== data.apartmentId));
    };

    // Real-time sync for users (tenants and guards)
    const handleUserCreated = () => fetchApartments();
    const handleUserUpdated = () => fetchApartments();
    const handleUserDeleted = () => fetchApartments();

    socketService.onApartmentCreated(handleApartmentCreated);
    socketService.onApartmentUpdated(handleApartmentUpdated);
    socketService.onApartmentDeleted(handleApartmentDeleted);
    socketService.onUserCreated(handleUserCreated);
    socketService.onUserUpdated(handleUserUpdated);
    socketService.onUserDeleted(handleUserDeleted);
    socketService.onPaymentNew(fetchTenantPaymentStatus);
    socketService.onRentReceived(fetchTenantPaymentStatus);
    socketService.onRentUpdate(fetchTenantPaymentStatus);
    socketService.joinAdmin();

    return () => {
      socketService.removeListener('apartment:created', handleApartmentCreated);
      socketService.removeListener('apartment:updated', handleApartmentUpdated);
      socketService.removeListener('apartment:deleted', handleApartmentDeleted);
      socketService.removeListener('user:created', handleUserCreated);
      socketService.removeListener('user:updated', handleUserUpdated);
      socketService.removeListener('user:deleted', handleUserDeleted);
      socketService.removeListener('payment:new', fetchTenantPaymentStatus);
      socketService.removeListener('rent:received', fetchTenantPaymentStatus);
      socketService.removeListener('rent:update', fetchTenantPaymentStatus);
    };
  }, []);

  const fetchApartments = async () => {
    setFetchError('');
    try {
      const response = await api.get('/apartments');
      const raw = response.data.apartments || response.data;
      const list = Array.isArray(raw) ? raw : [];
      // Flatten buildings → unit cards
      const flattened = list.flatMap(flattenApartment);
      setApartments(flattened);
      setBuildings(list); // Store buildings for building details
    } catch (error) {
      console.error('Error fetching apartments:', error);
      setFetchError(error.response?.data?.message || 'Failed to load apartments');
    } finally {
      setLoading(false);
    }
  };

  // Open building details modal
  const openBuildingDetails = (building) => {
    setSelectedBuilding(building);
    setShowBuildingDetails(true);
  };

  // Handle add single room
  const handleAddRoom = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    const formData = new FormData(e.target);
    const buildingId = formData.get('buildingId');
    const number = formData.get('number');
    const floor = formData.get('floor');
    const type = formData.get('type');
    const rent = formData.get('rent');
    const rentDueDay = formData.get('rentDueDay');

    if (!buildingId || number === '' || floor === '') {
      setFormError('Please fill in all required fields');
      setFormSaving(false);
      return;
    }

    try {
      await api.post(`/apartments/${buildingId}/units`, {
        number,
        floor: parseInt(floor),
        type: type || '1bed',
        rent: parseInt(rent) || 0,
        rentDueDay: rentDueDay ? parseInt(rentDueDay) : null
      });
      
      // The backend broadcasts apartment:updated after each room is added,
      // which triggers the socket listener to refresh the list automatically
      await fetchApartments();
      setShowRoomModal(false);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to add room');
    } finally {
      setFormSaving(false);
    }
  };

  // Handle bulk add rooms
  const handleBulkAddRooms = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    const formData = new FormData(e.target);
    const buildingId = formData.get('buildingId');
    const startNumber = parseInt(formData.get('startNumber'));
    const endNumber = parseInt(formData.get('endNumber'));
    const startFloor = parseInt(formData.get('startFloor'));
    const endFloor = parseInt(formData.get('endFloor'));
    const type = formData.get('type');
    const rent = parseInt(formData.get('rent')) || 0;
    const rentDueDay = formData.get('rentDueDay');

    if (
      !buildingId || 
      isNaN(startNumber) || 
      isNaN(endNumber) || 
      isNaN(startFloor) || 
      isNaN(endFloor)
    ) {
      setFormError('Please fill in all required fields');
      setFormSaving(false);
      return;
    }

    try {
      const results = { success: 0, failed: 0, duplicates: [] };
      
      for (let floor = startFloor; floor <= endFloor; floor++) {
        for (let i = startNumber; i <= endNumber; i++) {
          let roomNumber = i.toString();
          
          // Only prefix if the number is small (sequence) OR if we are on multiple floors
          // and the number doesn't already look like it belongs to that floor
          if (startFloor !== endFloor && !roomNumber.startsWith(floor.toString())) {
            roomNumber = `${floor}${i.toString().padStart(2, '0')}`;
          }

          try {
            await api.post(`/apartments/${buildingId}/units`, {
              number: roomNumber,
              floor,
              type,
              rent,
              rentDueDay: rentDueDay ? parseInt(rentDueDay) : null
            });
            results.success++;
          } catch (err) {
            results.failed++;
            if (err.response?.status === 400) results.duplicates.push(roomNumber);
          }
        }
      }
      
      await fetchApartments();
      
      if (results.failed > 0) {
        setFormError(`Added ${results.success} rooms. Failed to add ${results.failed} rooms${results.duplicates.length > 0 ? ` (Duplicates: ${results.duplicates.join(', ')})` : ''}.`);
      } else {
        setShowBulkAddModal(false);
      }
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to add rooms');
    } finally {
      setFormSaving(false);
    }
  };

  // Handle adding floors
  const handleAddFloors = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    const formData = new FormData(e.target);
    const buildingId = formData.get('buildingId');
    const startFloor = parseInt(formData.get('startFloor'));
    const endFloor = parseInt(formData.get('endFloor'));
    const roomsPerFloor = parseInt(formData.get('roomsPerFloor')) || 1;
    const type = formData.get('type');
    const rent = parseInt(formData.get('rent')) || 0;
    const rentDueDay = formData.get('rentDueDay');

    if (!buildingId || isNaN(startFloor) || isNaN(endFloor)) {
      setFormError('Please fill in all required fields');
      setFormSaving(false);
      return;
    }

    try {
      const results = { success: 0, failed: 0 };

      for (let floor = startFloor; floor <= endFloor; floor++) {
        for (let room = 1; room <= roomsPerFloor; room++) {
          const roomNumber = `${floor}${room.toString().padStart(2, '0')}`;
          try {
            await api.post(`/apartments/${buildingId}/units`, {
              number: roomNumber,
              floor,
              type: type || '1bed',
              rent,
              rentDueDay: rentDueDay ? parseInt(rentDueDay) : null
            });
            results.success++;
          } catch (err) {
            results.failed++;
          }
        }
      }
      
      await fetchApartments();
      
      if (results.failed > 0) {
        setFormError(`Added ${results.success} units. ${results.failed} units were already present or failed.`);
      } else {
        setShowAddFloorModal(false);
      }
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to add floors');
    } finally {
      setFormSaving(false);
    }
  };

  const handleSaveApartment = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.bedrooms = parseInt(data.bedrooms);
    data.bathrooms = parseInt(data.bathrooms);
    try {
      if (editingApartment?.unitId) {
        await api.put(`/apartments/${editingApartment._id}/units/${editingApartment.unitId}`, {
          number: data.buildingName, // Flattened UI uses 'buildingName' field for the unit number in the modal
          floor: parseInt(data.floor),
          type: data.bedrooms >= 3 ? '3bed' : data.bedrooms >= 2 ? '2bed' : '1bed',
          size: parseInt(data.area),
          rent: data.rent ? parseInt(data.rent) : 0,
          rentDueDay: data.rentDueDay ? parseInt(data.rentDueDay) : null
        });
      } else {
        await api.post('/apartments', data);
      }
      await fetchApartments();
      setShowModal(false);
      setEditingApartment(null);
    } catch (error) {
      setFormError(error.response?.data?.message || 'Failed to save apartment');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteBuilding = async (apt) => {
    if (!window.confirm(`Delete "${apt.buildingName}"? This will remove all units in this building.`)) return;
    try {
      await api.delete(`/apartments/${apt._id}`);
      await fetchApartments();
    } catch (error) {
      setFetchError(error.response?.data?.message || 'Failed to delete building');
    }
  };

  const handleDeleteUnit = async (apartment) => {
    if (!window.confirm(`Delete Unit ${apartment.number} in ${apartment.buildingName}?`)) return;
    try {
      await api.delete(`/apartments/${apartment._id}/units/${apartment.unitId}`);
      await fetchApartments();
    } catch (error) {
      setFetchError(error.response?.data?.message || 'Failed to delete apartment');
    }
  };

  const handleStatusToggle = async (apt) => {
    try {
      if (apt.status === 'occupied') {
        // Trying to mark as vacant - check if there's a tenant
        if (apt.tenant) {
          if (!window.confirm(`This unit has a tenant (${apt.tenant.name}). Remove tenant and mark as vacant?`)) {
            return;
          }
          await apartmentsAPI.unassignTenant(apt._id, {
            unitNumber: apt.number
          });
        } else {
          await apartmentsAPI.updateUnit(apt._id, apt.unitId, { isOccupied: false });
        }
      } else {
        // Trying to mark as occupied - need a tenant assigned
        if (!apt.tenant) {
          alert('Cannot mark unit as occupied. Please assign a tenant first.');
          return;
        }
        await apartmentsAPI.updateUnit(apt._id, apt.unitId, { isOccupied: true });
      }
      await fetchApartments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openTenantModal = async (apartment) => {
    const originalApt = apartments.find(a => a._id === apartment._id);
    const unitWithTenantIds = originalApt?.units?.find(u => u.number === apartment.number);
    const apartmentWithUnits = originalApt ? { ...apartment, units: originalApt.units } : apartment;
    setTenantApartment(apartmentWithUnits);
    setTenantError('');
    setTenantMode('existing');
    setSelectedTenants([]);
    setShowTenantModal(true);
    
    try {
      const res = await api.get('/auth/users', { params: { role: 'tenant' } });
      const allTenants = res.data.users || [];
      const assignedTenantIds = new Set();
      const unitData = unitWithTenantIds || apartment;
      if (unitData.tenantId) assignedTenantIds.add(typeof unitData.tenantId === 'object' ? unitData.tenantId._id?.toString() : unitData.tenantId.toString());
      if (unitData.tenantIds) {
        unitData.tenantIds.forEach(t => assignedTenantIds.add(typeof t === 'object' ? t._id?.toString() : t.toString()));
      }
      const unassignedTenants = allTenants.filter(t => {
        const tenantIdStr = t._id.toString();
        if (!t.apartmentId && !t.roomNumber) return true;
        return !assignedTenantIds.has(tenantIdStr);
      });
      setExistingTenants(unassignedTenants);
    } catch {
      setExistingTenants([]);
    }
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    setTenantSaving(true);
    setTenantError('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      if (tenantMode === 'existing') {
        if (selectedTenants.length === 0) { setTenantError('Please select at least one tenant'); setTenantSaving(false); return; }
        await api.put(`/apartments/${tenantApartment._id}/units/assign`, {
          unitNumber: tenantApartment.number,
          tenantIds: selectedTenants,
          rentDueDay: data.rentDueDay ? parseInt(data.rentDueDay) : null,
        });
      } else {
        await api.post('/auth/register', {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          password: data.password,
          role: 'tenant',
          roomNumber: tenantApartment.number,
          apartmentId: tenantApartment._id,
          rentDueDay: data.rentDueDay ? parseInt(data.rentDueDay) : null,
        });
      }
      await fetchApartments();
      setShowTenantModal(false);
      setTenantApartment(null);
      setSelectedTenants([]);
    } catch (error) {
      setTenantError(error.response?.data?.message || 'Failed to assign tenant');
    } finally {
      setTenantSaving(false);
    }
  };

  const handleTenantSelection = (tenantId) => {
    setSelectedTenants(prev => {
      if (prev.includes(tenantId)) {
        return prev.filter(id => id !== tenantId);
      }
      return [...prev, tenantId];
    });
  };

  const handleRemoveTenant = async (apartment) => {
    if (!window.confirm(`Remove tenant ${apartment.tenant?.name} from Unit ${apartment.number}?`)) return;
    try {
      await apartmentsAPI.unassignTenant(apartment._id, {
        unitNumber: apartment.number
      });
      await fetchApartments();
    } catch (error) {
      setFetchError(error.response?.data?.message || 'Failed to remove tenant');
    }
  };

  const handle3DUnitClick = (building, unit) => {
    const flattened = flattenApartment(building).find(u => u.unitId === unit._id);
    if (flattened) {
      setEditingApartment(flattened);
      setFormError('');
      setShowModal(true);
    }
  };

  const handleAddGuard = async (e) => {
    e.preventDefault();
    setGuardSaving(true);
    setGuardError('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    try {
      if (guardMode === 'existing') {
        if (!data.guardId) { setGuardError('Please select a guard'); setGuardSaving(false); return; }
        await api.post(`/apartments/${guardApartment._id}/guards`, { guardId: data.guardId });
      } else {
        const reg = await api.post('/auth/register', {
          name: data.name,
          phone: data.phone,
          email: data.email || undefined,
          password: data.password,
          role: 'guard',
          apartmentId: guardApartment._id,
        });
        const newGuardId = reg.data.user?._id;
        if (newGuardId) {
          await api.post(`/apartments/${guardApartment._id}/guards`, { guardId: newGuardId });
        }
      }
      await fetchApartments();
      setShowGuardModal(false);
      setGuardApartment(null);
    } catch (error) {
      setGuardError(error.response?.data?.message || 'Failed to assign guard');
    } finally {
      setGuardSaving(false);
    }
  };

  const fetchAvailableGuards = async () => {
    try {
      const response = await authAPI.getUsers({ role: 'guard' });
      const allGuards = response.data?.users || [];
      const assignedGuardIds = guardApartment?.securityGuards?.map(g => g._id) || [];
      const availableGuards = allGuards.filter(g => !assignedGuardIds.includes(g._id));
      setExistingGuards(availableGuards);
    } catch (error) {
      console.error('Error fetching guards:', error);
    }
  };

  const handleRemoveGuard = async (building, guardId) => {
    setConfirmAction({
      message: 'Are you sure you want to remove this guard from the building?',
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await apartmentsAPI.removeGuard(building._id, guardId);
          await fetchApartments();
        } catch (error) {
          console.error('Error removing guard:', error);
        }
      }
    });
  };

  const getFilteredApartments = () => {
    return apartments.filter(apt => {
      const matchesSearch =
        apt.number?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.buildingName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || apt.status === filter;
      const matchesBuilding = buildingFilter === 'all' || apt._id === buildingFilter;
      
      return matchesSearch && matchesFilter && matchesBuilding;
    });
  };

  // Apply search and status filters to the flattened list
  const searchedAndFilteredItems = getFilteredApartments();

  // Separate units from building-only entries for display in 'units' and 'unitsTable' views
  const displayUnits = searchedAndFilteredItems.filter(item => item.unitId !== null);
  // For 'buildings' view, we use the raw buildings list, but we can also filter it by search term if needed
  // For now, the 'buildings' view (cards) is not filtered by search/status, only the table/unit cards are.
  // If the user wants to filter buildings by search term, we'd need a separate filteredBuildings list.

  const getStatusColor = (status) => status === 'occupied' ? '#10B981' : '#F59E0B';

  const stats = {
    total: apartments.filter(a => a.unitId !== null).length,
    occupied: apartments.filter(a => a.unitId !== null && a.status === 'occupied').length,
    vacant: apartments.filter(a => a.unitId !== null && a.status === 'vacant').length,
  };

  return (
    <div style={styles.container}>
      <style>{`
        @media (max-width: 768px) {
          .apartments-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .apartments-header > div:first-child {
            text-align: center;
          }
          .apartments-buttons {
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
          .apartments-stats {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .apartments-filters {
            flex-direction: column !important;
          }
          .apartments-search {
            width: 100% !important;
            max-width: none !important;
          }
          .apartments-grid {
            grid-template-columns: 1fr !important;
          }
          .apartments-modal {
            margin: 10px !important;
            padding: 16px !important;
          }
          .apartments-form-row {
            grid-template-columns: 1fr !important;
          }
          .apartments-table {
            display: block !important;
            overflow-x: auto !important;
          }
        }
        @media (max-width: 480px) {
          .apartments-stats {
            grid-template-columns: 1fr !important;
          }
          .apartments-title {
            font-size: 20px !important;
          }
          .apartments-card {
            padding: 8px !important;
          }
          .apartments-card-header {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .apartments-card-footer {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
      `}</style>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={styles.header} className="apartments-header">
          <div>
            <h1 style={styles.title} className="apartments-title">Buildings & Rooms</h1>
            <p style={styles.subtitle}>Manage buildings and their units</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }} className="apartments-buttons">
            {/* View Toggle */}
            <div style={styles.viewToggle}>
              <button
                onClick={() => setViewMode('units')}
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === 'units' ? styles.viewToggleBtnActive : {})
                }}
              >
                🚪 Units
              </button>
              <button
                onClick={() => setViewMode('unitsTable')}
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === 'unitsTable' ? styles.viewToggleBtnActive : {})
                }}
              >
                📋 Table
              </button>
              <button
                onClick={() => setViewMode('buildings')}
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === 'buildings' ? styles.viewToggleBtnActive : {})
                }}
              >
                🏢 Buildings
              </button>
              <button
                onClick={() => setViewMode('3d')}
                style={{
                  ...styles.viewToggleBtn,
                  ...(viewMode === '3d' ? styles.viewToggleBtnActive : {})
                }}
              >
                🏗️ 3D View
              </button>
            </div>
            <button onClick={() => { setShowModal(true); setEditingApartment(null); setFormError(''); }} style={styles.addButton}>
              + Add Building
            </button>
            <button onClick={() => { setShowRoomModal(true); setEditingApartment(null); setFormError(''); }} style={{ ...styles.addButton, backgroundColor: COLORS.secondary }}>
              + Add Room
            </button>
            <button onClick={() => { setShowAddFloorModal(true); setFormError(''); }} style={{ ...styles.addButton, backgroundColor: '#10B981' }}>
              🏗️ Add Floor
            </button>
            <button onClick={() => { setShowBulkAddModal(true); setFormError(''); }} style={{ ...styles.addButton, backgroundColor: '#8B5CF6' }}>
              ⚡ Bulk Add
            </button>
          </div>
        </div>

        <div style={styles.statsGrid} className="apartments-stats">
          <div style={{ ...styles.statCard, borderLeft: `4px solid ${COLORS.textSecondary}` }}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total Units</div>
          </div>
          <div style={{ ...styles.statCard, borderLeft: `4px solid ${COLORS.primary}` }}>
            <div style={styles.statValue}>{stats.occupied}</div>
            <div style={styles.statLabel}>Occupied</div>
          </div>
          <div style={{ ...styles.statCard, borderLeft: '4px solid #F59E0B' }}>
            <div style={styles.statValue}>{stats.vacant}</div>
            <div style={styles.statLabel}>Vacant</div>
          </div>
        </div>

        <div style={styles.filters} className="apartments-filters">
          <input
            type="text"
            placeholder="Search apartments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            className="apartments-search"
          />
          <div style={styles.filterButtons}>
            {['all', 'occupied', 'vacant'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterButton,
                  backgroundColor: filter === f ? COLORS.primary : 'transparent',
                  color: filter === f ? '#fff' : COLORS.textSecondary,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {fetchError && (
          <div style={{ color: COLORS.danger, padding: '16px', textAlign: 'center' }}>{fetchError}</div>
        )}
        
        {loading ? ( // Loading state for all views
          <div style={styles.loadingContainer}><div style={styles.spinner} /></div>
        ) : (viewMode === 'units' || viewMode === 'unitsTable') && displayUnits.length === 0 ? ( // Empty state for unit views
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏢</span>
            <h3>No apartments found</h3>
            <p style={{ color: COLORS.textSecondary, marginTop: '8px', fontSize: '14px' }}>
              Click "+ Add Apartment" to create one
            </p>
          </div>
        ) : viewMode === 'buildings' && buildings.length === 0 ? ( // Empty state for buildings view
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏢</span>
            <h3>No buildings found</h3>
            <p style={{ color: COLORS.textSecondary, marginTop: '8px', fontSize: '14px' }}>
              Click "+ Add Building" to create one
            </p>
          </div>
        ) : viewMode === '3d' && buildings.length === 0 ? ( // Empty state for 3D view
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🏗️</span>
            <h3>No buildings to visualize</h3>
            <p style={{ color: COLORS.textSecondary, marginTop: '8px', fontSize: '14px' }}>
              Add a building and some rooms to see the 3D view.
            </p>
          </div>
        ) : viewMode === 'buildings' ? (
          <div style={styles.grid} className="apartments-grid">
            {buildings.map((building, index) => {
              const totalRent = building.units?.reduce((sum, u) => sum + (u.rent || 0), 0) || 0;
              const occupiedUnits = building.units?.filter(u => u.isOccupied).length || 0;
              const avgRent = building.units?.length ? Math.round(totalRent / building.units.length) : 0;
              return (
              <motion.div
                key={building._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                style={styles.buildingCard}
              >
                <div style={styles.buildingCardHeader}>
                  <h3 style={{ ...styles.apartmentNumber, margin: 0 }}>{building.buildingName}</h3>
                  <span style={styles.buildingCardStats}>
                    {building.units?.length || 0} Units
                  </span>
                </div>
                <div style={styles.buildingCardBody}>
                  <p style={styles.buildingCardText}>📍 {building.location?.address || 'No address'}</p>
                  <p style={styles.buildingCardText}>🏙️ {building.location?.city || 'Nairobi'}</p>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                    <p style={{ ...styles.buildingCardText, fontWeight: '600', color: '#10B981' }}>
                      💰 Total Rent: KES {totalRent.toLocaleString()}/mo
                    </p>
                    <p style={{ ...styles.buildingCardText, fontSize: '12px' }}>
                      Avg: KES {avgRent.toLocaleString()} | {occupiedUnits} occupied
                    </p>
                    <p style={{ ...styles.buildingCardText, fontSize: '12px', color: '#94A3B8' }}>
                      Due Day: {building.settings?.rentDueDay || 1}
                    </p>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <div style={styles.personLabel}>Security Staff ({building.securityGuards?.length || 0})</div>
                    {building.securityGuards?.map(g => (
                      <div key={g._id} style={{ ...styles.tenantInfo, marginTop: '8px' }}>
                        <div style={{ ...styles.personAvatar, backgroundColor: COLORS.secondary, width: '24px', height: '24px', fontSize: '10px' }}>
                          {g.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', color: COLORS.text }}>{g.name}</span>
                        <button
                          onClick={() => handleRemoveGuard(building, g._id)}
                          style={{ ...styles.actionButton, color: COLORS.danger, marginLeft: 'auto', padding: '2px 6px', fontSize: '11px' }}
                          title="Remove guard"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {(!building.securityGuards || building.securityGuards.length === 0) && (
                      <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '8px' }}>
                        No guards assigned yet
                      </p>
                    )}
                  </div>
                </div>
                <div style={styles.buildingCardFooter}>
                  <button
                    onClick={() => { setGuardApartment(building); setShowGuardModal(true); fetchAvailableGuards(); }}
                    style={{ ...styles.actionButton, color: COLORS.secondary }}
                  >
                    ➕ Add Guard
                  </button>
                  <button
                    onClick={() => openBuildingDetails(building)}
                    style={{ ...styles.actionButton, color: COLORS.primary }}
                  >
                    👁️ Details
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(building)}
                    style={{ ...styles.actionButton, color: COLORS.danger }}
                  >
                    🗑️
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        ) :
        viewMode === 'unitsTable' ? (
          <div style={styles.tableContainer} className="apartments-table">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Building</th>
                  <th style={styles.th}>Floor</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Tenant</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUnits.map((apartment, index) => (
                  <motion.tr
                    key={`${apartment._id}-${apartment.unitId || index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    style={styles.tr}
                  >
                    <td style={styles.td}>
                      <span style={{ fontWeight: '600', color: COLORS.text }}>Unit {apartment.number}</span>
                    </td>
                    <td style={styles.td}>{apartment.buildingName}</td>
                    <td style={styles.td}>{apartment.floor}</td>
                    <td style={styles.td}>
                      {apartment.bedrooms !== '-' ? `${apartment.bedrooms} bed` : '-'}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: getStatusColor(apartment.status) + '20',
                          color: getStatusColor(apartment.status),
                        }}
                      >
                        {apartment.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {apartment.tenant ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ ...styles.personAvatar, backgroundColor: COLORS.primary, width: '28px', height: '28px', fontSize: '12px' }}>
                            {apartment.tenant.name?.charAt(0).toUpperCase() || 'T'}
                          </div>
                          <span>{apartment.tenant.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: COLORS.textSecondary, fontStyle: 'italic' }}>No tenant</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {apartment.tenant?.phone || '-'}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            const building = buildings.find(b => b._id === apartment._id);
                            if (building) openBuildingDetails(building);
                          }}
                          style={{ ...styles.actionButton, fontSize: '14px', color: '#8B5CF6' }}
                          title="View Building"
                        >
                          🏢
                        </button>
                        {apartment.tenant ? (
                          <button
                            onClick={() => handleRemoveTenant(apartment)}
                            style={{ ...styles.actionButton, fontSize: '14px', color: '#EF4444' }}
                            title="Remove Tenant"
                          >
                            👤✕
                          </button>
                        ) : (
                          <button
                            onClick={() => openTenantModal(apartment)}
                            style={{ ...styles.actionButton, fontSize: '14px', color: '#10B981' }}
                            title="Add Tenant"
                          >
                            👤+
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusToggle(apartment)}
                          style={{ ...styles.actionButton, fontSize: '14px', color: apartment.status === 'occupied' ? '#10B981' : '#F59E0B' }}
                          title={apartment.status === 'occupied' ? 'Mark Vacant' : 'Mark Occupied'}
                        >
                          {apartment.status === 'occupied' ? '✓' : '○'}
                        </button>
                        <button
                          onClick={() => { setEditingApartment(apartment); setFormError(''); setShowModal(true); }}
                          style={{ ...styles.actionButton, fontSize: '14px' }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(apartment)}
                          style={{ ...styles.actionButton, fontSize: '14px' }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === '3d' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {buildings.map((building) => (
              <BuildingVisualizer 
                key={building._id} 
                apartment={building} 
                onUnitClick={(unit) => handle3DUnitClick(building, unit)}
                tenantPaymentStatus={tenantPaymentStatus}
              />
            ))}
          </div>
        ) : (
          <div style={styles.grid} className="apartments-grid">
            {displayUnits.map((apartment, index) => (
              <motion.div
                key={`${apartment._id}-${apartment.unitId || index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                style={styles.apartmentCard}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.apartmentNumber}>
                      {apartment.buildingName !== apartment.number ? apartment.buildingName + ' — ' : ''}
                      Unit {apartment.number}
                    </h3>
                    <span style={styles.floor}>Floor {apartment.floor}</span>
                  </div>
                  <button
                    onClick={() => handleStatusToggle(apartment)}
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(apartment.status) + '20',
                      color: getStatusColor(apartment.status),
                    }}
                  >
                    {apartment.status}
                  </button>
                </div>

                <div style={styles.cardBody}>
                  {apartment.tenant ? (
                    <div style={styles.tenantInfo}>
                      <div style={{ ...styles.personAvatar, backgroundColor: COLORS.primary }}>
                        {apartment.tenant.name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.personLabel}>Tenant</div>
                        <div style={styles.personName}>{apartment.tenant.name}</div>
                        <div style={styles.personContact}>{apartment.tenant.phone}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.noAssigned}>No tenant assigned</div>
                  )}
                </div>
                <div style={styles.cardFooter}>
                  {apartment.tenant ? (
                    <button
                      onClick={() => handleRemoveTenant(apartment)}
                      style={{ ...styles.tenantActionBtn, color: '#EF4444' }}
                      title="Remove Tenant"
                    >
                      ✕ Remove Tenant
                    </button>
                  ) : (
                    <button
                      onClick={() => openTenantModal(apartment)}
                      style={{ ...styles.tenantActionBtn, color: '#10B981' }}
                      title="Add Tenant"
                    >
                      + Add Tenant
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusToggle(apartment)}
                    style={{
                      ...styles.statusToggleBtn,
                      color: apartment.status === 'occupied' ? '#10B981' : '#F59E0B',
                    }}
                    title="Toggle Status"
                  >
                    {apartment.status === 'occupied' ? '✓ Occupied' : '○ Vacant'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Tenant Modal */}
      <AnimatePresence>
        {showTenantModal && tenantApartment && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowTenantModal(false); setTenantApartment(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>
                {tenantApartment.tenant ? `Remove Tenant — Unit ${tenantApartment.number}` : `Assign Tenant — Unit ${tenantApartment.number}`}
              </h2>

              {tenantApartment.tenant ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ marginBottom: '20px', color: COLORS.textSecondary }}>
                    Currently, <strong style={{ color: COLORS.text }}>{tenantApartment.tenant.name}</strong> is assigned to this unit.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.put(`/apartments/${tenantApartment._id}/units/assign`, {
                          unitNumber: tenantApartment.number,
                          tenantId: null,
                        });
                        await fetchApartments();
                        setShowTenantModal(false);
                        setTenantApartment(null);
                      } catch (error) {
                        setTenantError(error.response?.data?.message || 'Failed to remove tenant');
                      }
                    }}
                    style={{ ...styles.submitButton, backgroundColor: '#EF4444', padding: '12px 24px' }}
                  >
                    Remove Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTenantModal(false); setTenantApartment(null); }}
                    style={{ ...styles.cancelButton, marginLeft: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode toggle */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setTenantMode('existing')}
                      style={{ ...styles.modeBtn, ...(tenantMode === 'existing' ? styles.modeBtnActive : {}) }}
                    >
                      Existing User
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantMode('new')}
                      style={{ ...styles.modeBtn, ...(tenantMode === 'new' ? styles.modeBtnActive : {}) }}
                    >
                      New User
                    </button>
                  </div>

                  <form onSubmit={handleAddTenant}>
                    {tenantMode === 'existing' ? (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Select Tenants (choose multiple)</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '8px' }}>
                          {existingTenants.map(t => (
                            <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderBottom: '1px solid #F3F4F6' }}>
                              <input
                                type="checkbox"
                                checked={selectedTenants.includes(t._id)}
                                onChange={() => handleTenantSelection(t._id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <span>
                                <span style={{ fontWeight: 500 }}>{t.name}</span>
                                {t.phone && <span style={{ color: COLORS.textSecondary }}> ({t.phone})</span>}
                                {t.roomNumber && <span style={{ color: COLORS.textSecondary }}> · Unit {t.roomNumber}</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                        {selectedTenants.length > 0 && (
                          <p style={{ fontSize: '12px', color: COLORS.primary, marginTop: '6px' }}>
                            {selectedTenants.length} tenant(s) selected
                          </p>
                        )}
                        {existingTenants.length === 0 && (
                          <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '6px' }}>
                            No unassigned tenants found. Use "New User" to create one.
                          </p>
                        )}
                      </div>
                    ) : (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="tenant-name">Full Name *</label>
                      <input id="tenant-name" name="name" style={styles.input} required autoComplete="name" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="tenant-phone">Phone *</label>
                      <input id="tenant-phone" name="phone" type="tel" style={styles.input} required autoComplete="tel" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="tenant-email">Email</label>
                      <input id="tenant-email" name="email" type="email" style={styles.input} autoComplete="email" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="tenant-password">Password *</label>
                      <input id="tenant-password" name="password" type="password" style={styles.input} required minLength={6} autoComplete="new-password" placeholder="Min 6 characters" />
                    </div>
                  </>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="tenant-rent-due-day">Rent Due Day (optional)</label>
                  <select id="tenant-rent-due-day" name="rentDueDay" style={styles.select}>
                    <option value="">— Use room default —</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '6px' }}>
                    Set a custom day (1-31) for this tenant's rent payment. Leave empty to use the room's default.
                  </p>
                </div>
                {tenantError && <p style={styles.errorText}>{tenantError}</p>}
                <div style={styles.modalActions}>
                  <button type="button" onClick={() => { setShowTenantModal(false); setTenantApartment(null); }} style={styles.cancelButton} disabled={tenantSaving}>Cancel</button>
                  <button type="submit" style={{ ...styles.submitButton, opacity: tenantSaving ? 0.7 : 1 }} disabled={tenantSaving}>
                    {tenantSaving ? 'Adding...' : 'Add Tenant'}
                  </button>
                </div>
              </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Guard Modal */}
      <AnimatePresence>
        {showGuardModal && guardApartment && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowGuardModal(false); setGuardApartment(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>Assign Guard — {guardApartment.buildingName}</h2>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button type="button" onClick={() => setGuardMode('existing')} style={{ ...styles.modeBtn, ...(guardMode === 'existing' ? styles.modeBtnActive : {}) }}>Existing Guard</button>
                <button type="button" onClick={() => setGuardMode('new')} style={{ ...styles.modeBtn, ...(guardMode === 'new' ? styles.modeBtnActive : {}) }}>New Guard</button>
              </div>
              <form onSubmit={handleAddGuard}>
                {guardMode === 'existing' ? (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="guard-select">Select Guard</label>
                    <select id="guard-select" name="guardId" style={styles.select}>
                      <option value="">— Select a guard —</option>
                      {existingGuards.map(g => (
                        <option key={g._id} value={g._id}>
                          {g.name} {g.phone ? `(${g.phone})` : ''}
                        </option>
                      ))}
                    </select>
                    {existingGuards.length === 0 && (
                      <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '6px' }}>
                        No guards found. Use "New Guard" to create one.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="guard-name">Full Name *</label>
                      <input id="guard-name" name="name" style={styles.input} required autoComplete="name" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="guard-phone">Phone *</label>
                      <input id="guard-phone" name="phone" type="tel" style={styles.input} required autoComplete="tel" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="guard-email">Email</label>
                      <input id="guard-email" name="email" type="email" style={styles.input} autoComplete="email" />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="guard-password">Password *</label>
                      <input id="guard-password" name="password" type="password" style={styles.input} required minLength={6} autoComplete="new-password" placeholder="Min 6 characters" />
                    </div>
                  </>
                )}
                {guardError && <p style={styles.errorText}>{guardError}</p>}
                <div style={styles.modalActions}>
                  <button type="button" onClick={() => { setShowGuardModal(false); setGuardApartment(null); }} style={styles.cancelButton} disabled={guardSaving}>Cancel</button>
                  <button type="submit" style={{ ...styles.submitButton, backgroundColor: COLORS.secondary, opacity: guardSaving ? 0.7 : 1 }} disabled={guardSaving}>
                    {guardSaving ? 'Assigning...' : 'Assign Guard'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div style={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div style={styles.modal} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 style={{ ...styles.modalTitle, marginBottom: '16px' }}>Confirm Action</h3>
              <p style={{ marginBottom: '24px', color: COLORS.textSecondary }}>{confirmAction.message}</p>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setConfirmAction(null)} style={styles.cancelButton}>Cancel</button>
                <button type="button" onClick={confirmAction.onConfirm} style={{ ...styles.submitButton, backgroundColor: '#EF4444' }}>Confirm</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Building Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowModal(false); setEditingApartment(null); setFormError(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              className="apartments-modal"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>
                {editingApartment?.unitId ? 'Edit Unit' : editingApartment ? 'Edit Building' : 'Add New Building'}
              </h2>
              <form onSubmit={handleSaveApartment}>
                {editingApartment?.unitId && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Building</label>
                    <select 
                      style={{ ...styles.select, opacity: 0.7 }} 
                      disabled 
                      defaultValue={editingApartment._id}
                    >
                      <option value={editingApartment._id}>{editingApartment.buildingName}</option>
                    </select>
                    <p style={{ fontSize: '11px', color: COLORS.textSecondary, marginTop: '4px' }}>
                      To move a unit to another building, please delete and recreate it.
                    </p>
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="building-name">
                    {editingApartment?.unitId ? 'Unit Number *' : 'Building Name *'}
                  </label>
                  <input
                    id="building-name" name="buildingName"
                    defaultValue={editingApartment?.unitId ? editingApartment.number : editingApartment?.buildingName}
                    style={styles.input} required autoComplete="off"
                    placeholder={editingApartment?.unitId ? "e.g., 101" : "e.g., Block A, Tower 1"}
                  />
                </div>
                {!editingApartment?.unitId && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="building-code">Building Code</label>
                      <input
                        id="building-code" name="buildingCode"
                        defaultValue={editingApartment?.buildingCode}
                        style={styles.input} autoComplete="off"
                        placeholder="e.g., BLD-001 (optional)"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="address">Address</label>
                      <input
                        id="address" name="address"
                        defaultValue={editingApartment?.address || ''}
                        style={styles.input} autoComplete="off"
                        placeholder="Street address"
                      />
                    </div>
                  </>
                )}
                {(!editingApartment || !editingApartment.unitId) && (
                  <div style={styles.formRow} className="apartments-form-row">
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="city">City</label>
                      <input
                        id="city" name="city"
                        defaultValue={editingApartment?.city || 'Nairobi'}
                        style={styles.input} autoComplete="off"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="county">County</label>
                      <input
                        id="county" name="county"
                        defaultValue={editingApartment?.county || 'Nairobi'}
                        style={styles.input} autoComplete="off"
                      />
                    </div>
                  </div>
                )}
                {editingApartment?.unitId && (
                  <div style={styles.formRow} className="apartments-form-row">
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="floor">Floor</label>
                      <input
                        id="floor" name="floor" type="number"
                        defaultValue={editingApartment.floor}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="area">Area (sqm)</label>
                      <input
                        id="area" name="area" type="number"
                        defaultValue={editingApartment.area}
                        style={styles.input}
                      />
                    </div>
                  </div>
                )}
                {editingApartment?.unitId && (
                  <div style={styles.formRow} className="apartments-form-row">
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="rent">Monthly Rent</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CurrencySelector
                          value={selectedCurrency}
                          onChange={setSelectedCurrency}
                          showCurrencyCode={false}
                        />
                        <input
                          id="rent" name="rent" type="number"
                          defaultValue={editingApartment.rent || ''}
                          style={{ ...styles.input, flex: 1 }}
                          placeholder="e.g., 50000"
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label} htmlFor="rentDueDay">Rent Due Day</label>
                      <select
                        id="rentDueDay" name="rentDueDay"
                        defaultValue={editingApartment.rentDueDay || ''}
                        style={styles.select}
                      >
                        <option value="">— Select day —</option>
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {formError && <p style={styles.errorText}>{formError}</p>}
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingApartment(null); setFormError(''); }}
                    style={styles.cancelButton}
                    disabled={formSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={{ ...styles.submitButton, opacity: formSaving ? 0.7 : 1 }} disabled={formSaving}>
                    {formSaving ? 'Saving...' : editingApartment ? 'Update' : 'Create Building'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Room Modal */}
      <AnimatePresence>
        {showRoomModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowRoomModal(false); setFormError(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>Add Room to Building</h2>
              <form onSubmit={handleAddRoom}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="room-building">Select Building *</label>
                  <select id="room-building" name="buildingId" style={styles.select} required>
                    <option value="">— Select a building —</option>
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.buildingName} ({b.units?.length || 0} units)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="room-number">Room/Unit Number *</label>
                    <input
                      id="room-number" name="number"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 101"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="room-floor">Floor *</label>
                    <input
                      id="room-floor" name="floor" type="number"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 1"
                    />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="room-type">Unit Type</label>
                    <select id="room-type" name="type" style={styles.select} defaultValue="1bed">
                      <option value="studio">Studio</option>
                      <option value="bedsitter">Bedsitter</option>
                      <option value="1bed">1 Bedroom</option>
                      <option value="2bed">2 Bedroom</option>
                      <option value="3bed">3 Bedroom</option>
                      <option value="4bed">4 Bedroom</option>
                      <option value="penthouse">Penthouse</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="room-rent">Monthly Rent</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <CurrencySelector
                        value={roomCurrency}
                        onChange={setRoomCurrency}
                        showCurrencyCode={false}
                      />
                      <input
                        id="room-rent" name="rent" type="number"
                        style={{ ...styles.input, flex: 1 }} autoComplete="off"
                        placeholder="e.g., 500"
                      />
                    </div>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="room-rent-due-day">Rent Due Day (for all tenants in this room)</label>
                  <select id="room-rent-due-day" name="rentDueDay" style={styles.select}>
                    <option value="">— Use building default —</option>
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>
                    Set a specific day (1-31) for rent payment. Leave empty to use building default.
                  </p>
                </div>
                {formError && <p style={styles.errorText}>{formError}</p>}
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowRoomModal(false); setFormError(''); }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={{ ...styles.submitButton, opacity: formSaving ? 0.7 : 1 }} disabled={formSaving}>
                    {formSaving ? 'Adding...' : 'Add Room'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Rooms Modal */}
      <AnimatePresence>
        {showBulkAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowBulkAddModal(false); setFormError(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              className="apartments-modal"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ ...styles.modalTitle, color: COLORS.text }}>⚡ Bulk Add Rooms</h2>
              <p style={{ color: COLORS.textSecondary || COLORS.gray[500], fontSize: '13px', marginBottom: '16px' }}>
                Add multiple rooms at once. You can add rooms to a single floor or across multiple floors.
              </p>
              <form onSubmit={handleBulkAddRooms}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="bulk-building">Select Building *</label>
                  <select id="bulk-building" name="buildingId" style={styles.select} required>
                    <option value="">— Select a building —</option>
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.buildingName} ({b.units?.length || 0} units)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow} className="apartments-form-row">
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="start-number">Start Room # *</label>
                    <input
                      id="start-number" name="startNumber" type="number" min="1"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 101"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="end-number">End Room # *</label>
                    <input
                      id="end-number" name="endNumber" type="number" min="1"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 110"
                    />
                  </div>
                </div>
                <div style={styles.formRow} className="apartments-form-row">
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="bulk-start-floor">Start Floor *</label>
                    <input
                      id="bulk-start-floor" name="startFloor" type="number" min="0"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="bulk-end-floor">End Floor *</label>
                    <input
                      id="bulk-end-floor" name="endFloor" type="number" min="0"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
                <div style={styles.formRow} className="apartments-form-row">
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="bulk-type">Unit Type</label>
                    <select id="bulk-type" name="type" style={styles.select} defaultValue="1bed">
                      <option value="studio">Studio</option>
                      <option value="bedsitter">Bedsitter</option>
                      <option value="1bed">1 Bedroom</option>
                      <option value="2bed">2 Bedroom</option>
                      <option value="3bed">3 Bedroom</option>
                      <option value="4bed">4 Bedroom</option>
                      <option value="penthouse">Penthouse</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="bulk-rent">Monthly Rent (per room)</label>
                    <input
                      id="bulk-rent" name="rent" type="number"
                      style={styles.input} autoComplete="off"
                      placeholder="e.g., 500"
                    />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="bulk-rent-due-day">Rent Due Day (for all tenants in these rooms)</label>
                  <select id="bulk-rent-due-day" name="rentDueDay" style={styles.select}>
                    <option value="">— Use building default —</option>
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>
                    Set a specific day (1-31) for rent payment. Leave empty to use building default.
                  </p>
                </div>
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowBulkAddModal(false); setFormError(''); }}
                    style={styles.cancelButton}
                    disabled={formSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={{ ...styles.submitButton, backgroundColor: '#8B5CF6', opacity: formSaving ? 0.7 : 1 }} disabled={formSaving}>
                    {formSaving ? 'Adding...' : 'Add Rooms'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Floor Modal */}
      <AnimatePresence>
        {showAddFloorModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowAddFloorModal(false); setFormError(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={styles.modal}
              className="apartments-modal"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ ...styles.modalTitle, color: COLORS.text }}>🏗️ Add Floors</h2>
              <p style={{ color: COLORS.textSecondary || COLORS.gray[500], fontSize: '13px', marginBottom: '16px' }}>
                Add multiple floors at once. Each floor will be created with the specified number of rooms.
              </p>
              <form onSubmit={handleAddFloors}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="floor-building">Select Building *</label>
                  <select id="floor-building" name="buildingId" style={styles.select} required>
                    <option value="">— Select a building —</option>
                    {buildings.map(b => (
                      <option key={b._id} value={b._id}>
                        {b.buildingName} ({b.units?.length || 0} units)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow} className="apartments-form-row">
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="start-floor">Start Floor *</label>
                    <input
                      id="start-floor" name="startFloor" type="number" min="0"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="end-floor">End Floor *</label>
                    <input
                      id="end-floor" name="endFloor" type="number" min="0"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
                <div style={styles.formRow} className="apartments-form-row">
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="rooms-per-floor">Rooms per Floor *</label>
                    <input
                      id="rooms-per-floor" name="roomsPerFloor" type="number" min="1"
                      style={styles.input} required autoComplete="off"
                      placeholder="e.g., 4"
                      defaultValue="1"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="floor-type">Unit Type</label>
                    <select id="floor-type" name="type" style={styles.select} defaultValue="1bed">
                      <option value="studio">Studio</option>
                      <option value="bedsitter">Bedsitter</option>
                      <option value="1bed">1 Bedroom</option>
                      <option value="2bed">2 Bedroom</option>
                      <option value="3bed">3 Bedroom</option>
                      <option value="4bed">4 Bedroom</option>
                      <option value="penthouse">Penthouse</option>
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="floor-rent">Monthly Rent (per room)</label>
                  <input
                    id="floor-rent" name="rent" type="number"
                    style={styles.input} autoComplete="off"
                    placeholder="e.g., 500"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="floor-rent-due-day">Rent Due Day (for all tenants in these rooms)</label>
                  <select id="floor-rent-due-day" name="rentDueDay" style={styles.select}>
                    <option value="">— Use building default —</option>
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' }}>
                    Set a specific day (1-31) for rent payment. Leave empty to use building default.
                  </p>
                </div>
                {formError && <p style={styles.errorText}>{formError}</p>}
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowAddFloorModal(false); setFormError(''); }}
                    style={styles.cancelButton}
                    disabled={formSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={{ ...styles.submitButton, backgroundColor: '#10B981', opacity: formSaving ? 0.7 : 1 }} disabled={formSaving}>
                    {formSaving ? 'Adding...' : 'Add Floors'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Building Details Modal */}
      <AnimatePresence>
        {showBuildingDetails && selectedBuilding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => { setShowBuildingDetails(false); setSelectedBuilding(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ ...styles.modal, maxWidth: '600px' }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={styles.modalTitle}>{selectedBuilding.buildingName}</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: COLORS.textSecondary, fontSize: '14px' }}>
                  📍 {selectedBuilding.location?.address || 'No address'}, {selectedBuilding.location?.city || 'Nairobi'}
                </p>
                <p style={{ color: COLORS.textSecondary, fontSize: '14px', marginTop: '4px' }}>
                  🏠 Building Code: {selectedBuilding.buildingCode || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.text, margin: 0 }}>
                    Units in this Building ({selectedBuilding.units?.length || 0})
                  </h3>
                  {selectedBuilding.units && selectedBuilding.units.length > 0 && (
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: selectedBuilding.units.filter(u => u.isOccupied).length === selectedBuilding.units.length
                          ? '#10B98120'
                          : selectedBuilding.units.filter(u => u.isOccupied).length === 0
                          ? '#F59E0B20'
                          : '#3B82F620',
                        color: selectedBuilding.units.filter(u => u.isOccupied).length === selectedBuilding.units.length
                          ? '#10B981'
                          : selectedBuilding.units.filter(u => u.isOccupied).length === 0
                          ? '#F59E0B'
                          : '#3B82F6',
                      }}
                    >
                      {selectedBuilding.units.filter(u => u.isOccupied).length === selectedBuilding.units.length
                        ? '✓ Full'
                        : selectedBuilding.units.filter(u => u.isOccupied).length === 0
                        ? '○ All Vacant'
                        : `◐ ${selectedBuilding.units.filter(u => u.isOccupied).length}/${selectedBuilding.units.length} Occupied`}
                    </span>
                  )}
                </div>
                {selectedBuilding.units && selectedBuilding.units.length > 0 && (
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '13px' }}>
                    <span style={{ color: '#10B981', fontWeight: '500' }}>
                      ✓ {selectedBuilding.units.filter(u => u.isOccupied).length} Occupied
                    </span>
                    <span style={{ color: '#F59E0B', fontWeight: '500' }}>
                      ○ {selectedBuilding.units.filter(u => !u.isOccupied).length} Vacant
                    </span>
                  </div>
                )}
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
                  {selectedBuilding.units && selectedBuilding.units.length > 0 ? (
                    (() => {
                      // Group units by floor
                      const floors = {};
                      selectedBuilding.units.forEach(unit => {
                        const floor = unit.floor || 1;
                        if (!floors[floor]) floors[floor] = [];
                        floors[floor].push(unit);
                      });
                      const sortedFloors = Object.keys(floors).sort((a, b) => parseInt(a) - parseInt(b));
                      
                      return sortedFloors.map(floor => {
                        const floorUnits = floors[floor];
                        const occupiedCount = floorUnits.filter(u => u.isOccupied).length;
                        const vacantCount = floorUnits.filter(u => !u.isOccupied).length;
                        
                        return (
                          <div key={floor} style={{ borderBottom: '1px solid #334155' }}>
                            <div 
                              style={{
                                padding: '10px 16px',
                                backgroundColor: '#1E293B',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '600', color: COLORS.text, fontSize: '14px' }}>
                                  🏢 Floor {floor}
                                </span>
                                <span style={{ fontSize: '12px', color: COLORS.textSecondary }}>
                                  ({floorUnits.length} rooms)
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '500' }}>
                                  ✓ {occupiedCount}
                                </span>
                                <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: '500' }}>
                                  ○ {vacantCount}
                                </span>
                                <button
                                  onClick={() => {
                                    setShowBuildingDetails(false);
                                    setSelectedBuilding(null);
                                    setShowRoomModal(true);
                                    setFormError('');
                                  }}
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    backgroundColor: '#10B981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                  }}
                                  title={`Add room to Floor ${floor}`}
                                >
                                  + Room
                                </button>
                              </div>
                            </div>
                            {floorUnits.map((unit, index) => (
                              <div 
                                key={unit._id || index}
                                style={{
                                  padding: '10px 16px',
                                  borderBottom: index < floorUnits.length - 1 ? '1px solid #334155' : 'none',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  backgroundColor: '#0F172A'
                                }}
                              >
                                <div>
                                  <span style={{ fontWeight: '600', color: COLORS.text }}>Unit {unit.number}</span>
                                  <span style={{ color: COLORS.textSecondary, fontSize: '13px', marginLeft: '8px' }}>
                                    {unit.type}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    backgroundColor: unit.isOccupied ? '#10B98120' : '#F59E0B20',
                                    color: unit.isOccupied ? '#10B981' : '#F59E0B',
                                  }}
                                >
                                  {unit.isOccupied ? 'Occupied' : 'Vacant'}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: COLORS.textSecondary }}>
                      No units in this building
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => { setShowBuildingDetails(false); setSelectedBuilding(null); }}
                  style={styles.cancelButton}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styles = {
  container: { padding: '16px', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  title: { fontSize: '24px', fontWeight: 'bold', color: COLORS.text, marginBottom: '4px' },
  subtitle: { color: COLORS.textSecondary, fontSize: '13px' },
  addButton: { padding: '8px 16px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  viewToggle: { display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#1E293B', borderRadius: '8px' },
  viewToggleBtn: { padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', backgroundColor: 'transparent', color: COLORS.textSecondary },
  viewToggleBtnActive: { backgroundColor: COLORS.primary, color: '#fff' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: '#1E293B', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', borderLeft: `4px solid ${COLORS.primary}` },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: '12px', color: COLORS.textSecondary, marginTop: '4px' },
  filters: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' },
  searchInput: { padding: '10px 16px', border: '1px solid #334155', borderRadius: '8px', minWidth: '150px', flex: '1', maxWidth: '300px', fontSize: '14px', backgroundColor: '#1E293B', color: '#F1F5F9' },
  filterButtons: { display: 'flex', gap: '8px', padding: '4px', backgroundColor: '#1E293B', borderRadius: '8px' },
  filterButton: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  loadingContainer: { display: 'flex', justifyContent: 'center', padding: '60px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #334155', borderTop: `3px solid ${COLORS.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: COLORS.textSecondary },
  emptyIcon: { fontSize: '64px', display: 'block', marginBottom: '16px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' },
  apartmentCard: { backgroundColor: '#1E293B', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', overflow: 'hidden' },
  cardHeader: { padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155' },
  apartmentNumber: { fontSize: '14px', fontWeight: 'bold', color: COLORS.text, marginBottom: '4px' },
  floor: { fontSize: '12px', color: COLORS.textSecondary },
  statusBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', border: 'none', cursor: 'pointer' },
  cardBody: { padding: '16px', minHeight: '72px' },
  tenantInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  personAvatar: { width: '36px', height: '36px', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', flexShrink: 0 },
  personLabel: { fontSize: '10px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' },
  personName: { fontWeight: '600', color: COLORS.text, fontSize: '13px' },
  personContact: { fontSize: '12px', color: COLORS.textSecondary },
  noAssigned: { color: COLORS.textSecondary, fontSize: '14px', fontStyle: 'italic' },
  cardFooter: { padding: '12px 16px', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { display: 'flex', gap: '12px', fontSize: '12px', color: COLORS.textSecondary },
  cardActions: { display: 'flex', gap: '8px' },
  actionButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '16px' },
  tenantActionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)' },
  statusToggleBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)' },
  buildingCard: { backgroundColor: '#1E293B', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', overflow: 'hidden' },
  buildingCardHeader: { padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' },
  buildingCardStats: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: COLORS.primary + '20',
    color: COLORS.primary,
  },
  buildingCardBody: { padding: '16px', color: COLORS.textSecondary, fontSize: '14px' },
  buildingCardText: { margin: '4px 0' },
  buildingCardFooter: { padding: '12px 16px', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#1E293B', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' },
  modalTitle: { fontSize: '20px', fontWeight: 'bold', color: COLORS.text, marginBottom: '20px' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: COLORS.text, marginBottom: '6px' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#0F172A', color: '#F1F5F9' },
  select: { width: '100%', padding: '12px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#0F172A', color: '#F1F5F9' },
  errorText: { color: COLORS.danger, fontSize: '13px', marginBottom: '12px' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', flexWrap: 'wrap' },
  modeBtn: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: 'transparent', color: COLORS.textSecondary, cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
  modeBtnActive: { backgroundColor: COLORS.primary, color: '#fff', border: `1px solid ${COLORS.primary}` },
  cancelButton: { padding: '10px 20px', backgroundColor: '#334155', color: '#F1F5F9', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  submitButton: { padding: '10px 20px', backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  tableContainer: { backgroundColor: '#1E293B', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#0F172A', borderBottom: '1px solid #334155' },
  tr: { borderBottom: '1px solid #334155', transition: 'background-color 0.2s' },
  td: { padding: '14px 16px', fontSize: '14px', color: COLORS.text, verticalAlign: 'middle' },
};

export default Apartments;
