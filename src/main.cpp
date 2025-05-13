#include "engine/sample_engine.h"
#include "graphics/sample_renderer.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#include <emscripten/html5.h>
#include <emscripten/bind.h>

// Binding code
EMSCRIPTEN_BINDINGS(_Class_) {

    emscripten::class_<SampleEngine>("Engine")
        .constructor<>()
        .class_function("getInstance", &SampleEngine::get_sample_instance, emscripten::return_value_policy::reference())
        .function("setWasmModuleInitialized", &SampleEngine::set_wasm_module_initialized)
        .function("appendGLB", &SampleEngine::append_glb);
}

#endif

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
