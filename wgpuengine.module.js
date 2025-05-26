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
    const textureFilePath = wgpuEngine._getFilename( texturePath );
    return await wgpuEngine._requestBinary( texturePath ).then( data => {
        wgpuEngine._fileStore( textureFilePath, data );
        const texture = Module.RendererStorage._getTexture( textureFilePath, textureFlags ?? wgpuEngine.TextureStorageFlags.TEXTURE_STORAGE_NONE );
        if( onLoad ) onLoad( texture );
        return texture;
    }).catch(( err ) => console.error( `${ wgpuEngine._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.Environment3D.prototype.setTexture = async function( texturePath ) {
    const textureFilePath = wgpuEngine._getFilename( texturePath );
    await wgpuEngine._requestBinary( texturePath ).then( data => {
        wgpuEngine._fileStore( textureFilePath, data );
        this._setTexture( textureFilePath );
    }).catch(( err ) => console.error( `${ wgpuEngine._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.parseGltf = async function( gltfPath, nodes, onLoad ) {
    const gltfFilePath = wgpuEngine._getFilename( gltfPath );
    return await wgpuEngine._requestBinary( gltfPath ).then( data => {
        wgpuEngine._fileStore( gltfFilePath, data );
        nodes = nodes ?? new wgpuEngine.VectorNodePtr();
        const parser = new wgpuEngine.GltfParser();
        parser.parse( gltfFilePath, nodes );
        if( onLoad ) onLoad( nodes );
        return nodes;
    }).catch(( err ) => console.error( `${ wgpuEngine._getCurrentFunctionName() }: ${ err }` ) );
}

wgpuEngine.parseObj = async function( objPath, createAABB, onLoad ) {
    objPath = wgpuEngine._getFilename( objPath );
    return await wgpuEngine._requestBinary( objPath ).then( data => {
        wgpuEngine._fileStore( objPath, data );
        const meshInstance3D = new Module._parseObj( objPath, createAABB );
        if( onLoad ) onLoad( meshInstance3D );
        return meshInstance3D;
    }).catch(( err ) => console.error( `${ wgpuEngine._getCurrentFunctionName() }: ${ err }` ) );
}

// Utility functions

wgpuEngine._getFilename = function( filename )
{
    if( !filename.includes( '/' ) )
    {
        return filename;
    }
    // Return the last part of the path
    return filename.substring( filename.lastIndexOf( '/' ) + 1 );
}

wgpuEngine._getCurrentFunctionName = function()
{
    const err = new Error();
    const stack = err.stack?.split('\n');

    if (stack && stack.length >= 3) {
        const match = stack[3].match(/at (.*?) \(/);
        return match ? match[1] : 'anonymous';
    }

    return 'unknown';
}

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