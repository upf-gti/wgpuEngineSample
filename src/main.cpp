#include "engine/sample_engine.h"
#include "graphics/sample_renderer.h"

int main()
{
    // Debug for testing js bindings
#ifdef __EMSCRIPTEN__
    Engine* engine = new Engine();
#else
    SampleEngine* engine = new SampleEngine();
#endif

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
