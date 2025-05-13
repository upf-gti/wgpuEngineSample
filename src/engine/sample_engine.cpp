#include "sample_engine.h"

#include "framework/nodes/environment_3d.h"
#include "framework/parsers/parse_gltf.h"
//#include "framework/parsers/parse_obj.h"
#include "framework/input.h"

#include "graphics/sample_renderer.h"
#include "graphics/renderer_storage.h"

#include "engine/scene.h"

#include "shaders/mesh_forward.wgsl.gen.h"
#include "shaders/mesh_grid.wgsl.gen.h"

#include "spdlog/spdlog.h"

int SampleEngine::initialize(Renderer* renderer, sEngineConfiguration configuration)
{
	return Engine::initialize(renderer, configuration);
}

int SampleEngine::post_initialize()
{
    Engine::post_initialize();

    main_scene = new Scene("main_scene");

    // Create skybox
    {
        MeshInstance3D* skybox = new Environment3D();
        main_scene->add_node(skybox);
    }

    // Load Meta Quest Controllers and Controller pointer
    if (renderer->get_xr_available())
    {
        std::vector<Node*> entities_left;
        std::vector<Node*> entities_right;
        GltfParser parser;
        parser.parse("data/meshes/controllers/left_controller.glb", entities_left);
        parser.parse("data/meshes/controllers/right_controller.glb", entities_right);
        controller_mesh_left = static_cast<Node3D*>(entities_left[0]);
        controller_mesh_right = static_cast<Node3D*>(entities_right[0]);
    }

    // Create grid
    {
        MeshInstance3D* grid = new MeshInstance3D();
        grid->set_name("Grid");
        grid->add_surface(RendererStorage::get_surface("quad"));
        grid->set_position(glm::vec3(0.0f));
        grid->rotate(glm::radians(90.0f), glm::vec3(1.0f, 0.0f, 0.0f));
        grid->scale(glm::vec3(10.f));
        grid->set_frustum_culling_enabled(false);

        // NOTE: first set the transparency and all types BEFORE loading the shader
        Material* grid_material = new Material();
        grid_material->set_transparency_type(ALPHA_BLEND);
        grid_material->set_cull_type(CULL_NONE);
        grid_material->set_type(MATERIAL_UNLIT);
        grid_material->set_shader(RendererStorage::get_shader_from_source(shaders::mesh_grid::source, shaders::mesh_grid::path, shaders::mesh_grid::libraries, grid_material));
        grid->set_surface_material_override(grid->get_surface(0), grid_material);

        main_scene->add_node(grid);
    }

    return 0u;
}

void SampleEngine::clean()
{
    Engine::clean();
}

void SampleEngine::update(float delta_time)
{
    Engine::update(delta_time);

    main_scene->update(delta_time);

    if (renderer->get_xr_available()) {
        controller_mesh_left->set_transform(Transform::mat4_to_transform(Input::get_controller_pose(HAND_LEFT)));
        controller_mesh_right->set_transform(Transform::mat4_to_transform(Input::get_controller_pose(HAND_RIGHT)));
    }
}

void SampleEngine::render()
{
    if (show_imgui) {
        render_default_gui();
    }

    main_scene->render();

    if (renderer->get_xr_available()) {
        controller_mesh_left->render();
        controller_mesh_right->render();
    }

    Engine::render();
}


void SampleEngine::append_glb(const std::string& filename)
{
    std::vector<Node*> entities;

    GltfParser gltf_parser;

    gltf_parser.parse(filename.c_str(), entities, PARSE_NO_FLAGS);

    if (!entities.empty()) {
        main_scene->add_nodes(entities);
    }
}
