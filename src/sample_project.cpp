#include  "config_structs.h"

#include "core/managers/simulation/simulation_manager.h"
#include "core/managers/render/render_storage.h"
#include "core/managers/render/render_manager.h"
#include "core/managers/xr/xr_manager.h"

#include "scene/main/scene.h"
#include "scene/3d/mesh_instance_3d.h"
#include "scene/3d/environment_3d.h"
#include "scene/3d/editor_camera_3d.h"

#include "framework/parsers/parse_gltf.h"

#include "graphics/primitives/quad_mesh.h"
#include "shaders/mesh_grid.wgsl.gen.h"

void engine_post_initialize()
{
    Scene* main_scene = SimulationManager::get_singleton()->get_main_scene();

    {
        EditorCamera3D* editor_camera = new EditorCamera3D();
        editor_camera->set_perspective(glm::radians(45.0f), RenderManager::get_singleton()->get_render_width() / static_cast<float>(RenderManager::get_singleton()->get_render_height()), 0.01f, 1000.0f);
        editor_camera->look_at(glm::vec3(-3.0f, 3.0, -3.0f), glm::vec3(0.0f), glm::vec3(0.0f, 1.0f, 0.0f));
        main_scene->add_node(editor_camera);
        main_scene->set_main_camera(editor_camera);
    }

    // Create skybox
    {
        Environment3D* environment = new Environment3D();
        environment->set_sky_texture(RenderStorage::get_singleton()->get_texture("data/textures/environments/sky.hdr"));
        main_scene->add_node(environment);
    }

    // Load Meta Quest Controllers and Controller pointer
    if (XRManager::get_singleton()->is_xr_available())
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
        grid_material->set_shader(RenderStorage::get_singleton()->get_shader_from_source(shaders::mesh_grid::source, shaders::mesh_grid::path, shaders::mesh_grid::libraries, grid_material));
        grid->set_surface_material_override(grid->get_surface(0), grid_material);

        main_scene->add_node(grid);
    }
}

void engine_render()
{
    //Engine::get_instance()->render_default_gui();
}

void get_engine_config(sEngineConfig& out_config)
{
    out_config.window_width = 1280;
    out_config.window_height = 720;

    // Optional callbacks
    out_config.engine_post_initialize = engine_post_initialize;
    out_config.engine_pre_update = nullptr;
    out_config.engine_post_update = nullptr;
    out_config.engine_render = engine_render;
}
