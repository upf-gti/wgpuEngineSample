#include mesh_includes.wgsl
#include pbr_functions.wgsl
#include tonemappers.wgsl
#include pbr_material.wgsl
#include math.wgsl

#define MAX_LIGHTS

#ifndef UNLIT_MATERIAL
#include pbr_light.wgsl
#endif

#define GAMMA_CORRECTION

@group(0) @binding(0) var<storage, read> mesh_data : InstanceData;

#dynamic @group(1) @binding(0) var<uniform> camera_data : CameraData;

#ifdef ALBEDO_TEXTURE
@group(2) @binding(0) var albedo_texture: texture_2d<f32>;
#endif

@group(2) @binding(1) var<uniform> albedo: vec4f;

#ifdef METALLIC_ROUGHNESS_TEXTURE
@group(2) @binding(2) var metallic_roughness_texture: texture_2d<f32>;
#endif

#ifndef UNLIT_MATERIAL
@group(2) @binding(3) var<uniform> occlusion_roughness_metallic: vec3f;
#endif

#ifdef NORMAL_TEXTURE
@group(2) @binding(4) var normal_texture: texture_2d<f32>;
#endif

#ifdef EMISSIVE_TEXTURE
@group(2) @binding(5) var emissive_texture: texture_2d<f32>;
#endif

#ifdef OCLUSSION_TEXTURE
@group(2) @binding(9) var oclussion_texture: texture_2d<f32>;
#endif

#ifndef UNLIT_MATERIAL
@group(2) @binding(6) var<uniform> emissive: vec3f;
#endif

#ifdef USE_SAMPLER
@group(2) @binding(7) var sampler_2d : sampler;
#endif

#ifdef ALPHA_MASK
@group(2) @binding(8) var<uniform> alpha_cutoff: f32;
#endif

#ifdef USE_SKINNING
@group(2) @binding(10) var<storage, read> animated_matrices: array<mat4x4f>;
@group(2) @binding(11) var<storage, read> inv_bind_matrices: array<mat4x4f>;
#endif

#ifndef UNLIT_MATERIAL
@group(3) @binding(0) var irradiance_texture: texture_cube<f32>;
@group(3) @binding(1) var brdf_lut_texture: texture_2d<f32>;
@group(3) @binding(2) var sampler_clamp: sampler;
@group(3) @binding(3) var<uniform> lights : array<Light, MAX_LIGHTS>;
@group(3) @binding(4) var<uniform> num_lights : u32;
#endif

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
    
    var position = vec4f(in.position, 1.0);
    var normals = vec4f(in.normal, 0.0);

#ifdef USE_SKINNING
    var skin : mat4x4f = (animated_matrices[u32(in.joints.x)] * inv_bind_matrices[u32(in.joints.x)]) * in.weights.x;
    skin += (animated_matrices[u32(in.joints.y)] * inv_bind_matrices[u32(in.joints.y)]) * in.weights.y;
    skin += (animated_matrices[u32(in.joints.z)] * inv_bind_matrices[u32(in.joints.z)]) * in.weights.z;
    skin += (animated_matrices[u32(in.joints.w)] * inv_bind_matrices[u32(in.joints.w)]) * in.weights.w;
    position = skin * position;
    normals = skin * normals;
#endif

    let instance_data : RenderMeshData = mesh_data.data[in.instance_id];

    var out: VertexOutput;
    var world_position = instance_data.model * position;
    out.world_position = world_position.xyz;
    out.position = camera_data.view_projection * world_position;
    out.uv = in.uv; // forward to the fragment shader
    out.color = vec4f(in.color, 1.0) * albedo;

    // incorrect with scaling/non-uniform scaling
    //out.normal = normalize((instance_data.model * normals).xyz);
    out.normal = normalize(adjoint(instance_data.model) * normals.xyz);

#ifdef HAS_TANGENTS
    out.tangent = normalize((instance_data.model * vec4(in.tangent.xyz, 0.0)).xyz);
    out.bitangent = normalize(cross(out.normal, out.tangent) * in.tangent.w);
#endif

    return out;
}

struct FragmentOutput {
    @location(0) color: vec4f
}

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) is_front_facing: bool) -> FragmentOutput {

    var out: FragmentOutput;
    var dummy = camera_data.eye;

    var m : PbrMaterial;

    // Material properties

    var alpha : f32 = 1.0;

#ifdef ALBEDO_TEXTURE
    let albedo_texture : vec4f = textureSample(albedo_texture, sampler_2d, in.uv);
    m.albedo = albedo_texture.rgb * in.color.rgb;
    alpha = albedo_texture.a * in.color.a;
#else
    m.albedo = in.color.rgb;
    alpha = in.color.a;
#endif

#ifdef ALPHA_MASK
    if (alpha < alpha_cutoff) {
        discard;
    }
#endif

// fix properly by implementing #elif or nested #ifdef
#ifdef UNLIT_MATERIAL
    let emissive : vec3f = vec3f(0.0);
#endif

#ifdef EMISSIVE_TEXTURE
    m.emissive = textureSample(emissive_texture, sampler_2d, in.uv).rgb * emissive;
#else
    m.emissive = emissive;
#endif

// fix properly by implementing #elif or nested #ifdef
#ifdef UNLIT_MATERIAL
    let occlusion_roughness_metallic : vec3f = vec3f(0.0);
#endif

#ifdef OCLUSSION_TEXTURE
    m.ao = textureSample(oclussion_texture, sampler_2d, in.uv).r;
    m.ao = m.ao * occlusion_roughness_metallic.r;
#else
    m.ao = 1.0;
#endif

#ifdef METALLIC_ROUGHNESS_TEXTURE
    var metal_rough : vec3f = textureSample(metallic_roughness_texture, sampler_2d, in.uv).rgb;
    m.roughness = metal_rough.g * occlusion_roughness_metallic.g;
    m.metallic = metal_rough.b * occlusion_roughness_metallic.b;
#else
    m.roughness = occlusion_roughness_metallic.g;
    m.metallic = occlusion_roughness_metallic.b;
#endif

    m.pos = in.world_position;

    m.normal = normalize(in.normal);
    m.view_dir = normalize(camera_data.eye - m.pos);

#ifdef NORMAL_TEXTURE
    var normal_color = textureSample(normal_texture, sampler_2d, in.uv).rgb * 2.0 - 1.0;
    // normal_color.y = -normal_color.y;

#ifdef HAS_TANGENTS
    let TBN : mat3x3f = mat3x3f(in.tangent, in.bitangent, in.normal);
    m.normal = normalize(TBN * normal_color);
#else
    m.normal = perturb_normal(m.normal, m.view_dir, in.uv, normal_color);
#endif

#endif

    if (!is_front_facing) {
        m.normal = -m.normal;
    }

    var final_color : vec3f = vec3f(0.0);

#ifndef UNLIT_MATERIAL

    m.n_dot_v = clamp(dot(m.normal, m.view_dir), 0.0, 1.0);
    m.reflected_dir = normalize(reflect(-m.view_dir, m.normal));

    m.roughness = max(m.roughness, 0.04);
    m.diffuse = mix(m.albedo, vec3f(0.0), m.metallic);
    m.f0 = mix(vec3f(0.04), m.albedo, m.metallic);
    m.f90 = vec3f(1.0);
    m.specular_weight = 1.0;

    final_color += get_indirect_light(&m);
    final_color += get_direct_light(&m);
    final_color += m.emissive;
#else
    final_color += m.albedo;
#endif

    final_color *= camera_data.exposure;
    final_color = tonemap_khronos_pbr_neutral(final_color);

    if (GAMMA_CORRECTION == 1) {
        final_color = pow(final_color, vec3(1.0 / 2.2));
    }

    out.color = vec4f(vec3(1.0) - final_color, alpha);

    return out;
}