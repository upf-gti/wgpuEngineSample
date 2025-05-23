const wgpuEngine = {
    version: "0.0.1",
    name: "WGPUEngine"
};

// Add defaults to namespace
const skipInclude = [ "addRunDependency", "BindingError", "calledRun", "castObject", "compare", "count_emval_handles", "createContext", "dataFileDownloads", "expectedDataFileDownloads", 
    "getCache", "getClass", "getPointer", "getUserMedia", "pauseMainLoop", "preloadResults", "preRun", "postRun", "resumeMainLoop", "requestAnimationFrame", "removeRunDependency", "requestFullscreen", 
    "setCanvasSize", "totalDependencies", "VoidPtr", "WrapperObject", "wrapPointer", "NULL" ];

for( const key in Module )
{
    if( key.startsWith( '_' ) || key.startsWith( 'dynCall' ) || key.startsWith( 'FS_' ) || skipInclude.includes( key ) )
        continue;

    wgpuEngine[  key ] = Module[ key ];
}

// Custom wrappers for some classes

const RendererStorage = {
    getShader: function ( shaderName, material ) {
        return Module.RendererStorage.prototype.get_shader_from_name( shaderName, material );
    },
    getSurface: function ( surfaceName ) {
        return Module.RendererStorage.prototype.get_surface( surfaceName );
    },
    getTexture: function ( textureName, textureFlags ) {
        return Module.RendererStorage.prototype.get_texture( textureName, textureFlags );
    },
}

wgpuEngine.RendererStorage = RendererStorage;

wgpuEngine.destroy = function () {
    // ...
}   

export { wgpuEngine };