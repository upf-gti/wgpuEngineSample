#pragma once

#include "includes.h"

#include "graphics/renderer.h"
#include "graphics/texture.h"
#include "graphics/pipeline.h"

#include "framework/camera/flyover_camera.h"
#include "framework/camera/orbit_camera.h"

class SampleRenderer : public Renderer {

    Surface     quad_surface;
    Uniform     camera_uniform;
    Uniform     camera_2d_uniform;
    Uniform     linear_sampler_uniform;

    struct sCameraData {
        glm::mat4x4 mvp;
        glm::vec3 eye;
        float dummy;
    };

    sCameraData camera_data;
    sCameraData camera_2d_data;

    // Mesh rendering
    WGPUBindGroup           render_bind_group_camera = nullptr;
    WGPUBindGroup           render_bind_group_camera_2d = nullptr;

    void init_camera_bind_group();

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
