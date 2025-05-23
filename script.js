
import { LX } from 'lexgui';

window.App = {

    dragSupportedExtensions: [ /*'hdr'*/, 'glb', 'ply' ],

    init() {

        this.engine = window.engineInstance;

        // Module.Engine.onFrame = () => {
        //     console.log( "Frame" );
        // }

        const skybox = new Module.Environment3D();
        console.log( "Skybox", skybox );

        const scene = this.engine.get_main_scene();
        scene.add_node( skybox, -1 );

        Module.Engine.onRender = () => {
            scene.render();
        }

        Module.Engine.onUpdate = ( dt ) => {
            scene.update( dt );
        }

        // Create grid
        {
            const gridMaterial = new Module.Material();
            gridMaterial.set_transparency_type( Module.ALPHA_BLEND );
            gridMaterial.set_cull_type( Module.CULL_NONE );
            gridMaterial.set_type( Module.MATERIAL_UNLIT );
            const shader = Module.RendererStorage.prototype.get_shader_from_name( "mesh_grid", gridMaterial );
            console.log( "Shader", shader );
            gridMaterial.set_shader( shader );
            console.log( "gridMaterial", gridMaterial );

            const surface = Module.RendererStorage.prototype.get_surface("quad");
            console.log( "Surface", surface );

            const grid = new Module.MeshInstance3D();
            // grid.set_name("Grid");
            grid.add_surface( surface );
            grid.set_position( new Module.vec3(0.0) );
            grid.rotate( 1.5708, new Module.vec3(1.0, 0.0, 0.0) );
            grid.scale( new Module.vec3(10.0) );
            grid.set_frustum_culling_enabled( false );
            grid.set_surface_material_override( surface, gridMaterial );
            console.log( "Grid", grid );

            scene.add_node( grid, -1);
        }

        // Create box
        {
            const boxMaterial = new Module.Material();
            boxMaterial.set_color(new Module.vec4(1.0, 0.0, 0.0, 0.50));

            // Load texture from file
            {
                const filename = "wall.png";
                LX.requestBinary( filename, ( data ) => {
                    this._fileStore( filename, data );
                    boxMaterial.set_diffuse_texture( Module.RendererStorage.prototype.get_texture( filename ) );
                }, (error) => { console.log(error) } );
            }

            const shader = Module.RendererStorage.prototype.get_shader_from_name( "mesh_forward", boxMaterial );
            console.log( "Shader", shader );
            boxMaterial.set_shader( shader );
            console.log( "boxMaterial", boxMaterial );

            const surface = Module.RendererStorage.prototype.get_surface("box");
            console.log( "Surface", surface );

            const box = new Module.MeshInstance3D();
            // box.set_name("Box");
            box.add_surface( surface );
            box.set_position( new Module.vec3(0.0) );
            // box.scale( new Module.vec3(10.0) );
            box.set_surface_material_override( surface, boxMaterial );
            console.log( "Box", box );

            scene.add_node( box, -1);
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
    }
};

window.App.init();