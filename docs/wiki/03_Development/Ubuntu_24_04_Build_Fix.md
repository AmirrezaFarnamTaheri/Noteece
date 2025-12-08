## Build Fixes for Ubuntu 24.04 (Noble)

Ubuntu 24.04 (Noble Numbat) removed `webkit2gtk-4.0` and `javascriptcoregtk-4.0` from its repositories, replacing them with version 4.1. This causes build failures for Tauri v1 applications which depend on the 4.0 versions.

### Solution

We implement a symlink workaround to bridge the version gap. This is a temporary measure until the project migrates to Tauri v2 (which supports 4.1 natively).

```bash
# Install available 4.1 packages
sudo apt-get install -y libwebkit2gtk-4.1-dev

# Create symlinks for pkg-config to alias 4.1 as 4.0
sudo ln -s /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.1.pc /usr/lib/x86_64-linux-gnu/pkgconfig/javascriptcoregtk-4.0.pc
sudo ln -s /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.1.pc /usr/lib/x86_64-linux-gnu/pkgconfig/webkit2gtk-4.0.pc
```

Note: This workaround allows compilation but may have runtime stability implications. A full migration to Tauri v2 is recommended for long-term support.
