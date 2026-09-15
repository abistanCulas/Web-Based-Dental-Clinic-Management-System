import { createContext, useContext, useMemo, useState } from "react";
import { APPOINTMENTS, MEDICAL_RECORDS, MEDICINES, PAYMENTS, PRESCRIPTIONS, REVIEWS, USERS } from "../data/mockData";

const DashboardDataContext = createContext(null);

const initialCollections = {
  appointments: APPOINTMENTS,
  records: MEDICAL_RECORDS,
  prescriptions: PRESCRIPTIONS.map((item) => ({
    ...item,
    patient: "Sarah Mitchell",
    medicine: item.medicines.map((medicine) => medicine.name).join(", "),
  })),
  payments: PAYMENTS,
  users: USERS,
  medicines: MEDICINES,
  suppliers: [
    { id: 1, name: "DentalCare Supplies", email: "orders@dentalcare.lk", phone: "+94 11 234 5678", category: "Dental Instruments", status: "active" },
    { id: 2, name: "MediSource Lanka", email: "sales@medisource.lk", phone: "+94 11 345 6789", category: "Pharmaceuticals", status: "active" },
    { id: 3, name: "BioDent Implants", email: "info@biodent.lk", phone: "+94 11 456 7890", category: "Implants & Prosthetics", status: "active" },
  ],
  feedback: REVIEWS.map((item) => ({
    ...item,
    doctor: "Dr. James Wilson",
    date: "2026-03-01",
    status: item.rating >= 4 ? "completed" : "pending",
  })),
  notifications: [
    { id: 1, name: "Appointment confirmation", detail: "Dr. Wilson at 10:00 AM", status: "confirmed" },
    { id: 2, name: "Payment reminder", detail: "Invoice INV-2024-090", status: "pending" },
    { id: 3, name: "Low stock alert", detail: "Paracetamol 500mg running low", status: "pending" },
    { id: 4, name: "Prescription ready", detail: "RX-4521 ready for dispensing", status: "confirmed" },
  ],
  refunds: [
    { id: "REF-001", patient: "David Chen", invoice: "INV-2024-075", amount: "LKR 3,500", reason: "Cancelled Consultation", date: "2026-02-28", status: "completed" },
    { id: "REF-002", patient: "Maria Santos", invoice: "INV-2024-082", amount: "LKR 5,000", reason: "Duplicate payment", date: "2026-03-04", status: "pending" },
  ],
  audit: [
    { id: 1, name: "Appointment updated", detail: "By receptionist Emma", status: "completed" },
    { id: 2, name: "Inventory adjusted", detail: "By pharmacist Lisa", status: "completed" },
    { id: 3, name: "User profile modified", detail: "By admin", status: "completed" },
    { id: 4, name: "Prescription dispensed", detail: "RX-4489 fulfilled", status: "completed" },
  ],
  treatmentPlans: [
    { id: "TP-101", patient: "Sarah Mitchell", doctor: "Dr. James Wilson", procedure: "Dental Implant Stage 1", stage: "In Progress", estimatedCost: "LKR 150,000", actualCost: "LKR 75,000", status: "in-progress", date: "2026-03-01" },
    { id: "TP-102", patient: "David Chen", doctor: "Dr. Emily Carter", procedure: "Orthodontic Aligners", stage: "Aligner Set 3/10", estimatedCost: "LKR 80,000", actualCost: "LKR 80,000", status: "confirmed", date: "2026-02-15" },
    { id: "TP-103", patient: "Amanda Foster", doctor: "Dr. Daniel Brown", procedure: "Veneers & Whitening", stage: "Impression Done", estimatedCost: "LKR 45,000", actualCost: "LKR 20,000", status: "pending", date: "2026-03-10" },
    { id: "TP-104", patient: "Rajesh Kumar", doctor: "Dr. Sophia Martin", procedure: "Root Canal Retreatment", stage: "Canal Cleaning", estimatedCost: "LKR 25,000", actualCost: "LKR 15,000", status: "in-progress", date: "2026-03-12" },
  ],
  queue: [
    { id: "Q-01", queueNumber: "Q1", patient: "Sarah Mitchell", doctor: "Dr. James Wilson", service: "General Checkup", waitTime: "5 mins", status: "in-consultation" },
    { id: "Q-02", queueNumber: "Q2", patient: "John Doe", doctor: "Dr. James Wilson", service: "Root Canal", waitTime: "15 mins", status: "waiting" },
    { id: "Q-03", queueNumber: "Q3", patient: "Amanda Foster", doctor: "Dr. Emily Carter", service: "Orthodontics", waitTime: "25 mins", status: "waiting" },
    { id: "Q-04", queueNumber: "Q4", patient: "Rajesh Kumar", doctor: "Dr. Daniel Brown", service: "Teeth Whitening", waitTime: "35 mins", status: "checked-in" },
  ],
  schedule: [
    { id: 1, doctor: "Dr. James Wilson", day: "Mon - Fri", time: "09:00 AM - 05:00 PM", room: "Room 101", maxPatients: "16", status: "active" },
    { id: 2, doctor: "Dr. Emily Carter", day: "Tue - Sat", time: "10:00 AM - 06:00 PM", room: "Room 102", maxPatients: "12", status: "active" },
    { id: 3, doctor: "Dr. Daniel Brown", day: "Mon - Thu", time: "09:00 AM - 04:00 PM", room: "Room 103", maxPatients: "14", status: "active" },
    { id: 4, doctor: "Dr. Sophia Martin", day: "Wed - Sat", time: "08:00 AM - 03:00 PM", room: "Room 104", maxPatients: "10", status: "active" },
    { id: 5, doctor: "Dr. Priya Sharma", day: "Mon - Fri", time: "10:00 AM - 05:00 PM", room: "Room 105", maxPatients: "15", status: "active" },
  ],
  transactions: [
    { id: "TX-201", medicine: "Amoxicillin 500mg", type: "Stock In", quantity: "+200", reference: "PO-2026-088", date: "2026-03-01", status: "completed" },
    { id: "TX-202", medicine: "Ibuprofen 400mg", type: "Dispensed", quantity: "-20", reference: "RX-4521", date: "2026-03-02", status: "dispensed" },
    { id: "TX-203", medicine: "Chlorhexidine Mouthwash", type: "Dispensed", quantity: "-1", reference: "RX-4489", date: "2026-03-05", status: "dispensed" },
    { id: "TX-204", medicine: "Lidocaine 2%", type: "Stock In", quantity: "+50", reference: "PO-2026-092", date: "2026-03-08", status: "completed" },
    { id: "TX-205", medicine: "Paracetamol 500mg", type: "Stock Adjustment", quantity: "-5", reference: "ADJ-2026-012", date: "2026-03-11", status: "completed" },
  ],
};

export function DashboardDataProvider({ children }) {
  const [collections, setCollections] = useState(initialCollections);

  const saveRecord = (collection, record) =>
    setCollections((current) => {
      const records = current[collection] || [];
      const exists = records.some((item) => item.id === record.id);
      return {
        ...current,
        [collection]: exists
          ? records.map((item) => (item.id === record.id ? record : item))
          : [record, ...records],
      };
    });

  const removeRecord = (collection, id) =>
    setCollections((current) => ({
      ...current,
      [collection]: (current[collection] || []).filter((item) => item.id !== id),
    }));

  const value = useMemo(() => ({ collections, saveRecord, removeRecord }), [collections]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error("useDashboardData must be used within DashboardDataProvider");
  return context;
}
