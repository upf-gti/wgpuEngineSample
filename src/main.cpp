#include "engine/sample_engine.h"
#include "graphics/sample_renderer.h"

int main()
{
    SampleEngine* engine = new SampleEngine();
    SampleRenderer* renderer = new SampleRenderer();

    sEngineConfiguration configuration = {
        .window_width = 1280,
        .window_height = 720
    };

    if (engine->initialize(renderer, configuration)) {
        return 1;
    }

    engine->start_loop();

    engine->clean();

    delete engine;

    delete renderer;

    return 0;
}
