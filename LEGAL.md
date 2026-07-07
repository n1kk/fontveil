# Font Licensing Guide

FontVeil works by modifying font files — adding OpenType substitution tables (GSUB) that remap character rendering. Under font licensing law, this constitutes a **modification** and creates a **derivative work**. The license of the original font determines whether this is permitted.

## Quick Reference

| License | Modify | Redistribute | Rename Required | Notes |
|---------|--------|-------------|-----------------|-------|
| SIL Open Font License (OFL) | Yes | Yes | If font has Reserved Font Names | Most Google Fonts |
| Apache 2.0 | Yes | Yes | No | Roboto, Droid Sans, etc. |
| Proprietary (Monotype, Adobe, etc.) | **No** | **No** | N/A | Do not use with FontVeil |

## SIL Open Font License (OFL 1.1)

The majority of open-source fonts, including most Google Fonts, use this license.

**What you can do:**
- Modify the font binary (add GSUB tables, subset, convert formats)
- Serve the modified font to browsers as part of your application
- Use in commercial projects

**Requirements:**
- The modified font remains under the OFL — you cannot relicense it
- Include the original copyright notice and license text
- If the font declares **Reserved Font Names**, you **must rename** the modified font

**Reserved Font Names (RFN):**

Some OFL fonts reserve their name. If a font has RFNs, any modification requires the output font to use a different name. FontVeil's `name` option handles this — when you specify a name like `"Obfuscated"`, the patched font is registered under that name, not the original.

Check a font's license header for RFN declarations. They look like:

> "MyFont" is a Reserved Font Name for this Font Software.

Google Fonts actively discourages RFNs for new submissions, so most fonts there do not have them. However, always verify.

**The "not sold by themselves" clause:**

The OFL prohibits selling the font files as a standalone product. Serving a modified font as part of a web application (which is what FontVeil does) is considered bundling with software and is permitted.

## Apache 2.0

Some open-source fonts (Roboto, Droid Sans, Noto) use Apache 2.0.

**What you can do:**
- Modify and redistribute freely
- No copyleft — derivative works can use any license
- No renaming requirement

**Requirements:**
- Include the original copyright notice and license
- State that changes were made

This is the most permissive option for use with FontVeil.

## Proprietary Fonts

Fonts from commercial foundries (Monotype, Linotype, Hoefler&Co, Adobe Fonts service, etc.) almost universally prohibit modification in their EULAs:

> "You may not modify, adapt, translate, reverse engineer, decompile, disassemble, alter, or otherwise attempt to discover the source code of the Font Software."

**Do not use FontVeil with proprietary fonts.** Adding GSUB tables to a proprietary font binary violates these license terms.

## Recommendations

1. **Use OFL or Apache 2.0 fonts.** Google Fonts is a good source — the full catalog is openly licensed.

2. **Always use the `name` option** when patching fonts to register the modified font under a new name. This satisfies OFL Reserved Font Name requirements and makes it clear the font has been modified.

3. **Include license attribution.** Serve or bundle the original font's copyright notice and license text with your application.

4. **Check for RFNs before using a font.** Look at the font's license header or the `name` table in the font file.

## Disclaimer

This document is informational guidance, not legal advice. Font licensing terms vary. Review the specific license of any font you use with FontVeil. If you are uncertain whether your use case is permitted, consult a lawyer.
