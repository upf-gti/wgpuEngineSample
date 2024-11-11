#include "sample_renderer.h"

#include "graphics/shader.h"

SampleRenderer::SampleRenderer(const sRendererConfiguration& config) : Renderer(config)
{

}

int SampleRenderer::pre_initialize(GLFWwindow* window, bool use_mirror_screen)
{
    return Renderer::pre_initialize(window, use_mirror_screen);
}

int SampleRenderer::initialize()
{
    int error_code = Renderer::initialize();

    clear_color = glm::vec4(0.22f, 0.22f, 0.22f, 1.0);

    return error_code;
}

int SampleRenderer::post_initialize()
{
    return Renderer::post_initialize();
}

void SampleRenderer::clean()
{
    Renderer::clean();
}

void SampleRenderer::update(float delta_time)
{
    Renderer::update(delta_time);
}

void SampleRenderer::render()
{
    Renderer::render();
}
