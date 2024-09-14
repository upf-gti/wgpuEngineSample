#pragma once

#include "engine/engine.h"

class SampleEngine : public Engine {

public:

	int initialize(Renderer* renderer) override;
    void clean() override;

	void update(float delta_time) override;
	void render() override;
};
