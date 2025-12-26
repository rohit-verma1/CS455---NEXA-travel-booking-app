"use client";

/**
 * ServicesPage Component
 * 
 * This component displays and manages services (flights, trains, buses) for service providers.
 * 
 * EDIT FUNCTIONALITY:
 * When the edit button is clicked, the full service object is passed to onEditService(service).
 * The parent component should:
 * 1. Set selectedService with the passed service data
 * 2. Open the modal by calling setShowServiceModal(true)
 * 3. The ServiceFormModal should detect selectedService is populated and pre-fill all fields
 * 4. When submitting, check if selectedService exists:
 *    - If exists: Call PUT API with service_id (updateFlightService, updateTrainService, or updateBusService)
 *    - If null: Call POST API to create new service
 * 
 * The update APIs require the same body structure as POST, and are available from:
 * import { updateFlightService, updateTrainService, updateBusService } from '@/app/api';
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Clock, Plane, Train, Bus, Loader2, AlertTriangle, X, RefreshCw, Bell } from 'lucide-react';
import type { NotificationModalConfig, NotificationServiceModel } from '@/components/shared/notification-modal';
import { getAuthFromStorage } from '@/utils/authStorage';
import { 
  getBusServicesList, 
  getFlightServicesList, 
  getTrainServicesList,
  deleteBusService,
  deleteFlightService,
  deleteTrainService,
  type BusServiceListItem,
  type FlightServiceListItem,
  type TrainServiceListItem
} from '@/app/api';
import EditServiceForm from './edit-service-form';

type ServiceMode = 'flight' | 'train' | 'bus';
type ServiceItem = BusServiceListItem | FlightServiceListItem | TrainServiceListItem;

// Re-export for parent component to use
export { 
  updateBusService, 
  updateFlightService, 
  updateTrainService 
} from '@/app/api';

interface ServicesPageProps {
  theme: any;
  isDarkMode: boolean;
  services: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAddService: () => void;
  onEditService: (service: any) => void;
  showServiceModal: boolean;
  ServiceFormModal: any;
  selectedService: any;
  setShowServiceModal: (show: boolean) => void;
  handleServiceSubmit: () => void;
  onRequestNotification: (config: NotificationModalConfig) => void;
}

export default function ServicesPage({
  theme,
  isDarkMode,
  services,
  searchTerm,
  setSearchTerm,
  onAddService,
  onEditService,
  showServiceModal,
  ServiceFormModal,
  selectedService,
  setShowServiceModal,
  handleServiceSubmit,
  onRequestNotification
}: ServicesPageProps) {
  const t = theme;
  const [serviceMode, setServiceMode] = useState<ServiceMode>('flight');
  const [apiServices, setApiServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    serviceId: string | null;
    serviceName: string;
  }>({ show: false, serviceId: null, serviceName: '' });
  const [deleting, setDeleting] = useState(false);
  const [loadedModes, setLoadedModes] = useState<Set<ServiceMode>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  // Fetch services only when load button is clicked
  const handleLoadServices = async () => {
    // Get auth token
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setError('Please log in to view your services');
      setApiServices([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: ServiceItem[] = [];
      
      switch (serviceMode) {
        case 'flight':
          data = await getFlightServicesList(auth.token);
          break;
        case 'train':
          data = await getTrainServicesList(auth.token);
          break;
        case 'bus':
          data = await getBusServicesList(auth.token);
          break;
      }

      setApiServices(data);
      setLoadedModes(prev => new Set([...prev, serviceMode]));
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
      setApiServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Clear services when switching mode
  useEffect(() => {
    if (!loadedModes.has(serviceMode)) {
      setApiServices([]);
      setError(null);
    }
  }, [serviceMode, loadedModes]);

  // Filter services based on search term
  const filteredServices = apiServices.filter(service => {
    const searchLower = searchTerm.toLowerCase();
    
    // Check route information (source/destination codes)
    const routeMatch = 
      service.source.toLowerCase().includes(searchLower) ||
      service.destination.toLowerCase().includes(searchLower);
    
    // Check vehicle information
    const vehicleMatch = service.vehicle_model.toLowerCase().includes(searchLower) ||
      service.registration_no.toLowerCase().includes(searchLower);
    
    // Check service-specific fields
    let serviceSpecificMatch = false;
    if ('flight_number' in service) {
      serviceSpecificMatch = 
        service.flight_number.toLowerCase().includes(searchLower) ||
        service.airline_name.toLowerCase().includes(searchLower);
    } else if ('train_number' in service) {
      serviceSpecificMatch = 
        service.train_number.toLowerCase().includes(searchLower) ||
        service.train_name.toLowerCase().includes(searchLower);
    } else if ('bus_number' in service) {
      serviceSpecificMatch = 
        service.bus_travels_name.toLowerCase().includes(searchLower) ||
        service.bus_number.toString().includes(searchLower);
    }
    
    return routeMatch || vehicleMatch || serviceSpecificMatch;
  });

    // Helper function to format time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  // Helper function to get service display name
  const getServiceDisplayName = (service: ServiceItem) => {
    if ('flight_number' in service) {
      return `${service.airline_name} ${service.flight_number}`;
    } else if ('train_number' in service) {
      return `${service.train_name} (${service.train_number})`;
    } else if ('bus_number' in service) {
      return service.bus_travels_name;
    }
    return 'Unknown Service';
  };

  // Helper function to get route display
  const getRouteDisplay = (service: ServiceItem) => {
    return `${service.source} → ${service.destination}`;
  };

  const getServiceModelForService = (service: ServiceItem): NotificationServiceModel => {
    if ('flight_number' in service) {
      return 'flightservice';
    }
    if ('train_number' in service) {
      return 'trainservice';
    }
    return 'busservice';
  };

  // Helper function to get timing display
  const getTimingDisplay = (service: ServiceItem) => {
    return `${formatTime(service.departure_time)} - ${formatTime(service.arrival_time)}`;
  };

  // Handler to show delete confirmation
  const handleDeleteClick = (service: ServiceItem) => {
    setDeleteConfirmation({
      show: true,
      serviceId: service.service_id,
      serviceName: getServiceDisplayName(service),
    });
  };

  // Handler to cancel delete
  const handleCancelDelete = () => {
    setDeleteConfirmation({ show: false, serviceId: null, serviceName: '' });
  };

  // Handler to confirm delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation.serviceId) return;

    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setError('Please log in to delete services');
      return;
    }

    setDeleting(true);
    try {
      switch (serviceMode) {
        case 'flight':
          await deleteFlightService(deleteConfirmation.serviceId, auth.token);
          break;
        case 'train':
          await deleteTrainService(deleteConfirmation.serviceId, auth.token);
          break;
        case 'bus':
          await deleteBusService(deleteConfirmation.serviceId, auth.token);
          break;
      }

      // Remove the service from the local state
      setApiServices(prev => prev.filter(s => s.service_id !== deleteConfirmation.serviceId));
      
      // Close the confirmation dialog
      setDeleteConfirmation({ show: false, serviceId: null, serviceName: '' });
    } catch (err) {
      console.error('Error deleting service:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  // Handler for edit button - open the dedicated edit modal
  const handleEditClick = (service: ServiceItem) => {
    setServiceToEdit(service);
    setShowEditModal(true);
  };

  // Handler for edit submit
  const handleEditSubmit = () => {
    // Refresh the services list after edit
    setShowEditModal(false);
    setServiceToEdit(null);
    // Reload services for the current mode
    handleLoadServices();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${t.text}`}>Services & Routes</h1>
        <button 
          onClick={onAddService}
          className={`bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 via-blue-600 to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-lg`}>
          <Plus className="w-5 h-5" />
          Add New Service
        </button>
      </div>

      {/* Mode Toggle */}
      <div className={`${t.card} rounded-xl p-4 border ${t.cardBorder}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`${t.textSecondary} text-sm font-medium`}>Service Type:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setServiceMode('flight')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  serviceMode === 'flight'
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg'
                    : `${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${t.text}`
                }`}
              >
                <Plane className="w-4 h-4" />
                Flights
              </button>
              <button
                onClick={() => setServiceMode('train')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  serviceMode === 'train'
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg'
                    : `${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${t.text}`
                }`}
              >
                <Train className="w-4 h-4" />
                Trains
              </button>
              <button
                onClick={() => setServiceMode('bus')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  serviceMode === 'bus'
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg'
                    : `${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${t.text}`
                }`}
              >
                <Bus className="w-4 h-4" />
                Buses
              </button>
            </div>
          </div>
          <button
            onClick={handleLoadServices}
            disabled={loading}
            className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${t.text} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title={loadedModes.has(serviceMode) ? 'Reload services' : 'Load services'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`${t.card} rounded-xl p-4 border ${t.cardBorder}`}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${t.textSecondary} w-5 h-5`} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${t.text} ${isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:outline-none focus:border-sky-500`}
            />
          </div>
          <button className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg ${t.text} ${t.hover} transition-colors flex items-center gap-2`}>
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className={`${t.textSecondary} text-lg`}>Loading services...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={`${t.card} rounded-xl p-6 border border-red-500/50 bg-red-500/10`}>
          <p className="text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredServices.length === 0 && !loadedModes.has(serviceMode) && (
        <div className={`${t.card} rounded-xl p-12 border ${t.cardBorder}`}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`p-4 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {serviceMode === 'flight' && <Plane className={`w-12 h-12 ${t.textSecondary}`} />}
              {serviceMode === 'train' && <Train className={`w-12 h-12 ${t.textSecondary}`} />}
              {serviceMode === 'bus' && <Bus className={`w-12 h-12 ${t.textSecondary}`} />}
            </div>
            <h3 className={`text-xl font-bold ${t.text}`}>Load {serviceMode === 'flight' ? 'Flight' : serviceMode === 'train' ? 'Train' : 'Bus'} Services</h3>
            <p className={`${t.textSecondary}`}>
              Click the &quot;Load Services&quot; button above to fetch available {serviceMode} services
            </p>
          </div>
        </div>
      )}

      {/* Empty State - No results found */}
      {!loading && !error && filteredServices.length === 0 && loadedModes.has(serviceMode) && (
        <div className={`${t.card} rounded-xl p-12 border ${t.cardBorder}`}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`p-4 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {serviceMode === 'flight' && <Plane className={`w-12 h-12 ${t.textSecondary}`} />}
              {serviceMode === 'train' && <Train className={`w-12 h-12 ${t.textSecondary}`} />}
              {serviceMode === 'bus' && <Bus className={`w-12 h-12 ${t.textSecondary}`} />}
            </div>
            <h3 className={`text-xl font-bold ${t.text}`}>No {serviceMode} services found</h3>
            <p className={`${t.textSecondary}`}>
              {searchTerm 
                ? 'Try adjusting your search term' 
                : `You haven't created any ${serviceMode} services yet. Click "Add New Service" to get started.`}
            </p>
          </div>
        </div>
      )}

      {/* Services Grid */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map((service) => {
            // Parse occupancy string (format: "23/142" or "154/154 (100%)")
            const occupancyMatch = service.occupancy.match(/(\d+)\/(\d+)/);
            const bookedSeats = occupancyMatch ? parseInt(occupancyMatch[1]) : 0;
            const totalCapacity = occupancyMatch ? parseInt(occupancyMatch[2]) : 1;
            const occupancyPercent = totalCapacity > 0 ? (bookedSeats / totalCapacity) * 100 : 0;

            return (
              <div key={service.service_id} className={`${t.card} rounded-xl p-6 border ${t.cardBorder} hover:border-sky-500 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/20`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-xl font-bold ${t.text}`}>{getServiceDisplayName(service)}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        service.status.toLowerCase() === 'scheduled' || service.status.toLowerCase() === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {service.status}
                      </span>
                    </div>
                    <p className={`${t.textSecondary} text-sm mb-2`}>{getRouteDisplay(service)}</p>
                    <div className={`flex items-center gap-2 ${t.textSecondary} text-sm`}>
                      <Clock className="w-4 h-4" />
                      {getTimingDisplay(service)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRequestNotification({
                        targetAudienceType: 'service',
                        serviceId: service.service_id,
                        serviceModel: getServiceModelForService(service)
                      })}
                      className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded-lg transition-colors`}
                      title="Notify service"
                    >
                      <Bell className={`w-4 h-4 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                    </button>
                    <button 
                      onClick={() => handleEditClick(service)}
                      className={`p-2 hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg transition-colors`}
                      title="Edit service">
                      <Edit2 className={`w-4 h-4 ${t.textSecondary}`} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(service)}
                      className={`p-2 hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg transition-colors`}
                      title="Delete service">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`${t.textSecondary}`}>Vehicle</span>
                    <span className={`${t.text} font-medium`}>{service.vehicle_model}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${t.textSecondary}`}>Registration</span>
                    <span className={`${t.text} font-medium`}>{service.registration_no}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${t.textSecondary}`}>Price Range</span>
                    <span className={`${t.text} font-medium`}>{service.price_range}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`${t.textSecondary}`}>Distance</span>
                    <span className={`${t.text} font-medium`}>{service.distance_km} km</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${t.textSecondary}`}>Occupancy</span>
                      <span className={`${t.text} font-medium`}>{service.occupancy}</span>
                    </div>
                    <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                      <div 
                        className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <ServiceFormModal 
            isDarkMode={isDarkMode}
            onClose={() => setShowServiceModal(false)}
            onSubmit={handleServiceSubmit}
            selectedService={selectedService}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${t.card} rounded-xl border ${t.cardBorder} max-w-md w-full shadow-2xl`}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-full bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-bold ${t.text} mb-2`}>Delete Service</h3>
                  <p className={`${t.textSecondary} text-sm`}>
                    Are you sure you want to delete this service? This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className={`p-1 hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg transition-colors`}>
                  <X className={`w-5 h-5 ${t.textSecondary}`} />
                </button>
              </div>

              {/* Service Name */}
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'} mb-6`}>
                <p className={`${t.text} font-medium text-center`}>{deleteConfirmation.serviceName}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className={`flex-1 px-4 py-3 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${t.text} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}>
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:via-red-600 hover:to-red-700 text-white font-medium transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && serviceToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <EditServiceForm
            isDarkMode={isDarkMode}
            service={serviceToEdit}
            onClose={() => {
              setShowEditModal(false);
              setServiceToEdit(null);
            }}
            onSubmit={handleEditSubmit}
          />
        </div>
      )}
    </div>
  );
}
