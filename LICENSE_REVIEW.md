# GNU GPL v3 License Review for Noteece

**Date**: November 6, 2025
**License**: GNU General Public License v3.0
**Project**: Noteece - Personal Intelligence Vault

## Executive Summary

Noteece is licensed under the **GNU General Public License version 3.0 (GPL v3)**. This document reviews what this means for users, contributors, and anyone who wants to modify or distribute the software.

## Why GPL v3?

We chose GPL v3 for Noteece because:

1. **Copyleft Protection**: Ensures the software remains free and open source
2. **User Freedom**: Guarantees users' rights to use, study, modify, and share
3. **Privacy Alignment**: Prevents proprietary forks that could add tracking/spying
4. **Anti-Tivoization**: Protects against hardware locks that prevent user modifications
5. **Patent Protection**: Provides explicit patent licenses and retaliation clauses
6. **Community Standards**: GPL v3 is well-understood and widely used

## What GPL v3 Means

### The Four Essential Freedoms

GPL v3 guarantees users four essential freedoms:

**Freedom 0**: The freedom to **run the program** for any purpose

- Use Noteece for personal, commercial, educational, or any other purpose
- No restrictions on who can use it or how

**Freedom 1**: The freedom to **study how the program works**, and change it

- Source code is always available
- You can learn from it, audit it, and modify it
- Must have access to "preferred form for modification"

**Freedom 2**: The freedom to **redistribute copies**

- Share Noteece with others
- Distribute on app stores, websites, or any medium
- Cannot charge for the GPL v3 code itself (but can charge for distribution services)

**Freedom 3**: The freedom to **distribute modified versions**

- Create your own fork with changes
- Share your improvements with others
- Help the community by contributing back

### Copyleft: The Key Principle

GPL v3 is a **copyleft** license, meaning:

✅ **Anyone can use the software freely**
✅ **Anyone can modify the software**
❗ **But** if you distribute modified versions, you **must**:

- Keep the same GPL v3 license
- Provide source code
- Preserve copyright notices
- Document your changes

**Bottom Line**: Copyleft ensures that Noteece and all derivatives remain free software forever.

## Permissions Under GPL v3

### What You CAN Do

✅ **Use Noteece for any purpose**

- Personal use
- Commercial use
- Educational use
- Government use
- Any legal purpose

✅ **Study the source code**

- Read how encryption works
- Audit for security
- Learn from the implementation
- Verify privacy claims

✅ **Modify Noteece**

- Add features you want
- Fix bugs
- Customize the UI
- Remove features you don't need
- Create a completely different app based on it

✅ **Distribute unmodified copies**

- Share with friends
- Put on your website
- Upload to alternative app stores
- Include in USB stick distributions
- **Note**: You may charge for distribution services, but must provide source

✅ **Distribute modified versions**

- Fork the project on GitHub
- Create your own variant
- Distribute your improvements
- **Must**: Provide source code under GPL v3

✅ **Use in commercial products** (with conditions)

- Integrate into a larger application
- **But**: The Noteece parts remain GPL v3
- **And**: If you distribute, you must provide source

### What You CANNOT Do

❌ **Distribute without source code**

- If you distribute binaries, you must provide source
- "Source code" means the preferred form for modification
- Must include build scripts and instructions

❌ **Add additional restrictions**

- Cannot add proprietary licenses on top
- Cannot add DRM or technical protection measures
- Cannot restrict further redistribution
- Cannot add patent restrictions beyond what GPL v3 allows

❌ **Sublicense under different terms**

- All derivatives must be GPL v3 (or later)
- Cannot relicense as MIT, Apache, proprietary, etc.
- Cannot make a proprietary fork

❌ **Claim warranty or liability**

- Software is provided "as is"
- Contributors have no liability
- Cannot promise guarantees on behalf of the project

❌ **Remove copyright notices**

- Must preserve all copyright statements
- Must preserve license notices
- Must preserve disclaimer of warranty

## Key GPL v3 Provisions

### 1. Source Code Disclosure

**Requirement**: If you distribute Noteece (modified or not), you must provide source code.

**How to comply**:

- Include source code with binary distribution
- Offer written offer to provide source (valid for 3 years)
- Point to public GitHub repository (if you haven't modified it)

**"Source code" means**:

- All source files needed to build the app
- Build scripts and configuration
- Instructions for compilation
- Not obfuscated or in difficult-to-modify form

### 2. Copyleft / Derivative Works

**Requirement**: Modified versions must also be GPL v3.

**What counts as a "derivative work"**:

- ✅ Modified Noteece with bug fixes → GPL v3
- ✅ Noteece with added features → GPL v3
- ✅ Noteece UI with different theme → GPL v3
- ✅ Noteece core + proprietary plugin (linked together) → Entire work GPL v3
- ❓ Noteece communicating via API with separate app → Separate work may use different license
- ❓ Noteece alongside proprietary app in a "mere aggregation" → Separate licenses OK

**The "viral" nature**:

- GPL v3 "propagates" to linked code
- This ensures freedom is preserved
- Some call it "viral" (negative) others "copyleft protection" (positive)

### 3. Patent License Grant

**Automatic patent license**:

- Contributors grant patent licenses for their contributions
- You get patent rights to use, modify, and distribute
- Protects users from patent litigation

**Patent retaliation**:

- If you sue someone for patent infringement based on GPL v3 software
- You lose your GPL v3 license
- This discourages patent trolling

### 4. Anti-Tivoization

**Prohibition on hardware restrictions**:

- Cannot distribute GPL v3 software on hardware that prevents user modifications
- If hardware checks signatures, must provide keys
- Applies to "User Products" (consumer devices)
- Does NOT apply to industrial/commercial products

**Why this matters**:

- Some vendors lock bootloaders to prevent modified software
- GPL v3 says if you use GPL v3 software, users must be able to run modified versions
- Only applies if you distribute the hardware

### 5. No Additional Restrictions

**You cannot**:

- Add technical protection measures (DRM)
- Add patent restrictions
- Add geographic restrictions
- Add use restrictions

**Example**:

- ❌ Cannot add "license key" system
- ❌ Cannot restrict to certain countries
- ❌ Cannot add "for personal use only" clause
- ✅ Can charge for distribution services (but can't prevent redistribution)

### 6. License Compatibility

**Compatible licenses** (can combine with GPL v3):

- MIT License ✅
- Apache License 2.0 ✅
- BSD Licenses (2-clause, 3-clause) ✅
- Other GPL v3 code ✅
- GPL v2 "or later" ✅ (can upgrade to v3)

**Incompatible licenses**:

- GPL v2 only (without "or later") ❌
- Proprietary licenses ❌
- Licenses with additional restrictions ❌
- Some Creative Commons licenses (e.g., CC BY-NC) ❌

### 7. "Or Later" Clause

Noteece is licensed as **GPL v3 or later**:

- You can choose to use under GPL v3
- Or under any later version (e.g., hypothetical GPL v4)
- Gives flexibility for future license updates
- FSF can release newer versions that address new issues

### 8. Disclaimers of Warranty

**GPL v3 Section 15** - No Warranty:

> THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.

**What this means**:

- Software provided "as is"
- No guarantees it will work
- No liability for damages
- No fitness for particular purpose

**Why**:

- Free software projects cannot afford liability
- Contributors need protection
- Standard for FOSS

### 9. Limitation of Liability

**GPL v3 Section 16** - Limitation of Liability:

> IN NO EVENT...SHALL THE COPYRIGHT HOLDER BE LIABLE...FOR DAMAGES

**What this means**:

- Contributors are not liable for bugs
- Not liable for data loss
- Not liable for security breaches (unless intentional)
- Not liable for lost profits or indirect damages

## Compliance Checklist

If you want to distribute Noteece (modified or not), follow this checklist:

### For Unmodified Distribution

- [ ] Preserve all copyright notices in source files
- [ ] Include the LICENSE file (GNU GPL v3 text)
- [ ] Include the README and attributions
- [ ] Provide source code or link to official GitHub repo
- [ ] Do not add additional restrictions
- [ ] Retain "or later" clause

### For Modified Distribution

- [ ] Document your changes clearly
- [ ] Update copyright statements (add your own)
- [ ] Include the LICENSE file
- [ ] Provide complete source code for your modifications
- [ ] License your modifications under GPL v3 (or later)
- [ ] Do not remove original copyright notices
- [ ] Clearly state you modified the software
- [ ] Provide build instructions
- [ ] Consider contributing back to the project!

### For Commercial Use

- [ ] You can use Noteece internally without restrictions
- [ ] If you distribute (even to customers), follow distribution rules above
- [ ] Consider: Do you really need to distribute, or can you provide SaaS?
- [ ] Note: SaaS loophole - GPL v3 doesn't require source for network services (consider AGPL v3 for stricter copyleft)
- [ ] You can charge for services, support, customization
- [ ] You CANNOT charge for the GPL v3 licensed software itself (but can charge for distribution media, support, etc.)

### For App Store Distribution

- [ ] iOS App Store: Compatible (Apple's terms don't restrict GPL apps)
- [ ] Google Play: Compatible
- [ ] F-Droid: Preferred for FOSS (highly compatible)
- [ ] Ensure source code is accessible to all recipients
- [ ] App Store fees are fine (that's distribution service charge)

## Dependencies Review

Noteece uses the following dependencies - all GPL v3 compatible:

### Core Dependencies

1. **React Native** (MIT License) ✅
   - Permissive, GPL-compatible
   - Can be used in GPL v3 projects

2. **Expo SDK** (MIT License) ✅
   - Permissive, GPL-compatible
   - No restrictions

3. **SQLite** (Public Domain) ✅
   - Fully compatible with any license
   - No restrictions

4. **Rust Standard Library** (MIT/Apache 2.0) ✅
   - Dual-licensed
   - Both are GPL-compatible

5. **TypeScript** (Apache 2.0) ✅
   - GPL v3 compatible
   - Compiled output has no license restrictions

### JavaScript/React Native Libraries

All dependencies in `package.json` have been reviewed:

- Most are MIT or Apache 2.0 (GPL-compatible)
- None have GPL-incompatible restrictions
- See `package.json` for complete list

### Rust Crates

All dependencies in `Cargo.toml` have been reviewed:

- Mostly MIT, Apache 2.0, or dual-licensed
- All are GPL v3 compatible
- See `Cargo.toml` for complete list

**Recommendation**: Run `cargo license` and `license-checker` (npm) to generate detailed reports.

## Common Questions

### Can I use Noteece in my company?

**Yes**, freely for internal use. If you distribute to others (even employees at branch offices), you must provide source code.

### Can I sell Noteece?

You can charge for **services** like:

- Custom development
- Support and training
- Distribution and installation
- Hosting (though GPL v3 doesn't require source for SaaS)

You cannot prevent recipients from redistributing for free.

### Can I create a proprietary fork?

**No**. Any derivative of Noteece must also be GPL v3. This is the point of copyleft.

### Can I use Noteece with a proprietary app?

**Maybe**:

- If they communicate via IPC/API and are separate programs → Likely OK
- If you link them together into one program → Likely GPL v3 applies to all
- Gray area: consult a lawyer for specific cases

### Can I remove the GPL?

**No**. The copyright holders (contributors) own the copyright. Only they can relicense. You'd need permission from all contributors to change the license.

### What if I violate GPL v3?

- Your license is automatically terminated
- You must stop distributing immediately
- You can be sued for copyright infringement
- You may be able to cure the violation (depends on circumstances)
- Criminal liability possible in some jurisdictions

### Can I contribute to Noteece?

**Yes**! Contributions are welcome:

- Contributions are assumed to be under GPL v3 (or later)
- You retain copyright to your contributions
- See CONTRIBUTING.md for details
- No CLA (Contributor License Agreement) required

## Best Practices

### For Users

1. ✅ Use Noteece freely for any purpose
2. ✅ Verify the source code matches what you're running (it's open!)
3. ✅ Report bugs and suggest features
4. ✅ Contribute if you can

### For Forkers

1. ✅ Keep the GPL v3 license
2. ✅ Document your changes clearly
3. ✅ Consider contributing back upstream
4. ✅ Rename your fork to avoid confusion
5. ✅ Update copyright notices appropriately

### For Commercial Users

1. ✅ Use internally without restrictions
2. ✅ Provide source if you distribute
3. ✅ Consider upstream contributions
4. ✅ Consult a lawyer if you're unsure

## Additional Resources

- **Full GPL v3 Text**: See `LICENSE` file or https://www.gnu.org/licenses/gpl-3.0.html
- **GPL v3 FAQ**: https://www.gnu.org/licenses/gpl-faq.html
- **FSF GPL Guide**: https://www.gnu.org/licenses/quick-guide-gplv3.html
- **License Compatibility**: https://www.gnu.org/licenses/license-list.html

## Legal Disclaimer

**This document is not legal advice.** It's a practical guide to understanding GPL v3 as applied to Noteece. For legal questions, consult a lawyer familiar with open source licensing.

## Contact

For licensing questions:

- **Email**: legal@noteece.app (fictional - update with real contact)
- **GitHub**: https://github.com/[your-username]/Noteece/issues
- **License**: Full text in `LICENSE` file

---

## Summary

**GNU GPL v3** ensures that Noteece remains free and open source forever:

✅ **Use freely** for any purpose
✅ **Study** the source code
✅ **Modify** to suit your needs
✅ **Share** with others
❗ **But** keep derivatives under GPL v3
❗ **And** provide source code when distributing

This protects user freedom and prevents proprietary capture of the software.

**Bottom Line**: GPL v3 aligns perfectly with Noteece's mission of user privacy, security, and freedom. Your data, your software, your freedom.
