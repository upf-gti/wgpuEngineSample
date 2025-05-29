
import { LX } from 'lexgui';
import { wgpuEngine as WGE } from './wgpuengine.module.js';

window.App = {

    dragSupportedExtensions: [ /*'hdr'*/, 'glb', 'ply' ],
    selectedNode: null,

    async init() {

        this.engine = window.engineInstance;
        this.renderer = this.engine.getRenderer();

        console.log(WGE);
        window.WGE = WGE;

        // WGE.Engine.onFrame = () => {
        //     console.log( "Frame" );
        // }

        const scene = this.engine.getMainScene();
        this.scene = scene;

        const skybox = new WGE.Environment3D();
        // It's possible to use "await" here to block the main thread and wait
        // for the texture to be loaded
        // await skybox.setTexture( "test.hdr" );
        skybox.setTexture( "test.hdr" );

        scene.addNode( skybox, -1 );

        WGE.Engine.onRender = () => {
            scene.render();

            if( this.selectedNode )
            {
                const camera = this.renderer.getCamera();
                const model = WGE.Transform.transformToMat4( this.selectedNode.getTransform() );
                if( this.gizmo.render( camera.getView(), camera.getProjection(), model ) )
                {
                    const newTransform = WGE.Transform.mat4ToTransform( model );
                    this.selectedNode.setTransform( newTransform );
                }
            }
        }

        WGE.Engine.onUpdate = ( dt ) => {

            scene.update( dt );

            if( window.torus )
            {
                window.torus.rotate( WGE.radians( 100.0 * dt ), new WGE.vec3(0.0, 0.0, 1.0) );
            }

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
            grid.name = "Grid";
            grid.addSurface( surface );
            grid.setPosition( new WGE.vec3(0.0) );
            grid.rotate( WGE.radians( 90.0 ), new WGE.vec3(1.0, 0.0, 0.0) );
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

            // Update with a custom shader
            WGE.RendererStorage.getShader( "mesh_forward_custom.wgsl", boxMaterial, null, ( shader ) => {
                boxMaterial.setShader( shader );
            });
            
            // Method 2: Use callback
            // WGE.RendererStorage.getTexture( "wall.png", 0, (texture) => {
            //     boxMaterial.setDiffuseTexture( texture );
            //     boxMaterial.setShader( WGE.RendererStorage.getShaderFromName( "mesh_forward", boxMaterial ) );
            // });

            const surface = WGE.RendererStorage.getSurface("box");
            const box = new WGE.MeshInstance3D();
            box.name = "Box";
            box.addSurface( surface );
            box.setPosition( new WGE.vec3(1.0, 0, -5.0) );
            box.setSurfaceMaterialOverride( surface, boxMaterial );
            scene.addNode( box, -1 );
            window.box = box;
        }

        // Parse a glTF file
        {
            // Method 1: Await
            // const nodes = await WGE.parseGltf( "right_controller.glb" );
            // scene.addNodes( nodes, -1 );

            // Method 2: Use callback
            const nodes = WGE.parseGltf( "https://threejs.org/examples/models/gltf/Soldier.glb", null, ( nodes ) => {
                scene.addNodes( nodes, -1 );
            });
        }

        // Parse an Obj file
        {
            // Method 1: Await
            // const meshInstance3D = await WGE.parseObj( "torus.obj", true );
            // scene.addNode( meshInstance3D, -1 );

            // Method 2: Use callback
            const meshInstance3D = WGE.parseObj( "torus.obj", true, ( meshInstance3D ) => {
                scene.addNode( meshInstance3D, -1 );
                window.torus = meshInstance3D; // Store the torus mesh instance globally for debugging
            });
        }

        // Create lights
        {
            const directionalLight = new WGE.DirectionalLight3D();
            directionalLight.setColor( new WGE.vec3( 1.0, 0.0, 0.0 ) );
            directionalLight.setIntensity( 5.0 );
            directionalLight.rotate( WGE.radians( 90.0 ), new WGE.vec3(0.0, 1.0, 0.0) );
            scene.addNode( directionalLight, -1);
        }

        // Create gizmo
        {
            this.gizmo = new WGE.Gizmo2D();
        }

        this.initUI();
    },

    async initUI() {

        let area = await LX.init();

        const menubar = area.addMenubar([
            {
                name: "File", submenu: [
                    { name: "New Scene", callback: this.onNewScene.bind( this ) },
                    { name: "Open Scene", icon: "FolderOpen", kbd: "S", callback: () => { console.log("Opening SCENE Dialog") } }
                ]
            },
            {
                name: "Edit", submenu: [
                    { name: "Delete", icon: "Trash2" }
                ]
            },
            {
                name: "Add", submenu: [
                    { name: "Mesh", submenu: [
                        { name: "Box", callback: this.onAddMesh.bind( this ) },
                        { name: "Sphere", callback: this.onAddMesh.bind( this ) },
                        // { name: "Torus", callback: this.onAddMesh.bind( this ) }
                    ] },
                    { name: "Light", callback: this.onAddNode.bind( this ) },
                    { name: "Camera", callback: this.onAddNode.bind( this ) },
                ]
            },
            {
                name: "View", submenu: [
                    { name: "Grid Helper", checked: true },
                    null,
                    { name: "Fullscreen", checked: false }
                ]
            },
            {
                name: "Help", submenu: [
                    { name: "Documentation", icon: "Book", kbd: "F1", callback: () => { window.open("https://upf-gti.github.io/wgpuEngine/") } },
                    { name: "Source Code", icon: "Code", kbd: "F2", callback: () => { window.open("https://github.com/upf-gti/wgpuEngine/") } },
                    null,
                    { name: "About LexGUI", xicon: "Code", kbd: "F3", callback: () => { window.open("https://github.com/jxarco/lexgui.js/") } }
                ]
            },

        ], { sticky: false });


        var [ left, right ] = area.split({ sizes: ["80%", "20%"] });
        left.root.id = "canvas-area";

        var canvas = document.getElementById( "canvas" );
        left.attach( canvas );

        left.onresize = () => {
            this.engine.resize( left.root.offsetWidth, left.root.offsetHeight );
            window.dispatchEvent( new Event("resize") );
        }

        left.onresize();

        left.addOverlayButtons([
            [
                {
                    name: "Translate",
                    icon: "Move",
                    callback: (value, event) => console.log(value),
                    selectable: true
                },
                {
                    name: "Rotate",
                    icon: "RotateRight",
                    callback: (value, event) => console.log(value),
                    selectable: true
                },
                {
                    name: "Scale",
                    icon: "Scale3d",
                    callback: (value, event) => console.log(value),
                    selectable: true
                }
            ],
            {
                name: "Lit",
                options: ["Lit", "Unlit", "Wireframe"],
                callback: (value, event) => console.log(value)
            }
        ], { float: "htr" });

        const [ rightUp, rightDown ] = right.split({ type: "vertical", sizes: ["40%", "60%"] });

        // Scene Tree
        {
            this.sceneTreePanel = rightUp.addPanel();

            this.sceneTreePanel.refresh = () => {

                this.sceneTreePanel.clear();

                let sceneData = [];

                // Fill scene data recursively through the scene nodes and its children

                function fillSceneData( node, data ) {
                    const nodeData = {
                        id: node.name,
                        children: []
                    };

                    data.push( nodeData );

                    const children = node.getChildren();
                    for( let i = 0; i < children.size(); i++ )
                    {
                        fillSceneData( children.get(i), nodeData.children );
                    }
                }
                
                const nodes = this.scene.getNodes();
                for( let i = 0; i < nodes.size(); i++ )
                {
                    fillSceneData( nodes.get( i ), sceneData );
                }
        
                this.sceneTreePanel.addTree(null, sceneData, {
                    // icons: treeIcons,
                    // filter: false,
                    addDefault: true,
                    onevent: (event) => {    
                        switch (event.type) {
                            case LX.TreeEvent.NODE_SELECTED:
                                const index = sceneData.findIndex( n => n.id === event.node.id );
                                this.selectedNode = this.scene.getNodes().get(index);
                                break;
                            // case LX.TreeEvent.NODE_DELETED:
                            //     if (event.multiple)
                            //         console.log("Deleted: ", event.node);
                            //     else
                            //         console.log(event.node.id + " deleted");
                            //     break;
                            // case LX.TreeEvent.NODE_DBLCLICKED:
                            //     console.log(event.node.id + " dbl clicked");
                            //     break;
                            // case LX.TreeEvent.NODE_CONTEXTMENU:
                            //     const m = event.panel;
                            //     m.add("Components/Transform");
                            //     m.add("Components/MeshRenderer");
                            //     break;
                            // case LX.TreeEvent.NODE_DRAGGED:
                            //     console.log(event.node.id + " is now child of " + event.value.id);
                            //     break;
                            // case LX.TreeEvent.NODE_RENAMED:
                            //     console.log(event.node.id + " is now called " + event.value);
                            //     break;
                            // case LX.TreeEvent.NODE_VISIBILITY:
                            //     console.log(event.node.id + " visibility: " + event.value);
                            //     break;
                        }
                    }
                });
            }

            this.sceneTreePanel.refresh();
        }

        // Editor panels (This will be replaced by each node info)
        {
            const panelTabs = rightDown.addTabs();
            panelTabs.add( "Object", document.createElement('div') );
            panelTabs.add( "Geometry", document.createElement('div') );
            panelTabs.add( "Material", document.createElement('div') );
        }

        document.body.addEventListener('dragenter', e => e.preventDefault() );
        document.body.addEventListener('dragleave', e => e.preventDefault());
        document.body.addEventListener("dragover", function (event) {
            // prevent default to allow drop
            event.preventDefault();
        }, false);
        document.body.addEventListener('drop', (e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            const ext = LX.getExtension( file.name );
            switch(ext)
            {
                case "glb": this.loadLocation(this._loadGltf, file); break;
                case "ply": this.loadLocation(this._loadPly, file); break;
            }
        });

        this.stats = new Stats();
        this.stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.top = "";
        this.stats.dom.style.bottom = "0px";
		document.body.appendChild( this.stats.dom );
    },

    onNewScene() {
        LX.prompt("Are you sure you want to create a new scene? This will discard the current scene.", "New Scene", (ok) => {}, { input: false });
    },

    onAddMesh( geometryType ) {

        const mesh = new WGE.MeshInstance3D();
        mesh.name = "New Mesh";

        // Add a surface
        let surface = null;
        
        if( geometryType === "Sphere" )
        {
            surface = WGE.RendererStorage.getSurface("sphere");
        }
        // else if( geometryType === "Torus" )
        // {
        //     surface = WGE.RendererStorage.getSurface("torus");
        // }
        else if( geometryType === "Box" )
        {
            surface = WGE.RendererStorage.getSurface("box");
        }
        else
        {
            throw new Error( `Unknown geometry type: ${ geometryType }` );
        }

        mesh.addSurface( surface );

        // Add a material
        const material = new WGE.Material();
        material.setShader( WGE.RendererStorage.getShaderFromName( "mesh_forward", material ) );
        mesh.setSurfaceMaterialOverride( surface, material );
        this.scene.addNode( mesh, -1 );

        this.sceneTreePanel.refresh();
    },

    onAddNode( type ) {
        switch( type )
        {
            case "Light":
                this.addLight();
                break;
            case "Camera":
                this.addCamera();
                break;
        }
    },

    addLight() {
        const light = new WGE.DirectionalLight3D();
        light.setPosition( new WGE.vec3(0.0, 5.0, 0.0) );
        light.setColor( new WGE.vec3(1.0, 1.0, 1.0) );
        light.setIntensity( 1.0 );
    },

    addCamera() {
        const camera = new WGE.Camera3D();
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
    },

    _loadPly( name, buffer ) {

        name = name.substring( name.lastIndexOf( '/' ) + 1 );

        console.log( "Loading ply", [ name, buffer ] );

        this._fileStore( name, buffer );

        window.engineInstance.loadPly( name );
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