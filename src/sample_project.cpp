#include "engine/engine.h"
#include "engine/scene.h"

#include "graphics/renderer.h"

#include "framework/nodes/mesh_instance_3d.h"
#include "framework/nodes/environment_3d.h"

#include "framework/parsers/parse_gltf.h"

#include "graphics/primitives/quad_mesh.h"
#include "graphics/renderer_storage.h"
#include "shaders/mesh_grid.wgsl.gen.h"

void engine_post_initialize()
{
    Engine* engine = Engine::get_instance();
    Scene* main_scene = engine->get_main_scene();

    // Create skybox
    {
        MeshInstance3D* skybox = new Environment3D();
        main_scene->add_node(skybox);
    }

    // Load Meta Quest Controllers and Controller pointer
    if (engine->get_renderer()->get_xr_available())
    {
        std::vector<Node*> entities_left;
        std::vector<Node*> entities_right;
        GltfParser parser;
        parser.parse("data/meshes/controllers/left_controller.glb", entities_left);
        parser.parse("data/meshes/controllers/right_controller.glb", entities_right);
        main_scene->add_node(static_cast<Node3D*>(entities_left[0]));
        main_scene->add_node(static_cast<Node3D*>(entities_right[0]));
    }

    // Create grid
    {
        MeshInstance3D* grid = new MeshInstance3D();
        grid->set_name("Grid");
        grid->set_mesh(new QuadMesh(1000.0f, 1000.0f, false, true, 100));
        grid->set_position(glm::vec3(0.0f));
        grid->rotate(glm::radians(90.0f), glm::vec3(1.0f, 0.0f, 0.0f));
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
}

void engine_render()
{
    Engine::get_instance()->render_default_gui();
}

void get_engine_config(sEngineConfiguration& out_config)
{
    out_config.window_width = 1280;
    out_config.window_height = 720;

    // Optional callbacks
    out_config.engine_post_initialize = engine_post_initialize;
    out_config.engine_pre_update = nullptr;
    out_config.engine_post_update = nullptr;
    out_config.engine_render = engine_render;
}
