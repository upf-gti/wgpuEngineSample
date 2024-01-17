#pragma once

#include "includes.h"

#include "graphics/renderer.h"
#include "graphics/texture.h"
#include "graphics/pipeline.h"

#include "framework/camera/flyover_camera.h"
#include "framework/camera/orbit_camera.h"

class SampleRenderer : public Renderer {

    Surface             quad_surface;
    Uniform             camera_uniform;

    struct sCameraData {
        glm::mat4x4 mvp;
        glm::vec3 eye;
        float dummy;
    } camera_data;

    Texture             eye_depth_textures[EYE_COUNT] = {};
    WGPUTextureView     eye_depth_texture_view[EYE_COUNT] = {};

    // Mesh rendering
    WGPUBindGroup           render_bind_group_camera = nullptr;
    Shader*                 render_mesh_shader = nullptr;

    void init_depth_buffers();
    void init_camera_bind_group();
    void init_render_mesh_pipelines();

    void render_screen();

    void render_opaque(WGPURenderPassEncoder render_pass);
    void render_transparent(WGPURenderPassEncoder render_pass);

#if defined(XR_SUPPORT)
    void render_xr();

    // For the XR mirror screen
#if defined(USE_MIRROR_WINDOW)
    void render_mirror();
    void init_mirror_pipeline();

    Pipeline mirror_pipeline;
    Shader* mirror_shader = nullptr;

    std::vector<Uniform> swapchain_uniforms;
    std::vector<WGPUBindGroup> swapchain_bind_groups;
#endif // USE_MIRROR_WINDOW

#endif // XR_SUPPORT

public:

    SampleRenderer();

    int initialize(GLFWwindow* window, bool use_mirror_screen = false) override;
    void resize_window(int width, int height) override;
    inline Uniform* get_current_camera_uniform() { return &camera_uniform; }

    void update(float delta_time) override;
    void render() override;
    void clean() override;

    glm::vec3 get_camera_eye();
};
