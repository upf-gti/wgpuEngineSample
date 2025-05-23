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
    getTexture: async function ( textureName, textureFlags ) {
        const data = await wgpuEngine._requestBinary( textureName ).catch(( err ) => console.error( err ) );
        wgpuEngine._fileStore( textureName, data );
        return Module.RendererStorage.prototype.get_texture( textureName, textureFlags );
    },
}

wgpuEngine.RendererStorage = RendererStorage;

wgpuEngine.destroy = function () {
    // ...
}

// Utility functions

wgpuEngine._fileStore = function( filename, buffer ) {
    let data = new Uint8Array( buffer );
    let stream = FS.open( filename, 'w+' );
    FS.write( stream, data, 0, data.length, 0 );
    FS.close( stream );
}

wgpuEngine._requestBinary = function( url, nocache ) {
    return new Promise((resolve, reject) => {
        const dataType = "arraybuffer";
        const mimeType = "application/octet-stream";
        var xhr = new XMLHttpRequest();
        xhr.open( 'GET', url, true );
        xhr.responseType = dataType;
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

export { wgpuEngine };