#include <iostream>
#include <string>
#include <string_view>
#include <utility>
class CommandName {
public:
 explicit CommandName(std::string v): value_(std::move(v)) {}
 std::string_view View() const noexcept { return value_; }
 static bool IsAllowed(std::string_view v) noexcept { return v=="AT" || v=="AT+CSQ"; }
 const std::string& Get() const & noexcept { return value_; }
 std::string Take() && noexcept { return std::move(value_); }
private: std::string value_;
};
int main(){ CommandName c{"AT+CSQ"}; std::cout<<"allowed="<<CommandName::IsAllowed(c.View())<<" view="<<c.Get()<<'\n'; std::cout<<"taken="<<std::move(c).Take()<<'\n'; }