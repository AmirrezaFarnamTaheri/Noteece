cmake_minimum_required(VERSION 3.18.1)

project(noteece_core)

add_library( # Sets the name of the library.
             noteece_core

             # Sets the library as a shared library.
             SHARED

             # Provides a relative path to your source file(s).
             NoteeceCore.cpp )

find_library( # Sets the name of the path variable.
              log-lib

              # Specifies the name of the NDK library that
              # you want CMake to locate.
              log )

# Import the core-rs library
# We assume the build system (gradle/cargo-ndk) places libcore_rs.so in the correct jniLibs path
# which is usually on the link path for CMake if configured correctly.
# If not, we might need explicitly set IMPORTED_LOCATION, but relying on -lcore_rs
# via find_library or just target_link_libraries usually works if the paths are right.

target_link_libraries( # Specifies the target library.
                       noteece_core

                       # Link against our Rust core library
                       core_rs

                       # Links the target library to the log library
                       # included in the NDK.
                       ${log-lib} )
