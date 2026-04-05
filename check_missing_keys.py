#!/usr/bin/env python3
"""
Script to check for missing translation keys
"""
import re
import os

# Find all t('key') or t("key") in tsx files
translation_keys = set()

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                # Find all t('...') or t("...")
                matches = re.findall(r"t\(['\"]([^'\"]+)['\"]\)", content)
                translation_keys.update(matches)

print(f"Found {len(translation_keys)} unique translation keys in code:")
print(sorted(translation_keys))

# Read languages.ts and check which keys exist
with open('src/lib/languages.ts', 'r', encoding='utf-8') as f:
    lang_content = f.read()

# Find baseTranslations section
base_start = lang_content.find('const baseTranslations')
base_end = lang_content.find('\nexport const translations')
base_section = lang_content[base_start:base_end]

missing_keys = []
for key in sorted(translation_keys):
    # Check in baseTranslations
    if f"  {key}:" not in base_section and f"  {key}:" not in lang_content:
        missing_keys.append(key)

if missing_keys:
    print(f"\n⚠️  Missing {len(missing_keys)} translation keys:")
    for key in missing_keys:
        print(f"  - {key}")
else:
    print("\n✅ All translation keys are present!")
