
cmake_minimum_required(VERSION 3.13)

set(SAMPLE_PROJECT_DIR_ROOT        ${CMAKE_CURRENT_SOURCE_DIR})
set(SAMPLE_PROJECT_DIR_SOURCES     "${SAMPLE_PROJECT_DIR_ROOT}/src")
set(SAMPLE_PROJECT_DIR_LIBS        "${SAMPLE_PROJECT_DIR_ROOT}/libraries")

project(sample_project LANGUAGES C CXX)

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

#set_target_properties(${PROJECT_NAME} PROPERTIES VS_DEBUGGER_ENVIRONMENT "DAWN_DEBUG_BREAK_ON_ERROR=1")

set_property(DIRECTORY ${SAMPLE_PROJECT_DIR_ROOT} PROPERTY VS_STARTUP_PROJECT ${PROJECT_NAME})
set_property(TARGET ${PROJECT_NAME} PROPERTY CXX_STANDARD 20)
set_property(TARGET ${PROJECT_NAME} PROPERTY VS_DEBUGGER_WORKING_DIRECTORY "${SAMPLE_PROJECT_DIR_ROOT}")

if (MSVC)
    add_compile_options(/Zc:__cplusplus)
endif()

if (EMSCRIPTEN)
    set(SHELL_FILE shell.html)

    target_link_options(${PROJECT_NAME} PRIVATE
        -sUSE_GLFW=3
        -sUSE_WEBGPU
        -sALLOW_MEMORY_GROWTH
        -sASYNCIFY
#        -sWASM=0
        -sASSERTIONS
#        -fsanitize=address
        -Wdeprecated-literal-operator
        -sSTACK_SIZE=5MB
        -lembind # to bind functions from c++ to javascript
#        -O3
        # only for dev
#        -sERROR_ON_WASM_CHANGES_AFTER_LINK
#        -sWASM_BIGINT
        # ------------
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

# vulkan
include_directories(${Vulkan_INCLUDE_DIR})

# Enable multicore compile on VS solution
if(MSVC)
  add_definitions(/MP)
endif()

