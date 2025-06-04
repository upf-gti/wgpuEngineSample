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

// Custom wrappers for some classes

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
        if( onLoad ) onLoad( shader );
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

wgpuEngine.parseGltf = async function( gltfPath, nodes, onLoad ) {
    const gltfFilePath = Module._getFilename( gltfPath );
    return await Module._requestBinary( gltfPath ).then( data => {
        Module._writeFile( gltfFilePath, data );
        nodes = nodes ?? new wgpuEngine.VectorNodePtr();
        const parser = new wgpuEngine.GltfParser();
        parser.parse( gltfFilePath, nodes, wgpuEngine.ParseFlags.PARSE_DEFAULT.value );
        if( onLoad ) onLoad( nodes );
        return nodes;
    }).catch(( err ) => console.error( `${ Module._getCurrentFunctionName() }: ${ err }` ) );
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

// Expose data for creating user interfaces

/* Surface */

wgpuEngine.Surface.properties = [
    // { name: "aabb", prettyName: "AABB", type: wgpuEngine.AABB },
    { name: "vertexCount", prettyName: "Vertex Count", type: Number, disabled: true },
    { name: "verticesByteSize", prettyName: "Vertices Byte Size", type: Number, disabled: true },
    { name: "indexCount", prettyName: "Index Count", type: Number, disabled: true },
    { name: "indicesByteSize", prettyName: "Indices Byte Size", type: Number, disabled: true },
    { name: "interleavedDataByteSize", prettyName: "Interleaved Data Byte Size", type: Number, disabled: true },
    // { name: "material", prettyName: "Material", type: wgpuEngine.Material }
];

/* Material */

wgpuEngine.Material.properties = [
    { name: "color", prettyName: "Color", type: wgpuEngine.vec4, min: 0, max: 1, step: 0.01 },
    { name: "roughness", prettyName: "Roughness", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "metallic", prettyName: "Metallic", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "occlusion", prettyName: "Occlusion", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "emissive", prettyName: "Emissive", type: wgpuEngine.vec3 },
    // { name: "is2D", prettyName: "Is 2D", type: Boolean },
    { name: "type", prettyName: "Type", type: "Enum", enum: "MaterialType" },
    { name: "priority", prettyName: "Priority", type: Number },
    { name: "cullType", prettyName: "Cull Type", type: "Enum", enum: "CullType" },
    { name: "topologyType", prettyName: "Topology Type", type: "Enum", enum: "TopologyType" },
    { name: "transparencyType", prettyName: "Transparency Type", type: "Enum", enum: "TransparencyType" },
    { name: "alphaMask", prettyName: "Alpha Mask", type: Number, min: 0, max: 1, step: 0.01 },
    { name: "depthRead", prettyName: "Depth Read", type: Boolean },
    { name: "depthWrite", prettyName: "Depth Write", type: Boolean },
    { name: "fragmentWrite", prettyName: "Fragment Write", type: Boolean },
    { name: "useSkinning", prettyName: "Use Skinning", type: Boolean },
];

/* Node */

wgpuEngine.Node.icon = "CircleSmall";
wgpuEngine.Node.properties = [
    { name: "name", prettyName: "Name", type: String },
];

/* Node3D */

wgpuEngine.Node3D.icon = "Move3d";
wgpuEngine.Node3D.properties = wgpuEngine.Node.properties.concat( [
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
    { name: "innerConeAngle", prettyName: "Inner Cone Angle", type: Number, min: 0, max: Math.PI / 2, step: 0.01, units: "rad" },
    { name: "outerConeAngle", prettyName: "Outer Cone Angle", type: Number, min: 0, max: Math.PI / 2, step: 0.01, units: "rad" },
] );

/* OmniLight3D */

wgpuEngine.OmniLight3D.icon = "Lightbulb";
wgpuEngine.OmniLight3D.properties = wgpuEngine.Light3D.properties.concat( [] );

/* Environment3D */

wgpuEngine.Environment3D.icon = "Globe";
wgpuEngine.Environment3D.properties = wgpuEngine.MeshInstance3D.properties.concat( [
    { name: "texture", prettyName: "Texture", type: wgpuEngine.Texture, setter: function( value ) { this.setTexture( value ); } },
] );

/* AnimationPlayer */

wgpuEngine.AnimationPlayer.icon = "Play";
wgpuEngine.AnimationPlayer.properties = wgpuEngine.Node3D.properties.concat( [
    { name: "blendTime", prettyName: "Blend Time", type: Number },
    { name: "speed", prettyName: "Speed", type: Number },
    { name: "loopType", prettyName: "Loop Type", type: "Enum", enum: "LoopType" },
] );
wgpuEngine.AnimationPlayer.methods = [
    { name: "play", prettyName: "Play Animation" },
    { name: "pause", prettyName: "Pause Animation" },
    { name: "stop", prettyName: "Stop Animation" },
];

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

    if (stack && stack.length >= 3) {
        const match = stack[3].match(/at (.*?) \(/);
        return match ? match[1] : 'anonymous';
    }

    return 'unknown';
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