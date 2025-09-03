# **App Name**: GemsAccurate

## Core Features:

- User Authentication & Role-Based Access Control: Implement a secure authentication system with three user roles: Developer, Admin, and Accountant, each having specific permissions. Default Developer account: Username: `developer`, Password: `admin123`. Store passwords locally using SHA-256 hashing and manage user sessions.
- Business Configuration: Allow the Developer user to configure business details such as shop name (default: Bhagya Shree Jewellers), address (default: JP Market, In Front of High School Gate No. 01, Bherunda (Nasrullaganj)), contact persons (three entries with names and phone numbers), GSTIN registration number, and invoice numbering (C-10001+ for Cash, T-20001+ for Tax/GST).
- Customer Management: Enable adding, editing, and deleting customer profiles with fields for personal details (Name*, Father Name, Phone, Address), business details (GSTIN for tax invoices), and credit terms (Payment terms in days, Monthly interest rate %).
- Item/Inventory Management: Manage item details including item name, description, HSN code (dropdown with pre-loaded jewelry HSN codes), and created date tracking.
- Invoice Generation System: Generate invoices with a dynamic title (Invoice or Cash Memo), business details, customer details, invoice details, and an itemized section with columns for SN, Item Name, Qty, HSN, Gross Weight(gms), Purity, Rate, Making Charges, and Total. Support three types of making charges (Percentage, Flat rate, Per gram) and real-time total calculations.
- Payment & Receipt Management: Book payments by selecting a customer with outstanding invoices, allocating payments across multiple invoices, separating principal and interest amounts, and validating payment amounts against invoice dues.
- Interest Calculation Engine: Automatically calculate interest based on customer-specific rates and compounding schedules (Monthly, Quarterly, Annually) from the invoice date when payment terms are exceeded. The LLM will be used as a tool for deciding when and if to incorporate interest rates on invoices and payments

## Style Guidelines:

- Primary color: Deep Emerald (#0369A1) to convey trust, and highlight the financial precision. 
- Background color: Very light teal (#F0FDF4) provides a soft, uncluttered space to enhance focus. 
- Accent color: Gold-Yellow (#FBBF24) brings in the feel of a jewelry store. It can bring some user attention to where the content matters.
- Body and headline font: 'Alegreya', serif, lends an elegant, intellectual, contemporary feel to the interface.
- Use detailed line icons that represent items, customers, and actions within the system.
- Maintain a clear, professional layout with a role-based menu system for easy navigation. Use input validation and real-time calculations to guide users.
- Subtle transitions when navigating between sections. Use real time animated charts where it make sense