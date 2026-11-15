/**
 * Lab 与 Visualizer 共享的 C++ 演示源码预设
 */

export const VISUALIZER_DEMO_CODE = `#include "visualizer.h"
#include <iostream>

struct Resource {
    int id;
};

int main() {
    VIS_SCOPE("main");

    Resource res{1};
    VIS_TRACK(res, Resource);

    int* p = new int(100);
    VIS_PTR(p, p);

    delete p;
    VIS_STEP_L("堆内存释放完成");
    return 0;
}
`;

export const DEFAULT_DEMO_CODE = `#include <iostream>
#include <memory>

struct Widget {
    int id;
    Widget(int v) : id(v) {}
};

int main() {
    auto p1 = std::make_unique<Widget>(42);
    std::unique_ptr<Widget> p2 = std::move(p1);
    return 0;
}`;
