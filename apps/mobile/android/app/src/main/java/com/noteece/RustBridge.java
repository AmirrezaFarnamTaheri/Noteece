package com.noteece;

public class RustBridge {
    static {
        System.loadLibrary("core_rs");
    }

    public static native void ingest(String text);
    public static native String anchorLatest();
    public static native void reset();
}
