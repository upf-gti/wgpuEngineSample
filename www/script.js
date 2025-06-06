
import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';

import { wgpuEngine as WGE } from './wgpuengine.module.js';

window.App = {

    dragSupportedExtensions: [ /*'hdr'*/, 'glb', 'ply' ],
    selectedNode: null,
    renderGrid: true,
    running: false,
    scripts: {},
    defaultNodeScript: `// Add Start, Update and Render logic for your node:

this.onStart = function() {
    // console.log("Started", this.name);
};
this.onUpdate = function(dt) {
    // console.log("onUpdate", this.name);
    this.rotate( WGE.radians( 100.0 * dt ), new WGE.vec3(0.0, 0.0, 1.0) );
};
this.onRender = function() {
    // console.log("onRender", this.name);
};
`,

    async init() {

        window.LX = LX;

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

            if( this.renderGrid )
            {
                this.grid.render();
            }

            scene.render();

            // debug: run scripts
            if( this.running )
            {
                for( const nodeUid in this.scripts )
                {
                    for( const s of this.scripts[ nodeUid ] )
                    {
                        s.node.onRender();
                    }
                }
            }

            if( this.selectedNode && this.selectedNode.getTransform )
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

            // debug: run scripts
            if( this.running )
            {
                for( const nodeUid in this.scripts )
                {
                    for( const s of this.scripts[ nodeUid ] )
                    {
                        s.node.onUpdate( dt );
                    }
                }
            }

            // if( window.torus )
            // {
            //     window.torus.rotate( WGE.radians( 100.0 * dt ), new WGE.vec3(0.0, 0.0, 1.0) );
            // }

            if( this.stats )
                this.stats.update();
        }

        // Create grid
        {
            const gridMaterial = new WGE.Material();
            gridMaterial.transparencyType = WGE.TransparencyType.ALPHA_BLEND;
            gridMaterial.cullType = WGE.CullType.CULL_NONE;
            gridMaterial.type = WGE.MaterialType.MATERIAL_UNLIT;
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
            this.grid = grid;
        }

        // Create box
        {
            const boxMaterial = new WGE.Material();
            boxMaterial.color = new WGE.vec4(0.3, 0.2, 0.3, 0.50);

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
            const nodes = await WGE.parseGltf( "https://threejs.org/examples/models/gltf/Soldier.glb" );
            scene.addNodes( nodes, -1 );

            // Method 2: Use callback
            // const nodes = WGE.parseGltf( "https://threejs.org/examples/models/gltf/Soldier.glb", null, ( nodes ) => {
            //     scene.addNodes( nodes, -1 );
            // });
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

                // const torusMaterial = meshInstance3D.getSurfaceMaterial();
                // // torusMaterial.cullType = WGE.CullType.CULL_NONE;
                // torusMaterial.color = new WGE.vec4(1, 0, 1, 1);
                // torusMaterial.setShader( WGE.RendererStorage.getShaderFromName( "mesh_forward", torusMaterial ) );

                // const torusSurface = meshInstance3D.getSurface( 0 );
                // meshInstance3D.setSurfaceMaterialOverride( torusSurface, torusMaterial );
            });
        }

        // Create lights
        {
            const directionalLight = new WGE.DirectionalLight3D();
            directionalLight.color = new WGE.vec3( 1.0, 0.0, 0.0 );
            directionalLight.intensity = 5.0;
            directionalLight.rotate( WGE.radians( 90.0 ), new WGE.vec3(0.0, 1.0, 0.0) );
            scene.addNode( directionalLight, -1);
        }

        // Create gizmo
        {
            this.gizmo = new WGE.Gizmo2D();
        }

        setTimeout( () => {
            // Initialize the UI after the engine is ready
            this.initUI();
        }, 100 );
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
                        { name: "Torus", callback: this.onAddMesh.bind( this ) }
                    ] },
                    { name: "Light", submenu: [
                        { name: "Directional", callback: this.onAddLight.bind( this ) },
                        { name: "Omni", callback: this.onAddLight.bind( this ) },
                        { name: "Spot", callback: this.onAddLight.bind( this ) }
                    ] },
                    { name: "Camera", callback: this.onAddNode.bind( this ) },
                ]
            },
            {
                name: "View", submenu: [
                    { name: "Grid Helper", checked: this.renderGrid, callback: (name, value) => this.renderGrid = value },
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

        menubar.addButtons( [
            { title: "Play", icon: "Play", swap: "Stop", callback: ( value ) => {
                const ok = this.runScene( value );
                if( value && !ok )
                {
                    const playButton = menubar.getButton("Play");
                    playButton.swap();
                }
            } }
        ] );

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

        // Add code editor area
        {
            this.codeEditorArea = new LX.Area({ className: "absolute top-0 left-0 z-100" });
            this.codeEditorArea.root.style.opacity = 0.95;
            const closeEditorIcon = LX.makeIcon( "X", { iconClass: "absolute top-0 right-0 mr-2 mt-2 z-10" } );
            closeEditorIcon.listen( "click", this.closeEditor.bind( this ) );
            this.codeEditorArea.attach( closeEditorIcon );
            left.attach( this.codeEditorArea );
            this.closeEditor();
        }

        const [ rightUp, rightDown ] = right.split({ type: "vertical", sizes: ["40%", "60%"] });

        const upTabs = rightUp.addTabs( { fit: true });

        // Scene Tree
        {
            this.sceneTreePanel = new LX.Panel();
            upTabs.add( "Scene", this.sceneTreePanel );

            this.sceneTreePanel.refresh = () => {

                this.sceneTreePanel.clear();

                let sceneData = [
                    {
                        id: "Camera",
                        children: [],
                        icon: "Camera",
                        skipVisibility: true,
                        node: this.renderer.getCamera()
                    },
                    {
                        id: "Scene",
                        children: [],
                        icon: "Trees",
                        skipVisibility: true,
                        node: this.scene
                    }
                ];

                // Fill scene data recursively through the scene nodes and its children

                function fillSceneData( node, data ) {
                    const nodeData = {
                        id: node.name,
                        children: [],
                        icon: node.constructor.icon,
                        skipVisibility: true,
                        node
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
                                this.selectNode( event.node.node );
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

        // Project
        {
            this.projectPanel = new LX.Panel();
            upTabs.add( "Project", this.projectPanel );


        }

        // Editor panels (This will be replaced by each node info)
        {
            const panelTabs = this.nodePanelTabs = rightDown.addTabs();
            panelTabs.root.style.width = "calc( 100% - 4px )";

            this.objectPanel = new LX.Panel();
            panelTabs.add( "Object", this.objectPanel );

            this.geometryPanel = new LX.Panel();
            panelTabs.add( "Geometry", this.geometryPanel );

            this.materialPanel = new LX.Panel();
            panelTabs.add( "Material", this.materialPanel );

            this.scriptPanel = new LX.Panel();
            panelTabs.add( "Script", this.scriptPanel );

            panelTabs.tabDOMs[ "Object" ].classList.toggle( "hidden", true );
            panelTabs.tabDOMs[ "Geometry" ].classList.toggle( "hidden", true );
            panelTabs.tabDOMs[ "Material" ].classList.toggle( "hidden", true );
            panelTabs.tabDOMs[ "Script" ].classList.toggle( "hidden", true );
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
                case "glb": this.loadScene(this._loadGltf, file); break;
                case "ply": this.loadScene(this._loadPly, file); break;
            }
        });

        this.stats = new Stats();
        this.stats.showPanel( 1 ); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.top = "";
        this.stats.dom.style.bottom = "0px";
		document.body.appendChild( this.stats.dom );
    },

    selectNode( node ) {
        
        this.selectedNode = node;

        if( this.selectedNode )
        {
            this.inspectNode( this.selectedNode );
        }
        else
        {
            console.warn( `Node ${ node.name } not found!` );
        }

    },

    onNewScene() {
        LX.prompt("Are you sure you want to create a new scene? This will discard the current scene.", "New Scene", (ok) => {}, { input: false });
    },

    onAddMesh( geometryType ) {

        const mesh = new WGE.MeshInstance3D();
        mesh.name = "New_Mesh_" + LX.guidGenerator();

        // Add a surface
        let surface = null;
        
        if( geometryType === "Sphere" )
        {
            surface = WGE.RendererStorage.getSurface("sphere");
        }
        else if( geometryType === "Torus" )
        {
            surface = WGE.RendererStorage.getSurface("torus");
        }
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

    onAddLight( lightType ) {

        let light = null;

        if( lightType === "Directional" )
        {
            light = new WGE.DirectionalLight3D();
        }
        else if( lightType === "Omni" )
        {
            light = new WGE.OmniLight3D();
        }
        else if( lightType === "Spot" )
        {
            light = new WGE.SpotLight3D();
        }
        else
        {
            throw new Error( `Unknown light type: ${ lightType }` );
        }

        light.name = "New_Light_" + LX.guidGenerator();
        this.scene.addNode( light, -1 );
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

    inspectNode( node ) {

        let hasGeometry = false, hasMaterial = false, hasScript = false;

        this.inspectPropertiesAndMethods( node, this.objectPanel );

        // Has geometry?
        if( node instanceof WGE.MeshInstance3D )
        {
            const surface = node.getSurface( 0 );
            this.inspectPropertiesAndMethods( surface, this.geometryPanel );
            hasGeometry = true;
        }
        else
        {
            this.geometryPanel.clear();
        }

        const material = this.getNodeMaterial( node );
        if( material )
        {
            this.inspectPropertiesAndMethods( material, this.materialPanel );
            hasMaterial = true;
        }
        else
        {
            this.materialPanel.clear();
        }

        // Everyone can have a script?
        if( !( node instanceof WGE.Camera ) )
        {
            this.inspectScripts( node, this.scriptPanel );
            hasScript = true;
        }
        else
        {
            this.scriptPanel.clear();
        }

        this.nodePanelTabs.tabDOMs[ "Object" ].classList.toggle( "hidden", false );
        this.nodePanelTabs.tabDOMs[ "Geometry" ].classList.toggle( "hidden", !hasGeometry );
        this.nodePanelTabs.tabDOMs[ "Material" ].classList.toggle( "hidden", !hasMaterial );
        this.nodePanelTabs.tabDOMs[ "Script" ].classList.toggle( "hidden", !hasScript );
    },

    inspectPropertiesAndMethods( obj, panel, options = {} ) {

        panel.clear();

        if( obj.constructor.properties?.length )
        {
            panel.branch( "Properties" );

            for( let p of obj.constructor.properties )
            {
                if( !p )
                {
                    panel.addSeparator();
                    continue;
                }

                const widgetName = p.prettyName ?? p.name;

                switch( p.type )
                {
                    case Number:
                        panel.addNumber( widgetName, p.getter ? p.getter.call( obj ) : obj[ p.name ], value => {
                            if( p.setter )
                            {
                                p.setter.call( obj, value );
                            }
                            else
                            {
                                obj[ p.name ] = value;
                            }
                        }, { min: p.min, max: p.max, step: p.step, skipSlider: true, disabled: p.disabled, units: p.units } );
                        break;
                    case String:
                        panel.addText( widgetName, obj[ p.name ], value => {
                            obj[ p.name ] = value;
                            if( p.name === "name" )
                            {
                                this.sceneTreePanel.refresh();
                            }
                        }, { disabled: p.disabled } );
                        break;
                    case Boolean:
                        panel.addCheckbox( widgetName, obj[ p.name ], value => obj[ p.name ] = value, { disabled: p.disabled } );
                        break;
                    case WGE.vec3:
                    {
                        const value = obj[ p.name ] ?? new WGE.vec3( 0.0, 0.0, 0.0 );
                        panel.addVector3( widgetName, [ value.x, value.y, value.z ], value => {
                            const vec3 = new WGE.vec3( value[ 0 ], value[ 1 ], value[ 2 ] );
                            if( p.setter )
                            {
                                p.setter.call( obj, vec3 );
                            }
                            else
                            {
                                obj[ p.name ] = vec3;
                            }
                        }, { min: p.min, max: p.max, step: p.step, disabled: p.disabled } );
                        break;
                    }
                    case WGE.vec4:
                    {
                        const value = obj[ p.name ] ?? new WGE.vec4( 0.0, 0.0, 0.0, 1.0 );
                        panel.addVector4( widgetName, [ value.x, value.y, value.z, value.w ], value => {
                            obj[ p.name ] = new WGE.vec4( value[ 0 ], value[ 1 ], value[ 2 ], value[ 3 ] );
                        }, { min: p.min, max: p.max, step: p.step, disabled: p.disabled } );
                        break;
                    }
                    case WGE.Transform:
                    {
                        let transform = obj[ p.name ];
                        console.assert( transform );

                        // Position
                        {
                            const value = transform.position;
                            panel.addVector3( "Position", [ value.x, value.y, value.z ], value => {
                                let transform = obj.transform;
                                transform.position = new WGE.vec3( value[ 0 ], value[ 1 ], value[ 2 ] );
                                obj.transform = transform;
                            }, { min: -10, max: 10, step: 0.1, disabled: p.disabled } );
                        }
                        // Scale
                        {
                            const value = transform.scale;
                            panel.addVector3( "Scale", [ value.x, value.y, value.z ], value => {
                                let transform = obj.transform;
                                transform.scale = new WGE.vec3( value[ 0 ], value[ 1 ], value[ 2 ] );
                                obj.transform = transform;
                            }, { min: -10, max: 10, step: 0.1, disabled: p.disabled } );
                        }
                        // Rotation
                        {
                            const value = transform.rotation;
                            panel.addVector4( "Rotation", [ value.x, value.y, value.z, value.w ], value => {
                                let transform = obj.transform;
                                transform.rotation = new WGE.quat( value[ 0 ], value[ 1 ], value[ 2 ], value[ 3 ] );
                                obj.transform = transform;
                            }, { min: -1, max: 1, step: 0.1, disabled: p.disabled } );
                        }
                        // transform.delete();
                        break;
                    }
                    case "Enum":
                    {
                        const values = Object.values( WGE[ p.enum ].values ).map( v => v.constructor.name.replace( `${ p.enum }_`, "" ) )
                        panel.addSelect( widgetName, values, values[ obj[ p.name ].value ?? obj[ p.name ] ], value => {
                            obj[ p.name ] = WGE[ p.enum ][ value ];
                        }, { disabled: p.disabled } );
                        break;
                    }
                    case WGE.Texture:
                    {
                        const texture = obj[ p.name ];
                        const textureName = texture.name;
                        panel.sameLine( 2 );
                        const texNameWidget = panel.addText( widgetName, textureName ?? "TEXTURE_NAME_ERROR", null, { icon: "Image" } );
                        texNameWidget.root.style.flex = 1;
                        panel.addButton( null, "LoadTexture", ( data, file ) => {
                            const filename = file.name;
                            Module._writeFile( filename, data );
                            p.setter.call( obj, filename );
                            this.inspectPropertiesAndMethods( obj, panel, options );
                        }, { fileInput: true, fileInputType: "buffer", disabled: p.disabled, icon: "EllipsisVertical" } );
                        break;
                    }
                    case WGE.AABB:
                    {
                        const aabb = obj[ p.name ];

                        if( !panel.addAABB )
                        {
                            LX.ADD_CUSTOM_WIDGET( "AABB", {
                                icon: WGE.AABB.icon,
                                _get_center: function() {
                                    return [ this.center.x, this.center.y, this.center.z ];
                                },
                                _set_center: function( value ) {
                                    this.center.x = value[ 0 ]; this.center.y = value[ 1 ]; this.center.z = value[ 2 ];
                                },
                                _get_halfSize: function() {
                                    return [ this.halfSize.x, this.halfSize.y, this.halfSize.z ];
                                },
                                _set_halfSize: function( value ) {
                                    this.halfSize.x = value[ 0 ]; this.halfSize.y = value[ 1 ]; this.halfSize.z = value[ 2 ];
                                },
                                default: {
                                    center: new WGE.vec3( 0.0 ),
                                    halfSize: new WGE.vec3( 0.0 )
                                }
                            });
                        }

                        panel.addAABB( widgetName, aabb );
                        break;
                    }
                    default:
                        console.warn( `Property type ${ p.type } not supported.` );
                }
            }
        }

        if( !obj.constructor.methods || !obj.constructor.methods.length )
        {
            return;
        }

        panel.branch( "Methods" );

        for( let p of obj.constructor.methods )
        {
            const widgetName = p.prettyName ?? p.name;

            panel.addButton( null, widgetName, () => {
                if( obj[ p.name ] )
                {
                    obj[ p.name ]( "Walk", 0.0, -1.0, 1.0 );
                }
            }, {  } );
        }
    },

    inspectScripts( node, panel, options = {} ) {

        panel.clear();

        const nodeUid = `${ node.name }_${ node.sceneUID }`;
        const scripts = this.scripts[ nodeUid ] ?? [];

        panel.addButton( null, "New Script", () => {

            this.scripts[ nodeUid ] = this.scripts[ nodeUid ] ?? [];

            const newScript = { name: "script_" + LX.guidGenerator() + ".js", node };
            this.scripts[ nodeUid ].push( newScript );

            this.inspectNode( node );

            this.openScript( newScript );

        }, { buttonClass: "contrast" } );

        if( !scripts.length )
        {
            return;
        }

        panel.addSeparator();

        for( let s of scripts )
        {
            panel.sameLine( 3 );
            const nameWidget = panel.addText( null, s.name, v => {
                const scriptCode = this.codeEditor.getText();
                // this.codeEditor.closeTab( s.name, true );
                this.codeEditor.tabs.delete( s.name );
                s.name = v;
                this.codeEditor.loadTab( s.name );
                this.codeEditor.setText( scriptCode, "JavaScript" );
            });
            nameWidget.root.style.flex = 1;
            panel.addButton( null, "Edit", () => {
                this.openScript( s );
            }, { icon: "Edit", xtooltip: true, title: "Edit" } );
            panel.addButton( null, "Remove", () => {
                const idx = scripts.indexOf( s );
                scripts.splice( idx, 1 );
                this.inspectNode( node );
            }, { icon: "Trash2", xtooltip: true, title: "Remove" } );
        }
    },

    closeEditor() {
        this.codeEditorArea.root.classList.toggle( "hidden", true );
    },

    openEditor() {
        this.codeEditorArea.root.classList.toggle( "hidden", false );
    },

    openScript( script ) {

        const node = script.node;

        this.openEditor();

        if( !this.codeEditor )
        {
            this.codeEditor = new LX.CodeEditor( this.codeEditorArea, {
                skipInfo: true,
                allowAddScripts: false,
                name: script.name,
                onsave: ( code ) => {
                    if( this.running )
                    {
                        this.runScene( true );
                    }
                },
                onrun: ( code ) => {} // Disable default behaviour
            } );
            this.codeEditor.setText( this.defaultNodeScript, "JavaScript" );
        }
        else
        {
            this.codeEditor.loadTab( script.name );
        }
    },

    attachScriptToNode( node, scriptCode ) {
        try {
            const scriptFunc = new Function( scriptCode );
            scriptFunc.call( node );

            node.onStart ??= () => {};
            node.onRender ??= () => {};
            node.onUpdate ??= (dt) => {};

        } catch (e) {
            console.error("Error compiling script for node:", e );
        }
    },

    runScene( run ) {

        let allowRun = false;

        // Update node scripts
        if( run )
        {
            for( const nodeUid in this.scripts )
            {
                const scripts = this.scripts[ nodeUid ];

                for( const s of scripts )
                {
                    const node = s.node;
                    const code = this.codeEditor.loadedTabs[ s.name ].lines.join( '\n' );
                    this.attachScriptToNode( node, code );

                    // Run onStart
                    node.onStart();
                    allowRun = true; // Allow run if at least 1 node is executed
                }
            }
        }

        this.running = ( run && allowRun );

        return allowRun;
    },

    loadScene( loader, file, data ) {

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

    getNodeMaterial( node, surfaceIndex = 0 ) {

        // No node or no MeshInstance3D
        if( !node || !node.getSurface )
        {
            return null;
        }

        const surface = node.getSurface( surfaceIndex );
        const material = node.getSurfaceMaterialOverride ? node.getSurfaceMaterialOverride( surface ) : null;
        return material ?? surface.material;
    },
   
    _loadGltf( name, buffer ) {

        const gltfFilePath = Module._getFilename( name );
        console.log( "Loading glb", [ gltfFilePath, buffer ] );

        Module._writeFile( gltfFilePath, buffer );

        const nodes = new WGE.VectorNodePtr();
        const parser = new WGE.GltfParser();
        parser.parse( gltfFilePath, nodes, WGE.ParseFlags.PARSE_DEFAULT.value );
        this.scene.addNodes( nodes, -1 );

        this.sceneTreePanel.refresh();
    },

    _loadPly( name, buffer ) {

        const plyFilePath = Module._getFilename( name );
        console.log( "Loading ply", [ plyFilePath, buffer ] );

        Module._writeFile( plyFilePath, buffer );

        const nodes = new WGE.VectorNodePtr();
        const parser = new WGE.PlyParser();
        parser.parse( plyFilePath, nodes, WGE.ParseFlags.PARSE_DEFAULT.value );
        this.scene.addNodes( nodes, -1 );

        this.sceneTreePanel.refresh();
    }
};

window.App.init();