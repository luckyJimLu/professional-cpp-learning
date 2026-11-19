#include <atomic>
#include <iostream>
class DriverStats {
public:
 DriverStats(){ ++instances_; }
 ~DriverStats(){ --instances_; }
 void RecordTx() noexcept { ++tx_count_; }
 unsigned TxCount() const noexcept { return tx_count_; }
 static unsigned Instances() noexcept { return instances_.load(); }
private: unsigned tx_count_{0U}; inline static std::atomic<unsigned> instances_{0U};
};
int main(){ DriverStats a; { DriverStats b; a.RecordTx(); b.RecordTx(); std::cout<<"inside="<<DriverStats::Instances()<<'\n'; } std::cout<<"tx="<<a.TxCount()<<" outside="<<DriverStats::Instances()<<'\n'; }