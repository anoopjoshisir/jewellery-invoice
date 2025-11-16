/**
 * Restaurant Table Management Models
 *
 * Defines data structures for restaurant table management including:
 * - Table definitions with capacity and status
 * - Floor plans and sections
 * - Table reservations
 * - Table assignments to orders
 */

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  BILLED = 'billed',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance'
}

export enum TableShape {
  SQUARE = 'square',
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  OVAL = 'oval'
}

export interface TablePosition {
  x: number; // X coordinate on floor plan (pixels or grid units)
  y: number; // Y coordinate on floor plan
  width: number; // Width in pixels or grid units
  height: number; // Height in pixels or grid units
  rotation: number; // Rotation in degrees (0-360)
}

export interface RestaurantTable {
  id?: string;
  tenantId: string;

  // Basic Information
  tableNumber: string; // e.g., "T1", "A-12", "VIP-5"
  displayName: string; // Friendly name shown to customers

  // Capacity and Layout
  capacity: number; // Number of seats
  minCapacity?: number; // Minimum guests for booking
  shape: TableShape;

  // Location
  sectionId: string; // Reference to section/area
  floorId: string; // Reference to floor
  position?: TablePosition; // Position on floor plan for visual layout

  // Status
  status: TableStatus;
  currentOrderId?: string; // Reference to active order
  currentReservationId?: string; // Reference to active reservation

  // Metadata
  features: string[]; // e.g., ["window-view", "private", "outdoor", "ac"]
  priority: number; // For sorting/display order (1-100)
  qrCode?: string; // QR code for contactless ordering

  // Availability
  isActive: boolean; // Can be used for seating
  isVisible: boolean; // Shown in layout

  // Notes
  notes?: string; // Internal notes about the table

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Section {
  id?: string;
  tenantId: string;
  floorId: string;

  // Basic Information
  name: string; // e.g., "Main Hall", "Garden", "VIP Area", "Bar"
  displayName: string;
  description?: string;

  // Configuration
  capacity: number; // Total seating capacity
  tableCount: number; // Number of tables

  // Features
  features: string[]; // e.g., ["smoking", "non-smoking", "ac", "outdoor"]
  color?: string; // Color code for visual distinction
  icon?: string; // Icon name or emoji

  // Availability
  isActive: boolean;
  isVisible: boolean;

  // Operating hours (optional - if different from restaurant)
  openingTime?: string; // HH:mm format
  closingTime?: string; // HH:mm format

  // Display
  displayOrder: number;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Floor {
  id?: string;
  tenantId: string;

  // Basic Information
  name: string; // e.g., "Ground Floor", "First Floor", "Rooftop"
  displayName: string;
  description?: string;

  // Layout
  layoutWidth: number; // Floor plan width in pixels
  layoutHeight: number; // Floor plan height in pixels
  backgroundImage?: string; // URL to floor plan image
  gridSize: number; // Grid size for snapping (default 10)

  // Statistics
  totalCapacity: number;
  tableCount: number;
  sectionCount: number;

  // Availability
  isActive: boolean;
  isVisible: boolean;

  // Display
  displayOrder: number;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TableReservation {
  id?: string;
  tenantId: string;

  // Reservation Details
  tableId: string;
  tableNumber: string; // Denormalized for quick display

  // Customer Information
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  guestCount: number;

  // Timing
  reservationDate: string; // ISO date string
  reservationTime: string; // HH:mm format
  duration: number; // Expected duration in minutes
  arrivalTime?: string; // Actual arrival timestamp
  seatedTime?: string; // When guests were seated

  // Status
  status: ReservationStatus;

  // Special Requests
  specialRequests?: string;
  dietaryRestrictions?: string[];
  occasion?: string; // e.g., "birthday", "anniversary"

  // Notifications
  confirmationSent: boolean;
  reminderSent: boolean;

  // Associated Order
  orderId?: string; // If order was created

  // Cancellation
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;

  // Notes
  notes?: string;

  // Audit fields
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ARRIVED = 'arrived',
  SEATED = 'seated',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export interface TableAssignment {
  tableId: string;
  tableNumber: string;
  assignedAt: string;
  assignedBy: string;
  guestCount: number;
  notes?: string;
}

// Helper interfaces for UI
export interface TableSummary {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  billed: number;
  cleaning: number;
  maintenance: number;
  occupancyRate: number; // Percentage
}

export interface SectionSummary {
  section: Section;
  tables: RestaurantTable[];
  summary: TableSummary;
}

export interface FloorSummary {
  floor: Floor;
  sections: SectionSummary[];
  summary: TableSummary;
}

// Default values
export const DEFAULT_TABLE_POSITION: TablePosition = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0
};

export const DEFAULT_GRID_SIZE = 10;
export const DEFAULT_FLOOR_WIDTH = 1200;
export const DEFAULT_FLOOR_HEIGHT = 800;

// Utility functions
export function calculateOccupancyRate(summary: TableSummary): number {
  const usable = summary.total - summary.maintenance;
  if (usable === 0) return 0;
  return Math.round((summary.occupied / usable) * 100);
}

export function getTableStatusColor(status: TableStatus): string {
  const colors: Record<TableStatus, string> = {
    [TableStatus.AVAILABLE]: '#10b981', // Green
    [TableStatus.OCCUPIED]: '#ef4444', // Red
    [TableStatus.RESERVED]: '#f59e0b', // Orange
    [TableStatus.BILLED]: '#3b82f6', // Blue
    [TableStatus.CLEANING]: '#6b7280', // Gray
    [TableStatus.MAINTENANCE]: '#8b5cf6' // Purple
  };
  return colors[status] || '#6b7280';
}

export function getTableStatusLabel(status: TableStatus): string {
  const labels: Record<TableStatus, string> = {
    [TableStatus.AVAILABLE]: 'Available',
    [TableStatus.OCCUPIED]: 'Occupied',
    [TableStatus.RESERVED]: 'Reserved',
    [TableStatus.BILLED]: 'Billed',
    [TableStatus.CLEANING]: 'Cleaning',
    [TableStatus.MAINTENANCE]: 'Maintenance'
  };
  return labels[status] || 'Unknown';
}

export function getReservationStatusColor(status: ReservationStatus): string {
  const colors: Record<ReservationStatus, string> = {
    [ReservationStatus.PENDING]: '#f59e0b',
    [ReservationStatus.CONFIRMED]: '#10b981',
    [ReservationStatus.ARRIVED]: '#3b82f6',
    [ReservationStatus.SEATED]: '#8b5cf6',
    [ReservationStatus.COMPLETED]: '#6b7280',
    [ReservationStatus.CANCELLED]: '#ef4444',
    [ReservationStatus.NO_SHOW]: '#dc2626'
  };
  return colors[status] || '#6b7280';
}

export function isTableAvailableForBooking(table: RestaurantTable): boolean {
  return table.isActive &&
         table.isVisible &&
         table.status === TableStatus.AVAILABLE;
}

export function canTableBeSeated(table: RestaurantTable, guestCount: number): boolean {
  if (!isTableAvailableForBooking(table)) return false;
  if (table.minCapacity && guestCount < table.minCapacity) return false;
  return guestCount <= table.capacity;
}
