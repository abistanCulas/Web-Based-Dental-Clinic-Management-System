import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="CCCCCC"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="999999"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def create_test_cases_docx(filename="Test_Cases_Dental_Inventory.docx"):
    doc = Document()
    
    # Set page to Landscape orientation for optimal table width
    section = doc.sections[0]
    section.orientation = 1  # WD_ORIENT.LANDSCAPE
    new_width, new_height = section.page_height, section.page_width
    section.page_width = new_width
    section.page_height = new_height
    section.left_margin = Inches(0.5)
    section.right_margin = Inches(0.5)
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)
    
    # Document Header Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    run_title = title_p.add_run("Web-Based Dental Clinic Management System – Test Case Suite")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(16)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(15, 23, 42)
    
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(12)
    run_sub = sub_p.add_run("Module: Dental Supplies & Inventory Management (US01 – US04) | Student: IT25102201 (Abilash S.) | Group: Y2-S1-MLB-B12G1-04")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(9.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    # 10 Test Cases Data: 5 Pass, 5 Fail in one single unified table
    headers = ["ID", "Title", "Description", "Preconditions", "Steps", "Data", "Expected", "Actual", "Status"]
    
    test_cases = [
        # 5 PASS
        {
            "id": "TC_INV_01",
            "title": "Restock Material with Valid Security Key",
            "desc": "Verify that an authorized supplier can restock dental items when providing the correct clinic security key and valid quantity > 0.",
            "pre": "Supplier is logged into system and on Inventory Management page.",
            "steps": "1. Click 'Add / Restock Item'\n2. Select material\n3. Enter Quantity & valid Dates\n4. Enter Clinic Security Key\n5. Click 'Submit'",
            "data": "itemName: Composite Resin\nqty: 25, price: 3500.00\nmfgDate: 2026-01-10\nexpiryDate: 2027-01-10\nkey: DENTAL-SUPPLIER-KEY-2026",
            "expected": "Item restocked successfully; success toast displayed: 'Dental inventory item saved successfully!'; stock count increases by 25.",
            "actual": "Item restocked successfully; success toast displayed; stock updated in database and table.",
            "status": "Pass"
        },
        {
            "id": "TC_INV_02",
            "title": "Dispense Unexpired Material to Clinic",
            "desc": "Verify that a Nurse can take/dispense an active, unexpired dental item when requested quantity is within available stock.",
            "pre": "Nurse is logged in; 'Dental Composite Syringe' has stock 50 and expiry date 2027-06-30.",
            "steps": "1. Locate 'Dental Composite Syringe'\n2. Click 'Take' button\n3. Enter Quantity and Purpose\n4. Click 'Confirm Take Item'",
            "data": "itemId: 1\nrequestedQuantity: 5\npurpose: Tooth Extraction - Room 2",
            "expected": "System validates material not expired; deducts 5 units from stock; toast: 'Successfully dispensed items for clinic use.'; remaining stock becomes 45.",
            "actual": "Material checked and verified not expired; 5 units deducted; stock displays 45 in table; toast shown.",
            "status": "Pass"
        },
        {
            "id": "TC_INV_03",
            "title": "Safe Disposal of Expired Material",
            "desc": "Verify that a Nurse can safely dispose of an expired material, updating status to INACTIVE and quantity to 0.",
            "pre": "Item 'Lidocaine Anesthetic' has expiry date 2025-12-01 (past) and status EXPIRED.",
            "steps": "1. Locate expired item\n2. Click 'Dispose Expired'\n3. Click 'Confirm Disposal' in confirmation modal",
            "data": "itemId: 4\ncurrentStatus: EXPIRED\nconfirm: YES",
            "expected": "Item status changed to 'INACTIVE'; quantity updated to 0; item removed from active shelf; toast: 'Expired material safely disposed.'",
            "actual": "Item status set to 'INACTIVE' and quantity set to 0; success notification displayed.",
            "status": "Pass"
        },
        {
            "id": "TC_SUP_04",
            "title": "Register Supplier with Valid 10-Digit Phone",
            "desc": "Verify that Supplier Manager / Admin can register a new dental vendor with unique email and valid 10-digit phone number.",
            "pre": "Admin / Supplier Manager is logged in and on Supplier Management page.",
            "steps": "1. Click 'Add Supplier'\n2. Enter Name, Contact Person, valid Email, 10-digit Phone\n3. Click 'Save Supplier'",
            "data": "supplierName: Prime Dental Lanka\ncontact: Kamal Perera\nemail: info@primedental.lk\nphone: 0771234567\naddress: Colombo 03",
            "expected": "Supplier record saved in database; HTTP 201 Created; success toast: 'Supplier registered successfully!'; appears in active list.",
            "actual": "Supplier saved successfully with 10-digit phone number; displayed in supplier directory.",
            "status": "Pass"
        },
        {
            "id": "TC_INV_05",
            "title": "Automatic Low-Stock Alert Trigger",
            "desc": "Verify that when remaining stock falls below minimum stock level, item status automatically changes to LOW_STOCK.",
            "pre": "Item 'Dental Bibs' has current quantity = 6 and minimumStockLevel = 5.",
            "steps": "1. Nurse dispenses 2 units of 'Dental Bibs'\n2. System calculates remaining stock = 4\n3. System evaluates threshold: 4 <= 5",
            "data": "initialQty: 6\ndispenseQty: 2\nminStockLevel: 5",
            "expected": "New quantity becomes 4; system automatically recalculates status and marks item as 'LOW_STOCK' with amber badge; triggers dashboard alert.",
            "actual": "Quantity deducted to 4; status immediately changed to 'LOW_STOCK' and alert shown on dashboard.",
            "status": "Pass"
        },
        # 5 FAIL
        {
            "id": "TC_INV_06",
            "title": "Restock Attempt with Invalid Security Key",
            "desc": "Verify that system blocks restocking and rejects request when an incorrect supplier security key is entered.",
            "pre": "Supplier is on Add/Restock Material modal.",
            "steps": "1. Enter material details\n2. Enter incorrect security key\n3. Click 'Submit'",
            "data": "itemName: Dental Needles 27G\nquantity: 50\nsecurityKey: WRONG-KEY-999",
            "expected": "System rejects request; displays error: 'Security key was wrong! Please try again.'; no record added to database.",
            "actual": "Request rejected with HTTP 400; error message displayed; item not added.",
            "status": "Fail"
        },
        {
            "id": "TC_INV_07",
            "title": "Supplier Enters Zero or Negative Quantity",
            "desc": "Verify that suppliers are strictly prohibited from submitting restock quantity less than or equal to 0.",
            "pre": "Supplier has entered valid security key on restock form.",
            "steps": "1. Select material\n2. Enter Quantity = 0 (or -10)\n3. Click 'Submit'",
            "data": "quantity: 0\nsecurityKey: DENTAL-SUPPLIER-KEY-2026",
            "expected": "Form validation triggers; displays error: 'Quantity must be greater than 0'; submission blocked.",
            "actual": "Input rejected with validation error: 'Quantity must be greater than 0'; form cannot be submitted.",
            "status": "Fail"
        },
        {
            "id": "TC_INV_08",
            "title": "Nurse Dispense Expired Material Safety Blocker",
            "desc": "Verify that clinical safety blocker prevents a Nurse from dispensing an item whose expiry date has passed.",
            "pre": "Material 'Dental Articulating Paper' has expiry date 2025-11-20 (expired).",
            "steps": "1. Nurse clicks 'Take' on expired item\n2. Observe dispense modal\n3. Attempt to dispense",
            "data": "itemId: 3\nexpiryDate: 2025-11-20\nstatus: EXPIRED",
            "expected": "System displays prominent red safety banner: 'This item has EXPIRED! You cannot take or dispense this item.'; 'Confirm Take Item' button disabled; dispensing blocked.",
            "actual": "Red safety blocker alert displayed; confirm button disabled; patient safety policy enforced.",
            "status": "Fail"
        },
        {
            "id": "TC_INV_09",
            "title": "Add Material with Expiry Date Preceding Mfg Date",
            "desc": "Verify that system rejects inventory entry where expiry date is set before or equal to manufacture date.",
            "pre": "User is on Inventory Entry Form.",
            "steps": "1. Enter item details\n2. Set Mfg Date = 2026-06-01\n3. Set Exp Date = 2025-12-01\n4. Click 'Save Item'",
            "data": "mfgDate: 2026-06-01\nexpiryDate: 2025-12-01",
            "expected": "System blocks submission; shows validation error: 'Expiry date must be in the future and after manufacture date.'; no database insertion.",
            "actual": "Form validation failed; message 'Expiry date must be after manufacture date' displayed; save blocked.",
            "status": "Fail"
        },
        {
            "id": "TC_SUP_10",
            "title": "Supplier Registration with Invalid Phone Length",
            "desc": "Verify that system prevents supplier registration if phone number is not exactly 10 digits.",
            "pre": "Supplier Manager is on 'Add Supplier' modal.",
            "steps": "1. Enter supplier name and email\n2. Enter phone with 6 digits\n3. Click 'Save Supplier'",
            "data": "supplierName: Apex Dental\nemail: apex@dental.lk\nphone: 071234 (6 digits)",
            "expected": "Field validation triggers; displays inline error: 'Phone must be exactly 10 digits'; prevents form submission.",
            "actual": "Validation error 'Phone must be exactly 10 digits' shown beneath phone field; submission prevented.",
            "status": "Fail"
        }
    ]

    # Create table with 1 header row + 10 data rows
    table = doc.add_table(rows=len(test_cases) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    # Column widths (Total width ~ 10.0 inches)
    # ID: 0.8", Title: 1.1", Desc: 1.5", Preconditions: 1.1", Steps: 1.3", Data: 1.3", Expected: 1.4", Actual: 1.2", Status: 0.6"
    col_widths = [Inches(0.8), Inches(1.1), Inches(1.4), Inches(1.0), Inches(1.2), Inches(1.3), Inches(1.4), Inches(1.2), Inches(0.6)]

    # Format Header Row (Black background, white text matching screenshot)
    hdr_cells = table.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], "000000")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=100, right=100)
        hdr_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if h_text in ["ID", "Status"] else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        for run in p.runs:
            run.font.name = "Arial"
            run.font.size = Pt(9.5)
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    # Populate Data Rows
    for row_idx, tc in enumerate(test_cases, start=1):
        row_cells = table.rows[row_idx].cells
        # Alternating background subtle tint
        bg_color = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        
        values = [
            tc["id"],
            tc["title"],
            tc["desc"],
            tc["pre"],
            tc["steps"],
            tc["data"],
            tc["expected"],
            tc["actual"],
            tc["status"]
        ]
        
        for col_idx, val in enumerate(values):
            cell = row_cells[col_idx]
            cell.text = val
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=100, bottom=100, left=80, right=80)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            
            # Alignments
            if col_idx in [0, 8]:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            for run in p.runs:
                run.font.name = "Arial"
                run.font.size = Pt(8.5)
                
                # Column-specific font styling
                if col_idx == 0:  # ID
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(30, 41, 59)
                elif col_idx == 1: # Title
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(15, 23, 42)
                elif col_idx == 8: # Status
                    run.font.bold = True
                    if val == "Pass":
                        run.font.color.rgb = RGBColor(22, 163, 74)   # Green
                    else:
                        run.font.color.rgb = RGBColor(220, 38, 38)   # Red
                else:
                    run.font.color.rgb = RGBColor(51, 65, 85)

    # Set widths for each cell
    for row in table.rows:
        for i, width in enumerate(col_widths):
            row.cells[i].width = width

    # Save Word Document
    doc.save(filename)
    print(f"Successfully created: {filename}")

if __name__ == "__main__":
    create_test_cases_docx("Test_Cases_Dental_Inventory.docx")
