#include "sample_engine.h"
#include "framework/nodes/environment_3d.h"
#include "framework/nodes/viewport_3d.h"
#include "framework/nodes/node.h"
#include "framework/input.h"
#include "framework/scene/parse_scene.h"
#include "graphics/sample_renderer.h"
#include "engine/scene.h"

#include "backends/imgui_impl_glfw.h"
#include "backends/imgui_impl_wgpu.h"

#include "framework/utils/tinyfiledialogs.h"

#include "shaders/mesh_grid.wgsl.gen.h"

#include "spdlog/spdlog.h"

#include "framework/animation/skeleton.h"
#include "framework/nodes/look_at_ik_3d.h"
#include "framework/math/transform.h"

MeshInstance3D* SampleEngine::skybox = nullptr;
MeshInstance3D* SampleEngine::grid = nullptr;

int SampleEngine::initialize(Renderer* renderer, GLFWwindow* window, bool use_glfw, bool use_mirror_screen)
{
	int error = Engine::initialize(renderer, window, use_glfw, use_mirror_screen);

    // Create skybox

    main_scene = new Scene("main_scene");

    {
        skybox = new Environment3D();
        main_scene->add_node(skybox);
    }

    // Create grid
    {
        grid = new MeshInstance3D();
        grid->set_name("Grid");
        grid->add_surface(RendererStorage::get_surface("quad"));
        grid->set_position(glm::vec3(0.0f));
        grid->rotate(glm::radians(90.0f), glm::vec3(1.0f, 0.0f, 0.0f));
        grid->scale(glm::vec3(10.f));

        // NOTE: first set the transparency and all types BEFORE loading the shader
        Material grid_material;
        grid_material.transparency_type = ALPHA_BLEND;
        grid_material.cull_type = CULL_NONE;
        grid_material.shader = RendererStorage::get_shader_from_source(shaders::mesh_grid::source, shaders::mesh_grid::path, grid_material);

        grid->set_surface_material_override(grid->get_surface(0), grid_material);

        main_scene->add_node(grid);
    }

    std::vector<Node*> entities;
    parse_scene("data/meshes/Woman.gltf", entities);
    main_scene->add_nodes(entities);
    //Pose pose(4);
    //Transform t;
    //pose.set_local_transform(0, t);
    //pose.set_parent(0, -1);
    //t.position.y = 1;
    //pose.set_local_transform(1, t);
    //pose.set_parent(1, 0);
    //t.position.x = 1;
    //pose.set_local_transform(2, t);
    //pose.set_parent(2, 1);
    //t.position.x = 1;
    //pose.set_local_transform(3, t);
    //pose.set_parent(3, 2);
    //Skeleton* skeleton = new Skeleton(pose, pose, { "Bone 1", "Bone 2", "Bone 3", "Bones 4"});
    //SkeletonInstance3D* ski = new SkeletonInstance3D();
    //ski->set_skeleton(skeleton);
    //LookAtIK3D* lookat = new LookAtIK3D(ski);
    //ski->add_child((Node3D*)(lookat));

    //entities.push_back(ski);

    return error;
}

void SampleEngine::clean()
{
    Engine::clean();

    if (grid) delete grid;
}

void SampleEngine::update(float delta_time)
{
    main_scene->update(delta_time);

    Engine::update(delta_time);
}

void SampleEngine::render()
{
    render_gui();

    main_scene->render();

    Engine::render();
}

void SampleEngine::render_gui()
{
    if (SampleRenderer::instance->get_openxr_available()) {
        return;
    }

    bool active = true;

    ImGui::Begin("Debug panel", &active, ImGuiWindowFlags_MenuBar);

    if (ImGui::BeginMenuBar())
    {
        if (ImGui::BeginMenu("File"))
        {
            if (ImGui::MenuItem("Open scene (.gltf, .glb, .obj)"))
            {
                std::vector<const char*> filter_patterns = { "*.gltf", "*.glb", "*.obj" };
                char const* open_file_name = tinyfd_openFileDialog(
                    "Scene loader",
                    "",
                    filter_patterns.size(),
                    filter_patterns.data(),
                    "Scene formats",
                    0
                );

                if (open_file_name) {
                    std::vector<Node*> entities;
                    parse_scene(open_file_name, entities);
                    main_scene->add_nodes(entities);
                }
            }
            ImGui::EndMenu();
        }
        ImGui::EndMenuBar();
    }

    ImGuiTabBarFlags tab_bar_flags = ImGuiTabBarFlags_None;
    if (ImGui::BeginTabBar("TabBar", tab_bar_flags))
    {
        if (ImGui::BeginTabItem("Scene"))
        {
            if (ImGui::TreeNodeEx("Root", ImGuiTreeNodeFlags_DefaultOpen))
            {
                if (ImGui::BeginPopupContextItem()) // <-- use last item id as popup id
                {
                    if (ImGui::Button("Delete All")) {
                        main_scene->delete_all();
                        ImGui::CloseCurrentPopup();
                    }

                    ImGui::EndPopup();
                }

                std::vector<Node*>& nodes = main_scene->get_nodes();
                std::vector<Node*>::iterator it = nodes.begin();
                while (it != nodes.end())
                {
                    if (show_tree_recursive(*it)) {
                        it = nodes.erase(it);
                    }
                    else {
                        it++;
                    }
                }

                ImGui::TreePop();
            }
            ImGui::EndTabItem();
        }
        ImGui::EndTabBar();
    }
    ImGui::Separator();

    ImGui::End();
}

bool SampleEngine::show_tree_recursive(Node* entity)
{
    std::vector<Node*>& children = entity->get_children();

    MeshInstance3D* entity_mesh = dynamic_cast<MeshInstance3D*>(entity);

    ImGuiTreeNodeFlags flags = ImGuiTreeNodeFlags_DefaultOpen;

    if (!entity_mesh && children.empty() || (entity_mesh && children.empty() && entity_mesh->get_surfaces().empty())) {
        flags |= ImGuiTreeNodeFlags_Leaf;
    }

    flags |= ImGuiTreeNodeFlags_Framed;
    if (ImGui::TreeNodeEx(entity->get_name().c_str(), flags))
    {
        if (ImGui::BeginPopupContextItem()) // <-- use last item id as popup id
        {
            if (ImGui::Button("Delete")) {
                ImGui::CloseCurrentPopup();
                ImGui::EndPopup();
                ImGui::TreePop();
                return true;
            }
            ImGui::EndPopup();
        }

        if (entity_mesh) {

            const std::vector<Surface*>& surfaces = entity_mesh->get_surfaces();

            for (int i = 0; i < surfaces.size(); ++i) {

                ImGui::TreeNodeEx(("Surface " + std::to_string(i)).c_str(), ImGuiTreeNodeFlags_DefaultOpen | ImGuiTreeNodeFlags_Leaf);
                ImGui::TreePop();
            }
        }

        entity->render_gui();

        

        for (size_t i = 0; i < children.size(); i++) {
            show_tree_recursive(children[i]);
        }
        /*std::vector<Node*>::iterator it = children.begin();
        while (it != children.end())
        {
            if (show_tree_recursive(*it)) {
                it = children.erase(it);
            }
            else { 
                it++;
            }
        }*/

        ImGui::TreePop();
    }

    return false;
}
