import { createContext, useContext, useMemo, useState } from "react";

const DashboardDataContext = createContext(null);

const initialCollections = {
  appointments: [],
  records: [],
  prescriptions: [],
  payments: [],
  users: [],
  medicines: [],
  suppliers: [],
  feedback: [],
  notifications: [],
  refunds: [],
  audit: [],
  treatmentPlans: [],
  queue: [],
  schedule: [],
  transactions: [],
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
