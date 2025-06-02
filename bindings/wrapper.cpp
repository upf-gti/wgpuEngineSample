// Wrapper for all our classes
// that are necessary to bind

#include "engine/engine.h"
#include "engine/scene.h"

#include "graphics/renderer.h"
#include "graphics/renderer_storage.h"
#include "graphics/shader.h"
#include "graphics/texture.h"
#include "graphics/pipeline.h"

#include "framework/math/transform.h"
#include "framework/nodes/environment_3d.h"
#include "framework/nodes/directional_light_3d.h"
#include "framework/nodes/omni_light_3d.h"
#include "framework/nodes/spot_light_3d.h"

#include <glm/gtc/type_ptr.hpp>
#include "glm/gtx/quaternion.hpp"
#include "glm/gtx/euler_angles.hpp"