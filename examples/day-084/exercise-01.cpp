#include <iostream>
class DmaQueue {
private: struct Descriptor { unsigned id{0U}; bool owned{false}; };
public:
 void Submit(unsigned id) noexcept { descriptor_.id=id; descriptor_.owned=true; }
 bool Complete(unsigned id) noexcept { if(!descriptor_.owned || descriptor_.id!=id) return false; descriptor_.owned=false; return true; }
 bool HasPending() const noexcept { return descriptor_.owned; }
private: Descriptor descriptor_{};
};
int main(){ DmaQueue q; q.Submit(17U); const bool wrong=q.Complete(18U); const bool done=q.Complete(17U); std::cout<<"wrong="<<wrong<<" done="<<done<<" pending="<<q.HasPending()<<'\n'; }