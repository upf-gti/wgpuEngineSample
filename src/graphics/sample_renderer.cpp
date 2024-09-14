#include "sample_renderer.h"

#include "graphics/shader.h"

SampleRenderer::SampleRenderer() : Renderer()
{

}

int SampleRenderer::initialize(GLFWwindow* window, bool use_mirror_screen)
{
    Renderer::initialize(window, use_mirror_screen);

    clear_color = glm::vec4(0.22f, 0.22f, 0.22f, 1.0);

    return 0;
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
