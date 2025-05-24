
cmake_minimum_required(VERSION 3.13)

set(SAMPLE_PROJECT_DIR_ROOT        ${CMAKE_CURRENT_SOURCE_DIR})
set(SAMPLE_PROJECT_DIR_SOURCES     "${SAMPLE_PROJECT_DIR_ROOT}/src")
set(SAMPLE_PROJECT_DIR_LIBS        "${SAMPLE_PROJECT_DIR_ROOT}/libraries")

if (EMSCRIPTEN)
    project(index LANGUAGES C CXX)
else()
    project(sample_project LANGUAGES C CXX)
endif()

# Enable multicore and simd compile on VS solution
if(MSVC)
    add_definitions(/MP)
    add_definitions(/arch:AVX2)

    # enable link time optimization
    if (CMAKE_BUILD_TYPE STREQUAL "Release")
        add_definitions(/GL)
        add_definitions(/LTCG)
    endif()

    # disable RTTI (dynamic cast)
#    string(REGEX REPLACE "/GR" "/GR-" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")

    # disable exceptions
	string(REGEX REPLACE "/EHsc" "/EHs-c-" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
endif()

add_definitions(-D_SILENCE_STDEXT_ARR_ITERS_DEPRECATION_WARNING)

# Macro to map filters to folder structure for MSVC projects
macro(GroupSources curdir)
    if(MSVC)
		file(GLOB children RELATIVE ${PROJECT_SOURCE_DIR}/${curdir} ${PROJECT_SOURCE_DIR}/${curdir}/*)

        foreach(child ${children})
            if(IS_DIRECTORY ${PROJECT_SOURCE_DIR}/${curdir}/${child})
                GroupSources(${curdir}/${child})
            else()
                string(REPLACE "/" "\\" groupname ${curdir})
                source_group(${groupname} FILES ${PROJECT_SOURCE_DIR}/${curdir}/${child})
            endif()
        endforeach()
    endif()
endmacro()

GroupSources(src)

# Sources
macro(SAMPLE_PROJECT_FILES_APPEND)
    file(GLOB FILES_APPEND CONFIGURE_DEPENDS ${ARGV})
    list(APPEND SAMPLE_PROJECT_SOURCES ${FILES_APPEND})
endmacro()
macro(SAMPLE_PROJECT_SOURCES_APPEND)
    SAMPLE_PROJECT_FILES_APPEND(${ARGV0}/*.h)
    SAMPLE_PROJECT_FILES_APPEND(${ARGV0}/*.cpp)
endmacro()

SAMPLE_PROJECT_SOURCES_APPEND(${SAMPLE_PROJECT_DIR_SOURCES})
SAMPLE_PROJECT_SOURCES_APPEND(${SAMPLE_PROJECT_DIR_SOURCES}/engine)
SAMPLE_PROJECT_SOURCES_APPEND(${SAMPLE_PROJECT_DIR_SOURCES}/graphics)

add_executable(${PROJECT_NAME} ${SAMPLE_PROJECT_SOURCES})

target_include_directories(${PROJECT_NAME} PUBLIC ${SAMPLE_PROJECT_DIR_SOURCES})

set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 20)

# OS Dependant project setup
if(APPLE)
    set_target_properties(${PROJECT_NAME} PROPERTIES 
            XCODE_GENERATE_SCHEME TRUE 
            XCODE_SCHEME_WORKING_DIRECTORY ${SAMPLE_PROJECT_DIR_ROOT})
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g")
elseif(MSVC)
    #set_target_properties(${PROJECT_NAME} PROPERTIES VS_DEBUGGER_ENVIRONMENT "DAWN_DEBUG_BREAK_ON_ERROR=1")
    set_property(TARGET ${PROJECT_NAME} PROPERTY VS_DEBUGGER_WORKING_DIRECTORY "${SAMPLE_PROJECT_DIR_ROOT}")
    set_property(DIRECTORY ${SAMPLE_PROJECT_DIR_ROOT} PROPERTY VS_STARTUP_PROJECT ${PROJECT_NAME})
endif()

if (MSVC)
    add_compile_options(/Zc:__cplusplus)
endif()

if (EMSCRIPTEN)
    set(SHELL_FILE shell.html)

    include_directories(BEFORE
        "${CMAKE_BINARY_DIR}/_deps/emdawn-src/include/"
    )

    add_library(webgpu_layer
        "${CMAKE_BINARY_DIR}/_deps/emdawn-src/webgpu.cpp"
    )
    target_link_libraries(${PROJECT_NAME}
        webgpu_layer
    )

    add_compile_options(
        # "-fno-exceptions"
        "$<$<CONFIG:Release>:-flto>"
    )

    add_link_options(
        # "-fno-exceptions"
        "$<$<CONFIG:Release>:-flto>"
    )

    # See https://github.com/kainino0x/webgpu-cross-platform-demo/tree/dawnwasm for a sample setup

    # WebIDL bindings
    #set(IDL_FILE ${SAMPLE_PROJECT_DIR_ROOT}/bindings/bindings.idl)
    #set(GLUE_CPP ${CMAKE_BINARY_DIR}/glue.cpp)
    #set(GLUE_JS  ${CMAKE_BINARY_DIR}/glue.js)
    #set(PATCHED_GLUE_CPP ${CMAKE_BINARY_DIR}/glue_patched.cpp)

    #find_program(WEBIDL_BINDER webidl_binder PATHS "$ENV{EMSDK}/upstream/emscripten/tools")
    # message(STATUS "WEBIDL_BINDER path: ${WEBIDL_BINDER}")

    # Generate glue bindings
    #add_custom_command(
    #    OUTPUT ${GLUE_CPP} ${GLUE_JS}
    #    COMMAND ${WEBIDL_BINDER} ${IDL_FILE} glue
    #    DEPENDS ${IDL_FILE}
    #)

    # Add headers wrapper to glue at the top
    #add_custom_command(
    #    OUTPUT ${PATCHED_GLUE_CPP}
    #    COMMAND ${CMAKE_COMMAND} -E cat "${SAMPLE_PROJECT_DIR_ROOT}/bindings/wrapper.cpp" > ${PATCHED_GLUE_CPP}
    #    COMMAND ${CMAKE_COMMAND} -E cat ${GLUE_CPP} >> ${PATCHED_GLUE_CPP}
    #    DEPENDS ${GLUE_CPP} ${SAMPLE_PROJECT_DIR_ROOT}/bindings/wrapper.cpp
    #)

    #target_sources(${PROJECT_NAME} PRIVATE ${PATCHED_GLUE_CPP})
    target_sources(${PROJECT_NAME} PRIVATE ${SAMPLE_PROJECT_DIR_ROOT}/bindings/embind_bindings.cpp)

    target_link_options(${PROJECT_NAME} PRIVATE

        # -sVERBOSE

        # We are using Dawn-generated bindings, not built-in ones
        -sUSE_WEBGPU=0
        # The JS libraries needed for bindings
        "--js-library=${CMAKE_BINARY_DIR}/_deps/emdawn-src/library_webgpu_enum_tables.js"
        "--js-library=${CMAKE_BINARY_DIR}/_deps/emdawn-src/library_webgpu_generated_struct_info.js"
        "--js-library=${CMAKE_BINARY_DIR}/_deps/emdawn-src/library_webgpu_generated_sig_info.js"
        "--js-library=${CMAKE_BINARY_DIR}/_deps/emdawn-src/library_webgpu.js"
        "--closure-args=--externs=${CMAKE_BINARY_DIR}/_deps/emdawn-src/webgpu-externs.js"

        -sEXPORTED_FUNCTIONS=_main,_malloc,_free
        -sUSE_GLFW=3
        -sALLOW_MEMORY_GROWTH
        -sASYNCIFY
#        -sASSERTIONS
#        -fsanitize=address
        -Wdeprecated-literal-operator
        -sSTACK_SIZE=5MB
        -sASYNCIFY_STACK_SIZE=10000
        -lembind # to bind functions from c++ to javascript
        -sWASM_BIGINT

        # only for dev
        #-sERROR_ON_WASM_CHANGES_AFTER_LINK
        #-sWASM=0
        # For faster debug builds
        -O1
        # ------------
        #--post-js "${CMAKE_BINARY_DIR}/glue.js"
        --shell-file "${SAMPLE_PROJECT_DIR_ROOT}/${SHELL_FILE}"
        --preload-file "${SAMPLE_PROJECT_DIR_ROOT}/data@/data"
	)

	# Make sure to re-link when the shell file changes
    set_property(
        TARGET ${PROJECT_NAME}
        PROPERTY LINK_DEPENDS
        "${SAMPLE_PROJECT_DIR_ROOT}/${SHELL_FILE}"
    )

    set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".html")
endif()

# wgpuEngine
add_subdirectory(libraries/wgpuEngine)
target_link_libraries(${PROJECT_NAME} webgpuEngine)

# Enable multicore compile on VS solution
if(MSVC)
  add_definitions(/MP)
endif()

