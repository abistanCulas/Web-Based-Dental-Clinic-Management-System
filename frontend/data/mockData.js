export const SERVICE_CATEGORIES = [
  "Preventive Dentistry",
  "Restorative Dentistry",
  "Cosmetic Dentistry",
  "Orthodontics",
  "Oral Surgery",
  "Pediatric Dentistry",
  "Gum Care",
];

export const SERVICES = [
  { id: 1, name: "General Dental Checkup", category: "Preventive Dentistry", duration: "30 min", price: "LKR 2,500", desc: "Comprehensive oral examination including X-rays and personalized care plan.", icon: "checkup" },
  { id: 2, name: "Teeth Cleaning", category: "Preventive Dentistry", duration: "45 min", price: "LKR 3,500", desc: "Professional scaling and polishing to remove plaque and tartar buildup.", icon: "cleaning" },
  { id: 3, name: "Dental Fillings", category: "Restorative Dentistry", duration: "40 min", price: "LKR 4,500", desc: "Tooth-colored composite fillings to restore damaged teeth.", icon: "filling" },
  { id: 4, name: "Root Canal Treatment", category: "Restorative Dentistry", duration: "90 min", price: "LKR 25,000", desc: "Advanced endodontic treatment to save infected teeth.", icon: "rootcanal" },
  { id: 5, name: "Dental Implants", category: "Restorative Dentistry", duration: "120 min", price: "LKR 150,000", desc: "Permanent titanium implants for missing teeth replacement.", icon: "implant" },
  { id: 6, name: "Orthodontics", category: "Orthodontics", duration: "60 min", price: "LKR 80,000", desc: "Braces and aligners for teeth straightening and bite correction.", icon: "ortho" },
  { id: 7, name: "Cosmetic Dentistry", category: "Cosmetic Dentistry", duration: "60 min", price: "LKR 15,000", desc: "Smile makeovers including veneers and bonding.", icon: "cosmetic" },
  { id: 8, name: "Teeth Whitening", category: "Cosmetic Dentistry", duration: "60 min", price: "LKR 12,000", desc: "Professional in-office whitening for brighter smiles.", icon: "whitening" },
  { id: 9, name: "Gum Treatment", category: "Gum Care", duration: "45 min", price: "LKR 6,000", desc: "Periodontal therapy for gum disease prevention and treatment.", icon: "gum" },
  { id: 10, name: "Pediatric Dentistry", category: "Pediatric Dentistry", duration: "30 min", price: "LKR 2,000", desc: "Gentle dental care designed for children and teens.", icon: "pediatric" },
  { id: 11, name: "Dental Crowns & Bridges", category: "Restorative Dentistry", duration: "60 min", price: "LKR 35,000", desc: "Custom crowns and bridges for damaged or missing teeth.", icon: "crown" },
  { id: 12, name: "Oral Surgery", category: "Oral Surgery", duration: "90 min", price: "LKR 20,000", desc: "Wisdom tooth extraction and other surgical procedures.", icon: "surgery" },
];

export const DOCTORS = [
  { id: 1, name: "Dr. James Wilson", specialty: "Dental Surgeon", qualification: "BDS, MDS (Oral Surgery)", experience: "12 years", availability: "Mon - Fri, 9AM - 5PM", rating: 4.9, reviews: 128, services: ["General Checkup", "Oral Surgery", "Dental Implants"], bio: "Dr. Wilson specializes in oral surgery and implantology with over 12 years of clinical experience." },
  { id: 2, name: "Dr. Emily Carter", specialty: "Orthodontist", qualification: "BDS, MDS (Orthodontics)", experience: "10 years", availability: "Tue - Sat, 10AM - 6PM", rating: 4.8, reviews: 96, services: ["Orthodontics", "Braces", "Aligners"], bio: "Dr. Carter is a certified orthodontist passionate about creating beautiful, healthy smiles." },
  { id: 3, name: "Dr. Daniel Brown", specialty: "Cosmetic Dentist", qualification: "BDS, Fellowship in Cosmetic Dentistry", experience: "8 years", availability: "Mon - Thu, 9AM - 4PM", rating: 4.9, reviews: 84, services: ["Cosmetic Dentistry", "Teeth Whitening", "Veneers"], bio: "Dr. Brown focuses on aesthetic dentistry and smile transformations." },
  { id: 4, name: "Dr. Sophia Martin", specialty: "Endodontist", qualification: "BDS, MDS (Endodontics)", experience: "9 years", availability: "Wed - Sat, 8AM - 3PM", rating: 4.7, reviews: 72, services: ["Root Canal", "Endodontics"], bio: "Dr. Martin is an expert in root canal treatments and endodontic care." },
  { id: 5, name: "Dr. Priya Sharma", specialty: "Pediatric Dentist", qualification: "BDS, MDS (Pedodontics)", experience: "7 years", availability: "Mon - Fri, 10AM - 5PM", rating: 4.9, reviews: 65, services: ["Pediatric Dentistry"], bio: "Dr. Sharma creates a comfortable environment for young patients." },
  { id: 6, name: "Dr. Robert Lee", specialty: "Periodontist", qualification: "BDS, MDS (Periodontics)", experience: "11 years", availability: "Mon - Wed, Fri, 9AM - 5PM", rating: 4.8, reviews: 58, services: ["Gum Treatment", "Periodontics"], bio: "Dr. Lee specializes in gum disease treatment and periodontal surgery." },
];

export const REVIEWS = [
  { id: 1, name: "Amanda Foster", rating: 5, text: "DentaFlow made my dental experience comfortable and stress-free. The staff is incredibly professional.", avatar: "AF" },
  { id: 2, name: "Rajesh Kumar", rating: 5, text: "Best dental clinic I've visited. Modern equipment and caring dentists. Highly recommended!", avatar: "RK" },
  { id: 3, name: "Maria Santos", rating: 4, text: "Easy online booking and excellent treatment. Dr. Carter is amazing with orthodontics.", avatar: "MS" },
  { id: 4, name: "David Chen", rating: 5, text: "The AI assistant helped me prepare for my appointment. Very innovative platform!", avatar: "DC" },
];

export const STATS = [
  { value: "5,000+", label: "Happy Patients" },
  { value: "50+", label: "Expert Dentists" },
  { value: "15+", label: "Years Experience" },
  { value: "10,000+", label: "Successful Treatments" },
];

export const WHY_CHOOSE = [
  { title: "Experienced Dentists", desc: "Board-certified professionals with years of clinical expertise.", icon: "dentist" },
  { title: "Modern Technology", desc: "State-of-the-art digital imaging and treatment equipment.", icon: "tech" },
  { title: "Patient-Centered Care", desc: "Personalized treatment plans tailored to your needs.", icon: "care" },
  { title: "Comfortable Environment", desc: "Relaxing atmosphere designed to ease dental anxiety.", icon: "comfort" },
  { title: "Trusted Dental Services", desc: "Accredited clinic with proven track record of excellence.", icon: "trust" },
  { title: "Easy Appointment Booking", desc: "Book, reschedule, and manage appointments online 24/7.", icon: "booking" },
];

export const APPOINTMENTS = [
  { id: 1, doctor: "Dr. James Wilson", service: "General Checkup", date: "2026-03-15", time: "10:00 AM", status: "confirmed", reason: "Routine checkup" },
  { id: 2, doctor: "Dr. Emily Carter", service: "Orthodontics", date: "2026-03-20", time: "2:30 PM", status: "pending", reason: "Braces adjustment" },
  { id: 3, doctor: "Dr. Daniel Brown", service: "Teeth Whitening", date: "2026-02-28", time: "11:00 AM", status: "completed", reason: "Cosmetic treatment" },
  { id: 4, doctor: "Dr. Sophia Martin", service: "Root Canal", date: "2026-02-10", time: "9:00 AM", status: "cancelled", reason: "Rescheduled" },
];

export const PRESCRIPTIONS = [
  { id: "RX-4521", doctor: "Dr. James Wilson", date: "2026-03-01", medicines: [{ name: "Amoxicillin 500mg", dosage: "1 tablet", freq: "3x daily", duration: "7 days" }, { name: "Ibuprofen 400mg", dosage: "1 tablet", freq: "As needed", duration: "5 days" }], status: "ready", instructions: "Take with food. Complete full antibiotic course." },
  { id: "RX-4489", doctor: "Dr. Emily Carter", date: "2026-02-15", medicines: [{ name: "Chlorhexidine Mouthwash", dosage: "15ml", freq: "2x daily", duration: "14 days" }], status: "dispensed", instructions: "Rinse for 30 seconds after brushing." },
];

export const MEDICAL_RECORDS = [
  { id: 1, date: "2026-03-01", type: "Diagnosis", title: "Dental Caries - Upper Right Molar", doctor: "Dr. James Wilson", notes: "Moderate decay detected. Filling recommended." },
  { id: 2, date: "2026-02-15", type: "Treatment", title: "Professional Teeth Cleaning", doctor: "Dr. Daniel Brown", notes: "Scaling and polishing completed. Good oral hygiene." },
  { id: 3, date: "2026-01-20", type: "X-Ray", title: "Panoramic X-Ray", doctor: "Dr. James Wilson", notes: "Full mouth radiograph. No abnormalities detected." },
  { id: 4, date: "2025-12-10", type: "Treatment", title: "Dental Filling - Lower Left", doctor: "Dr. Sophia Martin", notes: "Composite filling placed. Patient tolerated well." },
];

export const PAYMENTS = [
  { id: "INV-2024-089", patient: "Sarah Mitchell", service: "General Checkup", amount: "LKR 5,500", status: "paid", date: "2026-03-01" },
  { id: "INV-2024-090", patient: "John Doe", service: "Root Canal", amount: "LKR 25,000", status: "pending", date: "2026-03-05" },
  { id: "INV-2024-091", patient: "Emily White", service: "Teeth Whitening", amount: "LKR 12,000", status: "paid", date: "2026-03-03" },
];

export const USERS = [
  { id: 1, name: "Sarah Mitchell", email: "patient@dentaflow.com", role: "patient", status: "active", joined: "2024-01-15" },
  { id: 2, name: "Dr. James Wilson", email: "dentist@dentaflow.com", role: "dentist", status: "active", joined: "2020-06-01" },
  { id: 3, name: "Emma Rodriguez", email: "receptionist@dentaflow.com", role: "receptionist", status: "active", joined: "2022-03-10" },
  { id: 4, name: "Michael Chen", email: "cashier@dentaflow.com", role: "cashier", status: "active", joined: "2023-01-20" },
  { id: 5, name: "Lisa Thompson", email: "pharmacist@dentaflow.com", role: "pharmacist", status: "active", joined: "2023-05-15" },
  { id: 6, name: "Admin User", email: "admin@dentaflow.com", role: "admin", status: "active", joined: "2019-01-01" },
  { id: 7, name: "John Doe", email: "john@email.com", role: "patient", status: "disabled", joined: "2025-06-20" },
];

export const MEDICINES = [
  { id: 1, name: "Amoxicillin 500mg", stock: 450, unit: "tablets", minStock: 100, status: "in-stock" },
  { id: 2, name: "Ibuprofen 400mg", stock: 320, unit: "tablets", minStock: 100, status: "in-stock" },
  { id: 3, name: "Chlorhexidine Mouthwash", stock: 45, unit: "bottles", minStock: 50, status: "low-stock" },
  { id: 4, name: "Lidocaine 2%", stock: 80, unit: "vials", minStock: 30, status: "in-stock" },
  { id: 5, name: "Paracetamol 500mg", stock: 15, unit: "tablets", minStock: 200, status: "low-stock" },
];

export const TIME_SLOTS = ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM"];
