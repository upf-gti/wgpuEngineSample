# wgpuEngineSample

This repository contains a sample project with XR enabled using [wgpuEngine](https://github.com/upf-gti/wgpuEngine), the engine used in [Rooms](https://github.com/upf-gti/rooms), our immersive XR sculpting (SDF based) application.

### Experimental

A simple live web editor is hosted [here](upf-gti.github.io/wgpuEngineSample/) using experimental C++ to JavaScript bindings.

## How to build

You will need to install the following tools:

- [CMake](https://cmake.org/download/)
- [Python](https://www.python.org/) (added to your PATH)

### Desktop

```bash
git submodule update --init --recursive
mkdir build
cd build
cmake ..
```

### Web


Download [emscripten](https://emscripten.org/) and follow the installation guide.


On Windows you may need to download [ninja](https://ninja-build.org/) and include the folder in your PATH environment variable, then:


```bash
git submodule update --init --recursive
mkdir build-web
cd build-web
emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build .
```

After building for web, you can host a local server with python:

```bash
python -m http.server
```

And access the webpage using a browser with WebGPU support using the link: ``localhost:8000/sample_project.html``

## Feedback/Issues

You can use the [repository issues section](https://github.com/upf-gti/wgpuEngineSample/issues) or simply write any feedback to the contributors!