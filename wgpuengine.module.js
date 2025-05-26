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

wgpuEngine.RendererStorage.getTexture = async function( textureName, textureFlags, onLoad ) {
    return await wgpuEngine._requestBinary( textureName ).then( data => {
        wgpuEngine._fileStore( textureName, data );
        const texture = Module.RendererStorage._getTexture( textureName, textureFlags ?? wgpuEngine.TextureStorageFlags.TEXTURE_STORAGE_NONE );
        if( onLoad ) onLoad( texture );
        return texture;
    }).catch(( err ) => console.error( err ) );
}

wgpuEngine.Environment3D.prototype.setTexture = async function( textureName ) {
    await wgpuEngine._requestBinary( textureName ).then( data => {
        wgpuEngine._fileStore( textureName, data );
        this._setTexture( textureName );
    }).catch(( err ) => console.error( err ) );
}

wgpuEngine.parseGltf = async function( glTFName, nodes, onLoad ) {
    return await wgpuEngine._requestBinary( glTFName ).then( data => {
        wgpuEngine._fileStore( glTFName, data );
        nodes = nodes ?? new wgpuEngine.VectorNodePtr();
        const parser = new wgpuEngine.GltfParser();
        parser.parse( glTFName, nodes );
        if( onLoad ) onLoad( nodes );
        return nodes;
    }).catch(( err ) => console.error( err ) );
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