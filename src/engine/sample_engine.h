#pragma once

#include "engine/engine.h"

class Node3D;

class SampleEngine : public Engine {

    Node3D* controller_mesh_left = nullptr;
    Node3D* controller_mesh_right = nullptr;

    Node3D* scene_root = nullptr;

public:

	int initialize(Renderer* renderer, const sEngineConfiguration& configuration = {}) override;
    int post_initialize() override;
    void clean() override;

    static SampleEngine* get_sample_instance() { return static_cast<SampleEngine*>(instance); }

	void update(float delta_time) override;
	void render() override;

    void append_glb(const std::string& filename);

#ifdef __EMSCRIPTEN__
    void set_wasm_module_initialized(bool value) {
        wasm_module_initialized = value;
    }
#endif
};
