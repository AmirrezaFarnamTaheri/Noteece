cmake_minimum_required(VERSION 3.18.1)

project(noteece_core)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define the shared library
add_library(noteece_core SHARED
    NoteeceCore.cpp
)

# Find required Android libraries
find_library(log-lib log)
find_library(android-lib android)

# Locate the Rust core library
# The library is built by cargo and placed in jniLibs during the build process
set(RUST_LIB_DIR ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI})

# Link against Rust core library if available
if(EXISTS "${RUST_LIB_DIR}/libcore_rs.so")
    add_library(core_rs SHARED IMPORTED)
    set_target_properties(core_rs PROPERTIES
        IMPORTED_LOCATION ${RUST_LIB_DIR}/libcore_rs.so
    )
    
    target_link_libraries(noteece_core
        core_rs
        ${log-lib}
        ${android-lib}
    )
    
    message(STATUS "Rust core library found at: ${RUST_LIB_DIR}/libcore_rs.so")
else()
    # Fallback: link without Rust (for development builds)
    target_link_libraries(noteece_core
        ${log-lib}
        ${android-lib}
    )
    
    message(WARNING "Rust core library not found. Building without Rust integration.")
    
    # Define stub implementations when Rust is not available
    target_compile_definitions(noteece_core PRIVATE RUST_CORE_STUB=1)
endif()

# Include directories
target_include_directories(noteece_core PRIVATE
    ${CMAKE_SOURCE_DIR}
)

# Compiler flags for optimization
target_compile_options(noteece_core PRIVATE
    -Wall
    -Wextra
    -O2
    -fvisibility=hidden
)
