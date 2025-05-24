// Wrapper for all our classes
// that are necessary to bind

#include <string.h>

#include "engine/engine.h"
#include "engine/scene.h"

#include "graphics/renderer.h"
#include "graphics/renderer_storage.h"
#include "graphics/shader.h"
#include "graphics/texture.h"
#include "graphics/pipeline.h"
#include "graphics/material.h"

#include "framework/math/transform.h"
#include "framework/math/math_utils.h"
#include "framework/nodes/environment_3d.h"
#include "framework/nodes/directional_light_3d.h"
#include "framework/nodes/omni_light_3d.h"
#include "framework/nodes/spot_light_3d.h"
#include "framework/parsers/parse_gltf.h"
#include "framework/camera/flyover_camera.h"
#include "framework/camera/orbit_camera.h"

#include <glm/gtc/type_ptr.hpp>
#include "glm/gtx/quaternion.hpp"
#include "glm/gtx/euler_angles.hpp"

#include <emscripten.h>
#include <emscripten/html5.h>
#include <emscripten/bind.h>

using namespace emscripten;


// Binding code

EMSCRIPTEN_BINDINGS(wgpuEngine_bindings) {

    /*
    *	Math
    */

    class_<glm::vec2>("vec2")
        .constructor<>()
        .constructor<float>()
        .constructor<float, float>()
        .property("x", &glm::vec2::x)
        .property("y", &glm::vec2::y);

    class_<glm::vec3>("vec3")
        .constructor<>()
        .constructor<float>()
        .constructor<float, float, float>()
        .property("x", &glm::vec3::x)
        .property("y", &glm::vec3::y)
        .property("z", &glm::vec3::z);

    class_<glm::vec4>("vec4")
        .constructor<>()
        .constructor<float>()
        .constructor<float, float, float, float>()
        .property("x", &glm::vec4::x)
        .property("y", &glm::vec4::y)
        .property("z", &glm::vec4::z)
        .property("w", &glm::vec4::w);

    class_<glm::quat>("quat")
        .constructor<>()
        .constructor<float, float, float, float>()
        .property("x", &glm::quat::x)
        .property("y", &glm::quat::y)
        .property("z", &glm::quat::z)
        .property("w", &glm::quat::w);

    class_<Transform>("Transform")
        .constructor<>();

    function("radians", &radians);
    function("degrees", &degrees);

    /*
    *	Camera
    */

    enum_<eCameraType>("CameraType")
        .value("CAMERA_ORBIT", CAMERA_ORBIT)
        .value("CAMERA_FLYOVER", CAMERA_FLYOVER);

    enum_<Camera::eCameraProjectionType>("CameraProjectionType")
        .value("CAMERA_PERSPECTIVE", Camera::eCameraProjectionType::PERSPECTIVE)
        .value("CAMERA_ORTHOGRAPHIC", Camera::eCameraProjectionType::ORTHOGRAPHIC);

    class_<Camera>("Camera")
        .function("update", &Camera::update)
        .function("updateViewMatrix", &Camera::update_view_matrix)
        .function("updateProjectionMatrix", &Camera::update_projection_matrix)
        .function("updateViewProjectionMatrix", &Camera::update_view_projection_matrix)
        .function("lookAt", &Camera::look_at)
        .function("screenToRay", &Camera::screen_to_ray)
        .function("setPerspective", &Camera::set_perspective)
        .function("setOrthographic", &Camera::set_orthographic)
        .function("setView", &Camera::set_view)
        .function("setProjection", &Camera::set_projection)
        .function("setViewProjection", &Camera::set_view_projection)
        .function("setEye", &Camera::set_eye)
        .function("setCenter", &Camera::set_center)
        .function("setSpeed", &Camera::set_speed)
        .function("setMouseSensitivity", &Camera::set_mouse_sensitivity)
        .function("getLocalVector", &Camera::get_local_vector)
        .function("getEye", &Camera::get_eye)
        .function("getCenter", &Camera::get_center)
        .function("getUp", &Camera::get_up)
        .function("getFov", &Camera::get_fov)
        .function("getAspect", &Camera::get_aspect)
        .function("getNear", &Camera::get_near)
        .function("getFar", &Camera::get_far)
        .function("getSpeed", &Camera::get_speed)
        .function("getView", &Camera::get_view)
        .function("getProjection", &Camera::get_projection)
        .function("getViewProjection", &Camera::get_view_projection);

    class_<Camera3D, base<Camera>>("Camera3D")
        .function("update", &Camera3D::update)
        .function("lookAt", &Camera3D::look_at)
        .function("applyMovement", &Camera3D::apply_movement)
        .function("lookAtNode", &Camera3D::look_at_node, allow_raw_pointers());

    class_<FlyoverCamera, base<Camera3D>>("FlyoverCamera")
        .constructor<>()
        .function("update", &FlyoverCamera::update);

    class_<OrbitCamera, base<Camera3D>>("OrbitCamera")
        .constructor<>()
        .function("update", &OrbitCamera::update)
        .function("lookAt", &OrbitCamera::look_at);

    /*
    *	Material and Surface
    */

    enum_<eMaterialType>("MaterialType")
        .value("MATERIAL_PBR", MATERIAL_PBR)
        .value("MATERIAL_UNLIT", MATERIAL_UNLIT)
        .value("MATERIAL_UI", MATERIAL_UI);

    enum_<eTransparencyType>("TransparencyType")
        .value("ALPHA_OPAQUE", ALPHA_OPAQUE)
        .value("ALPHA_BLEND", ALPHA_BLEND)
        .value("ALPHA_MASK", ALPHA_MASK)
        .value("ALPHA_HASH", ALPHA_HASH);

    enum_<eTopologyType>("TopologyType")
        .value("TOPOLOGY_POINT_LIST", TOPOLOGY_POINT_LIST)
        .value("TOPOLOGY_LINE_LIST", TOPOLOGY_LINE_LIST)
        .value("TOPOLOGY_LINE_STRIP", TOPOLOGY_LINE_STRIP)
        .value("TOPOLOGY_TRIANGLE_LIST", TOPOLOGY_TRIANGLE_LIST)
        .value("TOPOLOGY_TRIANGLE_STRIP", TOPOLOGY_TRIANGLE_STRIP);

    enum_<eCullType>("CullType")
        .value("CULL_NONE", CULL_NONE)
        .value("CULL_BACK", CULL_BACK)
        .value("CULL_FRONT", CULL_FRONT);

    enum_<LightType>("LightType")
        .value("LIGHT_UNDEFINED", LIGHT_UNDEFINED)
        .value("LIGHT_DIRECTIONAL", LIGHT_DIRECTIONAL)
        .value("LIGHT_OMNI", LIGHT_OMNI)
        .value("LIGHT_SPOT", LIGHT_SPOT);

    class_<Shader>("Shader").constructor<>();

    class_<Pipeline>("Pipeline").constructor<>();

    class_<Texture>("Texture").constructor<>();

    class_<Material>("Material")
        .constructor<>()
        .function("setColor", &Material::set_color)
        .function("setRoughness", &Material::set_roughness)
        .function("setMetallic", &Material::set_metallic)
        .function("setOcclusion", &Material::set_occlusion)
        .function("setEmissive", &Material::set_emissive)
        .function("setDiffuseTexture", &Material::set_diffuse_texture, allow_raw_pointers())
        .function("setMetallicRoughnessTexture", &Material::set_metallic_roughness_texture, allow_raw_pointers())
        .function("setNormalTexture", &Material::set_normal_texture, allow_raw_pointers())
        .function("setEmissiveTexture", &Material::set_emissive_texture, allow_raw_pointers())
        .function("setOcclusionTexture", &Material::set_occlusion_texture, allow_raw_pointers())
        .function("setAlphaMask", &Material::set_alpha_mask)
        .function("setDepthReadWrite", &Material::set_depth_read_write)
        .function("setDepthRead", &Material::set_depth_read)
        .function("setDepthWrite", &Material::set_depth_write)
        .function("setUseSkinning", &Material::set_use_skinning)
        .function("setIs2D", &Material::set_is_2D)
        .function("setFragmentWrite", &Material::set_fragment_write)
        .function("setTransparencyType", &Material::set_transparency_type)
        .function("setTopologyType", &Material::set_topology_type)
        .function("setCullType", &Material::set_cull_type)
        .function("setType", &Material::set_type)
        .function("setPriority", &Material::set_priority)
        .function("setShader", &Material::set_shader, allow_raw_pointers())
        .function("setShader_pipeline", &Material::set_shader_pipeline, allow_raw_pointers())
        .function("getColor", &Material::get_color)
        .function("getRoughness", &Material::get_roughness)
        .function("getMetallic", &Material::get_metallic)
        .function("getOcclusion", &Material::get_occlusion)
        .function("getEmissive", &Material::get_emissive)
        .function("getDiffuseTexture", select_overload<Texture*()>(&Material::get_diffuse_texture), allow_raw_pointers())
        .function("getMetallicRoughnessTexture", select_overload<Texture*()>(&Material::get_metallic_roughness_texture), allow_raw_pointers())
        .function("getNormalTexture", select_overload<Texture*()>(&Material::get_normal_texture), allow_raw_pointers())
        .function("getEmissiveTexture", select_overload<Texture*()>(&Material::get_emissive_texture), allow_raw_pointers())
        .function("getOcclusionTexture", select_overload<Texture*()>(&Material::get_occlusion_texture), allow_raw_pointers())
        .function("getAlphaMask", &Material::get_alpha_mask)
        .function("getDepthRead", &Material::get_depth_read)
        .function("getDepthWrite", &Material::get_depth_write)
        .function("getUseSkinning", &Material::get_use_skinning)
        .function("getIs2D", &Material::get_is_2D)
        .function("getFragmentWrite", &Material::get_fragment_write)
        .function("getTransparencyType", &Material::get_transparency_type)
        .function("getTopologyType", &Material::get_topology_type)
        .function("getCullType", &Material::get_cull_type)
        .function("getType", &Material::get_type)
        .function("getPriority", &Material::get_priority)
        .function("getShader", &Material::get_shader, allow_raw_pointers())
        .function("getShaderRef", &Material::get_shader_ref, allow_raw_pointers());

   class_<Surface>("Surface")
        .constructor<>()
        .function("createQuad", &Surface::create_quad, allow_raw_pointers());

   class_<Node>("Node")
        .constructor<>()
        .function("render", &Node::render)
        .function("update", &Node::update)
        .function("getName", &Node::get_name)
        .function("setName", &Node::set_name);

    class_<Node3D, base<Node>>("Node3D")
        .constructor<>()
        .function("render", &Node3D::render)
        .function("update", &Node3D::update)
        .function("translate", &Node3D::translate)
        .function("scale", &Node3D::scale)
        .function("rotate", select_overload<void(float, const glm::vec3&)>(&Node3D::rotate))
        .function("rotateQuat", select_overload<void(const glm::quat&)>(&Node3D::rotate))
        .function("rotateWorld", &Node3D::rotate_world)
        .function("getLocalTranslation", &Node3D::get_local_translation)
        .function("getTranslation", &Node3D::get_translation)
        .function("getGlobalModel", &Node3D::get_global_model)
        .function("getModel", &Node3D::get_model)
        .function("getRotation", &Node3D::get_rotation)
        .function("getTransform", &Node3D::get_transform)
        .function("getGlobalTransform", &Node3D::get_global_transform)
        .function("setPosition", &Node3D::set_position)
        .function("setRotation", &Node3D::set_rotation)
        .function("setScale", &Node3D::set_scale)
        .function("setGlobalTransform", &Node3D::set_global_transform)
        .function("setTransform", &Node3D::set_transform)
        .function("setTransformDirty", &Node3D::set_transform_dirty)
        .function("setParent", &Node3D::set_parent, allow_raw_pointers());

    class_<MeshInstance3D, base<Node3D>>("MeshInstance3D")
        .constructor<>()
        .function("render", &MeshInstance3D::render)
        .function("update", &MeshInstance3D::update)
        .function("getSurface", &MeshInstance3D::get_surface, allow_raw_pointers())
        .function("setSurfaceMaterialOverride", &MeshInstance3D::set_surface_material_override, allow_raw_pointers())
        .function("setFrustumCullingEnabled", &MeshInstance3D::set_frustum_culling_enabled)
        .function("addSurface", &MeshInstance3D::add_surface, allow_raw_pointers());

    class_<Environment3D, base<MeshInstance3D>>("Environment3D")
        .constructor<>()
        .function("update", &Environment3D::update)
        .function("_setTexture", &Environment3D::set_texture);

    class_<Light3D, base<Node3D>>("Light3D")
        .function("render", &Light3D::render)
        .function("getType", &Light3D::get_type)
        .function("getIntensity", &Light3D::get_intensity)
        .function("getColor", &Light3D::get_color)
        .function("getFadingEnabled", &Light3D::get_fading_enabled)
        .function("getCastShadows", &Light3D::get_cast_shadows)
        .function("getRange", &Light3D::get_range)
        .function("setColor", &Light3D::set_color)
        .function("setIntensity", &Light3D::set_intensity)
        .function("setRange", &Light3D::set_range)
        .function("setFadingEnabled", &Light3D::set_fading_enabled)
        .function("setCastShadows", &Light3D::set_cast_shadows);

    class_<DirectionalLight3D, base<Light3D>>("DirectionalLight3D")
        .constructor<>();

    class_<SpotLight3D, base<Light3D>>("SpotLight3D")
        .constructor<>();

    class_<OmniLight3D, base<Light3D>>("OmniLight3D")
        .constructor<>();

    class_<Scene>("Scene")
        .constructor<>()
        .function("update", &Scene::update)
        .function("render", &Scene::render)
        .function("addNode", &Scene::add_node, allow_raw_pointers())
        .function("addNodes", &Scene::add_nodes)
        .function("removeNode", &Scene::remove_node, allow_raw_pointers())
        .function("deleteAll", &Scene::delete_all);

    /*
    *	Parsers
    */

    enum_<eParseFlags>("ParseFlags")
        .value("PARSE_NO_FLAGS", PARSE_NO_FLAGS)
        .value("PARSE_GLTF_CLEAR_CACHE", PARSE_GLTF_CLEAR_CACHE)
        .value("PARSE_GLTF_FILL_SURFACE_DATA", PARSE_GLTF_FILL_SURFACE_DATA)
        .value("PARSE_DEFAULT", PARSE_DEFAULT);

    class_<Parser>("Parser");

    class_<GltfParser, base<Parser>>("GltfParser")
        .constructor<>()
        .function("parse", &GltfParser::parse);

    register_vector<Node*>("VectorNodePtr");

    /*
    *	Renderer
    */

    value_object<sRendererConfiguration>("RendererConfiguration");

    class_<Renderer>("Renderer")
        .constructor<const sRendererConfiguration&>();

    enum_<TextureStorageFlags>("TextureStorageFlags")
        .value("TEXTURE_STORAGE_NONE", TEXTURE_STORAGE_NONE)
        .value("TEXTURE_STORAGE_SRGB", TEXTURE_STORAGE_SRGB)
        .value("TEXTURE_STORAGE_KEEP_MEMORY", TEXTURE_STORAGE_KEEP_MEMORY)
        .value("TEXTURE_STORAGE_STORE_DATA", TEXTURE_STORAGE_STORE_DATA)
        .value("TEXTURE_STORAGE_UI", TEXTURE_STORAGE_UI);

    class_<RendererStorage>("RendererStorage")
        .class_function("getSurface", &RendererStorage::get_surface, allow_raw_pointers())
        .class_function("_getTexture", &RendererStorage::get_texture, allow_raw_pointers())
        .class_function("getShaderFromName", &RendererStorage::get_shader_from_name, allow_raw_pointers());

    /*
    *	Engine
    */

    value_object<sEngineConfiguration>("EngineConfiguration")
        .field("cameraType", &sEngineConfiguration::camera_type)
        .field("cameraEye", &sEngineConfiguration::camera_eye)
        .field("cameraCenter", &sEngineConfiguration::camera_center)
        .field("msaaCount", &sEngineConfiguration::msaa_count);

    class_<Engine>("Engine")
        .constructor<>()
        // .function("initialize", &Engine::initialize)
        .class_function("getInstance", &Engine::get_instance, return_value_policy::reference())
        .function("setWasmModuleInitialized", &Engine::set_wasm_module_initialized)
        .function("getMainScene", &Engine::get_main_scene, allow_raw_pointers());
}