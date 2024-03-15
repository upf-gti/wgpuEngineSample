#pragma once

#include "engine.h"

#include <vector>

class Node;
class Node3D;
class MeshInstance3D;

class SampleEngine : public Engine {

    static std::vector<Node3D*> entities;
    static MeshInstance3D* skybox;
    static MeshInstance3D* grid;

    void render_gui();
    bool show_tree_recursive(Node* entity);

public:

	int initialize(Renderer* renderer, GLFWwindow* window, bool use_glfw, bool use_mirror_screen) override;
    void clean() override;

	void update(float delta_time) override;
	void render() override;
};
