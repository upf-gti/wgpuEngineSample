#include "engine/sample_engine.h"
#include "graphics/sample_renderer.h"

#include "spdlog/spdlog.h"

int main()
{
    SampleEngine* engine = new SampleEngine();
    SampleRenderer* renderer = new SampleRenderer();

    // change if necessary
    WGPURequiredLimits required_limits = {};
    required_limits.limits.maxVertexAttributes = 4;
    required_limits.limits.maxVertexBuffers = 1;
    required_limits.limits.maxBindGroups = 2;
    required_limits.limits.maxUniformBuffersPerShaderStage = 1;
    required_limits.limits.maxUniformBufferBindingSize = 65536;
    required_limits.limits.minUniformBufferOffsetAlignment = 256;
    required_limits.limits.minStorageBufferOffsetAlignment = 256;
    required_limits.limits.maxComputeInvocationsPerWorkgroup = 256;
    required_limits.limits.maxSamplersPerShaderStage = 1;
    required_limits.limits.maxDynamicUniformBuffersPerPipelineLayout = 1;

    renderer->set_required_limits(required_limits);

    sEngineConfiguration configuration;
    configuration.window_width = 640;
    configuration.window_height = 360;

    if (engine->initialize(renderer, configuration)) {
        return 1;
    }

    engine->start_loop();

    engine->clean();

    delete engine;
    delete renderer;

    return 0;
}
