const wgpuEngine = {
    version: "0.0.1",
    name: "WGPUEngine"
};

// Add defaults to namespace
const skipInclude = [ "addRunDependency", "BindingError", "calledRun", "castObject", "compare", "count_emval_handles", "createContext", "dataFileDownloads",
    "destroy", "expectedDataFileDownloads", "getCache", "getClass", "getPointer", "getUserMedia", "InternalError", "pauseMainLoop", "preloadResults", "preRun", 
    "postRun", "resumeMainLoop", "requestAnimationFrame", "removeRunDependency", "requestFullscreen", "setCanvasSize", "totalDependencies", "VoidPtr", "WrapperObject",
    "wrapPointer", "NULL" ];

for( const key in Module )
{
    if( key.startsWith( '_' ) || key.startsWith( 'dynCall' ) || key.startsWith( 'FS_' ) || skipInclude.includes( key ) )
        continue;

    wgpuEngine[  key ] = Module[ key ];
}

/*
   ____          _                   __        __
  / ___|   _ ___| |_ ___  _ __ ___   \ \      / / __ __ _ _ __  _ __   ___ _ __ ___
 | |  | | | / __| __/ _ \| '_ ` _ \   \ \ /\ / / '__/ _` | '_ \| '_ \ / _ \ '__/ __|
 | |__| |_| \__ \ || (_) | | | | | |   \ V  V /| | | (_| | |_) | |_) |  __/ |  \__ \
  \____\__,_|___/\__\___/|_| |_| |_|    \_/\_/ |_|  \__,_| .__/| .__/ \___|_|  |___/
                                                         |_|   |_|

* Add custom wrapper functions to adapt C++ features to JavaScript
*/

wgpuEngine.RendererStorage.getTexture = async function( texturePath, textureFlags, onLoad ) {
    const textureFilePath = Module._getFilename( texturePath );
    return await Module._requestBinary( texturePath ).then( data => {
        Module._writeFile( textureFilePath, data );
        const texture = Module.RendererStorage._getTexture( textureFilePath, textureFlags ?? wgpuEngine.TextureStorageFlags.TEXTURE_STORAGE_NONE );
        if( onLoad ) onLoad( texture );
        return texture;
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.RendererStorage.getShader = async function( shaderPath, material, customDefineSpecializations, onLoad ) {
    const shaderFilePath = Module._getFilename( shaderPath );
    return await Module._requestText( shaderPath ).then( data => {
        data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        Module._writeFile( shaderFilePath, data );
        material = material ?? new wgpuEngine.Material();
        customDefineSpecializations = customDefineSpecializations ?? new WGE.VectorString();
        const shader = Module.RendererStorage._getShader( shaderFilePath, material, customDefineSpecializations );
        if( onLoad ) onLoad( shader, data );
        return shader;
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.Environment3D.prototype.setTexture = async function( texturePath ) {
    const textureFilePath = Module._getFilename( texturePath );
    await Module._requestBinary( texturePath ).then( data => {
        Module._writeFile( textureFilePath, data );
        this._setTexture( textureFilePath );
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.parse = async function( parser, path, nodes, onLoad ) {
    const filePath = Module._getFilename( path );
    return await Module._requestBinary( path ).then( data => {
        Module._writeFile( filePath, data );
        nodes = nodes ?? new wgpuEngine.VectorNodePtr();
        parser.parse( filePath, nodes, wgpuEngine.ParseFlags.PARSE_DEFAULT.value );
        if( onLoad ) onLoad( nodes );
        return nodes;
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.parseGltf = async function( gltfPath, nodes, onLoad ) {
    const parser = new wgpuEngine.GltfParser();
    return await wgpuEngine.parse( parser, gltfPath, nodes, onLoad );
}

wgpuEngine.parsePly = async function( plyPath, nodes, onLoad ) {
    const parser = new wgpuEngine.PlyParser();
    return await wgpuEngine.parse( parser, plyPath, nodes, onLoad );
}

wgpuEngine.parseVdb = async function( vdbPath, nodes, onLoad ) {
    const parser = new wgpuEngine.VdbParser();
    return await wgpuEngine.parse( parser, plyPath, nodes, onLoad );
}

wgpuEngine.parseObj = async function( objPath, createAABB, onLoad ) {
    objPath = Module._getFilename( objPath );
    return await Module._requestBinary( objPath ).then( data => {
        Module._writeFile( objPath, data );
        const meshInstance3D = new Module._parseObj( objPath, createAABB );
        if( onLoad ) onLoad( meshInstance3D );
        return meshInstance3D;
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
}

/*
   ____          _                    ____                            _   _
  / ___|   _ ___| |_ ___  _ __ ___   |  _ \ _ __ ___  _ __   ___ _ __| |_(_) ___  ___
 | |  | | | / __| __/ _ \| '_ ` _ \  | |_) | '__/ _ \| '_ \ / _ \ '__| __| |/ _ \/ __|
 | |__| |_| \__ \ || (_) | | | | | | |  __/| | | (_) | |_) |  __/ |  | |_| |  __/\__ \
  \____\__,_|___/\__\___/|_| |_| |_| |_|   |_|  \___/| .__/ \___|_|   \__|_|\___||___/
                                                     |_|

* Define properties that couldn't be binded from C++ due to limitations of Embind
*/

Object.defineProperty( wgpuEngine.Mesh.prototype, "skeleton", {
    get: function() { return this._getSkeleton(); },
    set: function( value ) { this._setSkeleton( value ); }
});

Object.defineProperty( wgpuEngine.MeshInstance3D.prototype, "mesh", {
    get: function() { return this._getMesh(); },
    set: function( value ) { this._setMesh( value ); }
});

/*
  ____        _          _____                      _
 |  _ \  __ _| |_ __ _  | ____|_  ___ __   ___  ___(_)_ __   __ _
 | | | |/ _` | __/ _` | |  _| \ \/ / '_ \ / _ \/ __| | '_ \ / _` |
 | |_| | (_| | || (_| | | |___ >  <| |_) | (_) \__ \ | | | | (_| |
 |____/ \__,_|\__\__,_| |_____/_/\_\ .__/ \___/|___/_|_| |_|\__, |
                                   |_|                      |___/

* Expose data for creating user interfaces
*/

/* Camera */

wgpuEngine.Camera.icon = "Camera";
wgpuEngine.Camera.properties = [
    { name: "fov", prettyName: "Fov", type: Number, min: 15, max: 90, step: 1, units: "º", getter: function() { return wgpuEngine.degrees( this.fov ); }, setter: function( value ) { this.setPerspective( wgpuEngine.radians( value ), this.aspect, this.near, this.far ); } },
    { name: "aspect", prettyName: "Aspect", type: Number, disabled: true },
    { name: "near", prettyName: "Near", type: Number, min: 1, max: 1000, step: 1, setter: function( value ) { this.setPerspective( this.fov, this.aspect, value, this.far ); } },
    { name: "far", prettyName: "Far", type: Number, min: 0.01, max: 1, step: 0.01, setter: function( value ) { this.setPerspective( this.fov, this.aspect, this.near, value ); } },
    { name: "speed", prettyName: "Speed", type: Number },
    { name: "mouseSensitivity", prettyName: "Mouse Sensitivity", type: Number },
    { name: "eye", prettyName: "Eye", type: wgpuEngine.vec3, step: 0.01, setter: function( value ) { this.lookAt( value, this.center, this.up, true ); } },
    { name: "center", prettyName: "Center", type: wgpuEngine.vec3, step: 0.01, setter: function( value ) { this.lookAt( this.eye, value, this.up, true ); } },
    { name: "up", prettyName: "Up", type: wgpuEngine.vec3, step: 0.01, setter: function( value ) { this.lookAt( this.eye, this.center, value, true ); } },
];

wgpuEngine.FlyoverCamera.icon = "Camera";
wgpuEngine.FlyoverCamera.properties = wgpuEngine.Camera.properties.concat( [] );

/* Meshes */

wgpuEngine.Mesh.properties = [];

wgpuEngine.QuadMesh.icon = "Square";
wgpuEngine.QuadMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "width", prettyName: "Width", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "height", prettyName: "Height", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "subdivisions", prettyName: "Subdivisions", type: Number, min: 0, max: 64, step: 1 },
    { name: "centered", prettyName: "Centered", type: Boolean },
    { name: "flipY", prettyName: "Flip Y", type: Boolean }
] );

wgpuEngine.BoxMesh.icon = "Box";
wgpuEngine.BoxMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "width", prettyName: "Width", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "height", prettyName: "Height", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "depth", prettyName: "Depth", type: Number, min: 0.01, max: 4, step: 0.01 },
] );

wgpuEngine.SphereMesh.icon = "Circle";
wgpuEngine.SphereMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "radius", prettyName: "Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "rings", prettyName: "Rings", type: Number, min: 1, max: 64, step: 1 },
    { name: "ringSegments", prettyName: "Ring Segments", type: Number, min: 4, max: 64, step: 1 }
] );

wgpuEngine.CapsuleMesh.icon = "Pill";
wgpuEngine.CapsuleMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "radius", prettyName: "Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "height", prettyName: "Height", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "rings", prettyName: "Rings", type: Number, min: 3, max: 64, step: 1 },
    { name: "ringSegments", prettyName: "Ring Segments", type: Number, min: 3, max: 64, step: 1 }
] );

wgpuEngine.CylinderMesh.icon = "Cylinder";
wgpuEngine.CylinderMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "topRadius", prettyName: "Top Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "bottomRadius", prettyName: "Bottom Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "height", prettyName: "Height", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "rings", prettyName: "Rings", type: Number, min: 3, max: 64, step: 1 },
    { name: "ringSegments", prettyName: "Ring Segments", type: Number, min: 3, max: 64, step: 1 },
    { name: "capTop", prettyName: "Cap Top", type: Boolean },
    { name: "capBottom", prettyName: "Cap Bottom", type: Boolean },
] );

wgpuEngine.TorusMesh.icon = "Torus";
wgpuEngine.TorusMesh.properties = wgpuEngine.Mesh.properties.concat( [
    { name: "ringRadius", prettyName: "Ring Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "tubeRadius", prettyName: "Tube Radius", type: Number, min: 0.01, max: 4, step: 0.01 },
    { name: "rings", prettyName: "Rings", type: Number, min: 3, max: 64, step: 1 },
    { name: "ringSegments", prettyName: "Ring Segments", type: Number, min: 3, max: 64, step: 1 },
] );

/* AABB */

wgpuEngine.AABB.icon = "Box";
wgpuEngine.AABB.properties = [
    { name: "center", prettyName: "Center", type: Number, disabled: true },
    { name: "halfSize", prettyName: "Half Size", type: Number, disabled: true }
];

/* Surface */

wgpuEngine.Surface.properties = [
    { name: "vertexCount", prettyName: "Vertex Count", type: Number, disabled: true },
    { name: "verticesByteSize", prettyName: "Vertices Byte Size", type: Number, disabled: true },
    { name: "indexCount", prettyName: "Index Count", type: Number, disabled: true },
    { name: "indicesByteSize", prettyName: "Indices Byte Size", type: Number, disabled: true },
    { name: "interleavedDataByteSize", prettyName: "Interleaved Data Byte Size", type: Number, disabled: true },
    { name: "aabb", prettyName: "AABB", type: wgpuEngine.AABB },
    // { name: "material", prettyName: "Material", type: wgpuEngine.Material }
];

/* Texture */

wgpuEngine.Texture.icon = "Image";
wgpuEngine.Texture.properties = [];

/* Shader */

wgpuEngine.Shader.icon = "FileText";
wgpuEngine.Shader.properties = [];

/* Material */

wgpuEngine.Material.properties = [
    { name: "type", prettyName: "Type", type: "Enum", enum: "MaterialType" },
    { name: "shader", prettyName: "Shader", type: wgpuEngine.Shader, getter: function(){ return this.getShader(); } },
    { name: "color", prettyName: "Color", type: wgpuEngine.vec4, min: 0, max: 1, step: 0.01 },
    { name: "emissive", prettyName: "Emissive", type: wgpuEngine.vec3 },
    { name: "roughness", prettyName: "Roughness", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "metallic", prettyName: "Metallic", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "occlusion", prettyName: "Occlusion", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "priority", prettyName: "Priority", type: Number },
    { name: "cullType", prettyName: "Cull Type", type: "Enum", enum: "CullType" },
    { name: "topologyType", prettyName: "Topology Type", type: "Enum", enum: "TopologyType" },
    { name: "transparencyType", prettyName: "Transparency Type", type: "Enum", enum: "TransparencyType" },
    { name: "alphaMask", prettyName: "Alpha Mask", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "depthRead", prettyName: "Depth Read", type: Boolean },
    { name: "depthWrite", prettyName: "Depth Write", type: Boolean },
    { name: "fragmentWrite", prettyName: "Fragment Write", type: Boolean, disabled: true },
    { name: "useSkinning", prettyName: "Use Skinning", type: Boolean, disabled: true },
    { name: "is2D", prettyName: "Is 2D", type: Boolean, disabled: true },
];

/* Node */

wgpuEngine.Node.icon = "CircleSmall";
wgpuEngine.Node.properties = [
    { name: "sceneUID", prettyName: "Scene UID", type: String, disabled: true },
    { name: "name", prettyName: "Name", type: String },
];

/* Node3D */

wgpuEngine.Node3D.icon = "Move3d";
wgpuEngine.Node3D.properties = wgpuEngine.Node.properties.concat( [
    null,
    { name: "transform", prettyName: "Transform", type: wgpuEngine.Transform }
] );

/* MeshInstance3D */

wgpuEngine.MeshInstance3D.icon = "Box";
wgpuEngine.MeshInstance3D.properties = wgpuEngine.Node3D.properties.concat( [] );

/* SkeletonInstance3D */

wgpuEngine.SkeletonInstance3D.icon = "Bone";
wgpuEngine.SkeletonInstance3D.properties = wgpuEngine.Node3D.properties.concat( [] );

/* Light3D */

wgpuEngine.Light3D.properties = wgpuEngine.Node3D.properties.concat( [
    null,
    { name: "type", prettyName: "Type", type: "Enum", enum: "LightType", disabled: true },
    { name: "color", prettyName: "Color", type: wgpuEngine.vec3, min: 0, max: 1, step: 0.01 },
    { name: "intensity", prettyName: "Intensity", type: Number, min: 0, max: 10, step: 0.01 },
    { name: "range", prettyName: "Range", type: Number, min: 0, max: 10, step: 0.1 },
    { name: "castShadows", prettyName: "Cast Shadows", type: Boolean },
    { name: "fadingEnabled", prettyName: "Fading Enabled", type: Boolean },
] );

/* DirectionalLight3D */

wgpuEngine.DirectionalLight3D.icon = "Sun";
wgpuEngine.DirectionalLight3D.properties = wgpuEngine.Light3D.properties.concat( [] );

/* SpotLight3D */

wgpuEngine.SpotLight3D.icon = "Cone";
wgpuEngine.SpotLight3D.properties = wgpuEngine.Light3D.properties.concat( [
    null,
    { name: "innerConeAngle", prettyName: "Inner Cone Angle", type: Number, min: 0, max: Math.PI / 2, step: 0.01, units: "rad" },
    { name: "outerConeAngle", prettyName: "Outer Cone Angle", type: Number, min: 0, max: Math.PI / 2, step: 0.01, units: "rad" },
] );

/* OmniLight3D */

wgpuEngine.OmniLight3D.icon = "Lightbulb";
wgpuEngine.OmniLight3D.properties = wgpuEngine.Light3D.properties.concat( [] );

/* Environment3D */

wgpuEngine.Environment3D.icon = "Globe";
wgpuEngine.Environment3D.properties = wgpuEngine.MeshInstance3D.properties.concat( [
    null,
    { name: "texture", prettyName: "Texture", type: wgpuEngine.Texture, setter: function( value ) { this._setTexture( value ); } },
] );

/* AnimationPlayer */

wgpuEngine.AnimationPlayer.icon = "Play";
wgpuEngine.AnimationPlayer.properties = wgpuEngine.Node3D.properties.concat( [
    null,
    { name: "blendTime", prettyName: "Blend Time", type: Number },
    { name: "speed", prettyName: "Speed", type: Number },
    { name: "loopType", prettyName: "Loop Type", type: "Enum", enum: "LoopType" },
] );
wgpuEngine.AnimationPlayer.methods = [
    { name: "play", prettyName: "Play Animation" },
    { name: "pause", prettyName: "Pause Animation" },
    { name: "stop", prettyName: "Stop Animation" },
];

wgpuEngine.DEFAULT_SHADER_CODE = `#include mesh_includes.wgsl
#include math.wgsl

@group(0) @binding(0) var<storage, read> mesh_data : InstanceData;

#dynamic @group(1) @binding(0) var<uniform> camera_data : CameraData;

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {

    var position = vec4f(in.position, 1.0);
    var normals = vec4f(in.normal, 0.0);

    let instance_data : RenderMeshData = mesh_data.data[in.instance_id];

    var out: VertexOutput;
    var world_position = instance_data.model * position;
    out.world_position = world_position.xyz;
    out.position = camera_data.view_projection * world_position;
    out.uv = in.uv; // forward to the fragment shader
    out.color = vec4f(in.color, 1.0);

    out.normal = normalize(adjoint(instance_data.model) * normals.xyz);

    return out;
}

struct FragmentOutput {
    @location(0) color: vec4f
}

@fragment
fn fs_main(in: VertexOutput, @builtin(front_facing) is_front_facing: bool) -> FragmentOutput {

    var out: FragmentOutput;
    var dummy = camera_data.eye;

    out.color = vec4f(1.0, 0.0, 0.0, 1.0);

    return out;
}`;

// Utility functions

Module._getFilename = function( filename )
{
    if( !filename.includes( '/' ) )
    {
        return filename;
    }
    // Return the last part of the path
    return filename.substring( filename.lastIndexOf( '/' ) + 1 );
}

Module._getCurrentFunctionName = function()
{
    const err = new Error();
    const stack = err.stack?.split('\n');

    let errorStr = `${ stack.shift() }: `;
    stack.shift(); // Remove "_getCurrentFunctionName" from the stack
    for( let l of stack )
    {
        const match = l.match(/(.*?) \(/);
        if( !match ) continue;
        errorStr += `\n${ match[ 1 ] }`;
    }

    return errorStr;
}

Module._writeFile = function( filename, data )
{
    if( data.constructor === ArrayBuffer )
    {
        data = new Uint8Array( data );
    }
    else if( typeof data != 'string' )
    {
        throw new Error( `${ Module._getCurrentFunctionName() }: Unsupported data type` );
    }

    FS.writeFile( filename, data, { flags: 'w+' } );
}

Module._requestFile = function( url, dataType, nocache ) {
    return new Promise((resolve, reject) => {
        dataType = dataType ?? "arraybuffer";
        const mimeType = dataType === "arraybuffer" ? "application/octet-stream" : undefined;
        var xhr = new XMLHttpRequest();
        xhr.open( 'GET', url, true );
        xhr.responseType = dataType;
        if( mimeType )
            xhr.overrideMimeType( mimeType );
        if( nocache )
            xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.onload = function(load)
        {
            var response = this.response;
            if( this.status != 200)
            {
                var err = "Error " + this.status;
                reject(err);
                return;
            }
            resolve( response );
        };
        xhr.onerror = function(err) {
            reject(err);
        };
        xhr.send();
        return xhr;
    });
}

Module._requestBinary = function( url, nocache ) {
    return Module._requestFile( url, "arraybuffer", nocache );
}

Module._requestText = function( url, nocache ) {
    return Module._requestFile( url, "text", nocache );
}

export { wgpuEngine };