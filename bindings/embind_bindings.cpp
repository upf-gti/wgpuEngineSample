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
#include "graphics/font.h"

#include "framework/math/transform.h"
#include "framework/math/aabb.h"
#include "framework/math/intersections.h"
#include "framework/nodes/environment_3d.h"
#include "framework/nodes/directional_light_3d.h"
#include "framework/nodes/omni_light_3d.h"
#include "framework/nodes/spot_light_3d.h"
#include "framework/nodes/animation_player.h"
#include "framework/parsers/parse_gltf.h"
#include "framework/parsers/parse_obj.h"
#include "framework/camera/flyover_camera.h"
#include "framework/camera/orbit_camera.h"
#include "framework/ui/gizmo_3d.h"

#include <glm/gtc/type_ptr.hpp>
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

    class_<glm::mat4x4>("mat4")
        .constructor<>();

    class_<Transform>("Transform")
        .constructor<>()
        .class_function("transformToMat4", &Transform::transform_to_mat4)
        .class_function("mat4ToTransform", &Transform::mat4_to_transform);

    class_<AABB>("AABB")
        .constructor<>()
        .property("center", &AABB::center, return_value_policy::reference())
        .property("halfSize", &AABB::half_size, return_value_policy::reference())
        .function("transform", &AABB::transform)
        .function("rotate", &AABB::rotate)
        .function("getLongestAxis", &AABB::longest_axis);

    // Utils

    function("getRayPlaneIntersection", &intersection::ray_plane, allow_raw_pointers());
    function("getRayQuadIntersection", &intersection::ray_quad, allow_raw_pointers());
    // function("getRayCurvedQuadIntersection", &intersection::ray_curved_quad, allow_raw_pointers());
    function("getRayCircleIntersection", &intersection::ray_circle, allow_raw_pointers());
    function("getRaySphereIntersection", &intersection::ray_sphere, allow_raw_pointers());
    function("getRayAABBIntersection", &intersection::ray_AABB, allow_raw_pointers());
    function("getRayOBBIntersection", &intersection::ray_OBB, allow_raw_pointers());
    function("getPointAABBIntersection", &intersection::point_AABB);
    function("getPointPlaneIntersection", &intersection::point_plane, allow_raw_pointers());
    function("getPointCircleIntersection", &intersection::point_circle);
    function("getPointCircleRingIntersection", &intersection::point_circle_ring);
    function("getPointSphereIntersection", &intersection::point_sphere);
    function("getAABBMinMax", &intersection::AABB_AABB_min_max);

    function("mergeAABBs", &merge_aabbs);
    function("radians", &radians);
    function("degrees", &degrees);
    function("loadVec3", &load_vec3);
    function("loadVec4", &load_vec4);
    function("loadQuat", &load_quat);
    function("modVec3", &mod_vec3);
    function("getQuatBetweenVec3", &get_quat_between_vec3);
    function("quatSwingTwistDecomposition", &quat_swing_twist_decomposition);
    function("nextPowerOfTwo", &next_power_of_two);
    function("hsv2rgb", &hsv2rgb);
    function("rgb2hsv", &rgb2hsv);
    function("rotatePointByQuat", &rotate_point_by_quat);
    function("getFront", &get_front);
    function("getPerpendicular", &get_perpendicular);
    function("ceilToNextMultiple", &ceil_to_next_multiple);
    function("clampRotation", &clamp_rotation);
    function("remapRange", &remap_range);
    function("yawPitchToVector", &yaw_pitch_to_vector);
    function("vectorToYawPitch", &vector_to_yaw_pitch, allow_raw_pointers());
    function("getRotationToFace", &get_rotation_to_face);
    function("smoothDampAngle", &smooth_damp_angle, allow_raw_pointers());

    class_<Resource>("Resource").constructor<>();

    enum_<eGizmoOp>("GizmoOp")
        .value("TRANSLATE_X", TRANSLATE_X)
        .value("TRANSLATE_Y", TRANSLATE_Y)
        .value("TRANSLATE_Z", TRANSLATE_Z)
        .value("ROTATE_X", ROTATE_X)
        .value("ROTATE_Y", ROTATE_Y)
        .value("ROTATE_Z", ROTATE_Z)
        .value("ROTATE_SCREEN", ROTATE_SCREEN)
        .value("SCALE_X", SCALE_X)
        .value("SCALE_Y", SCALE_Y)
        .value("SCALE_Z", SCALE_Z)
        .value("BOUNDS", BOUNDS)
        .value("SCALE_XU", SCALE_XU)
        .value("SCALE_YU", SCALE_YU)
        .value("SCALE_ZU", SCALE_ZU)
        .value("TRANSLATE", TRANSLATE)
        .value("ROTATE", ROTATE)
        .value("SCALE", SCALE)
        .value("SCALEU", SCALEU)
        .value("UNIVERSAL", UNIVERSAL);

    class_<Gizmo2D>("Gizmo2D")
        .constructor<>()
        .property("mode", &Gizmo2D::mode)
        .property("operation", &Gizmo2D::operation)
        .function("render", &Gizmo2D::render);

    class_<Gizmo3D>("Gizmo3D")
        .constructor<>()
        .property("enabled", &Gizmo3D::enabled)
        .property("transform", &Gizmo3D::transform, return_value_policy::reference())
        .property("position", &Gizmo3D::get_position, return_value_policy::reference())
        .property("rotation", &Gizmo3D::get_rotation, return_value_policy::reference())
        .property("eulerRotation", &Gizmo3D::get_euler_rotation, return_value_policy::reference())
        .function("initialize", &Gizmo3D::initialize)
        .function("render", &Gizmo3D::render)
        .function("update", select_overload<bool(const glm::vec3&, float)>(&Gizmo3D::update))
        .function("clean", &Gizmo3D::clean)
        .function("setOperation", &Gizmo3D::set_operation);

    //bool update(glm::vec3 & new_position, const glm::vec3 & controller_position, float delta_time);
    //bool update(glm::vec3 & new_position, glm::quat & rotation, const glm::vec3 & controller_position, float delta_time);
    //bool update(glm::vec3 & new_position, glm::vec3 & scale, const glm::vec3 & controller_position, float delta_time);
    //bool update(Transform & t, const glm::vec3 & controller_position, float delta_time);
    //bool update(const glm::vec3 & controller_position, float delta_time);

    register_vector<std::string>("VectorString");

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
        .property("fov", &Camera::get_fov)
        .property("aspect", &Camera::get_aspect)
        .property("near", &Camera::get_near)
        .property("far", &Camera::get_far)
        .property("speed", &Camera::speed)
        .property("mouseSensitivity", &Camera::mouse_sensitivity)
        .property("eye", &Camera::eye, return_value_policy::reference())
        .property("center", &Camera::center, return_value_policy::reference())
        .property("up", &Camera::up, return_value_policy::reference())
        .function("update", &Camera::update)
        .function("updateViewMatrix", &Camera::update_view_matrix)
        .function("updateProjectionMatrix", &Camera::update_projection_matrix)
        .function("updateViewProjectionMatrix", &Camera::update_view_projection_matrix)
        .function("lookAt", &Camera::look_at)
        .function("screenToRay", &Camera::screen_to_ray)
        .function("setPerspective", &Camera::set_perspective)
        .function("setOrthographic", &Camera::set_orthographic)
        .function("setView", &Camera::set_view)
        .function("setEye", &Camera::set_eye)
        .function("setCenter", &Camera::set_center)
        .function("setUp", &Camera::set_up)
        .function("setProjection", &Camera::set_projection)
        .function("setViewProjection", &Camera::set_view_projection)
        .function("getLocalVector", &Camera::get_local_vector)
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

    class_<Uniform>("Uniform").constructor<>();

    class_<Pipeline>("Pipeline").constructor<>();

    class_<Texture, base<Resource>>("Texture").constructor<>();

    class_<Font, base<Resource>>("Font").constructor<>();

    class_<Material, base<Resource>>("Material")
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
        .function("setShaderPipeline", &Material::set_shader_pipeline, allow_raw_pointers())
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

   class_<Surface, base<Resource>>("Surface")
        .constructor<>()
        .function("createQuad", &Surface::create_quad, allow_raw_pointers());

   class_<Node>("Node")
        .constructor<>()
        .property("name", &Node::name)
        .function("render", &Node::render)
        .function("update", &Node::update)
        .function("getChildren", &Node::get_children)
       ;

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
        .property("name", &Scene::name)
        .function("update", &Scene::update)
        .function("render", &Scene::render)
        .function("addNode", &Scene::add_node, allow_raw_pointers())
        .function("addNodes", &Scene::add_nodes)
        .function("removeNode", &Scene::remove_node, allow_raw_pointers())
        .function("getNodes", &Scene::get_nodes)
        .function("deleteAll", &Scene::delete_all);

    /*
    *	Animation
    */

    enum_<eTrackType>("TrackType")
        .value("TYPE_UNDEFINED", TYPE_UNDEFINED)
        .value("TYPE_FLOAT", TYPE_FLOAT)
        .value("TYPE_VECTOR2", TYPE_VECTOR2)
        .value("TYPE_VECTOR3", TYPE_VECTOR3)
        .value("TYPE_VECTOR4", TYPE_VECTOR4)
        .value("TYPE_QUAT", TYPE_QUAT)
        .value("TYPE_METHOD", TYPE_METHOD)
        .value("TYPE_POSITION", TYPE_POSITION)
        .value("TYPE_ROTATION", TYPE_ROTATION)
        .value("TYPE_SCALE", TYPE_SCALE);

    enum_<eLoopType>("LoopType")
        .value("ANIMATION_LOOP_NONE", ANIMATION_LOOP_NONE)
        .value("ANIMATION_LOOP_DEFAULT", ANIMATION_LOOP_DEFAULT)
        .value("ANIMATION_LOOP_REVERSE", ANIMATION_LOOP_REVERSE)
        .value("ANIMATION_LOOP_PING_PONG", ANIMATION_LOOP_PING_PONG);


    class_<Track>("Track").constructor<>();

    class_<Pose>("Pose").constructor<>();

    class_<Skeleton, base<Resource>>("Skeleton").constructor<>();

    class_<Animation, base<Resource>>("Animation").constructor<>();

    class_<AnimationPlayer, base<Node3D>>("AnimationPlayer")
        .constructor<>()
        .constructor<const std::string&>()
        .property("playback", &AnimationPlayer::get_playback_time, &AnimationPlayer::set_playback_time)
        .property("speed", &AnimationPlayer::speed)
        .property("blendTime", &AnimationPlayer::blend_time)
        .property("loopType", &AnimationPlayer::loop_type)
        .property("rootNode", &AnimationPlayer::root_node, allow_raw_pointers())
        .property("playing", &AnimationPlayer::is_playing)
        .property("paused", &AnimationPlayer::is_paused)
        .function("play", select_overload<void(const std::string&, float, float, float)>(&AnimationPlayer::play))
        .function("play", select_overload<void(Animation*, float, float, float)>(&AnimationPlayer::play), allow_raw_pointers())
        .function("pause", &AnimationPlayer::pause)
        .function("resume", &AnimationPlayer::resume)
        .function("stop", &AnimationPlayer::stop)
        .function("update", &AnimationPlayer::update);

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

    function("_parseObj", select_overload<MeshInstance3D*(const std::string&, bool)>(&parse_obj), allow_raw_pointers());

    register_vector<Node*>("VectorNodePtr");

    /*
    *	Renderer
    */

    value_object<sRendererConfiguration>("RendererConfiguration");

    class_<Renderer>("Renderer")
        .constructor<const sRendererConfiguration&>()
        .function("getCamera", &Renderer::get_camera, allow_raw_pointers());

    enum_<TextureStorageFlags>("TextureStorageFlags")
        .value("TEXTURE_STORAGE_NONE", TEXTURE_STORAGE_NONE)
        .value("TEXTURE_STORAGE_SRGB", TEXTURE_STORAGE_SRGB)
        .value("TEXTURE_STORAGE_KEEP_MEMORY", TEXTURE_STORAGE_KEEP_MEMORY)
        .value("TEXTURE_STORAGE_STORE_DATA", TEXTURE_STORAGE_STORE_DATA)
        .value("TEXTURE_STORAGE_UI", TEXTURE_STORAGE_UI);

    class_<RendererStorage>("RendererStorage")
        .class_function("getSurface", &RendererStorage::get_surface, allow_raw_pointers())
        .class_function("getShaderFromName", &RendererStorage::get_shader_from_name, allow_raw_pointers())
        .class_function("_getTexture", &RendererStorage::get_texture, allow_raw_pointers())
        .class_function("_getShader", select_overload<Shader*(const std::string&,const Material*,const std::vector<std::string>&)>(&RendererStorage::get_shader), allow_raw_pointers());

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
        .function("getMainScene", &Engine::get_main_scene, allow_raw_pointers())
        .function("getRenderer", &Engine::get_renderer, allow_raw_pointers())
        .function("resize", &Engine::resize_window);
}