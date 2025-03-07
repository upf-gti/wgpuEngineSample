#pragma once

#include "engine/engine.h"

class SampleEngine : public Engine {

public:

	int initialize(Renderer* renderer, sEngineConfiguration configuration = {}) override;
    int post_initialize() override;
    void clean() override;

    static SampleEngine* get_sample_instance() { return static_cast<SampleEngine*>(instance); }

	void update(float delta_time) override;
	void render() override;

#ifdef __EMSCRIPTEN__
    void set_wasm_module_initialized(bool value) {
        wasm_module_initialized = value;
    }
#endif
};
