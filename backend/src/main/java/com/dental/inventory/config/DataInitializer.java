package com.dental.inventory.config;

import com.dental.inventory.entity.InventoryItem;
import com.dental.inventory.entity.Supplier;
import com.dental.inventory.entity.User;
import com.dental.inventory.enums.ItemCategory;
import com.dental.inventory.enums.ItemStatus;
import com.dental.inventory.enums.SupplierStatus;
import com.dental.inventory.enums.UserRole;
import com.dental.inventory.repository.InventoryItemRepository;
import com.dental.inventory.repository.SupplierRepository;
import com.dental.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedUsers();
        seedSuppliersAndInventory();
    }

    private void seedUsers() {
        if (userRepository.count() == 0) {
            log.info("Seeding demo users...");

            createUser("manager", "manager@dentalclinic.lk", "password123", UserRole.INVENTORY_MANAGER);
            createUser("admin", "admin@dentalclinic.lk", "password123", UserRole.ADMIN);
            createUser("nurse", "nurse@dentalclinic.lk", "password123", UserRole.NURSE);
            createUser("supplier", "supplier@medidental.lk", "password123", UserRole.SUPPLIER);
            createUser("pharmacist", "pharmacist@dentalclinic.lk", "password123", UserRole.PHARMACIST);

            log.info("Demo users successfully created.");
        }
    }

    private void createUser(String username, String email, String password, UserRole role) {
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .build();
        userRepository.save(user);
    }

    private void seedSuppliersAndInventory() {
        if (supplierRepository.count() == 0) {
            log.info("Seeding demo suppliers and inventory items...");

            Supplier s1 = supplierRepository.save(Supplier.builder()
                    .supplierName("MediDental Supplies Ltd")
                    .contactPerson("Sunil Perera")
                    .email("sunil@medidental.lk")
                    .phone("0771234567")
                    .address("45 Galle Road, Colombo 03")
                    .registrationNumber("REG-2023-089")
                    .status(SupplierStatus.ACTIVE)
                    .build());

            Supplier s2 = supplierRepository.save(Supplier.builder()
                    .supplierName("Lanka Ortho Care")
                    .contactPerson("Kavinda Fernando")
                    .email("orders@lankaortho.lk")
                    .phone("0719876543")
                    .address("12 Kandy Road, Kiribathgoda")
                    .registrationNumber("REG-2024-112")
                    .status(SupplierStatus.ACTIVE)
                    .build());

            if (inventoryItemRepository.count() == 0) {
                inventoryItemRepository.save(InventoryItem.builder()
                        .itemName("Dental Composite Resin (A2)")
                        .category(ItemCategory.MATERIAL)
                        .description("Universal light-cure restorative composite syringe")
                        .unit("Syringe")
                        .quantity(25)
                        .minimumStockLevel(10)
                        .unitPrice(new BigDecimal("4500.00"))
                        .manufactureDate(LocalDate.now().minusMonths(6))
                        .expiryDate(LocalDate.now().plusYears(2))
                        .status(ItemStatus.ACTIVE)
                        .supplier(s1)
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .itemName("Lidocaine 2% with Epinephrine")
                        .category(ItemCategory.MATERIAL)
                        .description("Local dental anesthetic cartridges for extractions")
                        .unit("Box (50)")
                        .quantity(4)
                        .minimumStockLevel(15)
                        .unitPrice(new BigDecimal("6800.00"))
                        .manufactureDate(LocalDate.now().minusMonths(10))
                        .expiryDate(LocalDate.now().plusMonths(3))
                        .status(ItemStatus.LOW_STOCK)
                        .supplier(s1)
                        .build());

                // EXPIRED ITEM FOR TESTING NURSE BLOCKER
                inventoryItemRepository.save(InventoryItem.builder()
                        .itemName("Expired Dental Impression Alginate")
                        .category(ItemCategory.MATERIAL)
                        .description("Fast-setting chromatic alginate impression powder")
                        .unit("Pack (450g)")
                        .quantity(8)
                        .minimumStockLevel(5)
                        .unitPrice(new BigDecimal("2100.00"))
                        .manufactureDate(LocalDate.now().minusYears(2))
                        .expiryDate(LocalDate.now().minusDays(15))
                        .status(ItemStatus.EXPIRED)
                        .supplier(s1)
                        .build());

                inventoryItemRepository.save(InventoryItem.builder()
                        .itemName("Dental Ultrasonic Scaler Tip G1")
                        .category(ItemCategory.EQUIPMENT)
                        .description("Autoclavable supragingival scaling tip")
                        .unit("Piece")
                        .quantity(2)
                        .minimumStockLevel(5)
                        .unitPrice(new BigDecimal("3500.00"))
                        .manufactureDate(LocalDate.now().minusMonths(4))
                        .expiryDate(null)
                        .status(ItemStatus.LOW_STOCK)
                        .supplier(s2)
                        .build());

                log.info("Demo inventory seeded successfully.");
            }
        }
    }
}
