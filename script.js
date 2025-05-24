
import { LX } from 'lexgui';
import { wgpuEngine as WGE } from './wgpuengine.module.js';

window.App = {

    dragSupportedExtensions: [ /*'hdr'*/, 'glb', 'ply' ],

    async init() {

        this.engine = window.engineInstance;

        console.log(WGE);
        window.WGE = WGE;

        // WGE.Engine.onFrame = () => {
        //     console.log( "Frame" );
        // }

        const scene = this.engine.getMainScene();

        const skybox = new WGE.Environment3D();
        scene.addNode( skybox, -1 );

        WGE.Engine.onRender = () => {
            scene.render();
        }

        WGE.Engine.onUpdate = ( dt ) => {
            scene.update( dt );

            if( this.stats )
                this.stats.update();
        }

        // Create grid
        {
            const gridMaterial = new WGE.Material();
            gridMaterial.setTransparencyType( WGE.TransparencyType.ALPHA_BLEND );
            gridMaterial.setCullType( WGE.CullType.CULL_NONE );
            gridMaterial.setType( WGE.MaterialType.MATERIAL_UNLIT );
            gridMaterial.setShader( WGE.RendererStorage.getShaderFromName( "mesh_grid", gridMaterial ) );

            const surface = WGE.RendererStorage.getSurface( "quad" );
            const grid = new WGE.MeshInstance3D();
            grid.setName( "Grid" );
            grid.addSurface( surface );
            grid.setPosition( new WGE.vec3(0.0) );
            grid.rotate( 1.5708, new WGE.vec3(1.0, 0.0, 0.0) );
            grid.scale( new WGE.vec3(10.0) );
            grid.setFrustumCullingEnabled( false );
            grid.setSurfaceMaterialOverride( surface, gridMaterial );

            scene.addNode( grid, -1 );
        }

        // Create box
        {
            const boxMaterial = new WGE.Material();
            boxMaterial.setColor( new WGE.vec4(0.3, 0.2, 0.3, 0.50) );

            // By now we need to wait for the texture to be loaded in JS
            // Method 1: Await
            const texture = await WGE.RendererStorage.getTexture( "wall.png" );
            boxMaterial.setDiffuseTexture( texture );
            boxMaterial.setShader( WGE.RendererStorage.getShaderFromName( "mesh_forward", boxMaterial ) );
            
            // Method 2: Use callback
            // WGE.RendererStorage.getTexture( "wall.png", 0, (texture) => {
            //     boxMaterial.setDiffuseTexture( texture );
            //     boxMaterial.setShader( WGE.RendererStorage.getShaderFromName( "mesh_forward", boxMaterial ) );
            // });

            const surface = WGE.RendererStorage.getSurface("box");
            const box = new WGE.MeshInstance3D();
            box.setName( "Box" );
            box.addSurface( surface );
            box.setPosition( new WGE.vec3(1.0, 0, -10.0) );
            box.setSurfaceMaterialOverride( surface, boxMaterial );

            scene.addNode( box, -1 );
        }

        // Parse a glTF file
        {
            // Method 1: Await
            // const nodes = await WGE.parseGltf( "right_controller.glb" );
            // scene.addNodes( nodes, -1 );

            // Method 2: Use callback
            const nodes = WGE.parseGltf( "right_controller.glb", null, ( nodes ) => {
                scene.addNodes( nodes, -1 );
            });
        }

        // Create lights
        {
            const directionalLight = new WGE.DirectionalLight3D();
            directionalLight.setColor( new WGE.vec3( 1.0, 0.0, 0.0 ) );
            directionalLight.setIntensity( 5.0 );
            directionalLight.rotate( 1.5708, new WGE.vec3(0.0, 1.0, 0.0) );
            scene.addNode( directionalLight, -1);
        }

        this.initUI();
    },

    initUI() {

        var canvas = document.getElementById( "canvas" );
        document.body.appendChild(canvas);

        document.body.addEventListener('dragenter', e => e.preventDefault() );
        document.body.addEventListener('dragleave', e => e.preventDefault());
        document.body.addEventListener("dragover", function (event) {
            // prevent default to allow drop
            event.preventDefault();
        }, false);
        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            //this.toggleModal( true );
            const file = e.dataTransfer.files[0];
            const ext = this.getExtension( file.name );
            switch(ext)
            {
                case "glb": this.loadLocation(this._loadGltf, file); break;
                case "ply": this.loadLocation(this._loadPly, file); break;
            }
        });

        // Create loading  modal

        this.modal = document.createElement( 'div' );

        this.modal.style.width = "100%";
        this.modal.style.height = "100%";
        this.modal.style.opacity = "0.9";
        this.modal.style.backgroundColor = "#000";
        this.modal.style.position = "absolute";
        this.modal.style.cursor = "wait";
        this.modal.hidden = true;

        document.body.appendChild( this.modal );

        this.stats = new Stats();
        this.stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		document.body.appendChild( this.stats.dom );
    },

    getExtension( filename ) {

        return filename.includes('.') ? filename.split('.').pop() : null;
    },

    toggleModal( force ) {

        this.modal.hidden = force !== undefined ? (!force) : !this.modal.hidden;
    },

    loadLocation( loader, file, data ) {

        if( !data )
        {
            // file is the path URL
            if( file.constructor == String )
            {
                const path = file;
                LX.requestBinary( path, ( data ) => loader.call(this, path, data ), ( e ) => {
                    LX.popup( e.constructor === String ? e :  `[${ path }] can't be loaded.`, "Request Blocked", { size: ["400px", "auto"], timeout: 10000 } );
                    this.toggleModal( false );
                } );
                return;
            }

            const reader = new FileReader();
            reader.readAsArrayBuffer( file );
            reader.onload = e => loader.call(this, file.name, e.target.result);
            reader.onerror = (e, a, b, c) => {
                debugger;
            };

            return;
        }
        
        loader.call(this, file.name ?? file, data );
    },

   
    _loadGltf( name, buffer ) {

        name = name.substring( name.lastIndexOf( '/' ) + 1 );
        
        console.log( "Loading glb", [ name, buffer ] );

        this._fileStore( name, buffer );

        window.engineInstance.appendGLB( name );

        this.toggleModal( false );
    },

    _loadPly( name, buffer ) {

        name = name.substring( name.lastIndexOf( '/' ) + 1 );

        console.log( "Loading ply", [ name, buffer ] );

        this._fileStore( name, buffer );

        window.engineInstance.loadPly( name );

        this.toggleModal( false );
    },

    _fileStore( filename, buffer ) {

        let data = new Uint8Array( buffer );
        let stream = FS.open( filename, 'w+' );
        FS.write( stream, data, 0, data.length, 0 );
        FS.close( stream );
    },

    _requestBinary( url, nocache ) {

        return new Promise((resolve, reject) => {

            const dataType = "arraybuffer";
            const mimeType = "application/octet-stream";

            //regular case, use AJAX call
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
};

window.App.init();