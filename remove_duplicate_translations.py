#!/usr/bin/env python3
"""
Script to remove duplicate invoice translations from languages.ts
"""

# Read the file
with open('src/lib/languages.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keys that we want to keep only one instance of
invoice_keys = [
    'invoiceTitle', 'invoiceNumber', 'customerNumber', 'date',
    'performancePeriod', 'dearClient', 'thankYouText', 'qualityText',
    'position', 'designation', 'amountShort', 'unit', 'unitPrice',
    'totalPrice', 'netAmount', 'vat', 'grossAmount', 'paymentDue',
    'closingText', 'withRegards'
]

# Process the file
new_lines = []
in_lang_section = False
current_lang = None
seen_keys = set()
skip_until_comma = False

for i, line in enumerate(lines):
    # Check if we're entering a new language section
    if line.strip().endswith(': {') and not line.strip().startswith('//'):
        # Reset for new language section
        seen_keys = set()
        in_lang_section = True
        new_lines.append(line)
        continue

    # Check if we're exiting a language section
    if in_lang_section and line.strip() == '},':
        in_lang_section = False
        seen_keys = set()
        new_lines.append(line)
        continue

    # If we're in a language section, check for duplicate keys
    if in_lang_section:
        # Check if this line defines one of the invoice keys
        is_duplicate = False
        for key in invoice_keys:
            if line.strip().startswith(f"{key}:"):
                if key in seen_keys:
                    # This is a duplicate, skip it
                    is_duplicate = True
                    break
                else:
                    # First occurrence, keep it
                    seen_keys.add(key)
                    break

        if not is_duplicate:
            new_lines.append(line)
    else:
        new_lines.append(line)

# Write back
with open('src/lib/languages.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Duplicate translations removed successfully!")
